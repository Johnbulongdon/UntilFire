import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import {
  commissionCents, normaliseCode, REFERRAL_MONTHS, REFERRAL_RATE_BPS, REFERRAL_TERMS_VERSION, summarise, type PayoutMethod,
} from "@/lib/referrals";
import { PRO_ANNUAL_USD } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * A creator's own view of the program (D-27). Totals only: never who they
 * referred, never another creator's rows. The tables are service-role only,
 * so this route is the only way a creator reads them, and it scopes every
 * query to the partner row owned by the signed-in user.
 */

async function signedInUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user ? { user, admin } : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isMethod = (v: unknown): v is PayoutMethod => v === "paypal" || v === "wise";

export async function GET(req: NextRequest) {
  const auth = await signedInUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, admin } = auth;

  const { data: partner } = await admin
    .from("referral_partners")
    .select("id, code, status, kind, payout_method, payout_email, rate_bps, months, created_at")
    .eq("user_id", user.id)
    .maybeSingle();
  // A "give a month" link is not the creator program; they can still join it.
  if (!partner || partner.kind !== "creator") return NextResponse.json({ partner: null });

  const [visits, attributions, commissions, payouts] = await Promise.all([
    admin.from("referral_visits").select("id", { count: "exact", head: true }).eq("partner_id", partner.id),
    admin.from("referral_attributions").select("referred_user_id").eq("partner_id", partner.id),
    admin.from("referral_commissions").select("referred_user_id, commission_cents, status, payable_at").eq("partner_id", partner.id),
    admin.from("referral_payouts").select("amount_cents, method, paid_at").eq("partner_id", partner.id).order("paid_at", { ascending: false }),
  ]);

  // Momentum before money (D-27): readers on Pro who haven't paid yet are
  // in their free trial. Counted, never named.
  const referredIds = (attributions.data ?? []).map((a) => a.referred_user_id);
  const paidIds = new Set((commissions.data ?? []).map((c) => c.referred_user_id));
  const { data: onPro } = referredIds.length
    ? await admin.from("subscriptions").select("user_id").in("user_id", referredIds).eq("plan", "pro")
    : { data: [] as { user_id: string }[] };
  const inTrial = (onPro ?? []).filter((s) => !paidIds.has(s.user_id)).length;

  return NextResponse.json({
    partner: { ...partner, id: undefined },
    stats: {
      visits: visits.count ?? 0,
      signups: referredIds.length,
      inTrial,
      // If each one stays on the yearly plan, the lower of the two plans' first-year earnings.
      inTrialWorthCents: inTrial * commissionCents(PRO_ANNUAL_USD * 100),
      ...summarise(commissions.data ?? []),
    },
    payouts: payouts.data ?? [],
  });
}

/** Join the program: pick a code, say where to be paid, accept the terms. */
export async function POST(req: NextRequest) {
  const auth = await signedInUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, admin } = auth;

  const body = await req.json().catch(() => ({}));
  const code = normaliseCode(String(body?.code ?? ""));
  if (!code) {
    return NextResponse.json({ error: "Use 3–24 letters, numbers or single hyphens, like jane-saves." }, { status: 400 });
  }
  if (!isMethod(body?.payoutMethod)) return NextResponse.json({ error: "Choose PayPal or Wise." }, { status: 400 });
  const email = String(body?.payoutEmail ?? "").trim();
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: `Enter the email your ${body.payoutMethod === "paypal" ? "PayPal" : "Wise"} account uses.` }, { status: 400 });
  }
  if (body?.acceptTerms !== true) return NextResponse.json({ error: "Please accept the program terms." }, { status: 400 });

  const creator = {
    code,
    kind: "creator",
    payout_method: body.payoutMethod,
    payout_email: email,
    rate_bps: REFERRAL_RATE_BPS,
    months: REFERRAL_MONTHS,
    terms_version: REFERRAL_TERMS_VERSION,
    terms_accepted_at: new Date().toISOString(),
  };
  // Someone with a "give a month" link becomes a creator on the same row, so
  // friends they already invited count toward their creator numbers.
  const { data: friendRow } = await admin
    .from("referral_partners")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "friend")
    .maybeSingle();
  const { error } = friendRow
    ? await admin.from("referral_partners").update(creator).eq("id", friendRow.id)
    : await admin.from("referral_partners").insert({ user_id: user.id, ...creator });
  if (error) {
    // Unique violation: either the code is taken or this account already joined.
    const taken = error.code === "23505" && error.message.includes("code");
    return NextResponse.json(
      { error: taken ? "That link is taken. Try another." : "You're already in the program." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}

/** Change where payouts go. The code stays fixed: links already shared must keep working. */
export async function PATCH(req: NextRequest) {
  const auth = await signedInUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, admin } = auth;

  const body = await req.json().catch(() => ({}));
  const email = String(body?.payoutEmail ?? "").trim();
  if (!isMethod(body?.payoutMethod) || !EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Choose PayPal or Wise and enter that account's email." }, { status: 400 });
  }
  const { data, error } = await admin
    .from("referral_partners")
    .update({ payout_method: body.payoutMethod, payout_email: email })
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) return NextResponse.json({ error: "Join the program first." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
