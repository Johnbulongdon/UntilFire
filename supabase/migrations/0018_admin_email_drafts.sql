-- 0018_admin_email_drafts.sql
-- Drafts for the admin email composer (docs/design/admin-page.md). A draft
-- doubles as a reusable template: load one, edit this month's content, and
-- either overwrite it or "save as new" to keep the original as a base for
-- next time. `content` is JSONB because the two template shapes differ
-- (a freeform announcement vs. a structured monthly-update with New/Fixed
-- item lists) — same pattern already used for variable-shape data elsewhere
-- in this schema (scenario_assumptions.budget_categories, user_budget.expenses).

CREATE TABLE IF NOT EXISTS admin_email_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Untitled draft',
  template    TEXT NOT NULL DEFAULT 'announcement' CHECK (template IN ('announcement', 'monthly_update')),
  segment     TEXT NOT NULL DEFAULT 'all' CHECK (segment IN ('all', 'free', 'pro')),
  subject     TEXT NOT NULL DEFAULT '',
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS admin_email_drafts_updated_at_idx ON admin_email_drafts(updated_at DESC);

ALTER TABLE admin_email_drafts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON admin_email_drafts TO service_role;

DROP TRIGGER IF EXISTS update_admin_email_drafts_updated_at ON admin_email_drafts;
CREATE TRIGGER update_admin_email_drafts_updated_at
  BEFORE UPDATE ON admin_email_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
