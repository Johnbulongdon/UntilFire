import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { claimReferral } from "@/lib/referrals-server";
import { REFERRAL_COOKIE } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/**
 * Called once from the dashboard after sign-in. Reads the creator code the
 * /r/<code> link left in a cookie and attributes this new account to that
 * creator. The answer says nothing about the creator, and the cookie is
 * cleared either way so it is only ever tried once.
 */
/** Whether this account was referred, so the upgrade screen can say "60 days free". */
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ referred: false });
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return NextResponse.json({ referred: false });
  const { data } = await admin
    .from("referral_attributions")
    .select("referred_user_id")
    .eq("referred_user_id", user.id)
    .maybeSingle();
  return NextResponse.json({ referred: !!data });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await claimReferral(admin, user, req.cookies.get(REFERRAL_COOKIE)?.value);
  const res = NextResponse.json({ ok: true, referred: result === "claimed" || result === "already-attributed" });
  if (result !== "no-cookie") res.cookies.delete(REFERRAL_COOKIE);
  return res;
}
