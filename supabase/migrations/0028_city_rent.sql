-- 0028_city_rent.sql
--
-- City-level rents from the Census American Community Survey.
--
-- The third source and the first that fits. BEA priced by metro area, so
-- Manhattan was averaged with Paterson; HUD had the right granularity but its
-- API key is behind a site unreachable from some networks. ACS needs no key,
-- publishes per place, and covers roughly 29,500 US cities and towns — so any
-- city added later already has a real figure behind it.
--
-- `rent` is B25064, median GROSS rent: what sitting tenants pay, utilities
-- included. It is not market asking rent and understates expensive cities.
-- That limitation is the reason col is stored beside it rather than instead of
-- it — the rent is the measurement, col is the estimate built on top.

CREATE TABLE IF NOT EXISTS city_rent (
  city_key  TEXT        PRIMARY KEY,
  name      TEXT        NOT NULL,
  -- Monthly, USD.
  rent      INTEGER     NOT NULL,
  -- rent * 12 + the national non-housing baseline. See NON_HOUSING_ANNUAL_USD
  -- in lib/census.ts, which is one number on purpose: outside housing, costs
  -- barely move between US cities, and pretending they do is what made the BEA
  -- import read as authoritative nonsense.
  col       INTEGER     NOT NULL,
  geo       TEXT        NOT NULL,
  -- 'place' is the city itself. 'county' is a New York borough or an
  -- unincorporated area with no place record, and is a coarser match.
  basis     TEXT        NOT NULL CHECK (basis IN ('place', 'county')),
  previous  INTEGER,
  acs_year  INTEGER     NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS city_rent_col_idx ON city_rent(col DESC);

ALTER TABLE city_rent ENABLE ROW LEVEL SECURITY;
GRANT ALL ON city_rent TO service_role;
