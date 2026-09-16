-- 0029_city_rent_match.sql
--
-- How each city's Census name was resolved.
--
-- A US city's legal name is often not what anyone calls it: Census knows
-- Nashville as "Nashville-Davidson metropolitan government (balance)", Boise as
-- "Boise City city", Honolulu as "Urban Honolulu". Eleven cities went unpriced
-- for that alone, so the matcher now falls back from an exact name to a
-- boundary-safe prefix and then a whole-token match.
--
-- That is a loosening, and loosening needs to be visible. A prefix match once
-- picked "Ventura County CDP" over "San Buenaventura (Ventura) city" and looked
-- entirely certain doing so. Storing how each row was matched means a review
-- can go straight to the ones that were not exact.

ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS matched_by TEXT;

COMMENT ON COLUMN city_rent.matched_by IS
  'exact | prefix | contains | county. Anything but exact was resolved by fallback and is worth a look.';
