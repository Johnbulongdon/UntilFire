-- 0056_savings_withdrawals.sql
--
-- Money out of savings accounts this month, for the withdrawal countdown.
--
-- Kept apart from expenses on purpose: the sync drops TRANSFER_OUT and
-- LOAN_PAYMENTS from expenses so moving money is not counted as spending,
-- but those are exactly what uses up a savings withdrawal (a Bilt card
-- autopay pulled from savings, a transfer to checking). Rows are refreshed
-- for the current month on each sync, only for accounts with a limit set.

CREATE TABLE IF NOT EXISTS public.savings_withdrawals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_account_id      TEXT NOT NULL REFERENCES public.plaid_accounts(plaid_account_id) ON DELETE CASCADE,
  plaid_transaction_id  TEXT NOT NULL UNIQUE,
  date                  DATE NOT NULL,
  amount                NUMERIC NOT NULL,
  description           TEXT,
  pending               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS savings_withdrawals_account_date
  ON public.savings_withdrawals (plaid_account_id, date);

ALTER TABLE public.savings_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own savings withdrawals"
  ON public.savings_withdrawals FOR SELECT USING (auth.uid() = user_id);
