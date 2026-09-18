import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/household";

/** Cancel a pending invite you sent, before it is accepted. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  // Scoped to invites this user sent: inviter_id, not household_id, so there is
  // no way to revoke on someone else's behalf even inside a shared household.
  const { error } = await admin
    .from("household_invites")
    .update({ status: "revoked" })
    .eq("inviter_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[household/revoke]", error);
    return NextResponse.json({ error: "Could not revoke the invitation" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
