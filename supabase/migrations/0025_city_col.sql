-- 0025_city_col.sql
--
-- Cost-of-living figures imported from the Bureau of Economic Analysis.
--
-- These do not replace the hand-entered `col` in lib/fire-data.ts. They land
-- here first so a sync can be reviewed against what it is replacing before
-- anything a visitor reads changes — the figures appear on ~236 public pages,
-- and a bad import would be a confident, sourced, wrong number about someone's
-- cost of living.

CREATE TABLE IF NOT EXISTS city_col (
  city_key   TEXT        PRIMARY KEY,
  name       TEXT        NOT NULL,
  col        INTEGER     NOT NULL,
  rpp        NUMERIC     NOT NULL,
  -- 'metro' carries that metro's own price parity. 'state' means the city sits
  -- in no metro area and carries its state's level, which is an estimate and
  -- has to be labelled as one wherever it is shown.
  basis      TEXT        NOT NULL CHECK (basis IN ('metro', 'state')),
  geo        TEXT        NOT NULL,
  -- What the hand-entered value was at import time, so the movement stays
  -- visible after the fact rather than only in the moment of review.
  previous   INTEGER,
  bea_year   INTEGER     NOT NULL,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS city_col_synced_idx ON city_col(synced_at DESC);

ALTER TABLE city_col ENABLE ROW LEVEL SECURITY;
GRANT ALL ON city_col TO service_role;
