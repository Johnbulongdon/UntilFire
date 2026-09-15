import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Resend } from "resend";
import {
  buildDay1Email,
  buildDay3Email,
  buildRetentionEmail,
  type NudgeAsk,
} from "@/lib/email-html";
import { makeUnsubscribeToken } from "@/lib/unsubscribe-token";
import {
  JOBS,
  LIFECYCLE_EVENTS,
  type LifecycleEvent,
  finishJobRun,
  recordEvent,
  startJobRun,
} from "@/lib/lifecycle";

const SITE = "https://www.untilfire.com";
const DAY = 24 * 60 * 60 * 1000;

/**
 * The onboarding sequence, run once a day.
 *
 * Two rules that keep it from becoming spam:
 *
 *  1. One email per person per run, the latest stage they are due. Otherwise
 *     someone the job had not reached yet gets day 1, day 3 and day 7 in three
 *     consecutive minutes, which reads as a malfunction because it is one.
 *
 *  2. A nudge is only sent when there is something left to ask for. Day 1 and
 *     day 3 ask for the earliest step the reader has not cleared — real
 *     numbers, then a connected account — and send nothing at all once both
 *     are done.
 */

type StageKey = "day1" | "day3" | "day7";

interface Stage {
  key: StageKey;
  column: "day1_email_sent_at" | "day3_email_sent_at" | "day7_email_sent_at";
  event: LifecycleEvent;
  /** Days after signup this becomes due. */
  dueAfter: number;
  /**
   * How long after becoming due it is still worth sending, in days.
   *
   * Day 1 and day 3 are time-specific — mailing "day one" to someone who
   * signed up three months ago is absurd, so they expire. Day 7 is the
   * "you have gone quiet" note, which reads the same at any age, and it stays
   * open deliberately: the users stranded while this cron was broken are
   * reachable precisely because it has no ceiling.
   */
  expiresAfter: number | null;
  /** Day 7 is only for people who drifted off. The nudges are not. */
  requiresInactive: boolean;
}

const STAGES: Stage[] = [
  { key: "day1", column: "day1_email_sent_at", event: LIFECYCLE_EVENTS.DAY1_EMAIL, dueAfter: 1, expiresAfter: 4, requiresInactive: false },
  { key: "day3", column: "day3_email_sent_at", event: LIFECYCLE_EVENTS.DAY3_EMAIL, dueAfter: 3, expiresAfter: 5, requiresInactive: false },
  { key: "day7", column: "day7_email_sent_at", event: LIFECYCLE_EVENTS.DAY7_EMAIL, dueAfter: 7, expiresAfter: null, requiresInactive: true },
];

const SUBJECTS: Record<StageKey, Record<NudgeAsk | "none", string>> = {
  day1: {
    numbers: "Two numbers, and your freedom date stops being a guess",
    bank: "Typed numbers go stale. Connected ones don't.",
    none: "",
  },
  day3: {
    numbers: "The dread is usually worse than the number",
    bank: "The bit that makes it stick",
    none: "",
  },
  day7: {
    numbers: "Your path to financial freedom is waiting",
    bank: "Your path to financial freedom is waiting",
    none: "Your path to financial freedom is waiting",
  },
};

// Called daily by Vercel Cron (Authorization: Bearer <CRON_SECRET>).
//
// Vercel Cron issues a GET. This route used to export POST only, so every
// scheduled run since the cron was added answered 405 and nothing was ever
// sent. POST stays as an alias so the job can be triggered by hand without
// waiting for 10:00 UTC.
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
    return await sendSequence(admin, resend, runId);
  } catch (err) {
    await finishJobRun(admin, runId, {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function sendSequence(
  admin: ReturnType<typeof adminClient>,
  resend: Resend,
  runId: string | null,
): Promise<NextResponse> {
  const now = Date.now();

  // Anyone who has had the welcome and has not opted out is a candidate; which
  // stage they are due is decided per user below.
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, day1_email_sent_at, day3_email_sent_at, day7_email_sent_at")
    .not("welcome_email_sent_at", "is", null)
    .is("marketing_unsubscribed_at", null);

  if (!profiles?.length) {
    await finishJobRun(admin, runId, { status: "ok", considered: 0, acted: 0 });
    return NextResponse.json({ sent: 0 });
  }

  // What each candidate has actually done, so a nudge can ask for the right
  // thing — or not be sent at all.
  const { data: events } = await admin
    .from("lifecycle_events")
    .select("user_id, event")
    .in("user_id", profiles.map((p) => p.user_id));

  const done = new Map<string, Set<string>>();
  for (const e of events ?? []) {
    if (!done.has(e.user_id)) done.set(e.user_id, new Set());
    done.get(e.user_id)!.add(e.event);
  }

  let considered = 0;
  let sent = 0;

  for (const profile of profiles) {
    const { data: { user } } = await admin.auth.admin.getUserById(profile.user_id);
    if (!user?.email) continue;

    const ageDays = Math.floor((now - new Date(user.created_at).getTime()) / DAY);
    const idleDays = Math.floor((now - new Date(user.last_sign_in_at ?? user.created_at).getTime()) / DAY);
    const theirs = done.get(user.id) ?? new Set<string>();

    // What is this person missing? The earliest gap is what we ask for.
    const ask: NudgeAsk | "none" = !theirs.has(LIFECYCLE_EVENTS.ACTIVATED)
      ? "numbers"
      : !theirs.has(LIFECYCLE_EVENTS.BANK_CONNECTED)
        ? "bank"
        : "none";

    // Latest due stage first — one email, not a backlog delivered at once.
    const stage = [...STAGES].reverse().find((st) => {
      if (profile[st.column]) return false;
      if (ageDays < st.dueAfter) return false;
      if (st.expiresAfter !== null && ageDays > st.dueAfter + st.expiresAfter) return false;
      if (st.requiresInactive && idleDays < 5) return false;
      // Nothing left to ask for means nothing to say. Day 7 is exempt: it is
      // about absence, not about an unfinished step.
      if (st.key !== "day7" && ask === "none") return false;
      return true;
    });

    if (!stage) continue;
    considered++;

    const unsubscribeUrl = `${SITE}/unsubscribe?u=${user.id}&t=${makeUnsubscribeToken(user.id)}`;
    const html =
      stage.key === "day1"
        ? buildDay1Email(ask as NudgeAsk, unsubscribeUrl)
        : stage.key === "day3"
          ? buildDay3Email(ask as NudgeAsk, unsubscribeUrl)
          : buildRetentionEmail(unsubscribeUrl);

    try {
      const { error } = await resend.emails.send({
        from: "UntilFire <hello@untilfire.com>",
        to: user.email,
        subject: SUBJECTS[stage.key][ask],
        html,
      });
      if (error) {
        console.error(`[sequence] Resend error for ${user.id} at ${stage.key}:`, error);
        continue;
      }
      await admin
        .from("profiles")
        .upsert({ user_id: user.id, [stage.column]: new Date().toISOString() }, { onConflict: "user_id" });
      await recordEvent(admin, user.id, stage.event);
      sent++;
    } catch (err) {
      console.error(`[sequence] threw for ${user.id} at ${stage.key}:`, err);
    }
  }

  await finishJobRun(admin, runId, { status: "ok", considered, acted: sent });
  return NextResponse.json({ sent, considered });
}
