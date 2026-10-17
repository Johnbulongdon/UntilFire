-- 0059_lease.sql
-- A lease on the Rent bill, and Rent and Mortgage as separate sub-categories.
--
-- The founder (Oct 17) wants the lease end tracked because renewal is a big
-- money moment. It is three optional facts about the Rent bill, not a table
-- of its own: when it ends, how much notice to give, and the expected rise at
-- renewal. Only a bill or transaction tagged Rent offers it, so Housing's
-- "Rent/Mortgage" is split; homeowners never see a lease question.
ALTER TABLE expected_payments
  ADD COLUMN IF NOT EXISTS lease_ends_on    DATE,
  ADD COLUMN IF NOT EXISTS lease_notice_days INTEGER,
  ADD COLUMN IF NOT EXISTS lease_rise_pct   NUMERIC,
  ADD COLUMN IF NOT EXISTS lease_decision   TEXT
    CHECK (lease_decision IN ('renew', 'move', 'unsure'));

COMMENT ON COLUMN expected_payments.lease_ends_on IS
  'Last day of the lease, on a Rent bill. Null when no lease was added.';
COMMENT ON COLUMN expected_payments.lease_notice_days IS
  'Days of notice the lease asks for before it ends. Null means the 60-day default.';
COMMENT ON COLUMN expected_payments.lease_rise_pct IS
  'Expected rent rise at renewal, in percent (5 = 5%). Null means not sure. Used only in what-ifs, never the headline freedom date.';
COMMENT ON COLUMN expected_payments.lease_decision IS
  'The answer to Today''s "Stay or move?": renew, move or unsure. Unsure is asked again a week before the deadline. Cleared when the end date changes.';

-- Bank rows Plaid already called rent or a mortgage get the matching new tag.
UPDATE expenses SET sub_category = 'Rent'
  WHERE category = 'housing' AND pfc_detailed = 'RENT_AND_UTILITIES_RENT'
    AND (sub_category IS NULL OR sub_category = 'Rent/Mortgage');
UPDATE expenses SET sub_category = 'Mortgage'
  WHERE category = 'housing' AND pfc_detailed = 'LOAN_PAYMENTS_MORTGAGE_PAYMENT'
    AND sub_category = 'Rent/Mortgage';
-- Rows still on "Rent/Mortgage" (typed ones, Upcoming bills) are asked about once in Today.
