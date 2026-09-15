-- 0026_city_col_components.sql
--
-- The RPP components behind each city's figure.
--
-- The first import used BEA's all-items parity, which weights housing at its
-- share of aggregate consumption. That averages the one price that varies
-- enormously between cities against goods that barely vary at all, and it
-- compressed the country into a 2.06x band — Fresno came out dearer than
-- Austin. `col` is now computed from a housing-weighted blend instead, and the
-- components are stored so a review can see what the blend was made of rather
-- than having to trust it.

ALTER TABLE city_col ADD COLUMN IF NOT EXISTS rpp_blended NUMERIC;
ALTER TABLE city_col ADD COLUMN IF NOT EXISTS rpp_rents   NUMERIC;
ALTER TABLE city_col ADD COLUMN IF NOT EXISTS rpp_goods   NUMERIC;
ALTER TABLE city_col ADD COLUMN IF NOT EXISTS rpp_other   NUMERIC;

-- `rpp` keeps its meaning: the all-items headline index. It is no longer what
-- col is derived from, so it stays only as the published reference point.
COMMENT ON COLUMN city_col.rpp IS 'BEA all-items RPP, US average = 100. Reference only; col derives from rpp_blended.';
COMMENT ON COLUMN city_col.rpp_blended IS 'Housing-weighted index used to compute col. See BUDGET_WEIGHTS in lib/bea.ts.';
