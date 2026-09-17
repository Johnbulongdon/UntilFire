import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildWelcomeEmail, buildRetentionEmail } from "@/lib/email-html";
import { adminClient } from "@/lib/supabase-admin";
import { CAMPAIGNS, sendTagged } from "@/lib/email-send";

const SITE = "https://www.untilfire.com";

// GET /api/email/preview?type=welcome|retention&to=email&secret=CRON_SECRET
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const type = searchParams.get("type") ?? "welcome";
  const to = searchParams.get("to") ?? "hello@untilfire.com";

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const admin = adminClient();
  const isRetention = type === "retention";

  const { error } = await sendTagged(resend, admin, {
    campaign: CAMPAIGNS.PREVIEW,
    label: `Preview \u2014 ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    from: "UntilFire <hello@untilfire.com>",
    to,
    subject: isRetention
      ? "Your path to financial freedom is waiting"
      : "Welcome to UntilFire — your path to financial freedom starts here",
    // A preview goes to the sender, so the link only has to render, not resolve.
    html: isRetention ? buildRetentionEmail(`${SITE}/unsubscribe?preview=1`) : buildWelcomeEmail(),
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ sent: true, type, to });
}
