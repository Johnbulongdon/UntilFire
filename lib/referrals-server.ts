import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  accountYoungEnoughToClaim, commissionCents, payableAt, withinEarningWindow,
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
export async function recordReferralCommission(admin: Admin, invoice: Stripe.Invoice) {
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

  const paidAt = new Date(((invoice.status_transitions?.paid_at ?? invoice.created) || Date.now() / 1000) * 1000);
  const { data: first } = await admin
    .from("referral_commissions")
    .select("earned_at")
    .eq("referred_user_id", sub.user_id)
    .order("earned_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!withinEarningWindow(first ? new Date(first.earned_at) : null, paidAt)) return "window-ended";

  const { error } = await admin.from("referral_commissions").insert({
    partner_id: attribution.partner_id,
    referred_user_id: sub.user_id,
    stripe_invoice_id: invoice.id,
    collected_cents: collected,
    rate_bps: attribution.rate_bps,
    // The rate snapshotted at sign-up, so a later change never rewrites this.
    commission_cents: commissionCents(collected, attribution.rate_bps),
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
