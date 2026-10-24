-- 0049_debt_originals.sql
-- Debts show how much of each is paid off (D-40), which needs what it started at.
-- { "<key>": <original balance in USD> }, keyed "plaid:<plaid_accounts.id>" for a
-- connected loan, "typed_debt" for the typed other-debt figure and "mortgage"
-- for the typed mortgage. A key missing from the map has no original set, and
-- its debt shows its balance without a paid-off bar.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS debt_originals JSONB;
