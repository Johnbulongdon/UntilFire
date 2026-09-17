-- 0032_email_campaigns.sql
--
-- Let automated email be attributed, not just admin broadcasts.
--
-- The Resend webhook identifies an email by a broadcast_id tag and drops
-- anything without one:
--
--   if (!sendId) return NextResponse.json({ ok: true, ignored: "untagged" });
--
-- Only the admin broadcast path set that tag, so every delivery, open and
-- click from the welcome email, the day 1/3/7 sequence, the waitlist result
-- and the trial reminder arrived and was binned. Six retention emails went out
-- on 16 Sep and produced no record that they had ever existed.
--
-- Automated sends have no admin behind them, which is why they had nowhere to
-- be recorded: sent_by was NOT NULL. It is now nullable, and a send row can
-- describe a campaign rather than a one-off broadcast.

ALTER TABLE admin_email_sends ALTER COLUMN sent_by DROP NOT NULL;

-- 'broadcast' is a human pressing send; 'campaign' is the product sending on
-- its own. Defaulted so existing rows keep their meaning.
ALTER TABLE admin_email_sends ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'broadcast';
ALTER TABLE admin_email_sends ADD COLUMN IF NOT EXISTS campaign TEXT;

-- One row per campaign per UTC day, so the five day-7 emails sent in one cron
-- run group into a single send with an open rate, exactly like a broadcast.
CREATE UNIQUE INDEX IF NOT EXISTS admin_email_sends_campaign_day
  ON admin_email_sends (campaign, ((created_at AT TIME ZONE 'utc')::date))
  WHERE campaign IS NOT NULL;

COMMENT ON COLUMN admin_email_sends.campaign IS
  'Stable key for an automated send (lifecycle_day7, waitlist_result, …). Null for admin broadcasts.';
