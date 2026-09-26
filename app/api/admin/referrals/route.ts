import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { commissionStatus, REFERRAL_MIN_PAYOUT_CENTS, summarise } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/**
 * The founder's side of the referral program (D-27): every creator, what
 * they are owed, and the manual monthly payout. Money leaves by PayPal or
 * Wise outside the app; "mark paid" records it here with that transfer's id.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const [partners, visits, attributions, commissions, payouts, users] = await Promise.all([
    admin.from("referral_partners").select("*").order("created_at", { ascending: false }),
    admin.from("referral_visits").select("partner_id"),
    admin.from("referral_attributions").select("partner_id"),
    admin.from("referral_commissions").select("id, partner_id, referred_user_id, collected_cents, commission_cents, status, earned_at, payable_at, reversed_reason").order("earned_at", { ascending: false }),
    admin.from("referral_payouts").select("partner_id, amount_cents, method, reference, paid_at").order("paid_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (partners.error) return NextResponse.json({ error: partners.error.message }, { status: 500 });

  const emailOf = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const countBy = (rows: { partner_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.partner_id === id).length;
  const now = new Date();

  return NextResponse.json({
    minPayoutCents: REFERRAL_MIN_PAYOUT_CENTS,
    partners: (partners.data ?? []).map((p) => {
      const rows = (commissions.data ?? []).filter((c) => c.partner_id === p.id);
      return {
        id: p.id,
        code: p.code,
        status: p.status,
        accountEmail: emailOf.get(p.user_id) ?? "",
        payoutMethod: p.payout_method,
        payoutEmail: p.payout_email,
        createdAt: p.created_at,
        visits: countBy(visits.data, p.id),
        signups: countBy(attributions.data, p.id),
        ...summarise(rows, now),
        commissions: rows.map((c) => ({
          id: c.id,
          collectedCents: c.collected_cents,
          commissionCents: c.commission_cents,
          status: commissionStatus(c, now),
          earnedAt: c.earned_at,
          reversedReason: c.reversed_reason,
        })),
        payouts: (payouts.data ?? []).filter((x) => x.partner_id === p.id),
      };
    }),
  });
}

/**
 * { action: "payout", partnerId, amountCents, reference }
 *     record a transfer already sent, covering every payable commission
 * { action: "status", partnerId, status }     pause or reactivate a creator
 * { action: "reverse", commissionId, reason } take back one unpaid commission
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin, user } = auth;
  const body = await req.json().catch(() => ({}));

  if (body?.action === "status") {
    if (body.status !== "active" && body.status !== "paused") return NextResponse.json({ error: "Bad status" }, { status: 400 });
    const { error } = await admin.from("referral_partners").update({ status: body.status }).eq("id", String(body.partnerId));
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (body?.action === "reverse") {
    const { data, error } = await admin
      .from("referral_commissions")
      .update({ status: "reversed", reversed_at: new Date().toISOString(), reversed_reason: String(body.reason || "reversed by admin").slice(0, 200) })
      .eq("id", String(body.commissionId))
      .eq("status", "pending")
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return data?.length ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Only unpaid commissions can be reversed." }, { status: 409 });
  }

  if (body?.action === "payout") {
    const reference = String(body.reference ?? "").trim().slice(0, 120);
    if (!reference) return NextResponse.json({ error: "Enter the PayPal or Wise transaction id." }, { status: 400 });

    const { data: partner } = await admin.from("referral_partners").select("id, payout_method").eq("id", String(body.partnerId)).maybeSingle();
    if (!partner) return NextResponse.json({ error: "No such creator" }, { status: 404 });

    const now = new Date();
    const { data: pending } = await admin
      .from("referral_commissions")
      .select("id, commission_cents, status, payable_at")
      .eq("partner_id", partner.id)
      .eq("status", "pending");
    const due = (pending ?? []).filter((c) => commissionStatus(c, now) === "payable");
    const amount = due.reduce((sum, c) => sum + c.commission_cents, 0);
    if (amount < REFERRAL_MIN_PAYOUT_CENTS) {
      return NextResponse.json({ error: "Less than the $20 minimum is payable." }, { status: 409 });
    }
    // The amount the founder saw and sent. If another commission cleared its
    // hold in between, refuse rather than record more than was transferred.
    if (Number(body.amountCents) !== amount) {
      return NextResponse.json({ error: "The payable amount changed. Refresh, then send the new amount." }, { status: 409 });
    }

    const { data: payout, error: payoutError } = await admin
      .from("referral_payouts")
      .insert({ partner_id: partner.id, amount_cents: amount, method: partner.payout_method, reference, paid_by: user.id })
      .select("id")
      .single();
    if (payoutError || !payout) return NextResponse.json({ error: payoutError?.message ?? "Payout failed" }, { status: 500 });

    const { error: markError } = await admin
      .from("referral_commissions")
      .update({ status: "paid", payout_id: payout.id })
      .in("id", due.map((c) => c.id))
      .eq("status", "pending");
    if (markError) {
      // Leave no payout that points at unpaid commissions.
      await admin.from("referral_payouts").delete().eq("id", payout.id);
      return NextResponse.json({ error: markError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, amountCents: amount });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
