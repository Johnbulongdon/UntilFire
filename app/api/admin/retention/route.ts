import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  EMAIL_STEPS,
  FUNNEL_STEPS,
  JOB_EXPECTED_INTERVAL_HOURS,
  JOBS,
  LIFECYCLE_EVENTS,
} from "@/lib/lifecycle";

/**
 * Everything the Retention tab shows, in one request.
 *
 * Three questions, deliberately in this order:
 *   1. Are the jobs running?   — the one that was unanswerable before
 *   2. Where do people stop?   — the funnel
 *   3. What happened to X?     — the per-user rows
 *
 * All of it is derived from lifecycle_events, so adding a funnel step is an
 * entry in FUNNEL_STEPS plus something that writes the event. No SQL here
 * changes, and neither does the UI.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

type EventRow = { user_id: string; event: string; occurred_at: string };

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const [
    { data: usersPage, error: usersErr },
    { data: events },
    { data: runs },
    { data: profiles },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("lifecycle_events").select("user_id, event, occurred_at"),
    admin.from("job_runs").select("*").order("started_at", { ascending: false }).limit(50),
    admin.from("profiles").select("user_id, display_name, marketing_unsubscribed_at"),
  ]);

  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  // user -> event -> when
  const byUser = new Map<string, Map<string, string>>();
  for (const e of (events ?? []) as EventRow[]) {
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, new Map());
    byUser.get(e.user_id)!.set(e.event, e.occurred_at);
  }

  const now = Date.now();

  const users = usersPage.users
    .map((u) => {
      const ev = byUser.get(u.id) ?? new Map<string, string>();
      const profile = profileByUser.get(u.id);
      const createdAt = u.created_at;
      const ageDays = Math.floor((now - new Date(createdAt).getTime()) / DAY_MS);

      // An email is only "missing" once it was actually due. Before that it is
      // pending, and calling it a gap would make every new signup look broken.
      const emails = EMAIL_STEPS.map((step) => {
        const sentAt = ev.get(step.event) ?? null;
        return {
          event: step.event,
          label: step.label,
          sentAt,
          state: sentAt ? "sent" : ageDays >= step.dayOffset ? "missed" : "pending",
        };
      });

      return {
        id: u.id,
        email: u.email ?? "",
        displayName: profile?.display_name ?? null,
        createdAt,
        ageDays,
        lastSignInAt: u.last_sign_in_at ?? null,
        // Did they ever come back after the session that created the account?
        returned:
          !!u.last_sign_in_at &&
          new Date(u.last_sign_in_at).getTime() - new Date(createdAt).getTime() > 60 * 1000,
        unsubscribed: !!profile?.marketing_unsubscribed_at,
        emails,
        activatedAt: ev.get(LIFECYCLE_EVENTS.ACTIVATED) ?? null,
        bankConnectedAt: ev.get(LIFECYCLE_EVENTS.BANK_CONNECTED) ?? null,
        subscribedAt: ev.get(LIFECYCLE_EVENTS.SUBSCRIBED) ?? null,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ── Funnel ────────────────────────────────────────────────────────────────
  // Counted against the previous step, not against the top, so a row reads
  // "of the people who got here, this many went on" — which is the number that
  // tells you where to work.
  const total = users.length;

  /**
   * Did this user clear every step up to and including `upTo`?
   *
   * Counting each step independently is the obvious mistake: activation does
   * not require a bank, so an independent count can put more people at a later
   * step than an earlier one and report conversion above 100%. A funnel step
   * only means something as "reached here, having reached everything before".
   */
  const reachedThrough = (userId: string, upTo: number) =>
    FUNNEL_STEPS.slice(0, upTo + 1).every(
      (s) => s.event === LIFECYCLE_EVENTS.SIGNED_UP || byUser.get(userId)?.has(s.event),
    );

  let previous = total;
  const funnel = FUNNEL_STEPS.map((step, i) => {
    const count = users.filter((u) => reachedThrough(u.id, i)).length;
    const fromPrevious = previous > 0 ? Math.round((count / previous) * 100) : 0;
    const fromTop = total > 0 ? Math.round((count / total) * 100) : 0;
    previous = count;
    return { ...step, count, fromPrevious: i === 0 ? 100 : fromPrevious, fromTop };
  });

  // ── Cohorts by signup week ────────────────────────────────────────────────
  // Useless at 13 users and the reason nothing needs rebuilding at 1,300.
  const cohortMap = new Map<string, { users: string[] }>();
  for (const u of users) {
    const d = new Date(u.createdAt);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    if (!cohortMap.has(key)) cohortMap.set(key, { users: [] });
    cohortMap.get(key)!.users.push(u.id);
  }
  const cohorts = [...cohortMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .map(([week, { users: ids }]) => ({
      week,
      size: ids.length,
      // Same nesting as the funnel above, so the two views cannot disagree.
      steps: FUNNEL_STEPS.map((step, i) => ({
        event: step.event,
        count: ids.filter((id) => reachedThrough(id, i)).length,
      })),
    }));

  // ── Job health ────────────────────────────────────────────────────────────
  // The verdict, not just the log. "never" is its own state and is the one
  // this whole tab was built to surface.
  const jobs = Object.values(JOBS).map((job) => {
    const jobRuns = (runs ?? []).filter((r) => r.job === job);
    const lastOk = jobRuns.find((r) => r.status === "ok");
    const expectedHours = JOB_EXPECTED_INTERVAL_HOURS[job] ?? 24;
    // One interval of slack, so a job that runs daily is not "late" the minute
    // it passes 24h — cron drift alone would make that flap.
    const staleAfter = expectedHours * 2 * 60 * 60 * 1000;
    const health = !lastOk
      ? "never"
      : now - new Date(lastOk.started_at).getTime() > staleAfter
        ? "stale"
        : jobRuns[0]?.status === "error"
          ? "failing"
          : "ok";

    return {
      job,
      health,
      expectedHours,
      lastRunAt: jobRuns[0]?.started_at ?? null,
      lastOkAt: lastOk?.started_at ?? null,
      runs: jobRuns.slice(0, 10),
    };
  });

  return NextResponse.json({ total, funnel, cohorts, jobs, users });
}
