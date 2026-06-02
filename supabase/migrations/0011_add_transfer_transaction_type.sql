-- 0011_add_transfer_transaction_type.sql
-- Add 'transfer' as a valid transaction_type value alongside 'expense' and 'income'.
-- Transfers represent internal account movements and currency exchanges that should
-- not be counted in cashflow calculations.

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_transaction_type_check,
  ADD CONSTRAINT expenses_transaction_type_check
    CHECK (transaction_type IN ('expense', 'income', 'transfer'));
