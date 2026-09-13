-- 0023_expected_payments_recurrence.sql
-- Folds recurring bills and income into expected_payments, so "what is coming
-- and when" has one answer instead of two.
--
-- Before this, Recurring and Expected told the same story from opposite ends:
-- Expected was what the user declared (this table), Recurring was what the app
-- guessed from transaction history — and the user's own recurring items lived
-- in localStorage under `uf_recurring_manual`, so they were device-local,
-- lost when browser data cleared, and invisible to the server. A recurring
-- bill is a payment you expect that happens to repeat; it belongs here, in a
-- real table, with the rest.
--
-- `recurrence` = 'none' is a one-off, which is every row that existed before
-- this migration and therefore the correct default.

ALTER TABLE expected_payments
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS category TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expected_payments_recurrence_check'
  ) THEN
    ALTER TABLE expected_payments
      ADD CONSTRAINT expected_payments_recurrence_check
      CHECK (recurrence IN ('none','weekly','biweekly','monthly','quarterly','annual'));
  END IF;
END $$;
