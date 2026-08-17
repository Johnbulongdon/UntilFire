-- 0017_admin_email.sql
-- Backs the admin page (docs/design/admin-page.md): a marketing-email
-- opt-out flag on profiles, and an audit log of admin-composed broadcast
-- sends.
--
-- No RLS read/write is granted to `authenticated` on admin_email_sends —
-- the admin page never queries Supabase directly. It goes through
-- /api/admin/* routes using the service-role client, and the actual admin
-- allowlist check (ADMIN_EMAILS env var) lives in lib/admin-auth.ts, not
-- in the database. RLS here is enabled with zero policies for
-- `authenticated`, which is a default-deny — only service_role can touch it.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at TIMESTAMPTZ DEFAULT NULL;

CREATE TABLE IF NOT EXISTS admin_email_sends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject     TEXT NOT NULL,
  segment     TEXT NOT NULL CHECK (segment IN ('all', 'free', 'pro')),
  recipients  INTEGER NOT NULL DEFAULT 0,
  sent_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE admin_email_sends ENABLE ROW LEVEL SECURITY;
GRANT ALL ON admin_email_sends TO service_role;
