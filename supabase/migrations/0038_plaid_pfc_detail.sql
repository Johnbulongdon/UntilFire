-- 0038_plaid_pfc_detail.sql
-- Keep what Plaid actually said about a transaction.
--
-- Plaid returns personal_finance_category as three fields — primary, detailed
-- and confidence_level — and the importer used only `primary`, mapped it
-- through a lookup, and discarded the rest. So a transaction that fell through
-- the map landed in "other" with no record of what it had been, which makes
-- the map impossible to tune: 3 of the first 43 imported transactions are
-- "other" and nobody can say what they were.
--
-- Stored raw and unmapped on purpose. sub_category is the user's field and
-- they may overwrite it; these three stay as what Plaid said, so a disagreement
-- between the two is visible rather than lost.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS pfc_primary    TEXT,
  ADD COLUMN IF NOT EXISTS pfc_detailed   TEXT,
  ADD COLUMN IF NOT EXISTS pfc_confidence TEXT;

COMMENT ON COLUMN expenses.pfc_primary IS
  'Plaid personal_finance_category.primary, verbatim. The category column is this mapped through PLAID_CATEGORY_MAP; keeping the original is what makes an unmapped value findable.';
COMMENT ON COLUMN expenses.pfc_detailed IS
  'Plaid personal_finance_category.detailed, verbatim. Seeds sub_category on import; the user may then change sub_category without this moving.';
COMMENT ON COLUMN expenses.pfc_confidence IS
  'Plaid confidence_level: VERY_HIGH, HIGH, MEDIUM, LOW or UNKNOWN. Low-confidence rows are the ones worth reviewing or re-categorising.';

-- Finding unmapped categories is the point, so make that query cheap.
CREATE INDEX IF NOT EXISTS expenses_pfc_primary_idx
  ON expenses (pfc_primary) WHERE pfc_primary IS NOT NULL;
