-- 0055_savings_withdrawal_limit.sql
--
-- Monthly withdrawal limit per savings account, typed by the person.
--
-- Reg D's six-transfer cap was suspended in 2020 and many banks dropped it
-- (Capital One 360 still lists it but says it is not enforced), while Chase,
-- Bank of America and Wells Fargo still cap savings at six. So the limit is
-- the person's to set; the app only suggests a known one. Null means no limit
-- is tracked. Like apy, the sync upsert never writes this column.

ALTER TABLE public.plaid_accounts
  ADD COLUMN IF NOT EXISTS withdrawal_limit SMALLINT DEFAULT NULL
  CHECK (withdrawal_limit IS NULL OR withdrawal_limit BETWEEN 1 AND 99);
