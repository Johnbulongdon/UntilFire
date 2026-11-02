-- 0060_split.sql
-- Split a payment between people (Nov 2 2026, D-135).
--
-- John pays for a group dinner and only his share should count as spending.
-- The others' share is kept off his spending the same way a refund is: it is
-- added to refund_amount, which every total on the website, the phone and
-- household already nets out. These columns remember that part of
-- refund_amount came from a split, so it can be shown, changed or undone, and
-- so Today can check later that the money really came back.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS split_count SMALLINT
    CHECK (split_count IS NULL OR split_count >= 2),
  ADD COLUMN IF NOT EXISTS split_owed  NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (split_owed >= 0),
  ADD COLUMN IF NOT EXISTS split_state TEXT
    CHECK (split_state IN ('waiting', 'paid', 'cash'));

COMMENT ON COLUMN expenses.split_count IS
  'People the payment was split between, the payer included. Null when split by a typed share or not split.';
COMMENT ON COLUMN expenses.split_owed IS
  'The others'' share, already inside refund_amount. 0 when not split.';
COMMENT ON COLUMN expenses.split_state IS
  'waiting until a pay-back is seen, paid once one is linked in Today, cash when the person says they were paid in cash. Null when not split.';
