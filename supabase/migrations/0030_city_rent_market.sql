-- 0030_city_rent_market.sql
--
-- What a mover would pay, beside what everyone pays.
--
-- B25064 is median gross rent across every renter, which folds in leases signed
-- years ago and rent-stabilised units. A sitting tenant's rent is not on offer
-- to somebody deciding whether they could afford to live there, and the gap is
-- widest in exactly the cities people most want checked.
--
-- B25113 publishes the same rent cut by the year the household moved in, and
-- the most recent cohort is close to the asking market. `col` is built from
-- that where it exists. Both are stored: the difference between them is itself
-- the reality check.

ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS market_rent INTEGER;
ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS rent_source TEXT;

COMMENT ON COLUMN city_rent.rent IS 'B25064 median gross rent across all renters, monthly USD.';
COMMENT ON COLUMN city_rent.market_rent IS 'B25113 median gross rent among the most recent movers. Null where Census suppressed it.';
COMMENT ON COLUMN city_rent.rent_source IS 'market | all — which figure col was built from. "all" means the mover cohort was unavailable for this place.';
