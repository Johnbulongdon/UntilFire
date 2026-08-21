-- 0019_expected_payments.sql
-- One-time expected payments for the Cashflow tab: a lightweight place to
-- log a single upcoming payment with a due date, in either direction
-- (money coming in — an invoice, a refund, a bonus — or a one-off bill
-- going out). This is distinct from the recurring income/bills already
-- tracked in RecurringTab — recurring items stay there; this covers the
-- one-time gap it doesn't.
--
-- Single owner-only FOR ALL policy, matching the live `goals` table exactly
-- (auth.uid() = user_id on both USING and WITH CHECK — safe here since
-- there's no shared/peer access on this table, unlike the household-account
-- planning work where a FOR ALL policy would have needed splitting).

CREATE TABLE IF NOT EXISTS expected_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  amount            NUMERIC NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'USD',
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  due_date          DATE NOT NULL,
  completed_at      TIMESTAMPTZ DEFAULT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expected_payments_user_due_idx ON expected_payments(user_id, due_date);

ALTER TABLE expected_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own expected payments" ON expected_payments;
CREATE POLICY "users can manage own expected payments" ON expected_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_expected_payments_updated_at ON expected_payments;
CREATE TRIGGER update_expected_payments_updated_at
  BEFORE UPDATE ON expected_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
