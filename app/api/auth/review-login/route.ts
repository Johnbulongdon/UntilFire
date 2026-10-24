import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { adminClient } from "@/lib/supabase-admin";

// App Review signs in with email codes like everyone else, but can't read the
// reviewer inbox. For the one reviewer account (REVIEW_LOGIN_EMAIL) a fixed
// code (REVIEW_LOGIN_CODE) is accepted instead; the phone app tries this only
// after the normal code check fails. Unset either variable to turn it off.
const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(req: NextRequest) {
  const limited = rateLimit(callerKey(req, "review-login"), 5);
  if (limited) return limited;

  const reviewEmail = process.env.REVIEW_LOGIN_EMAIL?.trim().toLowerCase();
  const reviewCode = process.env.REVIEW_LOGIN_CODE?.trim();
  const { email, code } = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
  if (!reviewEmail || !reviewCode || !email || !code) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!same(email.trim().toLowerCase(), reviewEmail) || !same(code.trim(), reviewCode)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await adminClient().auth.admin.generateLink({ type: "magiclink", email: reviewEmail });
  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ error: "Couldn't sign in" }, { status: 500 });
  }
  return NextResponse.json({ token_hash: data.properties.hashed_token });
}
