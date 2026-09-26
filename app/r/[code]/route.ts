import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { normaliseCode, REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/**
 * A creator's link: untilfire.com/r/<code>. Counts the visit, remembers the
 * code for 60 days in a first-party cookie, and sends the visitor to the free
 * calculator tagged as ref-<code>, so PostHog shows each creator's funnel with
 * no new events. An unknown or paused code still lands on the calculator,
 * just without the cookie. Always redirects to our own "/", never to a URL
 * taken from the request.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = normaliseCode((await params).code);
  const home = new URL("/", req.url);
  if (!code) return NextResponse.redirect(home);

  // A creator's link must always land somewhere useful: if the lookup fails,
  // the visitor still gets the calculator, just without the attribution.
  try {
    const admin = adminClient();
    const { data: partner } = await admin
      .from("referral_partners")
      .select("id, status")
      .eq("code", code)
      .maybeSingle();
    if (!partner || partner.status !== "active") return NextResponse.redirect(home);
    await admin.from("referral_visits").insert({ partner_id: partner.id });
  } catch (err) {
    console.error("[r] referral lookup failed:", err);
    return NextResponse.redirect(home);
  }

  home.searchParams.set("source", `ref-${code}`);
  const res = NextResponse.redirect(home);
  // Read only by our own server when the new account's dashboard first loads.
  res.cookies.set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
  });
  return res;
}
