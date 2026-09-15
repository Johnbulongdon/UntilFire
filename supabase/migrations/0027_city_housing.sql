-- 0027_city_housing.sql
--
-- Mover-facing housing costs, from HUD Fair Market Rents.
--
-- This is the replacement for the BEA approach, not an addition to it. BEA's
-- smallest US geography is the metro area, so Manhattan was averaged with
-- Paterson and Brooklyn fell back to the New York State average: 226 cities
-- came back carrying 134 distinct figures. HUD publishes by county, which is
-- the granularity a city page actually needs.
--
-- Nothing a visitor sees reads these tables. Promoting them is a separate step.

-- Which county a city sits in. Cached because a city does not change county,
-- and because resolving 226 of them means 226 geocoder calls that should
-- happen once rather than on every sync.
CREATE TABLE IF NOT EXISTS city_county (
  city_key    TEXT        PRIMARY KEY,
  county_fips TEXT        NOT NULL,
  county_name TEXT        NOT NULL,
  -- 'geocoder' resolved automatically; 'manual' was corrected by hand and must
  -- survive a re-sync, which is why the importer reads this table first.
  source      TEXT        NOT NULL DEFAULT 'geocoder' CHECK (source IN ('geocoder', 'manual')),
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS city_housing (
  city_key     TEXT        PRIMARY KEY,
  name         TEXT        NOT NULL,
  county_fips  TEXT        NOT NULL,
  county_name  TEXT        NOT NULL,
  -- The two-bedroom, monthly. HUD's own reference size, and the closest single
  -- figure to a household rather than one person.
  monthly_rent INTEGER     NOT NULL,
  rent_0br     INTEGER,
  rent_1br     INTEGER,
  rent_2br     INTEGER,
  rent_3br     INTEGER,
  rent_4br     INTEGER,
  -- HUD publishes ZIP-level Small Area FMRs across most large metros. Where it
  -- did, monthly_rent is the median across those ZIPs rather than one
  -- published rent, and a review needs to be able to see which rows those are.
  small_area   BOOLEAN     NOT NULL DEFAULT FALSE,
  fmr_year     INTEGER     NOT NULL,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS city_housing_rent_idx ON city_housing(monthly_rent DESC);

ALTER TABLE city_county  ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_housing ENABLE ROW LEVEL SECURITY;
GRANT ALL ON city_county  TO service_role;
GRANT ALL ON city_housing TO service_role;
