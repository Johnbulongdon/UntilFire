import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/household";

/**
 * Disconnect — one symmetric action, either member, no approval.
 *
 * At two members with symmetric visibility, "I leave" and "I remove you" have
 * the same outcome: the household ends and neither can see the other again. So
 * they are not two features. Deleting the household cascades both membership
 * rows and any invite, and every peer-read policy keys off household_members,
 * so access stops the instant this returns — nothing to revoke separately and
 * no cache to invalidate.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  const { data: mine } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mine) return NextResponse.json({ ok: true, alreadyDisconnected: true });

  const { error } = await admin.from("households").delete().eq("id", mine.household_id);
  if (error) {
    console.error("[household/disconnect]", error);
    return NextResponse.json({ error: "Could not disconnect" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
