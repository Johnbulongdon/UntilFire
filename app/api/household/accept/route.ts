import { NextRequest, NextResponse } from "next/server";
import { SLOT_PARTNER, normaliseEmail, requireUser } from "@/lib/household";

/**
 * Accept an invitation.
 *
 * The token is not the only credential. The signed-in address must also match
 * the one the invite was addressed to, because accepting hands over read
 * access to another person's complete financial history — a forwarded link
 * should not be enough to obtain that. When they don't match we name the
 * expected address, since the usual cause is signing in with a different
 * Google account rather than anything sinister.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  let token = "";
  try {
    token = String(((await req.json()) as { token?: string }).token ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: "Missing invitation token" }, { status: 400 });

  try {
    const { data: invite } = await admin
      .from("household_invites")
      .select("id, household_id, invitee_email, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "This invitation link isn't valid." }, { status: 404 });
    }
    if (invite.status === "accepted") {
      return NextResponse.json({ error: "This invitation has already been used." }, { status: 409 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "This invitation was cancelled." }, { status: 409 });
    }
    if (new Date(invite.expires_at as string).getTime() < Date.now()) {
      await admin.from("household_invites").update({ status: "expired" }).eq("id", invite.id);
      return NextResponse.json({ error: "This invitation has expired. Ask for a new one." }, { status: 410 });
    }

    const invitee = invite.invitee_email as string;
    if (normaliseEmail(user.email ?? "") !== normaliseEmail(invitee)) {
      return NextResponse.json(
        { error: `This invitation was sent to ${invitee}. Sign in with that address to accept it.`, wrongAccount: true },
        { status: 403 },
      );
    }

    const { data: existing } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.household_id === invite.household_id
              ? "You're already in this household."
              : "You're already in a household. Disconnect from it first.",
        },
        { status: 409 },
      );
    }

    const { error: joinError } = await admin.from("household_members").insert({
      household_id: invite.household_id,
      user_id: user.id,
      role: "member",
      member_slot: SLOT_PARTNER,
    });

    if (joinError) {
      // 23505 is the slot or user uniqueness constraint: somebody else took
      // the second place, or this user joined elsewhere, between the checks
      // above and this insert. The constraint is the thing that decides.
      if ((joinError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "That household is already full." },
          { status: 409 },
        );
      }
      throw joinError;
    }

    await admin
      .from("household_invites")
      .update({ status: "accepted", accepted_by: user.id })
      .eq("id", invite.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[household/accept]", err);
    return NextResponse.json({ error: "Could not accept the invitation" }, { status: 500 });
  }
}
