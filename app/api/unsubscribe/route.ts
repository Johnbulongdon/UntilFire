import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

// Public — no auth. Reached from the unsubscribe link in admin broadcast
// emails, which is verified via an HMAC token rather than a login.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const u = typeof body?.u === "string" ? body.u : "";
  const t = typeof body?.t === "string" ? body.t : "";

  if (!u || !t || !verifyUnsubscribeToken(u, t)) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
  }

  const admin = adminClient();
  const { error } = await admin
    .from("profiles")
    .upsert({ user_id: u, marketing_unsubscribed_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
