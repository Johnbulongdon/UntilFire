import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Resend } from "resend";
import { CAMPAIGNS, sendTagged } from "@/lib/email-send";
import { buildWelcomeEmail } from "@/lib/email-html";
import { LIFECYCLE_EVENTS, recordEvent } from "@/lib/lifecycle";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Idempotency — skip if already sent
  const { data: profile } = await admin
    .from("profiles")
    .select("welcome_email_sent_at")
    .eq("user_id", user.id)
    .single();

  if (profile?.welcome_email_sent_at) {
    return NextResponse.json({ skipped: true });
  }

  // The name is already here and was simply never copied across. Twelve of
  // thirteen users signed in with Google, which hands over full_name, and the
  // emails greeted every one of them as nobody because profiles.display_name
  // stayed null. Captured at the one place a profile row is created.
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const claimed = [metadata.full_name, metadata.name, metadata.given_name]
    .find((v): v is string => typeof v === "string" && v.trim().length > 0);

  await admin.from("profiles").upsert(
    {
      user_id: user.id,
      welcome_email_sent_at: new Date().toISOString(),
      ...(claimed ? { display_name: claimed.trim().slice(0, 120) } : {}),
    },
    { onConflict: "user_id" },
  );
  await recordEvent(admin, user.id, LIFECYCLE_EVENTS.WELCOME_EMAIL);
  await recordEvent(admin, user.id, LIFECYCLE_EVENTS.SIGNED_UP, user.created_at);

  if (process.env.RESEND_API_KEY && user.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      const { error: sendError } = await sendTagged(resend, admin, {
        campaign: CAMPAIGNS.WELCOME,
        label: `Welcome \u2014 ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        from: "UntilFire <hello@untilfire.com>",
        to: user.email,
        subject: "Welcome to UntilFire — your path to financial freedom starts here",
        html: buildWelcomeEmail(),
      });
      if (sendError) console.error("[welcome] Resend error:", sendError);
    } catch (err) {
      console.error("[welcome] Resend threw:", err);
    }
  }

  return NextResponse.json({ success: true });
}
