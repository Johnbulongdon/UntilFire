-- 0016_household_accounts.sql
-- P0 of family (household) accounts: the household/membership/invite shell,
-- two SECURITY DEFINER helpers, and the RLS amendments that let a linked
-- partner *read* (never write) the other's financial data. See
-- docs/design/family-accounts.md for the full plan and product decisions.
--
-- Scope intentionally stops at "can two linked accounts see each other's
-- numbers." Invite UI, duplicate-account detection, the combined dashboard,
-- and household billing are later phases built on top of this schema
-- without further migrations to these tables (see the design doc's phasing).
--
-- IMPORTANT — this migration was written against the LIVE schema (checked via
-- the Supabase MCP), not just the tracked migration files, because the two
-- have drifted: e.g. expenses' real SELECT policy is named
-- "Users can view own expenses", not "expenses owner select" as the tracked
-- 0001-era files would suggest, and `goals` / `net_worth_snapshots` aren't in
-- any tracked migration at all (created directly against the database) and
-- each use a single FOR ALL policy rather than the per-action shape used
-- elsewhere. Always re-check live policy names before extending RLS —
-- `select tablename, policyname, cmd, qual from pg_policies where
-- schemaname = 'public'` — rather than assuming the tracked SQL matches.

-- ─── households ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Our household',
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- ─── household_members ──────────────────────────────────────────────────────
-- One household per user in v1 (UNIQUE(user_id)) — matches the "2 partners"
-- scope in the design doc. Deleting a row is how a member leaves (or is
-- removed): every peer-read policy below keys off this table, so removal
-- revokes access immediately with no separate "revoke" step and no cache to
-- invalidate.
CREATE TABLE IF NOT EXISTS household_members (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  -- Caps a household at two people, decided 18 Sep 2026. Nothing else in this
  -- schema limits membership: is_household_peer() is a set-membership join and
  -- works for any N, so without this a third member would silently receive
  -- full read access while P3's combined math still assumed two — misreporting
  -- the one number this feature exists to produce.
  --
  -- A slot rather than a trigger, because a unique index cannot be raced: two
  -- concurrent accepts both checking "does this household already have 2?"
  -- can both pass, two inserts against slot 2 cannot. Slot 1 is assigned on
  -- create, slot 2 on accept.
  --
  -- Households of 3+ are common (multi-generational especially), but households
  -- sharing ONE freedom date are not — that is a shared-expenses feature, not
  -- this one. Raising the cap later is a one-line CHECK change; un-shipping a
  -- broken three-person experience is not.
  member_slot  SMALLINT NOT NULL CHECK (member_slot IN (1, 2)),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (household_id, user_id),
  UNIQUE (user_id),
  UNIQUE (household_id, member_slot)
);

CREATE INDEX IF NOT EXISTS household_members_household_id_idx
  ON household_members(household_id);

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- ─── household_invites ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS household_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  inviter_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()) + INTERVAL '14 days',
  accepted_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS household_invites_household_id_idx
  ON household_invites(household_id);
CREATE INDEX IF NOT EXISTS household_invites_invitee_email_idx
  ON household_invites(invitee_email);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- ─── shared_account_links ───────────────────────────────────────────────────
-- Only rows here are deduped in the combined household total (P2 work, not
-- built yet). Populated once a partner confirms a Plaid-detected match
-- ("looks like you both linked Chase •••• 4821 — same account?"). Absence of
-- a row means it's counted separately for both partners — the safe default,
-- since we'd rather overstate a household's number than silently understate
-- it by guessing two accounts are the same when they aren't.
CREATE TABLE IF NOT EXISTS shared_account_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id        UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plaid_account_id_a  TEXT NOT NULL,
  plaid_account_id_b  TEXT NOT NULL,
  confirmed_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (plaid_account_id_a, plaid_account_id_b)
);

CREATE INDEX IF NOT EXISTS shared_account_links_household_id_idx
  ON shared_account_links(household_id);

ALTER TABLE shared_account_links ENABLE ROW LEVEL SECURITY;

