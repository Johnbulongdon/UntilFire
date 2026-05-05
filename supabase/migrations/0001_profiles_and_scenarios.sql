-- 0001_profiles_and_scenarios.sql
-- Forward-only migration. Splits the implicit "user_budget" payload into the
-- three durable shapes the FIRE OS architecture asks for (UNTAAAA-6):
--   profiles               — who the user is (locale + demographics)
--   scenarios              — a named container for one set of assumptions
--   scenario_assumptions   — the tunable inputs the engine consumes
--
-- This migration is additive: existing tables (user_budget, expenses,
-- subscriptions, waitlist) are left untouched. Reads in v1 always go through
-- the user's single default scenario; multi-scenario UI is intentionally
-- out of scope here.

-- ─── Shared helpers ─────────────────────────────────────────────────────────
-- update_updated_at_column() is also defined in supabase-setup.sql, but a
-- database bootstrapped via migrations only (no setup script) won't have it.
-- Keep this idempotent CREATE OR REPLACE here so the trigger creates below
-- never fail against a fresh project. This block matches what was actually
-- applied in production for UNTAAAA-23.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── profiles ───────────────────────────────────────────────────────────────
-- One row per authenticated user. Captures the slow-changing facts about the
-- person rather than their planning assumptions.
CREATE TABLE IF NOT EXISTS profiles (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   TEXT,
  locale_kind    TEXT NOT NULL DEFAULT 'us'
    CHECK (locale_kind IN ('us', 'intl', 'unknown')),
  jurisdiction   TEXT,                      -- city/state key into lib/fire-data
  current_age    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles owner select" ON profiles;
CREATE POLICY "profiles owner select" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles owner insert" ON profiles;
CREATE POLICY "profiles owner insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles owner update" ON profiles;
CREATE POLICY "profiles owner update" ON profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles owner delete" ON profiles;
CREATE POLICY "profiles owner delete" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ─── scenarios ──────────────────────────────────────────────────────────────
-- A scenario is a named container for one set of FIRE assumptions. v1 always
-- reads `is_default = true` for the current user; later releases can light up
-- compare/branch features without reshaping the schema.
CREATE TABLE IF NOT EXISTS scenarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Default',
  is_default  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS scenarios_user_id_idx ON scenarios(user_id);
-- Exactly one default per user. We rely on this in the dashboard read path.
CREATE UNIQUE INDEX IF NOT EXISTS scenarios_one_default_per_user
  ON scenarios(user_id) WHERE is_default;

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scenarios owner select" ON scenarios;
CREATE POLICY "scenarios owner select" ON scenarios
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenarios owner insert" ON scenarios;
CREATE POLICY "scenarios owner insert" ON scenarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenarios owner update" ON scenarios;
CREATE POLICY "scenarios owner update" ON scenarios
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenarios owner delete" ON scenarios;
CREATE POLICY "scenarios owner delete" ON scenarios
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_scenarios_updated_at ON scenarios;
CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON scenarios TO authenticated;
GRANT ALL ON scenarios TO service_role;

-- ─── scenario_assumptions ───────────────────────────────────────────────────
-- The tunable inputs the FIRE engine reads. One row per scenario. The
-- column shape mirrors the legacy user_budget._fire_profile blob plus the
-- budget categories so the dashboard can dual-source during the cutover.
CREATE TABLE IF NOT EXISTS scenario_assumptions (
  scenario_id        UUID PRIMARY KEY REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income     NUMERIC(12,2) NOT NULL DEFAULT 0,
  fire_age           INTEGER       NOT NULL DEFAULT 30,
  k401               NUMERIC(14,2) NOT NULL DEFAULT 0,
  roth_ira           NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable            NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_debt         NUMERIC(14,2) NOT NULL DEFAULT 0,
  mortgage_balance   NUMERIC(14,2) NOT NULL DEFAULT 0,
  mortgage_monthly   NUMERIC(12,2) NOT NULL DEFAULT 0,
  growth_rate        NUMERIC(6,4)  NOT NULL DEFAULT 0.07,
  withdrawal_rate    NUMERIC(6,4)  NOT NULL DEFAULT 0.04,
  -- Budget categories (housing/food/transport/...). Free-form JSON so we
  -- don't reshape the dashboard every time a new category lands.
  budget_categories  JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS scenario_assumptions_user_id_idx
  ON scenario_assumptions(user_id);

ALTER TABLE scenario_assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scenario_assumptions owner select" ON scenario_assumptions;
CREATE POLICY "scenario_assumptions owner select" ON scenario_assumptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenario_assumptions owner insert" ON scenario_assumptions;
CREATE POLICY "scenario_assumptions owner insert" ON scenario_assumptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenario_assumptions owner update" ON scenario_assumptions;
CREATE POLICY "scenario_assumptions owner update" ON scenario_assumptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenario_assumptions owner delete" ON scenario_assumptions;
CREATE POLICY "scenario_assumptions owner delete" ON scenario_assumptions
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_scenario_assumptions_updated_at
  ON scenario_assumptions;
CREATE TRIGGER update_scenario_assumptions_updated_at
  BEFORE UPDATE ON scenario_assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON scenario_assumptions TO authenticated;
GRANT ALL ON scenario_assumptions TO service_role;

-- ─── Backfill from existing user_budget ─────────────────────────────────────
-- Idempotent. Existing user_budget rows get a profile, a default scenario,
-- and a scenario_assumptions row carrying the legacy `_fire_profile` blob and
-- the persisted budget categories. New users hit the lazy-init path in
-- lib/fire/scenarios.ts (see ensureDefaultScenario) and never touch this.
INSERT INTO profiles (user_id)
SELECT ub.user_id
FROM user_budget ub
LEFT JOIN profiles p ON p.user_id = ub.user_id
WHERE p.user_id IS NULL;

INSERT INTO scenarios (user_id, name, is_default)
SELECT ub.user_id, 'Default', TRUE
FROM user_budget ub
LEFT JOIN scenarios s
  ON s.user_id = ub.user_id AND s.is_default = TRUE
WHERE s.id IS NULL;

INSERT INTO scenario_assumptions (
  scenario_id, user_id,
  monthly_income, fire_age,
  k401, roth_ira, taxable, total_debt,
  mortgage_balance, mortgage_monthly,
  growth_rate, withdrawal_rate,
  budget_categories
)
SELECT
  s.id,
  ub.user_id,
  COALESCE(ub.income, 0),
  COALESCE(ub.fire_age, 30),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'k401'), '')::numeric,
           ub.fire_assets, 0),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'rothIRA'), '')::numeric, 0),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'taxable'), '')::numeric, 0),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'totalDebt'), '')::numeric, 0),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'mortgageBalance'), '')::numeric, 0),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'mortgageMonthly'), '')::numeric, 0),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'growthRate'), '')::numeric, 0.07),
  COALESCE(NULLIF((ub.expenses->'_fire_profile'->>'withdrawalRate'), '')::numeric, 0.04),
  COALESCE(ub.expenses - '_fire_profile', '{}'::jsonb)
FROM user_budget ub
JOIN scenarios s
  ON s.user_id = ub.user_id AND s.is_default = TRUE
LEFT JOIN scenario_assumptions sa ON sa.scenario_id = s.id
WHERE sa.scenario_id IS NULL;
