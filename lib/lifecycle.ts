import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lifecycle instrumentation — the funnel's vocabulary, and the two writes
 * that keep a scheduled job from failing where nobody can see it.
 *
 * Schema and the reasoning behind it: supabase/migrations/0024_lifecycle_tracking.sql
 *
 * The rule worth keeping: recording an event NEVER decides anything. A failed
 * write here must not stop an email going out or a subscription activating, so
 * every function below swallows its own errors. Analysis is allowed to be
 * lossy; the product is not allowed to break because analysis was.
 */

type Admin = SupabaseClient<any, any, any>;

export const LIFECYCLE_EVENTS = {
  SIGNED_UP: "signed_up",
  WELCOME_EMAIL: "welcome_email",
  ACTIVATED: "activated",
  DAY1_EMAIL: "day1_email",
  DAY3_EMAIL: "day3_email",
  DAY7_EMAIL: "day7_email",
  BANK_CONNECTED: "bank_connected",
  SUBSCRIBED: "subscribed",
} as const;

export type LifecycleEvent = (typeof LIFECYCLE_EVENTS)[keyof typeof LIFECYCLE_EVENTS];

/**
 * The funnel, in order. This array is the single definition of what the steps
 * are and what they're called — the admin page renders from it, so a new step
 * is one entry here plus a writer, never a schema change.
 *
 * `drop` marks the steps where losing people is the actual problem, so the
 * admin view can point at them rather than making every row look equal.
 */
export const FUNNEL_STEPS: { event: LifecycleEvent; label: string; drop?: boolean }[] = [
  { event: LIFECYCLE_EVENTS.SIGNED_UP, label: "Signed up" },
  { event: LIFECYCLE_EVENTS.ACTIVATED, label: "Put in real numbers", drop: true },
  { event: LIFECYCLE_EVENTS.BANK_CONNECTED, label: "Connected a bank", drop: true },
  { event: LIFECYCLE_EVENTS.SUBSCRIBED, label: "Subscribed" },
];

// The welcome email is deliberately not a funnel step. It is something we do
// to the user, not something the user did, and mixing the two is how a step
// ends up converting at more than 100% of the one above it.

/** The onboarding sequence, separately, because it is a schedule not a funnel. */
export const EMAIL_STEPS: { event: LifecycleEvent; label: string; dayOffset: number }[] = [
  { event: LIFECYCLE_EVENTS.WELCOME_EMAIL, label: "Welcome", dayOffset: 0 },
  { event: LIFECYCLE_EVENTS.DAY1_EMAIL, label: "Day 1", dayOffset: 1 },
  { event: LIFECYCLE_EVENTS.DAY3_EMAIL, label: "Day 3", dayOffset: 3 },
  { event: LIFECYCLE_EVENTS.DAY7_EMAIL, label: "Day 7", dayOffset: 7 },
];

export const JOBS = {
  RETENTION_EMAIL: "retention_email",
  BEA_SYNC: "bea_sync",
} as const;

/** How stale a job's last successful run can get before it is a problem. */
export const JOB_EXPECTED_INTERVAL_HOURS: Record<string, number> = {
  [JOBS.RETENTION_EMAIL]: 24,
  // BEA publishes once a year, so this is run by hand. A year of slack keeps
  // it from sitting permanently red between releases.
  [JOBS.BEA_SYNC]: 24 * 365,
};

/**
 * Record that something happened to someone. First occurrence wins — the
 * unique index makes a repeat a no-op rather than a duplicate, so callers can
 * retry freely.
 */
export async function recordEvent(
  admin: Admin,
  userId: string,
  event: LifecycleEvent,
  occurredAt?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await admin
      .from("lifecycle_events")
      .upsert(
        {
          user_id: userId,
          event,
          occurred_at: occurredAt ?? new Date().toISOString(),
          metadata: metadata ?? null,
        },
        { onConflict: "user_id,event", ignoreDuplicates: true },
      );
  } catch (err) {
    console.error(`[lifecycle] failed to record ${event} for ${userId}:`, err);
  }
}

/**
 * Open a job run. Returns the row id, or null if the write failed — callers
 * pass whatever they get straight to finishJobRun, which tolerates null, so a
 * logging failure can never abort the job it was only supposed to watch.
 */
export async function startJobRun(admin: Admin, job: string): Promise<string | null> {
  try {
    const { data, error } = await admin
      .from("job_runs")
      .insert({ job, status: "running" })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    console.error(`[lifecycle] failed to open job run for ${job}:`, err);
    return null;
  }
}

export async function finishJobRun(
  admin: Admin,
  runId: string | null,
  result: { status: "ok" | "error"; considered?: number; acted?: number; error?: string },
): Promise<void> {
  if (!runId) return;
  try {
    await admin
      .from("job_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: result.status,
        considered: result.considered ?? 0,
        acted: result.acted ?? 0,
        // Truncated: a stack trace in a table column helps nobody, and the
        // first line is what says which failure this was.
        error: result.error ? result.error.slice(0, 500) : null,
      })
      .eq("id", runId);
  } catch (err) {
    console.error(`[lifecycle] failed to close job run ${runId}:`, err);
  }
}
