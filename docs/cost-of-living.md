# Cost of living data

How UntilFire prices a city, which sources were tried, and why two of them are
in the tree but not in the product. Written down because rediscovering this is
expensive: each dead end below cost a working importer before the flaw showed
up in real numbers.

## The number a city page needs

`col` in `lib/fire-data.ts` — annual living costs in USD. It drives the FIRE
target on ~294 prerendered city pages, which rank between 3rd and 9th for their
city queries. A wrong figure there is a confident, sourced, wrong claim about
someone's money, so every importer writes to a review table and nothing reaches
the site until it is promoted by hand.

## What is live

**Census ACS.** `lib/census.ts` → `city_rent` → admin Cities tab.

    annual cost = housing + non-housing

- **Housing** is measured per city: median gross rent by year the household
  moved in (`B25113`), most recent cohort. Falls back to all-renter median
  gross rent (`B25064`) where Census suppresses the cohort.
- **Non-housing** is one national baseline (`NON_HOUSING_ANNUAL_USD`, currently
  $34,000) re-priced by BEA's goods and services parities from `city_col`.

Needs `CENSUS_API_KEY` (free, instant, api.census.gov). 226/226 cities match.

### Why split them

Rents spread 3.89x across these cities; the totals spread 1.70x. A flat
national baseline was 76% of the cheapest city's figure and under half of the
dearest's, quietly flattening the country toward itself. Split, each half can
be labelled for what it is — one measured, one estimated — and a reader can
replace the estimated half with their own spending.

### Known limitations

- **Census top-codes median rent at 3501.** Hoboken, Huntington NY and Palo
  Alto all report the ceiling and produce identical figures. Flagged in the
  table, never invented; "at least this" is the honest claim.
- **Mover rent is still a median**, not a quote. It is a starting estimate the
  user overwrites.
- **Gross rent includes utilities.** Any future utilities line double-counts.

## What was tried and rejected

### BEA regional price parities — too coarse

`lib/bea.ts`, `city_col`. Still synced because its goods and services parities
are exactly right for the non-housing half. Rejected for cost of living itself:

BEA's smallest US geography is the metro area. New York means twenty million
people across three states, so Manhattan was averaged with Paterson. Brooklyn,
Palo Alto, Berkeley, Pasadena, Scottsdale and Plano matched no metro and fell
back to their state average. **226 cities came back carrying 134 distinct
figures**, with New York behind Manchester NH — because New Hampshire consumes
more per person, which is a fact about incomes and says nothing about costs.

No weighting fixes a geography problem. A housing-weighted blend of BEA's own
components was tried first and moved the spread from 1.70x to only 1.88x.

### HUD Fair Market Rents — right data, unreachable door

`lib/housing.ts`, `city_county` + `city_housing`, route at
`/api/admin/housing-sync`. Not rendered.

The right measure — 40th percentile of recent-mover rents, published by county.
The API key is only obtainable from huduser.gov, which is blocked from some
networks including the one this project is run from. The importer works; revive
it if a key ever becomes available.

## Rules that keep this honest

1. **Look before building.** Guessing at an agency's table names cost this
   project twice: the wrong BEA table (SAPCE1 vs SAPCE2, a factor of millions),
   and an assumption that Census needed no key. The Cities tab has a read-only
   inspector for exactly this.
2. **Discover line codes at runtime.** Cohort definitions shift every vintage —
   what reads "moved in 2023 or later" this year is a closed range the next, and
   a pinned variable reports an older cohort while still returning a plausible
   number.
3. **Report, never guess.** A city that cannot be matched is listed with the
   string that failed. A loose name match is stored and flagged, because
   "Ventura" matching "Ventura County CDP" over "San Buenaventura (Ventura)
   city" looked entirely certain.
4. **Nothing reaches the site without promotion.**

## Open

- Promote `city_rent` into `lib/fire-data.ts` — not done. Review the table
  first; the figures move both ways against the hand-entered ones.
- Show the split on city pages, in the app's own budget categories.
- Expanding the city list is cheap now, but Search Console says indexing
  plateaued at 223 pages with 30 declined, so more near-identical pages likely
  grow the "crawled, not indexed" pile rather than traffic. Depth first.
