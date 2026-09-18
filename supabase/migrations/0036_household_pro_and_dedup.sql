-- 0036_household_pro_and_dedup.sql
-- P4 (household billing) and the P2 (duplicate-account) state it needs.

-- ─── P4: entitlement, not billing detail ────────────────────────────────────
-- The design doc's original sketch added subscriptions.household_id and let a
-- partner read the owner's subscriptions row. That answers "is the household
-- Pro?" by handing over the amount, the status, the renewal date and the
-- Stripe IDs alongside it. A boolean answers the question and nothing else,
-- so subscriptions' RLS stays exactly as it is — owner-only, as 0016 assumed.
CREATE OR REPLACE FUNCTION household_has_pro()
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
    JOIN subscriptions s ON s.user_id = them.user_id
    WHERE me.user_id = auth.uid()
      AND s.plan = 'pro'
      AND s.status IN ('active', 'trialing')
  );
$$;

-- Naming anon explicitly, per the lesson 0035 paid for: Supabase's default
-- privileges grant EXECUTE to anon as its own ACL entry, which REVOKE ... FROM
-- PUBLIC leaves untouched.
REVOKE ALL ON FUNCTION household_has_pro() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION household_has_pro() FROM anon;
GRANT EXECUTE ON FUNCTION household_has_pro() TO authenticated;

-- ─── P2: a decision, not just a confirmation ────────────────────────────────
-- shared_account_links originally recorded only confirmations, which leaves no
-- way to record "we looked, they are different accounts" — so the prompt would
-- reappear every time either partner opened the page. A row now means a
-- decision was made, and its status says which.
ALTER TABLE shared_account_links
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'dismissed'));

COMMENT ON COLUMN shared_account_links.status IS
  'confirmed = one account, count it once in the household total. dismissed = genuinely two accounts, stop asking. Absence of a row = undecided, counted for both (the safe default: overstating a household total beats silently halving it).';
