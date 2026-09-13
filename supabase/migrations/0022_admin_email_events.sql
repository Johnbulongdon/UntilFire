-- 0022_admin_email_events.sql
-- Delivery/open/click events for admin broadcasts, so the rates can be read
-- in the admin page instead of in Resend's dashboard.
--
-- One row per (send, recipient, event type) rather than one per raw webhook:
-- a reader who opens the same email five times is one person who opened it,
-- and an open rate built from raw events would count them five times.
-- `occurrences` keeps the repeat count for anyone who wants it.
--
-- Opens are measured with a tracking pixel, so they undercount every reader
-- whose client blocks images — which is most of Gmail by default. Treat the
-- open rate as a floor, and the click rate as the number that means something.

CREATE TABLE IF NOT EXISTS admin_email_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id     UUID        REFERENCES admin_email_sends(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  event       TEXT        NOT NULL CHECK (event IN (
                            'sent', 'delivered', 'opened', 'clicked',
                            'bounced', 'complained', 'delivery_delayed'
                          )),
  link        TEXT,
  occurrences INTEGER     NOT NULL DEFAULT 1,
  first_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  last_at     TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- The webhook can redeliver, and Resend retries on non-2xx. Upserting on this
-- key makes the handler idempotent rather than double-counting on a retry.
CREATE UNIQUE INDEX IF NOT EXISTS admin_email_events_unique
  ON admin_email_events(send_id, email, event);

CREATE INDEX IF NOT EXISTS admin_email_events_send_idx
  ON admin_email_events(send_id);

ALTER TABLE admin_email_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON admin_email_events TO service_role;
