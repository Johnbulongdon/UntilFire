import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  accountYoungEnoughToClaim, commissionCents, FRIEND_CREDIT_CENTS, friendCode, payableAt, rateForPayment,
  withinEarningWindow,
} from "./referrals.ts";

/**
 * The referral program's writes (D-27). Every function takes the service-role
 * client: the tables have RLS on and no policies, so nothing reaches them
 * from a browser.
 */

type Admin = SupabaseClient;

const idOf = (v: string | { id: string } | null | undefined) =>
  typeof v === "string" ? v : v?.id ?? null;

/**
 * Attach a newly signed-up account to the creator whose link brought it.
 * Returns why nothing happened, for logs; never throws on bad input.
 */
export async function claimReferral(admin: Admin, user: { id: string; created_at: string }, code: string | undefined) {
  if (!code) return "no-cookie";
  if (!accountYoungEnoughToClaim(user.created_at)) return "existing-account";

  const { data: partner } = await admin
    .from("referral_partners")
    .select("id, user_id, status, rate_bps, months")
    .eq("code", code)
    .maybeSingle();
  if (!partner || partner.status !== "active") return "unknown-code";
  if (partner.user_id === user.id) return "self-referral";

  // The primary key on referred_user_id makes the first claim final: a
  // second link clicked later cannot move an existing attribution.
  const { error } = await admin.from("referral_attributions").insert({
    referred_user_id: user.id,
    partner_id: partner.id,
    rate_bps: partner.rate_bps,
    months: partner.months,
  });
  return error ? "already-attributed" : "claimed";
}

/**
 * invoice.paid: if the payer was referred, record 30% of what was collected,
 * inside the 12 months that start with their first paid invoice. A free
 * trial's $0 invoice earns nothing. Keyed by invoice id, so a webhook Stripe
 * retries records once.
 */
export async function recordReferralCommission(admin: Admin, invoice: Stripe.Invoice, stripe?: Stripe) {
  const customerId = idOf(invoice.customer as string | { id: string } | null);
  // Tax is collected for the government, not for us or the creator.
  const tax = (invoice.total_taxes ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const collected = (invoice.amount_paid ?? 0) - tax;
  if (!customerId || !invoice.id || collected <= 0) return "nothing-collected";

  const { data: sub } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!sub?.user_id) return "unknown-customer";

  const { data: attribution } = await admin
    .from("referral_attributions")
    .select("partner_id, rate_bps")
    .eq("referred_user_id", sub.user_id)
    .maybeSingle();
  if (!attribution) return "not-referred";

  // A friend's link earns the person who shared it a free month, not cash.
  const { data: partner } = await admin
    .from("referral_partners")
    .select("user_id, kind")
    .eq("id", attribution.partner_id)
    .maybeSingle();
  if (partner?.kind === "friend") {
    return recordFriendCredit(admin, { referrerUserId: partner.user_id, referredUserId: sub.user_id, invoiceId: invoice.id }, stripe);
  }

  const paidAt = new Date(((invoice.status_transitions?.paid_at ?? invoice.created) || Date.now() / 1000) * 1000);
  const { data: first } = await admin
    .from("referral_commissions")
    .select("earned_at")
    .eq("referred_user_id", sub.user_id)
    .order("earned_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const inFirstYear = withinEarningWindow(first ? new Date(first.earned_at) : null, paidAt);

  // This creator's paying customers, counting this one (the 40% tier).
  const { data: paying } = await admin
    .from("referral_commissions")
    .select("referred_user_id, status")
    .eq("partner_id", attribution.partner_id);
  const payingCustomers = new Set([
    sub.user_id,
    ...(paying ?? []).filter((c) => c.status !== "reversed").map((c) => c.referred_user_id),
  ]).size;
  const rateBps = rateForPayment({ baseRateBps: attribution.rate_bps, inFirstYear, payingCustomers });

  const { error } = await admin.from("referral_commissions").insert({
    partner_id: attribution.partner_id,
    referred_user_id: sub.user_id,
    stripe_invoice_id: invoice.id,
    collected_cents: collected,
    rate_bps: rateBps,
    // Stored with the row, so a later change to the program never rewrites it.
    commission_cents: commissionCents(collected, rateBps),
    earned_at: paidAt.toISOString(),
    payable_at: payableAt(paidAt).toISOString(),
  });
  // A unique violation is Stripe retrying an invoice already recorded.
  return error ? (error.code === "23505" ? "duplicate" : `error: ${error.message}`) : "recorded";
}

/**
 * charge.refunded / charge.dispute.created: reverse the commission on the
 * invoice the charge paid, unless it has already been paid out (those are
 * left for the founder to settle with the creator by hand).
 */
export async function reverseReferralCommission(stripe: Stripe, admin: Admin, paymentIntentId: string | null, reason: string) {
  if (!paymentIntentId) return "no-payment-intent";
  const payments = await stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId },
    limit: 1,
  });
  const invoiceId = idOf(payments.data[0]?.invoice as string | { id: string } | null | undefined);
  if (!invoiceId) return "no-invoice";

  const { data, error } = await admin
    .from("referral_commissions")
    .update({ status: "reversed", reversed_at: new Date().toISOString(), reversed_reason: reason })
    .eq("stripe_invoice_id", invoiceId)
    .eq("status", "pending")
    .select("id");
  if (error) return `error: ${error.message}`;
  return data?.length ? "reversed" : "nothing-to-reverse";
}

