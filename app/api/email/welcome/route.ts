import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Resend } from "resend";
import { buildWelcomeEmail } from "@/lib/email-html";

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

  await admin.from("profiles").upsert(
    { user_id: user.id, welcome_email_sent_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  if (process.env.RESEND_API_KEY && user.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      const { error: sendError } = await resend.emails.send({
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
