-- 0015_csv_source_file.sql
-- Track which uploaded file a transaction came from, and add 'csv' as a
-- distinct source value alongside 'manual' and 'plaid' so imported rows can
-- be distinguished in the transactions list.

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS source_file TEXT DEFAULT NULL;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_source_check,
  ADD CONSTRAINT expenses_source_check
    CHECK (source IN ('manual', 'plaid', 'csv'));
