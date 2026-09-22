-- 0041_contribution_plan.sql
-- Persistence for the Next contribution tab, which until now kept everything
-- in localStorage — per-browser, and gone the moment site data is cleared.
--
-- Two halves, stored two ways, because they are two different kinds of thing.
--
-- The plan itself — target allocation, what you hold, budget, frequency — is
-- exactly one per user and is a preference rather than a record. That is the
-- same shape as dashboard_layout in 0037, and it goes the same way: a JSONB
-- column on profiles, where the row already exists and the RLS is already
-- correct. A separate table would need its own policies for no gain, and the
-- three tables the design doc originally sketched would need three.
--
-- NULL means "never set up", which is deliberately different from an empty
-- plan. A user who deletes every asset has an empty targets array and should
-- keep it; a user who has never opened the tab gets the worked example.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contribution_plan JSONB;

COMMENT ON COLUMN profiles.contribution_plan IS
  'Next contribution plan: {"targets":[{"symbol","targetPct","bandOverride"}],"holdings":[{"symbol","value"}],"budget","frequency"}. NULL = never set up, show the worked example. targetPct is a fraction, not a percentage.';

-- The monthly snapshot is the other half: many rows per user, a record of what
-- was true at a point in time, and the only thing that can answer "has my
-- drift been getting worse?". Holdings are priced live and never stored
-- elsewhere, so a month not captured here cannot be reconstructed later.
CREATE TABLE IF NOT EXISTS contribution_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Always the first of the month. The unique constraint below is what makes
  -- a re-visit update the month rather than add a second row for it.
  month       DATE NOT NULL,
  total_value NUMERIC NOT NULL,
  budget      NUMERIC NOT NULL,
  frequency   TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'weekly', 'daily')),
  -- [{symbol, value, targetPct, currentPct, deviation, allocated, status}]
  assets      JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS contribution_snapshots_user_month_idx
  ON contribution_snapshots(user_id, month DESC);

ALTER TABLE contribution_snapshots ENABLE ROW LEVEL SECURITY;

-- Single owner-only FOR ALL policy, matching expected_payments and goals.
-- Safe here for the same reason: nothing on this table is shared with a
-- household peer, so there is no read path that needs splitting out.
DROP POLICY IF EXISTS "users can manage own contribution snapshots" ON contribution_snapshots;
CREATE POLICY "users can manage own contribution snapshots" ON contribution_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_contribution_snapshots_updated_at ON contribution_snapshots;
CREATE TRIGGER update_contribution_snapshots_updated_at
  BEFORE UPDATE ON contribution_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
