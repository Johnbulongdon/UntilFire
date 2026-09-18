import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { CAMPAIGNS, sendTagged } from "@/lib/email-send";
import { buildHouseholdInviteEmail, firstNameFor } from "@/lib/email-html";
import {
  SLOT_OWNER,
  inviteExpiry,
  isValidEmail,
  mintInviteToken,
  normaliseEmail,
  requireUser,
} from "@/lib/household";

const SITE = "https://www.untilfire.com";

/**
 * Invite one person into a household, creating the household if needed.
 *
 * The household is created lazily here rather than by its own endpoint: a
 * household with one person in it is not a household, and making "create" a
 * separate step would leave empty ones behind every time someone opened the
 * section and changed their mind.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  let email = "";
  try {
    email = normaliseEmail(((await req.json()) as { email?: string }).email ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }
  if (email === normaliseEmail(user.email ?? "")) {
    return NextResponse.json({ error: "That's your own address." }, { status: 400 });
  }

  try {
    // Existing household, or a new one with this user in slot 1.
    let householdId: string;
    const { data: mine } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (mine) {
      householdId = mine.household_id as string;
      const { count } = await admin
        .from("household_members")
        .select("user_id", { count: "exact", head: true })
        .eq("household_id", householdId);
      // The slot constraint would reject the second member on accept anyway;
      // this is so the person finds out now rather than after sending.
      if ((count ?? 0) >= 2) {
        return NextResponse.json(
          { error: "Your household is already full. Disconnect first to invite someone else." },
          { status: 409 },
        );
      }
    } else {
      const { data: created, error: hErr } = await admin
        .from("households")
        .insert({ name: "Our household", created_by: user.id })
        .select("id")
        .single();
      if (hErr || !created) throw hErr ?? new Error("household insert returned nothing");
      householdId = created.id as string;

      const { error: mErr } = await admin.from("household_members").insert({
        household_id: householdId,
        user_id: user.id,
        role: "owner",
        member_slot: SLOT_OWNER,
      });
      if (mErr) {
        // Never leave a household with nobody in it.
        await admin.from("households").delete().eq("id", householdId);
        throw mErr;
      }
    }

    // One live invite at a time. Re-inviting supersedes rather than stacks, so
    // an old link cannot be redeemed after the address was corrected.
    await admin
      .from("household_invites")
      .update({ status: "revoked" })
      .eq("household_id", householdId)
      .eq("status", "pending");

    const inviteToken = mintInviteToken();
    const { error: iErr } = await admin.from("household_invites").insert({
      household_id: householdId,
      inviter_id: user.id,
      invitee_email: email,
      token: inviteToken,
      status: "pending",
      expires_at: inviteExpiry(),
    });
    if (iErr) throw iErr;

    // Send after the row exists: an email pointing at an invite that was never
    // written is a dead link, which is worse than a slow one.
    const { data: prof } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const inviterLabel =
      firstNameFor(prof?.display_name as string | null) || user.email?.split("@")[0] || "Someone";

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const { error: sendError } = await sendTagged(new Resend(apiKey), admin, {
        campaign: CAMPAIGNS.HOUSEHOLD_INVITE,
        label: `Household invite — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        from: "UntilFire <hello@untilfire.com>",
        to: email,
        subject: `${inviterLabel} invited you to plan together on UntilFire`,
        html: buildHouseholdInviteEmail(inviterLabel, `${SITE}/household/join?token=${inviteToken}`),
      });
      if (sendError) {
        console.error("[household/invite] resend:", sendError);
        return NextResponse.json(
          { error: "The invitation was created but the email didn't send. Try again." },
          { status: 502 },
        );
      }
    } else {
      console.warn("[household/invite] RESEND_API_KEY missing — invite row created, no email sent");
    }

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error("[household/invite]", err);
    return NextResponse.json({ error: "Could not send the invitation" }, { status: 500 });
  }
}
