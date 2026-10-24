import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { rowForTransaction, verifyNotification, verifyRenewalInfo, verifyTransaction } from "@/lib/apple-store";

/**
 * App Store Server Notifications V2 (D-75): Apple posts here when an Apple
 * subscription renews, is turned off, expires, fails to bill, or is refunded.
 * Set this URL in App Store Connect, under the app's App Store Server
 * Notifications. Each notice is checked against Apple's certificates and the
 * Apple-billed row for that purchase is brought up to date. Apple retries
 * anything but a 2xx, so only a notice that can't be verified is refused.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({})) as { signedPayload?: string };
  if (!body.signedPayload) return NextResponse.json({ error: "Missing signedPayload" }, { status: 400 });

  let notice;
  try {
    notice = await verifyNotification(body.signedPayload);
  } catch (err) {
    console.error("[apple/notifications] verify", err);
    return NextResponse.json({ error: "Unverified" }, { status: 400 });
  }

  const signedTx = notice.data?.signedTransactionInfo;
  if (!signedTx) return NextResponse.json({ ok: true });
  const tx = await verifyTransaction(signedTx);
  const renewal = notice.data?.signedRenewalInfo ? await verifyRenewalInfo(notice.data.signedRenewalInfo).catch(() => null) : null;
  const row = rowForTransaction(tx, renewal);
  if (!row) return NextResponse.json({ ok: true });

  // Only rows the app already linked to an account; a purchase never verified by the app has no owner yet.
  const admin = adminClient();
  const { data: existing } = await admin.from("subscriptions").select("user_id").eq("apple_original_transaction_id", row.apple_original_transaction_id).maybeSingle();
  if (!existing) return NextResponse.json({ ok: true });

  const { error } = await admin.from("subscriptions").update({ ...row, updated_at: new Date().toISOString() }).eq("user_id", existing.user_id);
  if (error) {
    console.error("[apple/notifications] save", notice.notificationType, error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