/**
 * "Give a month, get a month" (D-27): the friend's first payment earns the
 * person who shared the link one month of Pro, as a Stripe account credit
 * that comes off their next bill. Once per friend, whatever Stripe retries.
 */
export async function recordFriendCredit(
  admin: Admin,
  opts: { referrerUserId: string; referredUserId: string; invoiceId: string },
  stripe?: Stripe,
) {
  const { data: credit, error } = await admin
    .from("referral_credits")
    .insert({
      referrer_user_id: opts.referrerUserId,
      referred_user_id: opts.referredUserId,
      stripe_invoice_id: opts.invoiceId,
      amount_cents: FRIEND_CREDIT_CENTS,
    })
    .select("id, amount_cents")
    .single();
  if (error) return error.code === "23505" ? "duplicate" : `error: ${error.message}`;

  const { data: referrerSub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", opts.referrerUserId)
    .maybeSingle();
  if (!stripe || !referrerSub?.stripe_customer_id) return "credit-pending";
  return applyCredit(stripe, admin, credit, referrerSub.stripe_customer_id);
}

async function applyCredit(stripe: Stripe, admin: Admin, credit: { id: string; amount_cents: number }, customerId: string) {
  const txn = await stripe.customers.createBalanceTransaction(
    customerId,
    { amount: -credit.amount_cents, currency: "usd", description: "UntilFire: a free month for inviting a friend" },
    // A retry can never credit twice.
    { idempotencyKey: `uf-referral-credit-${credit.id}` },
  );
  await admin
    .from("referral_credits")
    .update({ status: "applied", stripe_balance_transaction_id: txn.id, applied_at: new Date().toISOString() })
    .eq("id", credit.id);
  return "credit-applied";
}

/** At checkout: credits earned before this person had a Stripe customer. */
export async function applyPendingCredits(stripe: Stripe, admin: Admin, userId: string, customerId: string) {
  const { data: pending } = await admin
    .from("referral_credits")
    .select("id, amount_cents")
    .eq("referrer_user_id", userId)
    .eq("status", "pending");
  for (const credit of pending ?? []) await applyCredit(stripe, admin, credit, customerId);
  return (pending ?? []).length;
}

/** A user's own "give a month" link, created the first time they ask for it. */
export async function friendLinkFor(admin: Admin, userId: string) {
  const { data: existing } = await admin
    .from("referral_partners")
    .select("code, kind")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = friendCode();
    const { error } = await admin.from("referral_partners").insert({
      user_id: userId,
      code,
      kind: "friend",
      rate_bps: 0,
      months: 0,
    });
    if (!error) return { code, kind: "friend" as const };
    // The user joined in the meantime: return what they have.
    if (error.message.includes("user_id")) return friendLinkFor(admin, userId);
  }
  return null;
}
