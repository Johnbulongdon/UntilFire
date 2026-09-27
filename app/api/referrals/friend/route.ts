import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { friendLinkFor } from "@/lib/referrals-server";

export const dynamic = "force-dynamic";

/**
 * A user's "give a month, get a month" link (D-27), created on first ask,
 * and how many free months it has earned. A creator gets their creator
 * link back instead: one link per person.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const link = await friendLinkFor(admin, user.id);
  if (!link) return NextResponse.json({ error: "Couldn't create a link. Try again." }, { status: 500 });

  const { count } = await admin
    .from("referral_credits")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", user.id);
  return NextResponse.json({ code: link.code, kind: link.kind, monthsEarned: count ?? 0 });
}
