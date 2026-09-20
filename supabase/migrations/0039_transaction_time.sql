-- 0039_transaction_time.sql
-- Optional time of day for a transaction.
--
-- `date` stays the authoritative field — everything groups, sums and filters
-- by it, and this does not change that. occurred_at is additive: when the time
-- is known it is stored, and when it is not the column is null and the UI
-- says nothing rather than implying midnight.
--
-- timestamptz rather than a bare time column because the sources disagree
-- about what a time means. Plaid gives an instant in UTC; a person typing
-- "14:30" means 14:30 where they are. Storing the instant lets both render
-- correctly for the reader — including a household partner in another
-- country looking at the same row.
--
-- The two can disagree at a day boundary: an instant late on the 19th UTC is
-- the 20th in Hong Kong. `date` wins wherever they differ, because it is what
-- every total is built from.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

COMMENT ON COLUMN expenses.occurred_at IS
  'Optional instant the transaction happened. Null means the time is unknown — most rows. Never derived from date alone: a fabricated midnight looks like information. The date column remains authoritative for all grouping and totals.';
