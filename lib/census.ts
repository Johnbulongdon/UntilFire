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
 * ACS is published per PLACE: roughly 29,500 incorporated cities and towns,
 * which is every US city anyone might type. One request returns every place in
 * a state, so 51 requests cover the country.
 *
 * It needs a key. That was an assumption worth checking and was not checked —
 * the first live run came back with an HTML "Missing Key" page. Unlike HUD's,
 * the key is issued instantly by email from api.census.gov and the signup is on
 * the API domain rather than a separate portal.
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

/** Median gross rent across every renter, monthly USD. */
const MEDIAN_GROSS_RENT = "B25064_001E";

/**
 * Median gross rent by the year the household moved in.
 *
 * The whole point of this table: B25064 averages in leases signed years ago and
 * rent-stabilised units, and a sitting tenant's rent is not on offer to anyone
 * deciding whether they could move somewhere. The most recent move-in cohort is
 * close to what the market asks today.
 *
 * Confirmed present in ACS 2024 by the inspector rather than assumed. The
 * variable inside it is still discovered at runtime, because which cohort is
 * "most recent" changes with every vintage.
 */
const MOVER_TABLE = "B25113";

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

/**
 * Census top-codes a median gross rent at 3501.
 *
 * Not a rent anyone pays — it is the ceiling of the published scale, so every
 * place above it reports the same figure. Hoboken, Huntington and Palo Alto all
 * came back at exactly 3501 and all produced an identical cost of living, which
 * put Huntington above New York City. Capped rows are marked rather than
 * invented: the honest statement is "at least this", and a fabricated number
 * above the ceiling would be a guess wearing a citation.
 */
export const CENSUS_RENT_CAP = 3500;

export interface CityRent {
  key: string;
  name: string;
  /** Median gross rent across all renters, monthly USD. Kept for comparison. */
  rent: number;
  /** Median rent among the most recent movers, monthly USD. Null where suppressed. */
  marketRent: number | null;
  /** rent x 12 + the non-housing baseline, to the nearest hundred. */
  col: number;
  /** The Census geography this came from, verbatim, for display and audit. */
  geo: string;
  /** "place" is the city itself; "county" is a borough or an unincorporated match. */
  basis: "place" | "county";
  /** How the name was resolved, so a loose match can be checked rather than trusted. */
  matchedBy: MatchKind;
  /** Which rent col was built from: recent movers where published, else all renters. */
  rentSource: "market" | "all";
  /** Rent x 12. The part of col that is actually measured for this city. */
  housingAnnual: number;
  /** Low and high ends of a plausible annual cost. Display only — col is what maths uses. */
  colLow: number;
  colHigh: number;
  /** The national baseline, re-priced to this city. An estimate, and labelled as one. */
  nonHousingAnnual: number;
  /** The non-housing price level used, US average = 100. Null when unscaled. */
  nonHousingIndex: number | null;
  /** True when Census returned its ceiling rather than a real median. */
  capped: boolean;
  /** The hand-entered figure this would replace. */
  previous: number;
}

export interface CensusResult {
  year: number;
  cities: CityRent[];
  unmatched: string[];
  /** The move-in cohort used, verbatim, so the table can say what it is showing. */
  moverLabel: string | null;
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
  // Hawaii has three places whose names contain "Honolulu" and two Kailuas told
  // apart only by a parenthetical county, so the matcher was right to refuse
  // both. These are the intended ones.
  honolulu: "Urban Honolulu",
  kailuakona: "Kailua CDP (Hawaii County)",
  // Ventura's legal name. Without this it is genuinely ambiguous — the fixture
  // finds both this and "Ventura County CDP", and the matcher is right to
  // refuse to pick between them.
  ventura: "San Buenaventura (Ventura)",
};

/** Census places carry a type suffix: "Austin city, Texas". Strip it to compare. */
const PLACE_SUFFIX = /\s+(city|town|village|borough|municipality|CDP|city and borough|urban county)$/i;

export type MatchKind = "exact" | "prefix" | "contains" | "county";

/**
 * Find a city in one state's places.
 *
 * Exact first. The fallbacks exist because a US city's legal name is often not
 * what anyone calls it: Census knows Nashville as "Nashville-Davidson
 * metropolitan government (balance)", Boise as "Boise City city", Ventura as
 * "San Buenaventura (Ventura)" and Honolulu as "Urban Honolulu". Eleven of our
 * cities went unpriced for that reason alone.
 *
 * Both fallbacks require a WORD BOUNDARY, so "Athens" cannot land on "Athens
 * Heights", and both refuse to choose when more than one place matches —
 * "Springfield" against two Springfields is a question for a human, not a
 * coin toss. The kind of match is carried out with the row so a loose one can
 * be checked in review rather than taken on trust.
 */
