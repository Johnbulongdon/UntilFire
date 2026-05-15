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

type EmailDay = 1 | 3 | 7;

const SUBJECTS: Record<EmailDay, string> = {
  1: "Your FIRE number is waiting",
  3: "Did you know UntilFire covers your city?",
  7: "One week in — how's it going?",
};

function day1Html(email: string) {
  const name = email.split("@")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#064E3B;padding:28px 36px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">UntilFire 🔥</p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#19181E;letter-spacing:-0.5px;">Have you set up your FIRE plan yet?</h1>
          <p style="margin:0 0 20px;font-size:16px;color:#4B5563;line-height:1.6;">
            Hey ${name}, you signed up yesterday — nice move. Your FIRE number is waiting to be calculated.
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
            <strong style="color:#19181E;">Quick tip:</strong> Your savings rate is the single biggest lever for reaching financial independence. Even moving from 15% to 25% can shave <em>years</em> off your timeline.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#4B5563;line-height:1.6;">
            Log your first income and expense in the Cash Flow tab — it takes under 2 minutes.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="border-radius:8px;background:#22d3a5;">
              <a href="https://untilfire.com/dashboard?tab=cashflow" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#064E3B;text-decoration:none;">Log my first transaction →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
            Or jump straight to the <a href="https://untilfire.com/dashboard?tab=fire-calculator" style="color:#059669;font-weight:600;">FIRE Calculator</a> to see your personalised timeline.
          </p>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#f8fafc;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">You're receiving this from <a href="https://untilfire.com" style="color:#059669;">untilfire.com</a>. Reply to unsubscribe.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function day3Html(email: string) {
  const name = email.split("@")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#064E3B;padding:28px 36px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">UntilFire 🔥</p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#19181E;letter-spacing:-0.5px;">A feature you might have missed</h1>
          <p style="margin:0 0 20px;font-size:16px;color:#4B5563;line-height:1.6;">
            Hey ${name}, did you know UntilFire has personalised FIRE timelines for <strong>97 US cities</strong>?
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
            Every city has different costs of living and state tax rules — which means your path to FIRE looks completely different in Austin vs San Francisco vs Miami. We've crunched the numbers for all of them.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#4B5563;line-height:1.6;">
            You'll also find articles, calculators, and guides inside the <strong>Learning Hub</strong> tab in your dashboard — everything from Coast FIRE to compound interest explained simply.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="border-radius:8px;background:#22d3a5;">
              <a href="https://untilfire.com/fire-number" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#064E3B;text-decoration:none;">Explore city FIRE data →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#6B7280;">
            Or go to <a href="https://untilfire.com/dashboard?tab=learning-hub" style="color:#059669;font-weight:600;">Learning Hub</a> inside your dashboard.
          </p>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#f8fafc;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">You're receiving this from <a href="https://untilfire.com" style="color:#059669;">untilfire.com</a>. Reply to unsubscribe.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function day7Html(email: string) {
  const name = email.split("@")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#064E3B;padding:28px 36px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">UntilFire 🔥</p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#19181E;letter-spacing:-0.5px;">One week in — how's it going?</h1>
          <p style="margin:0 0 20px;font-size:16px;color:#4B5563;line-height:1.6;">
            Hey ${name}, it's been a week since you joined UntilFire. Building any habit takes consistency — logging your expenses even once a week puts you miles ahead of most people.
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
            <strong style="color:#19181E;">Savings rate reminder:</strong> If you're saving 20% of your income, you're on track to retire in roughly 37 years. Bump it to 50% and that drops to just 17 years. Every percentage point matters.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#4B5563;line-height:1.6;">
            We'd love to know how you're finding UntilFire so far. Hit the <strong>Feedback</strong> button inside the dashboard — we read every message.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="border-radius:8px;background:#22d3a5;">
              <a href="https://untilfire.com/dashboard" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#064E3B;text-decoration:none;">Go to my dashboard →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#f8fafc;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">You're receiving this from <a href="https://untilfire.com" style="color:#059669;">untilfire.com</a>. Reply to unsubscribe.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const EMAIL_HTML: Record<EmailDay, (email: string) => string> = {
  1: day1Html,
  3: day3Html,
  7: day7Html,
};

const COLUMN_MAP: Record<EmailDay, string> = {
  1: "day1_email_sent_at",
  3: "day3_email_sent_at",
  7: "day7_email_sent_at",
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "no RESEND_API_KEY" });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();
  const results: Record<string, number> = {};

  for (const day of [1, 3, 7] as EmailDay[]) {
    const col = COLUMN_MAP[day];
    const windowStart = new Date(now.getTime() - (day + 1) * 86400_000).toISOString();
    const windowEnd = new Date(now.getTime() - day * 86400_000).toISOString();

    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .is(col, null)
      .gte("created_at", windowStart)
      .lt("created_at", windowEnd);

    if (!profiles?.length) {
      results[`day${day}`] = 0;
      continue;
    }

    let sent = 0;
    for (const profile of profiles) {
      const { data: userData } = await admin.auth.admin.getUserById(profile.id);
      const email = userData?.user?.email;
      if (!email) continue;

      await resend.emails.send({
        from: "hello@untilfire.com",
        to: email,
        subject: SUBJECTS[day],
        html: EMAIL_HTML[day](email),
      }).catch(() => {});

      await admin
        .from("profiles")
        .update({ [col]: now.toISOString() })
        .eq("id", profile.id);

      sent++;
    }
    results[`day${day}`] = sent;
  }

  return NextResponse.json({ success: true, sent: results });
}