-- ─── helpers ─────────────────────────────────────────────────────────────────
-- Both are SECURITY DEFINER so they read household_members without going
-- through household_members' own RLS (which would either recurse or need a
-- second self-referencing subquery). search_path is pinned so they can't be
-- hijacked by a same-named function earlier on an attacker-controlled path.
-- Neither writes anything, so both are safe to expose to `authenticated`.

CREATE OR REPLACE FUNCTION my_household_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION my_household_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_household_id() TO authenticated;

-- True when the caller (auth.uid()) shares a household with target_user_id.
-- Used to extend read-only access on the financial tables below.
CREATE OR REPLACE FUNCTION is_household_peer(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members me
    JOIN household_members them ON them.household_id = me.household_id
    WHERE me.user_id = auth.uid()
      AND them.user_id = target_user_id
      AND me.user_id <> target_user_id
  );
$$;

REVOKE ALL ON FUNCTION is_household_peer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_household_peer(UUID) TO authenticated;

-- ─── households / household_members / household_invites / shared_account_links RLS ──
-- All structural writes (create household, invite, accept, remove a member,
-- confirm a shared account) go through server routes using the service-role
-- client — the same pattern this repo already uses for Stripe and Plaid.
-- `authenticated` only gets read access, plus the one safe, simple
-- client-side write: a member removing *themselves* (leave).

DROP POLICY IF EXISTS "households member select" ON households;
CREATE POLICY "households member select" ON households
  FOR SELECT USING (id = my_household_id());

GRANT SELECT ON households TO authenticated;
GRANT ALL ON households TO service_role;

DROP POLICY IF EXISTS "household_members roster select" ON household_members;
CREATE POLICY "household_members roster select" ON household_members
  FOR SELECT USING (household_id = my_household_id());

DROP POLICY IF EXISTS "household_members self leave" ON household_members;
CREATE POLICY "household_members self leave" ON household_members
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, DELETE ON household_members TO authenticated;
GRANT ALL ON household_members TO service_role;

-- Visible to the inviter (to manage what they sent) and to the invitee once
-- authenticated (to see and accept it). auth.email() reads the JWT's email
-- claim directly — no auth.users table access needed (authenticated doesn't
-- have SELECT on auth.users by default in Supabase).
DROP POLICY IF EXISTS "household_invites visible to inviter or invitee" ON household_invites;
CREATE POLICY "household_invites visible to inviter or invitee" ON household_invites
  FOR SELECT USING (auth.uid() = inviter_id OR invitee_email = auth.email());

GRANT SELECT ON household_invites TO authenticated;
GRANT ALL ON household_invites TO service_role;

DROP POLICY IF EXISTS "shared_account_links household select" ON shared_account_links;
CREATE POLICY "shared_account_links household select" ON shared_account_links
  FOR SELECT USING (household_id = my_household_id());

GRANT SELECT ON shared_account_links TO authenticated;
GRANT ALL ON shared_account_links TO service_role;

-- ─── peer-read amendments on existing financial tables ──────────────────────
-- Additive and read-only: every owner write policy (insert/update/delete) is
-- untouched, so a partner can see the numbers but never edit them in v1.
-- Policy names and shapes below are copied from the LIVE database, not the
-- tracked migration files — see the header note.

-- profiles / scenario_assumptions: tracked migration names match production,
-- and both already use the per-action shape, so this is a simple swap.
DROP POLICY IF EXISTS "profiles owner select" ON profiles;
CREATE POLICY "profiles owner select" ON profiles
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));

DROP POLICY IF EXISTS "scenario_assumptions owner select" ON scenario_assumptions;
CREATE POLICY "scenario_assumptions owner select" ON scenario_assumptions
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));

-- expenses: live SELECT policy name differs from the tracked file.
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));

-- plaid_accounts: single SELECT-only policy in production (writes go through
-- the service-role client in the Plaid sync/exchange routes already).
DROP POLICY IF EXISTS "Users can read own accounts" ON plaid_accounts;
CREATE POLICY "Users can read own accounts" ON plaid_accounts
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));

