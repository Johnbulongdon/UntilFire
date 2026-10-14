import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { rowForTransaction, verifyTransaction } from "@/lib/apple-store";

/**
 * The iOS app calls this after an Apple purchase or a restore (D-75), sending
 * the signed transaction StoreKit returned. Verified with Apple's root
 * certificates, then stored in `subscriptions` as an Apple-billed row.
 * Someone already Pro through Stripe keeps their Stripe row.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { signedTransaction?: string };
  if (!body.signedTransaction) return NextResponse.json({ error: "Missing signedTransaction" }, { status: 400 });

  let row;
  try {
    row = rowForTransaction(await verifyTransaction(body.signedTransaction));
  } catch (err) {
    console.error("[apple/verify]", err);
    return NextResponse.json({ error: "Couldn't confirm the purchase with Apple." }, { status: 400 });
  }
  if (!row) return NextResponse.json({ error: "That purchase isn't UntilFire Pro." }, { status: 400 });

  // One Apple purchase belongs to one account.
  const { data: owner } = await admin.from("subscriptions").select("user_id").eq("apple_original_transaction_id", row.apple_original_transaction_id).maybeSingle();
  if (owner && owner.user_id !== user.id) {
    return NextResponse.json({ error: "This Apple subscription is already linked to another UntilFire account." }, { status: 409 });
  }

  const { data: current } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
  if (current && current.source === "stripe" && current.status === "active") {
    return NextResponse.json({ pro: true, source: "stripe" });
  }

  const { error } = await admin.from("subscriptions").upsert({
    user_id: user.id,
    source: "apple",
    ...row,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) {
    console.error("[apple/verify] save", error);
    return NextResponse.json({ error: "Couldn't save the purchase. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ pro: row.plan === "pro", source: "apple", expires: row.current_period_end });
}
