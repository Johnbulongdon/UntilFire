-- 0031_city_rent_split.sql
--
-- The two halves of a city's cost, kept apart.
--
-- A single blended figure hid a real problem: rents spread 3.89x across these
-- cities while the total spread only 1.70x, because a flat national baseline
-- was three quarters of the cheapest city's number and under half of the
-- dearest's. The baseline was quietly flattening the country.
--
-- Split, each half can be shown for what it is — housing measured per city,
-- everything else a national estimate re-priced by BEA's goods and services
-- parities — and a reader can replace the estimated half with their own
-- spending. Housing is deliberately excluded from that parity blend: it is the
-- other half of this sum and would otherwise be counted twice.

ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS housing_annual     INTEGER;
ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS non_housing_annual INTEGER;
ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS non_housing_index  NUMERIC;
-- Census publishes a median gross rent no higher than 3501; above that every
-- place reports the ceiling. Three cities hit it and landed on an identical
-- cost of living, which put Huntington NY above New York City. Marked, never
-- invented: "at least this" is the honest claim.
ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS rent_capped        BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN city_rent.housing_annual IS 'Rent x 12. The measured half of col.';
COMMENT ON COLUMN city_rent.non_housing_annual IS 'National baseline re-priced by non_housing_index. An estimate.';
COMMENT ON COLUMN city_rent.non_housing_index IS 'BEA goods and services parity, US average = 100. Excludes rents by design.';
