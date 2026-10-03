-- Free to spend (D-29): which accounts count as spending money.
-- { "<plaid_accounts.id>": true | false }; an account missing from the map
-- follows the default (checking counts, everything else does not).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_to_spend_accounts JSONB;
