-- 0057_household_private_reads.sql
-- Partners stop being able to read each other's raw financial rows.
--
-- 0016 let a household peer SELECT the other's transactions, bank accounts,
-- goals, net-worth history, budget, scenarios, expected payments and profile.
-- Nothing in the app uses that: every web and phone query filters by the
-- caller's own user_id, and the combined view (lib/household.ts) reads both
-- members server side through the service-role client. So the grant only
-- added exposure, and it promised far more than the invite says ("a combined
-- freedom date, and what the two of you spend together"). Each SELECT goes
-- back to owner-only. Household tables, the helpers and household_has_pro()
-- are unchanged.
--
-- Also closes an unrelated leak: "Service role can view waitlist" was
-- USING (true) for every role, so the public anon key could read every
-- waitlist email. The service role bypasses RLS and never needed it.

DROP POLICY IF EXISTS "profiles owner select" ON profiles;
CREATE POLICY "profiles owner select" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenario_assumptions owner select" ON scenario_assumptions;
CREATE POLICY "scenario_assumptions owner select" ON scenario_assumptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenarios owner select" ON scenarios;
CREATE POLICY "scenarios owner select" ON scenarios
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own accounts" ON plaid_accounts;
CREATE POLICY "Users can read own accounts" ON plaid_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "goals owner select" ON goals;
CREATE POLICY "goals owner select" ON goals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "net_worth_snapshots owner select" ON net_worth_snapshots;
CREATE POLICY "net_worth_snapshots owner select" ON net_worth_snapshots
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own budget" ON user_budget;
CREATE POLICY "Users can view own budget" ON user_budget
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "expected_payments owner select" ON expected_payments;
CREATE POLICY "expected_payments owner select" ON expected_payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can view waitlist" ON waitlist;
