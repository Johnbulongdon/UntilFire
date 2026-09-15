import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Resend } from "resend";
import { buildRetentionEmail } from "@/lib/email-html";
import { makeUnsubscribeToken } from "@/lib/unsubscribe-token";
import { JOBS, LIFECYCLE_EVENTS, finishJobRun, recordEvent, startJobRun } from "@/lib/lifecycle";

const SITE = "https://www.untilfire.com";

// Called daily by Vercel Cron (Authorization: Bearer <CRON_SECRET>).
//
// Vercel Cron issues a GET. This route used to export POST only, so every
// scheduled run since the cron was added answered 405 and no retention email
// has ever been sent. POST stays as an alias so the job can be triggered by
// hand without waiting for 10:00 UTC.
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 });
  }

  // Without this we cannot mint an unsubscribe link, and an email nobody can
  // opt out of is worse than an email not sent.
  if (!process.env.UNSUBSCRIBE_SECRET) {
    return NextResponse.json({ error: "UNSUBSCRIBE_SECRET not set" }, { status: 503 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Opened before any work so that a crash mid-run leaves a 'running' row.
  // A job that dies silently is the failure mode this whole table exists for.
  const runId = await startJobRun(admin, JOBS.RETENTION_EMAIL);

  try {
    return await sendDay7(admin, resend, runId);
  } catch (err) {
    await finishJobRun(admin, runId, {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function sendDay7(
  admin: ReturnType<typeof adminClient>,
  resend: Resend,
  runId: string | null,
): Promise<NextResponse> {

  // Find users who signed up 7+ days ago, got a welcome email, but haven't
  // received a day-7 retention email yet.
  // We use auth.admin.listUsers() since we can't JOIN auth.users directly.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch profiles needing day-7 email
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id")
    .not("welcome_email_sent_at", "is", null)
    .is("day7_email_sent_at", null)
    .is("marketing_unsubscribed_at", null);

  if (!profiles?.length) {
    await finishJobRun(admin, runId, { status: "ok", considered: 0, acted: 0 });
    return NextResponse.json({ sent: 0 });
  }

  const userIds = profiles.map((p) => p.user_id);

  // Pull auth user records for those IDs to check sign-up date and last sign-in
  const results = await Promise.all(
    userIds.map((id) => admin.auth.admin.getUserById(id))
  );

  const eligible = results
    .filter(({ data: { user } }) => {
      if (!user?.email) return false;
      const created = user.created_at;
      const lastSeen = user.last_sign_in_at ?? created;
      // Signed up 7+ days ago AND not active in the last 5 days. There used to
      // be a 14-day ceiling here, which meant anyone who passed day 14 while
      // the cron was broken could never be reached. day7_email_sent_at is what
      // stops a second send, so the ceiling bought nothing.
      return created <= sevenDaysAgo && lastSeen <= fiveDaysAgo;
    })
    .map(({ data: { user } }) => user!);

  let sent = 0;
  for (const user of eligible) {
    try {
      const { error } = await resend.emails.send({
        from: "UntilFire <hello@untilfire.com>",
        to: user.email!,
        subject: "Your path to financial freedom is waiting",
        html: buildRetentionEmail(`${SITE}/unsubscribe?u=${user.id}&t=${makeUnsubscribeToken(user.id)}`),
      });
      if (error) {
        console.error(`[retention] Resend error for ${user.id}:`, error);
        continue;
      }
      await admin
        .from("profiles")
        .upsert({ user_id: user.id, day7_email_sent_at: new Date().toISOString() }, { onConflict: "user_id" });
      await recordEvent(admin, user.id, LIFECYCLE_EVENTS.DAY7_EMAIL);
      sent++;
    } catch (err) {
      console.error(`[retention] threw for ${user.id}:`, err);
    }
  }

  await finishJobRun(admin, runId, {
    status: "ok",
    considered: eligible.length,
    acted: sent,
  });

  return NextResponse.json({ sent, eligible: eligible.length });
}
