# Sourced US FIRE-by-state reference — 27 September 2026

Baseline: `b437adf`. This is a bounded upgrade to the existing
`/fire-number/fire-by-state` page, not a new set of location pages.

## Problem found

The page had broad coverage but did not expose how its state figures were built,
which cities contributed, the source vintage, or the limits of the estimate. It
called the figures state averages even though they are unweighted averages of
the city baselines in UntilFire's sample. It also treated the New York City tax
key as a separate geography, producing 52 rows while claiming all 50 states.

## Reference contract

- Housing begins with the 2024 ACS five-year median gross rent for the most
  recent mover cohort (`B25113`), with the all-renter median (`B25064`) as the
  documented fallback.
- Each city adds the existing $34,000 national non-housing planning baseline.
- A state baseline is the unweighted arithmetic mean of its sampled cities.
  It is not population weighted and is not an official statewide household
  budget. The table exposes the number and range of cities behind every row.
- The displayed FIRE target is the annual baseline multiplied by 25. The page
  links to the calculator for readers who want to change withdrawal rate, taxes
  and other income.
- New York City stays a separate tax key for city calculations but groups into
  New York in the state reference. Washington, D.C. remains its own jurisdiction.

The page links directly to the official Census variable tables and ACS
methodology. A generated CSV carries the same state rows as the visible table,
and Dataset structured data describes the calculation and download.

## Measurement

Record the production deployment date and reviewed commit after integration.
After a complete 28-day window plus Search Console reporting delay, compare the
page and its state children with the preceding 28 days:

- non-branded impressions, clicks, CTR and impression-weighted position;
- query mix for state-level FIRE and retirement-cost intent;
- organic continuation into a city page or the FIRE-number calculator;
- verified referring pages to the reference or CSV.

Treat small counts as directional. A source link, Dataset markup or CSV does not
guarantee ranking or backlinks, and search clicks are not registrations.
