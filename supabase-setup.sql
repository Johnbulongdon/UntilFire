-- UntilFire Supabase bootstrap
-- Run this in your Supabase project's SQL Editor on a fresh environment.
--
-- Tables created:
--   - user_budget         (dashboard income/expenses + FIRE profile json — legacy)
--   - expenses            (transaction log used by /dashboard transactions tab)
--   - subscriptions       (Stripe Pro tier mirror)
--   - waitlist            (public landing waitlist signups)
--   - profiles            (FIRE OS: who the user is — locale, demographics)
--   - scenarios           (FIRE OS: named container for one set of assumptions)
--   - scenario_assumptions (FIRE OS: tunable inputs the engine consumes)
--
-- The FIRE OS tables (profiles, scenarios, scenario_assumptions) are additive.
-- v1 always reads the user's single default scenario; multi-scenario UI is
-- intentionally out of scope here. See supabase/migrations/ for forward-only
-- migrations that incrementally evolved the schema.
--
-- Auth model: Supabase Google OAuth + RLS. There is no Next.js middleware.ts;
-- /dashboard redirects to /login client-side when no session is found.
-- See AUTH_SETUP.md for the full live architecture.

-- ─── Shared helpers ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── user_budget (dashboard primary store) ──────────────────────────────────
-- Backs app/dashboard/page.tsx and app/dashboard/TransactionsTab.tsx.
-- One row per authenticated user; expenses jsonb holds budget categories
-- plus a `_fire_profile` blob (k401, rothIRA, taxable, totalDebt, etc.).
CREATE TABLE IF NOT EXISTS user_budget (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  income      NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses    JSONB         NOT NULL DEFAULT '{}'::jsonb,
  fire_age    INTEGER       NOT NULL DEFAULT 30,
  fire_assets NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE user_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_budget owner select" ON user_budget;
CREATE POLICY "user_budget owner select" ON user_budget
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_budget owner insert" ON user_budget;
CREATE POLICY "user_budget owner insert" ON user_budget
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_budget owner update" ON user_budget;
CREATE POLICY "user_budget owner update" ON user_budget
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_budget owner delete" ON user_budget;
CREATE POLICY "user_budget owner delete" ON user_budget
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_budget_updated_at ON user_budget;
CREATE TRIGGER update_user_budget_updated_at
  BEFORE UPDATE ON user_budget
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON user_budget TO authenticated;
GRANT ALL ON user_budget TO service_role;

-- ─── expenses (transaction log) ─────────────────────────────────────────────
-- Used by the Transactions tab. Stores both income and expense rows; the
-- transaction_type column distinguishes them.
CREATE TABLE IF NOT EXISTS expenses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  amount           NUMERIC(12,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  description      TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'other',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  sub_category     TEXT DEFAULT NULL,
  is_work_related  BOOLEAN NOT NULL DEFAULT FALSE,
  transaction_type TEXT NOT NULL DEFAULT 'expense'
    CHECK (transaction_type IN ('expense', 'income')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS expenses_user_id_idx     ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_user_date_idx   ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_user_cat_idx    ON expenses(user_id, category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses owner select" ON expenses;
CREATE POLICY "expenses owner select" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses owner insert" ON expenses;
CREATE POLICY "expenses owner insert" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses owner update" ON expenses;
CREATE POLICY "expenses owner update" ON expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses owner delete" ON expenses;
CREATE POLICY "expenses owner delete" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON expenses TO authenticated;
GRANT ALL ON expenses TO service_role;

-- ─── subscriptions (Stripe Pro tier mirror) ─────────────────────────────────
-- Read by lib/supabase.ts getSubscription/isPro and written by
-- app/api/stripe/webhook/route.ts using the service role key.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'inactive',  -- active | inactive | canceled | past_due
  plan                   TEXT NOT NULL DEFAULT 'free',       -- free | pro
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx
  ON subscriptions(stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Reads only — writes happen with the service role key from the Stripe webhook.
DROP POLICY IF EXISTS "subscriptions owner select" ON subscriptions;
CREATE POLICY "subscriptions owner select" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT ON subscriptions TO authenticated;
GRANT ALL    ON subscriptions TO service_role;

-- ─── waitlist (public landing capture) ──────────────────────────────────────
-- Written by app/api/waitlist/route.ts using the anon key, so the table needs
-- an INSERT policy that does not require auth.uid(). No reads from the client.
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist anon insert" ON waitlist;
CREATE POLICY "waitlist anon insert" ON waitlist
  FOR INSERT WITH CHECK (true);

-- No SELECT policy → anon/authenticated cannot read. Service role bypasses RLS.
GRANT INSERT ON waitlist TO anon;
GRANT INSERT ON waitlist TO authenticated;
GRANT ALL    ON waitlist TO service_role;

-- ─── FIRE OS: profiles, scenarios, scenario_assumptions ─────────────────────
-- Source of truth lives in supabase/migrations/0001_profiles_and_scenarios.sql.
-- The block below is that migration inlined so a fresh Supabase SQL Editor
-- run builds the full FIRE OS schema in one pass. Keep them in sync; new
-- changes go in a new forward-only migration file.

-- profiles ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  locale_kind  TEXT NOT NULL DEFAULT 'us'
    CHECK (locale_kind IN ('us', 'intl', 'unknown')),
  jurisdiction TEXT,
  current_age  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
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

-- scenarios -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scenarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS scenarios_user_id_idx ON scenarios(user_id);
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

-- scenario_assumptions ------------------------------------------------------
CREATE TABLE IF NOT EXISTS scenario_assumptions (
  scenario_id       UUID PRIMARY KEY REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income    NUMERIC(12,2) NOT NULL DEFAULT 0,
  fire_age          INTEGER       NOT NULL DEFAULT 30,
  k401              NUMERIC(14,2) NOT NULL DEFAULT 0,
  roth_ira          NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable           NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_debt        NUMERIC(14,2) NOT NULL DEFAULT 0,
  mortgage_balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  mortgage_monthly  NUMERIC(12,2) NOT NULL DEFAULT 0,
  growth_rate       NUMERIC(6,4)  NOT NULL DEFAULT 0.07,
  withdrawal_rate   NUMERIC(6,4)  NOT NULL DEFAULT 0.04,
  budget_categories JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
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
