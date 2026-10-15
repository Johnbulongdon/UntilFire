-- 0054_city_income_bands.sql
--
-- Household income by rank, per city, from Census ACS B19080 (D-82).
--
-- Five annual USD figures: the 20th, 40th, 60th and 80th percentiles and the
-- 95th (the lower limit of the top 5%). Null where Census suppressed any band.
--
-- Used for one suggestion only: pay in a city someone plans to move to and work
-- in, at the same rank they hold where they live now. It is household income,
-- not one person's pay, so the app uses the ratio between two cities at the
-- same rank, never a band as a salary. The suggestion is labelled and editable.

ALTER TABLE city_rent ADD COLUMN IF NOT EXISTS income_bands INTEGER[];