-- goals / net_worth_snapshots: each currently has ONE "FOR ALL" policy. That
-- can't be safely OR-extended in place — Postgres reuses a FOR ALL policy's
-- USING clause as the WITH CHECK for writes when no WITH CHECK is given, so
-- adding "OR is_household_peer(user_id)" to it would silently let a partner
-- INSERT/UPDATE/DELETE the other's goals and net-worth snapshots too. Split
-- each into the same four-policy shape used everywhere else instead, so the
-- peer clause only ever lands on SELECT.
DROP POLICY IF EXISTS "users can manage own goals" ON goals;

CREATE POLICY "goals owner select" ON goals
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));
CREATE POLICY "goals owner insert" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals owner update" ON goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals owner delete" ON goals
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_snapshots" ON net_worth_snapshots;

CREATE POLICY "net_worth_snapshots owner select" ON net_worth_snapshots
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));
CREATE POLICY "net_worth_snapshots owner insert" ON net_worth_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "net_worth_snapshots owner update" ON net_worth_snapshots
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "net_worth_snapshots owner delete" ON net_worth_snapshots
  FOR DELETE USING (auth.uid() = user_id);

-- ─── added 2026-09-17: tables this migration missed ──────────────────────────
-- This file was written on 16 Aug and never applied. Migrations 0017-0034
-- landed in the meantime, and re-checking the live schema turned up three
-- financial tables carrying user data that the amendments above do not cover.

-- scenarios: THE IMPORTANT ONE. scenario_assumptions is already extended
-- above, but every read of it goes through lib/fire/scenarios.ts, which
-- selects `scenarios!inner(user_id, is_default)` — a PostgREST inner join.
-- An embedded resource is filtered by its OWN select policy, so without this
-- swap a peer's assumptions row is dropped by the join and comes back empty.
-- P3's combined freedom date is computed from exactly that query, so the
-- headline feature would have returned nothing for the partner.
DROP POLICY IF EXISTS "scenarios owner select" ON scenarios;
CREATE POLICY "scenarios owner select" ON scenarios
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));

-- user_budget: the legacy fallback in loadDefaultScenario() reads this when
-- an account predates the scenarios schema. Per-action shape already, so a
-- simple swap. Without it a household peer on an older account falls back to
-- defaults rather than their real numbers.
DROP POLICY IF EXISTS "Users can view own budget" ON user_budget;
CREATE POLICY "Users can view own budget" ON user_budget
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));

-- expected_payments: created by 0019, five days after this file was written,
-- so it could not have been covered. It has the same single FOR ALL policy
-- that goals and net_worth_snapshots had, and therefore the same trap — an
-- in-place OR-extension would reuse USING as WITH CHECK and hand a partner
-- write access. Split into four, peer clause on SELECT only.
DROP POLICY IF EXISTS "users can manage own expected payments" ON expected_payments;

CREATE POLICY "expected_payments owner select" ON expected_payments
  FOR SELECT USING (auth.uid() = user_id OR is_household_peer(user_id));
CREATE POLICY "expected_payments owner insert" ON expected_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expected_payments owner update" ON expected_payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expected_payments owner delete" ON expected_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ─── explicitly NOT amended here ─────────────────────────────────────────────
-- classification_rules and plaid_items (which holds the Plaid access token)
-- stay fully private — a partner doesn't need raw bank credentials or the
-- other person's auto-categorization rules to see the combined numbers.
-- subscriptions is untouched in this migration, and stays that way: household
-- billing (P4) reads entitlement through a SECURITY DEFINER function returning
-- a boolean, NOT a peer-readable subscriptions row. The row carries amount,
-- status, renewal date and Stripe IDs; a partner needs to know the household
-- is Pro, not what the other is charged. See docs/design/family-accounts.md.
--
-- APPLIED 18 Sep 2026. See 0035 for the anon EXECUTE revoke this file's
-- REVOKE ... FROM PUBLIC did not actually achieve.