interface PlaceHit { rent: number; marketRent: number | null; moe: number | null; geo: string }

function findPlace(
  target: string,
  places: { bare: string; rent: number; marketRent: number | null; moe: number | null; geo: string }[],
): { hit: PlaceHit; how: MatchKind } | { ambiguous: string[] } | null {
  const exact = places.filter((p) => p.bare === target);
  if (exact.length) return { hit: exact[0], how: "exact" };

  // Both tiers are gathered BEFORE anything is chosen, and a single winner
  // across the union is the only thing that gets picked automatically.
  // Running them in sequence was worse than useless: "Ventura" matched
  // "Ventura County CDP" on prefix and returned it as a confident answer,
  // never noticing that "San Buenaventura (Ventura) city" — the actual city —
  // matched on the next tier down. A place whose name merely starts with a
  // city's name is not obviously the better answer, so when both tiers find
  // something the question goes to a person.
  const boundary = "[\\s\\-/(),.]";
  const prefix = new RegExp(`^${escapeRe(target)}(?=${boundary}|$)`);
  const token = new RegExp(`(?:^|${boundary})${escapeRe(target)}(?=${boundary}|$)`);

  const candidates = new Map<string, { p: typeof places[number]; how: MatchKind }>();
  for (const p of places) {
    if (prefix.test(p.bare)) candidates.set(p.geo, { p, how: "prefix" });
    else if (token.test(p.bare)) candidates.set(p.geo, { p, how: "contains" });
  }

  const found = [...candidates.values()];
  if (found.length === 1) return { hit: found[0].p, how: found[0].how };
  if (found.length > 1) return { ambiguous: found.map((f) => f.p.geo) };

  return null;
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[.'’]/g, "").replace(/\s+/g, " ").trim();
}

/** The bare city name, without our ", ST" suffix. */
function cityName(city: City): string {
  return normalise(city.name.split(",")[0]);
}

/**
 * A margin of error, which is not a rent and must not be parsed like one.
 *
 * Census publishes one alongside every estimate at 90% confidence, and uses
 * large negative sentinels where it cannot be computed. Zero is legitimate, so
 * the rent parser's "must exceed 50" floor would silently discard the small
 * ones — which are exactly the cities where the range most needs a floor.
 */
function moeFrom(value: string | null): number | null {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
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

async function censusRows(year: number, key: string, params: Record<string, string>): Promise<string[][]> {
  const url = new URL(`${BASE}/${year}/acs/acs5`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  // Census answers an auth problem with an HTML error page, not a status code
  // or JSON. Left alone it surfaced as 200 lines of markup in the admin, which
  // says nothing about what to do. Never echo the URL — it carries the key.
  if (/<html/i.test(text)) {
    const title = text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
    throw new Error(
      title && /key/i.test(title)
        ? `Census rejected the request: ${title}. CENSUS_API_KEY is missing or not valid for this deployment.`
        : `Census returned an HTML error page${title ? ` (${title})` : ""} rather than data.`,
    );
  }
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
async function stateGeographies(year: number, key: string, fips: string, moverVar: string | null) {
  // Census takes several variables in one request, so asking for the mover rent
  // alongside costs no extra round trips.
  // The margin of error rides along in the same request. It is what stops the
  // range collapsing to a point where sitting tenants and new arrivals happen
  // to pay the same — Toledo and Palo Alto both show a 0% gap, and a range of
  // zero width is not a range.
  const moeVar = moverVar ? moverVar.replace(/E$/, "M") : null;
  const get = `NAME,${MEDIAN_GROSS_RENT}${moverVar ? `,${moverVar}` : ""}${moeVar ? `,${moeVar}` : ""}`;
  const [places, counties] = await Promise.all([
    censusRows(year, key, { get, for: "place:*", in: `state:${fips}` }),
    censusRows(year, key, { get, for: "county:*", in: `state:${fips}` }),
  ]);

  // A list rather than a map: the fallbacks in findPlace need to scan, and an
  // exact-keyed map would have thrown away the very names they look for.
  const placeList: { bare: string; rent: number; marketRent: number | null; moe: number | null; geo: string }[] = [];
  const seen = new Set<string>();
  for (const [name, value, mover, moe] of places) {
    const rent = rentFrom(value);
    if (rent === null) continue;
    const marketRent = moverVar ? rentFrom(mover) : null;
    const moeValue = moeVar ? moeFrom(moe) : null;
    const bare = normalise(String(name).split(",")[0].replace(PLACE_SUFFIX, ""));
    // First wins: Census lists "Springfield city" before "Springfield CDP", and
    // the incorporated city is the one anyone means.
    if (seen.has(bare)) continue;
    seen.add(bare);
    placeList.push({ bare, rent, marketRent, moe: moeValue, geo: String(name) });
  }

  const byCounty = new Map<string, { rent: number; marketRent: number | null; moe: number | null; geo: string }>();
  for (const [name, value, mover, moe] of counties) {
    const rent = rentFrom(value);
    if (rent === null) continue;
    byCounty.set(normalise(String(name).split(",")[0]), {
      rent,
      marketRent: moverVar ? rentFrom(mover) : null,
      moe: moeVar ? moeFrom(moe) : null,
      geo: String(name),
    });
  }

  return { placeList, byCounty };
}

/**
 * Which B25113 column holds the most recent move-in cohort.
 *
 * Discovered, never hardcoded. The cohorts shift with every vintage — what is
 * "moved in 2021 or later" this year is a closed range the next — so a pinned
 * variable would quietly start reporting an older and older cohort while still
 * returning a perfectly plausible number.
 */
async function findRecentMoverVariable(
  year: number,
  key: string,
): Promise<{ id: string; label: string } | null> {
  let variables: TableRef[];
  try {
    variables = await inspectTableVariables(year, key, MOVER_TABLE);
  } catch {
    return null; // The table is optional; without it we use all renters.
  }

  let best: { id: string; label: string; since: number } | null = null;
  for (const v of variables) {
    const label = v.description;
    // "Total" is every renter, which is the number this table exists to improve on.
    if (/total/i.test(label) && !/moved/i.test(label)) continue;
    if (!/moved/i.test(label)) continue;

    const years = [...label.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => Number(m[0]));
    if (!years.length) continue;
    // "or later" is the open-ended newest bucket and beats any closed range.
    const since = Math.max(...years) + (/or later/i.test(label) ? 1000 : 0);
    if (!best || since > best.since) best = { id: v.name, label: label.split(" > ").pop() ?? label, since };
  }

  return best ? { id: best.id, label: best.label } : null;
}

/**
 * Annual living costs, split into the half we measure and the half we estimate.
 *
 * Keeping them apart is the point. A single blended number hid that rents
 * spread 3.89x across these cities while the total spread only 1.70x — the flat
 * baseline was three quarters of the cheapest city's figure and under half of
 * the dearest's, quietly flattening everything. Split, each half can be shown
 * for what it is, and the reader can replace the estimated half with their own
 * spending.
 *
 * `nonHousingIndex` re-prices the baseline using BEA's goods and services
 * parities, which the BEA import already stores. Housing is deliberately not in
 * that blend: it is the other half of this sum and would be counted twice.
 */
export async function fetchCityRents(
  year: number,
  key: string,
  nonHousingIndex: Map<string, number> = new Map(),
): Promise<CensusResult> {
  const cities = CITIES.filter((c) => isUS(c.state));

  const mover = await findRecentMoverVariable(year, key);
  const moverVar = mover?.id ?? null;
  const moverLabel = mover?.label ?? null;

  // One fetch per state rather than per city: 51 states against 226 cities, and
  // it stays that way however many cities get added later.
  const needed = [...new Set(cities.map((c) => STATES[c.state]?.fips).filter(Boolean) as string[])];
  const loaded = new Map<string, Awaited<ReturnType<typeof stateGeographies>>>();
  for (const fips of needed) {
    loaded.set(fips, await stateGeographies(year, key, fips, moverVar));
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

    let hit: PlaceHit | undefined;
    let how: MatchKind = "county";

    if (county) {
      hit = geos.byCounty.get(normalise(county));
    } else {
      const found = findPlace(normalise(place), geos.placeList);
      if (found !== null) {
        if ("ambiguous" in found) {
          unmatched.push(
            `${city.name} — "${place}" matches several places in ${state.name}: ${found.ambiguous.join("; ")}`,
          );
          continue;
        }
        hit = found.hit;
        how = found.how;
      }
    }

    if (!hit) {
      unmatched.push(`${city.name} — no Census ${county ? "county" : "place"} matched "${county ?? place}" in ${state.name}`);
      continue;
    }

    // The mover figure where Census publishes one, otherwise all renters. A
    // suppressed cohort is common in small places, and falling back is far
    // better than dropping the city.
    const used = hit.marketRent ?? hit.rent;

    /**
     * A range, not just a number.
     *
     * A single figure has to be right; a range only has to contain the truth,
     * which is a burden this data can actually carry. Two honest bounds are
     * already in hand — what sitting tenants pay and what arrivals pay — and
     * they bracket the real answer for anyone deciding whether they could
     * live somewhere. Census's own margin of error widens them, which matters
     * where the two happen to coincide and the range would otherwise have no
     * width at all.
     *
     * Display only. `col` stays the single number everything is calculated
     * from, because a FIRE target cannot be multiplied out of an interval.
     */
    const bounds = [hit.rent, hit.marketRent].filter((v): v is number => v !== null);
    const moe = hit.moe ?? 0;
    const lowRent = Math.max(0, Math.min(...bounds) - moe);
    const highRent = Math.max(...bounds) + moe;

    // Both halves are rounded, then the total is their sum — never rounded
    // again. Rounding the total independently left Palo Alto's $42,012 and
    // $37,900 adding up to $79,912 against a displayed $79,900, and a
    // breakdown whose parts do not make the whole is worse than no breakdown
    // at all on a page about somebody's money.
    const index = nonHousingIndex.get(city.key) ?? null;
    const housingAnnual = Math.round((used * 12) / 100) * 100;
    const nonHousingAnnual = Math.round((NON_HOUSING_ANNUAL_USD * (index ?? 100)) / 100 / 100) * 100;

    out.push({
      key: city.key,
      name: city.name,
      rent: hit.rent,
      marketRent: hit.marketRent,
      col: housingAnnual + nonHousingAnnual,
      colLow: Math.round((lowRent * 12 + nonHousingAnnual) / 100) * 100,
      colHigh: Math.round((highRent * 12 + nonHousingAnnual) / 100) * 100,
      housingAnnual,
      nonHousingAnnual,
      nonHousingIndex: index,
      capped: used >= CENSUS_RENT_CAP,
      geo: hit.geo,
      basis: county ? "county" : "place",
      matchedBy: how,
      rentSource: hit.marketRent !== null ? "market" : "all",
      previous: city.col,
    });
  }

  return { year, cities: out, unmatched, moverLabel };
}


/**
 * What rent tables this ACS vintage publishes — read-only, writes nothing.
 *
 * Median gross rent (B25064) is what EVERY renter currently pays, which folds
 * in leases signed years ago and rent-stabilised units. That is the wrong
 * number for someone deciding whether they could afford to live somewhere: a
 * sitting tenant's rent is not on offer to them. ACS also publishes rent cut by
 * the year the household moved in, and the most recent cohort is close to what
 * the market asks today.
 *
 * This exists rather than a hardcoded table number because guessing at an
 * agency's table names has now cost this project twice — the wrong BEA table,
 * and an assumption that Census needed no key. Look first, then build.
 */
export interface TableRef {
  name: string;
  description: string;
}

export async function inspectRentTables(year: number, key: string): Promise<TableRef[]> {
  const url = new URL(`${BASE}/${year}/acs/acs5/groups.json`);
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (/<html/i.test(text)) {
    const title = text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
    throw new Error(`Census returned an HTML error page${title ? ` (${title})` : ""} instead of the table list.`);
  }

  const body = JSON.parse(text) as { groups?: { name?: string; description?: string }[] };
  const groups = body.groups ?? [];

  // Every dimension Census cuts rent by, not just move-in year. Bedrooms is
  // the one that gives a household size — a one-bed for a single person against
  // a three-bed for a family — which is the honest way to answer "who is this
  // number for" instead of picking a household on the reader's behalf.
  //
  // Kept broad on purpose: the point is to see what is actually published, so a
  // narrow filter that quietly returns nothing would defeat it.
  const wanted = /rent/i;
  const cut = /(moved|mover|year householder|tenure|recent|bedroom|household size|persons in)/i;

  return groups
    .filter((g) => wanted.test(g.description ?? "") && cut.test(g.description ?? ""))
    .map((g) => ({ name: String(g.name ?? ""), description: String(g.description ?? "") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every variable in one table, so a line code is read rather than assumed. */
export async function inspectTableVariables(year: number, key: string, table: string): Promise<TableRef[]> {
  const url = new URL(`${BASE}/${year}/acs/acs5/groups/${encodeURIComponent(table)}.json`);
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (/<html/i.test(text)) throw new Error(`Census has no table "${table}" for ${year}, or the request was rejected.`);

  const body = JSON.parse(text) as { variables?: Record<string, { label?: string }> };
  return Object.entries(body.variables ?? {})
    .filter(([name]) => name.endsWith("E"))
    .map(([name, v]) => ({ name, description: String(v.label ?? "").replace(/!!/g, " > ") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
