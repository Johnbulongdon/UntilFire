-- 0047_expected_payments_match.sql
-- An Upcoming bill can carry a sub-category like a transaction, and the
-- bank's name for it once the person confirms a payment is that bill.
--
-- Without the second, "Rent" in Upcoming and "BILT PAYMENT" from the bank
-- were two bills to the Transactions forecast and budget line (D-31). The
-- person answers "Is BILT PAYMENT your Rent?" once; after that the match is
-- by name and nothing is asked again.

ALTER TABLE expected_payments
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS match_merchant TEXT;
