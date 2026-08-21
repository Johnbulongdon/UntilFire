-- 0020_plaid_institution_branding.sql
-- Cache each connected bank's logo/brand color from Plaid's institutions API
-- (base64 PNG + hex color, via include_optional_metadata) so the connected-
-- accounts UI can render real bank logos instead of letter monograms,
-- without an extra Plaid round trip on every page load.

ALTER TABLE plaid_items
  ADD COLUMN IF NOT EXISTS institution_logo TEXT,
  ADD COLUMN IF NOT EXISTS institution_color TEXT;
