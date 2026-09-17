-- 0034_city_rent_range.sql
--
-- A range, not just a number.
--
-- A single cost-of-living figure has to be right. A range only has to contain
-- the truth, which is a burden this data can actually carry — and it tells the
-- reader plainly that it is an estimate, so no one number has to bear weight it
-- cannot hold.
--
-- The bounds are honest measurements, not error bars invented after the fact:
-- what sitting tenants pay (B25064) and what recent arrivals pay (B25113),
-- which genuinely bracket what someone deciding whether to move there would
-- face. Census's own 90% margin of error widens them, which matters in places
-- like Toledo and Palo Alto where the two rents happen to coincide and the
-- range would otherwise have no width at all.
--
-- Display only. `col` stays the single number everything is calculated from,
-- because a FIRE target cannot be multiplied out of an interval.

ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS col_low  INTEGER;
ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS col_high INTEGER;

COMMENT ON COLUMN city_rent.col_low IS
  'Low end: the cheaper of the two rent bases, less the Census margin of error. Display only.';
COMMENT ON COLUMN city_rent.col_high IS
  'High end: the dearer of the two rent bases, plus the Census margin of error. Display only.';
