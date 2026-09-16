import { CITIES, isUS, type City } from "./fire-data";

/**
 * City-level rents for US cities, from the Census American Community Survey.
 *
 * The third source tried, and the first that fits. BEA's smallest geography is
 * the metro area, so Manhattan was averaged with Paterson and 226 cities came
 * back carrying 134 distinct figures. HUD publishes by county, which is the
 * right granularity, but its API needs a key from a site that is unreachable
 * from some networks — including the one this project is run from.
 *
 * ACS needs no key at this volume, and it is published per PLACE: roughly
 * 29,500 incorporated cities and towns, which is every US city anyone might
 * type. One request returns every place in a state, so 51 requests cover the
 * country.
 *
 * What it measures, stated plainly because it matters: B25064 is MEDIAN GROSS
 * RENT — what sitting tenants currently pay, including long and rent-stabilised
 * leases, with utilities included. It is not the market asking rent a mover
 * would face, and it understates expensive cities for exactly that reason. It
 * is a starting estimate the user can overwrite, not a quote.
 *
 * Server-only by convention; it needs no secret, but it makes ~51 outbound
 * calls and has no business running in a browser.
 */

const BASE = "https://api.census.gov/data";

/** Median gross rent, monthly USD. */
const MEDIAN_GROSS_RENT = "B25064_001E";

/**
 * Everything that is not rent, annually.
 *
 * Roughly the BLS Consumer Expenditure Survey average household outlay less
 * shelter and less the pension and insurance contributions that are saving
 * rather than spending. It is deliberately ONE national number: food, transport
 * and healthcare barely move between US cities, and pretending otherwise was
 * what made the BEA figures look authoritative and read as nonsense. Rent is
 * the only line that really varies, so rent is the only line we look up.
 *
 * Shown separately in the admin so it is never mistaken for a measurement.
 */
export const NON_HOUSING_ANNUAL_USD = 34_000;

export interface CityRent {
  key: string;
  name: string;
  /** Median gross rent, monthly USD. */
  rent: number;
  /** rent x 12 + the non-housing baseline, to the nearest hundred. */
  col: number;
  /** The Census geography this came from, verbatim, for display and audit. */
  geo: string;
  /** "place" is the city itself; "county" is a borough or an unincorporated match. */
  basis: "place" | "county";
  /** The hand-entered figure this would replace. */
  previous: number;
}

export interface CensusResult {
  year: number;
  cities: CityRent[];
  unmatched: string[];
}

/** Our state keys to Census state FIPS and full names. */
const STATES: Record<string, { fips: string; name: string }> = {
  al: { fips: "01", name: "Alabama" }, ak: { fips: "02", name: "Alaska" },
  az: { fips: "04", name: "Arizona" }, ar_us: { fips: "05", name: "Arkansas" },
  ca: { fips: "06", name: "California" }, co: { fips: "08", name: "Colorado" },
  ct: { fips: "09", name: "Connecticut" }, de_us: { fips: "10", name: "Delaware" },
  dc: { fips: "11", name: "District of Columbia" }, fl: { fips: "12", name: "Florida" },
  ga: { fips: "13", name: "Georgia" }, hi: { fips: "15", name: "Hawaii" },
  id: { fips: "16", name: "Idaho" }, il: { fips: "17", name: "Illinois" },
  in_us: { fips: "18", name: "Indiana" }, ia: { fips: "19", name: "Iowa" },
  ks: { fips: "20", name: "Kansas" }, ky: { fips: "21", name: "Kentucky" },
  la: { fips: "22", name: "Louisiana" }, me: { fips: "23", name: "Maine" },
  md: { fips: "24", name: "Maryland" }, ma: { fips: "25", name: "Massachusetts" },
  mi: { fips: "26", name: "Michigan" }, mn: { fips: "27", name: "Minnesota" },
  ms: { fips: "28", name: "Mississippi" }, mo: { fips: "29", name: "Missouri" },
  mt: { fips: "30", name: "Montana" }, ne: { fips: "31", name: "Nebraska" },
  nv: { fips: "32", name: "Nevada" }, nh: { fips: "33", name: "New Hampshire" },
  nj: { fips: "34", name: "New Jersey" }, nm: { fips: "35", name: "New Mexico" },
  ny: { fips: "36", name: "New York" }, nyc: { fips: "36", name: "New York" },
  nc: { fips: "37", name: "North Carolina" }, nd: { fips: "38", name: "North Dakota" },
  oh: { fips: "39", name: "Ohio" }, ok: { fips: "40", name: "Oklahoma" },
  or: { fips: "41", name: "Oregon" }, pa: { fips: "42", name: "Pennsylvania" },
  ri: { fips: "44", name: "Rhode Island" }, sc: { fips: "45", name: "South Carolina" },
  sd: { fips: "46", name: "South Dakota" }, tn: { fips: "47", name: "Tennessee" },
  tx: { fips: "48", name: "Texas" }, ut: { fips: "49", name: "Utah" },
  vt: { fips: "50", name: "Vermont" }, va: { fips: "51", name: "Virginia" },
  wa: { fips: "53", name: "Washington" }, wv: { fips: "54", name: "West Virginia" },
  wi: { fips: "55", name: "Wisconsin" }, wy: { fips: "56", name: "Wyoming" },
};

/**
 * Cities that are not Census "places".
 *
 * The New York boroughs are the reason this exists: Brooklyn is not a place,
 * it is Kings County, and under BEA it fell through to the New York State
 * average and was priced like a town upstate. Each borough is matched against
 * its county instead. Honolulu is a CDP whose Census name does not contain the
 * bare city name.
 */
