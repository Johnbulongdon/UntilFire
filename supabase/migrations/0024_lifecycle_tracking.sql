-- 0024_lifecycle_tracking.sql
--
-- Two tables that exist because the day-7 retention cron failed silently for
-- its entire life and nothing in the system could have told us.
--
-- Why not just more columns on `profiles`? Because a column records that
-- something happened. It cannot record that something was supposed to happen
-- and didn't, it has no room for ordering or time-between-steps, and every new
-- lifecycle step costs a migration and a rewrite of anything that reads it.
--
-- The split of responsibility, which matters and should not drift:
--   * profiles.*_email_sent_at stays the IDEMPOTENCY GUARD. It answers
--     "have we already sent this to them" before a send. It is load-bearing.
--   * lifecycle_events is the ANALYSIS RECORD. It answers "what happened, to
--     whom, in what order". Nothing gates a send on it.

-- ─── Job runs ────────────────────────────────────────────────────────────────
-- One row per execution of a scheduled job. The point is the absence: a job
-- that stops running leaves a visibly stale last-run instead of nothing at all,
-- which is the difference between "working" and "we have never checked".

CREATE TABLE IF NOT EXISTS job_runs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job         TEXT        NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  finished_at TIMESTAMPTZ,
  -- 'running' is written first so a job that crashes mid-flight is
  -- distinguishable from one that never started.
  status      TEXT        NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running', 'ok', 'error')),
  considered  INTEGER     NOT NULL DEFAULT 0,
  acted       INTEGER     NOT NULL DEFAULT 0,
  error       TEXT
);

CREATE INDEX IF NOT EXISTS job_runs_job_started_idx
  ON job_runs(job, started_at DESC);

ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON job_runs TO service_role;

-- ─── Lifecycle events ────────────────────────────────────────────────────────
-- Append-only. Every funnel view — per-user journey, step conversion, cohorts
-- by signup week — is a query over this, so adding a step later is a new string
-- rather than a new column.

CREATE TABLE IF NOT EXISTS lifecycle_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  event       TEXT        NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  metadata    JSONB
);

-- Every milestone here is once-per-user by definition: you sign up once, you
-- connect a first bank once, you receive the day-3 email once. Writers use
-- ON CONFLICT DO NOTHING, so the FIRST occurrence wins and a retried job is
-- harmless. Anything genuinely repeatable does not belong in this table.
CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_events_once
  ON lifecycle_events(user_id, event);

CREATE INDEX IF NOT EXISTS lifecycle_events_event_idx
  ON lifecycle_events(event, occurred_at DESC);

ALTER TABLE lifecycle_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON lifecycle_events TO service_role;

-- ─── Backfill ────────────────────────────────────────────────────────────────
-- The history already exists, scattered across four tables. Import it so the
-- funnel is not blank on day one and today's numbers are comparable to
-- tomorrow's. Timestamps are the real ones wherever a real one was recorded.

INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT id, 'signed_up', created_at FROM auth.users
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT user_id, 'welcome_email', welcome_email_sent_at
FROM profiles WHERE welcome_email_sent_at IS NOT NULL
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT user_id, 'day1_email', day1_email_sent_at
FROM profiles WHERE day1_email_sent_at IS NOT NULL
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT user_id, 'day3_email', day3_email_sent_at
FROM profiles WHERE day3_email_sent_at IS NOT NULL
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT user_id, 'day7_email', day7_email_sent_at
FROM profiles WHERE day7_email_sent_at IS NOT NULL
ON CONFLICT (user_id, event) DO NOTHING;

-- Activation is "they put something real in", whichever surface they used
-- first. user_budget and net_worth_snapshots are the two that most users touch.
INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT user_id, 'activated', MIN(at) FROM (
  SELECT user_id, updated_at  AS at FROM user_budget
  UNION ALL
  SELECT user_id, captured_at AS at FROM net_worth_snapshots
) s
WHERE at IS NOT NULL
GROUP BY user_id
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT user_id, 'bank_connected', MIN(created_at)
FROM plaid_items GROUP BY user_id
ON CONFLICT (user_id, event) DO NOTHING;

-- subscriptions has no created_at, only updated_at, so this backfilled
-- timestamp is an upper bound rather than the moment they subscribed. Every
-- subscription from here is recorded by the Stripe webhook at the real time.
INSERT INTO lifecycle_events (user_id, event, occurred_at)
SELECT user_id, 'subscribed', updated_at
FROM subscriptions WHERE status IN ('active', 'trialing')
ON CONFLICT (user_id, event) DO NOTHING;
