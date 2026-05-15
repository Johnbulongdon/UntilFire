import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const welcomeHtml = (email: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to UntilFire</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#064E3B;padding:28px 36px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">UntilFire 🔥</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 36px 28px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#19181E;letter-spacing:-0.5px;">Welcome aboard!</h1>
          <p style="margin:0 0 24px;font-size:16px;color:#4B5563;line-height:1.6;">
            Hi ${email.split("@")[0]}, you're now part of the UntilFire community — people who are serious about reaching financial independence.
          </p>
          <p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#064E3B;">Here's how to get started in 3 steps:</p>
          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;">
                <span style="display:inline-block;width:28px;height:28px;background:#ECFDF5;border-radius:50%;text-align:center;line-height:28px;font-weight:800;color:#059669;font-size:13px;margin-right:12px;">1</span>
                <span style="font-size:15px;color:#19181E;font-weight:600;">Add your income &amp; expenses</span>
                <p style="margin:6px 0 0 40px;font-size:14px;color:#6B7280;line-height:1.5;">Log your first transactions in the Cash Flow tab to track your savings rate.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;">
                <span style="display:inline-block;width:28px;height:28px;background:#ECFDF5;border-radius:50%;text-align:center;line-height:28px;font-weight:800;color:#059669;font-size:13px;margin-right:12px;">2</span>
                <span style="font-size:15px;color:#19181E;font-weight:600;">See your FIRE number</span>
                <p style="margin:6px 0 0 40px;font-size:14px;color:#6B7280;line-height:1.5;">The FIRE Calculator tab shows exactly how long until you reach financial independence.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;vertical-align:top;">
                <span style="display:inline-block;width:28px;height:28px;background:#ECFDF5;border-radius:50%;text-align:center;line-height:28px;font-weight:800;color:#059669;font-size:13px;margin-right:12px;">3</span>
                <span style="font-size:15px;color:#19181E;font-weight:600;">Explore city FIRE data</span>
                <p style="margin:6px 0 0 40px;font-size:14px;color:#6B7280;line-height:1.5;">Considering a move? Check cost-of-living adjusted FIRE timelines for 97 US cities.</p>
              </td>
            </tr>
          </table>
          <!-- CTA -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:8px;background:#22d3a5;">
              <a href="https://untilfire.com/dashboard" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#064E3B;text-decoration:none;letter-spacing:-0.2px;">Go to my dashboard →</a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 36px;background:#f8fafc;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
            You're receiving this because you signed up at <a href="https://untilfire.com" style="color:#059669;">untilfire.com</a>. Questions? Reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if welcome email already sent
  const { data: profile } = await admin
    .from("profiles")
    .select("welcome_email_sent_at")
    .eq("id", user.id)
    .single();

  if (profile?.welcome_email_sent_at) {
    return NextResponse.json({ skipped: true });
  }

  // Mark as sent first (idempotency guard)
  await admin.from("profiles").upsert({
    id: user.id,
    welcome_email_sent_at: new Date().toISOString(),
  });

  if (process.env.RESEND_API_KEY && user.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "hello@untilfire.com",
      to: user.email,
      subject: "Welcome to UntilFire 🔥",
      html: welcomeHtml(user.email),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