const COUNTY_MATCH: Record<string, string> = {
  // Manhattan, not the five-borough aggregate. Census's "New York city" covers
  // all five, and its median is pulled down by Queens and the Bronx — which we
  // already carry separately, so using it would both understate Manhattan and
  // count the same rents twice.
  nyc: "New York County",
  brooklyn: "Kings County",
  queens: "Queens County",
  bronx: "Bronx County",
  staten: "Richmond County",
};

/**
 * Cities whose bare name is not what Census calls the place.
 *
 * "Washington DC" carries no ", ST" suffix for us to split on, so the bare name
 * comes out as "washington dc" against a Census place of plain "Washington".
 * Found by the fixture rather than by reading the data — left alone the capital
 * would simply have gone unpriced.
 *
 * Note that Salt Lake City, Kansas City, Jersey City and the rest need nothing
 * here: Census names them "Kansas City city", so stripping the type suffix
 * leaves the name intact. New York is the only city whose name genuinely ends
 * in the word Census uses as its suffix.
 */
const PLACE_ALIAS: Record<string, string> = {
  dc: "Washington",
};

/** Census places carry a type suffix: "Austin city, Texas". Strip it to compare. */
const PLACE_SUFFIX = /\s+(city|town|village|borough|municipality|CDP|city and borough|urban county)$/i;

function normalise(value: string): string {
  return value.toLowerCase().replace(/[.'’]/g, "").replace(/\s+/g, " ").trim();
}

/** The bare city name, without our ", ST" suffix. */
function cityName(city: City): string {
  return normalise(city.name.split(",")[0]);
}

/**
 * Census returns a header row then data rows, all strings. A suppressed or
 * absent value comes back as a large negative sentinel rather than null, which
 * is why this rejects anything below a plausible floor instead of only NaN.
 */
function rentFrom(value: string | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 50 ? n : null;
}

async function censusRows(year: number, params: Record<string, string>): Promise<string[][]> {
  const url = new URL(`${BASE}/${year}/acs/acs5`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Census HTTP ${res.status}: ${text.slice(0, 160)}`);

  let rows: unknown;
  try {
    rows = JSON.parse(text);
  } catch {
    throw new Error(`Census returned non-JSON: ${text.slice(0, 160)}`);
  }
  if (!Array.isArray(rows) || rows.length < 2) return [];
  return (rows as string[][]).slice(1);
}

/**
 * Pull every place and every county in one state.
 *
 * Both, because a handful of our cities are boroughs or unincorporated areas
 * that have no place record. Two requests per state, 102 for the country,
 * which is well inside what Census allows without a key.
 */
async function stateGeographies(year: number, fips: string) {
  const [places, counties] = await Promise.all([
    censusRows(year, { get: `NAME,${MEDIAN_GROSS_RENT}`, for: "place:*", in: `state:${fips}` }),
    censusRows(year, { get: `NAME,${MEDIAN_GROSS_RENT}`, for: "county:*", in: `state:${fips}` }),
  ]);

  const byPlace = new Map<string, { rent: number; geo: string }>();
  for (const [name, value] of places) {
    const rent = rentFrom(value);
    if (rent === null) continue;
    const bare = normalise(String(name).split(",")[0].replace(PLACE_SUFFIX, ""));
    // First match wins: Census lists "Springfield city" before "Springfield CDP",
    // and the incorporated city is the one anyone means.
    if (!byPlace.has(bare)) byPlace.set(bare, { rent, geo: String(name) });
  }

  const byCounty = new Map<string, { rent: number; geo: string }>();
  for (const [name, value] of counties) {
    const rent = rentFrom(value);
    if (rent === null) continue;
    byCounty.set(normalise(String(name).split(",")[0]), { rent, geo: String(name) });
  }

  return { byPlace, byCounty };
}

export async function fetchCityRents(year: number): Promise<CensusResult> {
  const cities = CITIES.filter((c) => isUS(c.state));

  // One fetch per state rather than per city: 51 states against 226 cities, and
  // it stays that way however many cities get added later.
  const needed = [...new Set(cities.map((c) => STATES[c.state]?.fips).filter(Boolean) as string[])];
  const loaded = new Map<string, Awaited<ReturnType<typeof stateGeographies>>>();
  for (const fips of needed) {
    loaded.set(fips, await stateGeographies(year, fips));
  }

  const out: CityRent[] = [];
  const unmatched: string[] = [];

  for (const city of cities) {
    const state = STATES[city.state];
    if (!state) { unmatched.push(`${city.name} — no Census state mapped for "${city.state}"`); continue; }

    const geos = loaded.get(state.fips);
    if (!geos) { unmatched.push(`${city.name} — ${state.name} returned nothing`); continue; }

    const county = COUNTY_MATCH[city.key];
    const place = PLACE_ALIAS[city.key] ?? cityName(city);
    const hit = county
      ? geos.byCounty.get(normalise(county))
      : geos.byPlace.get(normalise(place));

    if (!hit) {
      unmatched.push(`${city.name} — no Census ${county ? "county" : "place"} matched "${county ?? place}" in ${state.name}`);
      continue;
    }

    out.push({
      key: city.key,
      name: city.name,
      rent: hit.rent,
      col: Math.round((hit.rent * 12 + NON_HOUSING_ANNUAL_USD) / 100) * 100,
      geo: hit.geo,
      basis: county ? "county" : "place",
      previous: city.col,
    });
  }

  return { year, cities: out, unmatched };
}
