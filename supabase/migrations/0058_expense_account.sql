-- 0058_expense_account.sql
-- Which connected account a bank transaction came from.
--
-- Two money rules need it (money logic audit round 2): a joint account marked
-- shared counts at your share on your own freedom date, and a card whose
-- balance is only its own recent charges is paid in full, so it isn't offered
-- as a debt. Filled by the Plaid sync for new and changed rows; older rows
-- stay null and count as before.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;

COMMENT ON COLUMN expenses.plaid_account_id IS
  'Plaid account_id of the account this transaction is on. Null for typed and imported rows, and for bank rows synced before 0058.';
