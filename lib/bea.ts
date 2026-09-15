import { CITIES, isUS, type City } from "./fire-data";

/**
 * Cost-of-living figures for US cities, from the Bureau of Economic Analysis.
 *
 * col = state per-capita consumer spending, re-priced to the place:
 *
 *     statePCE x (placeIndex / stateIndex)
 *
 * The state's own parity divides out, so the metro adjustment is relative to
 * its state rather than applied twice.
 *
 * Server-only: it reads BEA_API_KEY. Never import this into a client component.
 */

const BASE = "https://apps.bea.gov/api/data/";

/**
 * Confirmed against live GetParameterValues calls, not guessed:
 *
 *   MARPP   Regional price parities by MSA        — ~384 metro areas
 *   SARPP   Regional price parities by state
 *   SAPCE2  PER CAPITA personal consumption expenditures by major type
 *
 * SAPCE2, not SAPCE1. SAPCE1 is a state's total consumer spending; using it as
 * one household's annual expenses gives a figure in the hundreds of billions,
 * which would reach every city page as a confident, sourced, absurd number.
 */
export const TABLES = {
  metroRpp: "MARPP",
  stateRpp: "SARPP",
  statePce: "SAPCE2",
} as const;

/**
 * The four RPP series BEA publishes for every geography.
 *
 * "all" is the headline index and is what the first import used. It turned out
 * to be the wrong one for this product: all-items RPP weights housing at its
 * share of aggregate consumption (~18%), so it averages the one price that
 * varies enormously between cities against goods that barely vary at all. The
 * result compressed the whole country into a 2.06x band and put Fresno above
 * Austin. The components let us weight housing the way a household budget
 * actually does.
 */
export type Component = "all" | "goods" | "rents" | "other";

const COMPONENT_PATTERNS: Record<Component, RegExp[]> = {
  all: [/all items/i, /^\s*(\[[^\]]*\]\s*)?regional price parities\s*$/i],
  goods: [/goods/i],
  rents: [/rents/i],
  other: [/other/i],
};

/**
 * How a household budget divides, not how aggregate consumption divides.
 *
 * Roughly the BLS Consumer Expenditure Survey shape — shelter and utilities
 * about a third, goods about a third, non-housing services the rest. This is a
 * deliberate departure from BEA's own weighting, for one reason: per-capita
 * PCE includes imputed rent for owners, so a household that bought thirty
 * years ago drags the average far below what someone moving there today would
 * pay. Our users are planning future spending, so they need the price a mover
 * faces.
 *
 * These three must sum to 1.
 */
export const BUDGET_WEIGHTS: Record<Exclude<Component, "all">, number> = {
  rents: 0.33,
  goods: 0.32,
  other: 0.35,
};

/**
 * Our state keys to the names BEA uses in GeoName.
 *
 * Written out rather than derived: STATE_TAX stores a prose label
 * ("California — ~7.20% effective"), not a state name, so there is nothing
 * there to read. The _us suffixes disambiguate states from countries sharing a
 * code — ar is Argentina, de Germany, in India. "nyc" is a tax key rather than
 * a state and maps to New York; the metro match handles the city itself.
 */
const STATE_TO_BEA: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar_us: "Arkansas", ca: "California",
  co: "Colorado", ct: "Connecticut", de_us: "Delaware", dc: "District of Columbia",
  fl: "Florida", ga: "Georgia", hi: "Hawaii", id: "Idaho", il: "Illinois",
  in_us: "Indiana", ia: "Iowa", ks: "Kansas", ky: "Kentucky", la: "Louisiana",
  me: "Maine", md: "Maryland", ma: "Massachusetts", mi: "Michigan", mn: "Minnesota",
  ms: "Mississippi", mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada",
  nh: "New Hampshire", nj: "New Jersey", nm: "New Mexico", ny: "New York",
  nyc: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio",
  ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island",
  sc: "South Carolina", sd: "South Dakota", tn: "Tennessee", tx: "Texas",
  ut: "Utah", vt: "Vermont", va: "Virginia", wa: "Washington",
  wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
};

/**
 * Cities whose name does not line up with BEA's principal-city naming.
 *
 * Both found by testing rather than by reading the data. BEA's metro principal
 * is plain "New York", and "Washington DC" carries no ", ST" suffix to match
 * on at all. Left alone the two largest US cities would quietly show a
 * state-level price — a failure that looks like data, not like a bug.
 */
const CITY_ALIASES: Record<string, { place: string; state: string }> = {
  nyc: { place: "new york", state: "ny" },
  dc: { place: "washington", state: "dc" },
};

export interface CityCol {
  key: string;
  name: string;
  /** Annual living expenses in USD, rounded to the nearest hundred. */
  col: number;
  /** The place's all-items regional price parity, US average = 100. */
  rpp: number;
  /** The housing-weighted index actually used to compute col. */
  rppBlended: number;
  /** Components, kept so a review can see where the blend came from. */
  rppRents: number | null;
  rppGoods: number | null;
  rppOther: number | null;
  /** "metro" carries its own metro parity; "state" is an estimate. */
  basis: "metro" | "state";
  /** Which BEA geography the figure came from, for display and audit. */
  geo: string;
  /** What the hand-entered value was, so a review can see the movement. */
  previous: number;
}

export interface SyncResult {
  year: number;
  cities: CityCol[];
  unmatched: string[];
  metroCount: number;
  /** Which component series BEA actually served, so the blend is auditable. */
  components: string[];
}

interface BeaRow {
  GeoFips?: string;
  GeoName?: string;
  DataValue?: string;
  TimePeriod?: string;
}

/**
 * BEA reports failures inside a 200 response rather than as an HTTP status, so
 * checking res.ok treats every error as success and yields an empty import.
 */
async function bea(key: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(BASE);
  url.searchParams.set("UserID", key);
  url.searchParams.set("ResultFormat", "JSON");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    // Never include the URL in an error — it carries the key.
    throw new Error(`BEA returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  const api = (json.BEAAPI ?? {}) as Record<string, unknown>;
  const results = (api.Results ?? {}) as Record<string, unknown>;
  const err = api.Error ?? results.Error;
  if (err) {
    const e = err as Record<string, string>;
    throw new Error(`BEA error: ${e.APIErrorDescription ?? JSON.stringify(err).slice(0, 200)}`);
  }
  return results;
}

/** BEA sends numbers as strings with separators, and "(NA)"/"(D)" for gaps. */
function numeric(value: unknown): number | null {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned || /^\(.*\)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Which row of a table to read. Discovered rather than assumed — a wrong line
 * code returns rents instead of all items, a real number of the wrong kind
 * that nothing downstream can detect.
 */
async function findLineCode(key: string, table: string, matchers: RegExp[], label: string): Promise<string> {
  const res = await bea(key, {
    method: "GetParameterValuesFiltered",
    datasetname: "Regional",
    TargetParameter: "LineCode",
    TableName: table,
  });
  const lines = (res.ParamValue ?? []) as Record<string, string>[];

  // Patterns in priority order: the exact wording first, then the structural
  // fallback. BEA's descriptions are prose and a single strict pattern breaks
  // on a rewording — which is how the first attempt failed, looking for a line
  // beginning "Total" against one that reads "…(PCE) by state".
  for (const matcher of matchers) {
    const hit = lines.find((l) => matcher.test(String(l.Desc ?? l.Description ?? "")));
    if (hit) return String(hit.Key ?? hit.LineCode);
  }

  throw new Error(
    `No ${label} line in ${table}. Available: ${lines.map((l) => `${l.Key}=${l.Desc}`).join(" | ").slice(0, 600)}`,
  );
}

async function latestYear(key: string, table: string): Promise<number> {
  const res = await bea(key, {
    method: "GetParameterValuesFiltered",
    datasetname: "Regional",
    TargetParameter: "Year",
    TableName: table,
  });
  const years = ((res.ParamValue ?? []) as Record<string, string>[])
    .map((y) => Number(y.Key ?? y.Year))
    .filter(Number.isFinite);
  if (!years.length) throw new Error(`No years returned for ${table}`);
  return Math.max(...years);
}

/**
 * Lowercased GeoName -> value, plus the original spelling.
 *
 * Keys are folded so lookups are case-insensitive, but BEA's own capitalisation
 * is what the review table shows, so it has to survive the fold.
 */
interface GeoValues {
  values: Map<string, number>;
  names: Map<string, string>;
}

async function valuesByGeo(
  key: string,
  table: string,
  lineCode: string,
  geoFips: string,
  year: string,
): Promise<GeoValues> {
  const raw = await bea(key, {
    method: "GetData", datasetname: "Regional",
    TableName: table, LineCode: lineCode, GeoFips: geoFips, Year: year,
  });
  const values = new Map<string, number>();
  const names = new Map<string, string>();
  for (const r of (raw.Data ?? []) as BeaRow[]) {
    const v = numeric(r.DataValue);
    if (v === null) continue;
    const name = String(r.GeoName ?? "").trim();
    values.set(name.toLowerCase(), v);
    names.set(name.toLowerCase(), name);
  }
  return { values, names };
}

/**
 * Weight the components into one index.
 *
 * Any component BEA does not publish for a geography drops out and the
 * remaining weights are renormalised, so a missing rents figure shifts the
 * blend rather than silently zeroing a third of the basket. With nothing at
 * all, the all-items index stands in — that is the old behaviour, which is a
 * safe floor rather than a wrong number.
 */
function blend(parts: Partial<Record<Exclude<Component, "all">, number | null>>, allItems: number): number {
  let weighted = 0;
  let weight = 0;
  for (const [name, w] of Object.entries(BUDGET_WEIGHTS) as [Exclude<Component, "all">, number][]) {
    const value = parts[name];
    if (value == null || value <= 0) continue;
    weighted += value * w;
    weight += w;
  }
  return weight > 0 ? weighted / weight : allItems;
}

/**
 * Match one of our cities to a BEA metro area.
 *
 * BEA names metros like "San Francisco-Oakland-Berkeley, CA (Metropolitan
 * Statistical Area)" — hyphenated principal cities, then the state codes. So a
 * match needs BOTH: our city among the principals, and our state among its
 * states. Name alone is not enough — "Columbus" hits both Ohio and Georgia,
 * and matching the wrong one prices a city off the other side of the country.
 */
function matchMetro(city: City, metroNames: string[]): string | null {
  const alias = CITY_ALIASES[city.key];
  const cityName = alias ? alias.place : city.name.split(",")[0].trim().toLowerCase();
  const stateAbbr = alias ? alias.state : (city.name.split(",")[1] ?? "").trim().toLowerCase();
  if (!stateAbbr) return null;

  for (const name of metroNames) {
    const [placePart, statePart = ""] = name.split(/,\s*/);
    const states = statePart.replace(/\(.*/, "").split("-").map((x) => x.trim().toLowerCase());
    if (!states.includes(stateAbbr)) continue;
    const principals = placePart.split("-").map((x) => x.trim().toLowerCase());
    if (principals.includes(cityName)) return name;
  }
  return null;
}

export async function fetchCityCosts(key: string): Promise<SyncResult> {
  const year = await latestYear(key, TABLES.metroRpp);
  const yr = String(year);

  // Sequential, not Promise.all: if the first fails its error names the lines
  // that do exist, and a rejected Promise.all would discard the second's.
  //
  // All-items is required; the components are not. A year where BEA renames or
  // drops one of them should cost us the weighting, not the whole import — the
  // blend renormalises around what arrived, and losing every component leaves
  // the all-items behaviour this started with.
  const rppLines: Partial<Record<Component, string>> = {
    all: await findLineCode(key, TABLES.metroRpp, COMPONENT_PATTERNS.all, "all-items RPP"),
  };
  for (const component of ["goods", "rents", "other"] as Component[]) {
    try {
      rppLines[component] = await findLineCode(
        key, TABLES.metroRpp, COMPONENT_PATTERNS[component], `${component} RPP`,
      );
    } catch {
      // Left undefined: valuesByGeo is skipped and blend drops the weight.
    }
  }
  // The total is the line with no category after the colon. Every other line
  // in SAPCE2 reads "…expenditures: Clothing and footwear" and so on.
  const pceLine = await findLineCode(
    key,
    TABLES.statePce,
    [/expenditures\s*\(pce\)\s*by state\s*$/i, /expenditures[^:]*$/i, /^total/i],
    "total per-capita PCE",
  );

  const components = (["all", "goods", "rents", "other"] as Component[]).filter((c) => rppLines[c]);
  const empty: GeoValues = { values: new Map(), names: new Map() };
  const [metroValues, stateValues, statePce] = await Promise.all([
    Promise.all(components.map((c) => valuesByGeo(key, TABLES.metroRpp, rppLines[c]!, "MSA", yr))),
    Promise.all(components.map((c) => valuesByGeo(key, TABLES.stateRpp, rppLines[c]!, "STATE", yr))),
    valuesByGeo(key, TABLES.statePce, pceLine, "STATE", yr),
  ]);

  const byComponent = (fetched: GeoValues[]) =>
    Object.fromEntries(
      (["all", "goods", "rents", "other"] as Component[]).map((c) => {
        const i = components.indexOf(c);
        return [c, i === -1 ? empty : fetched[i]];
      }),
    ) as Record<Component, GeoValues>;

  const metro = byComponent(metroValues);
  const state = byComponent(stateValues);

  // Matching works off the all-items list: every metro with any RPP has one.
  const metroNames = [...metro.all.values.keys()];

  const cities: CityCol[] = [];
  const unmatched: string[] = [];

  for (const city of CITIES.filter((c) => isUS(c.state))) {
    const stateName = STATE_TO_BEA[city.state];
    if (!stateName) { unmatched.push(`${city.name} — no BEA state mapped for "${city.state}"`); continue; }

    const sKey = stateName.toLowerCase();
    const pce = statePce.values.get(sKey);
    const sAll = state.all.values.get(sKey);
    if (pce == null || sAll == null || sAll === 0) {
      unmatched.push(`${city.name} — BEA returned no PCE or RPP for ${stateName}`);
      continue;
    }

    const matched = matchMetro(city, metroNames);
    const lookup = (c: Component) =>
      matched ? metro[c].values.get(matched) ?? null : state[c].values.get(sKey) ?? null;

    const all = (matched ? metro.all.values.get(matched) : sAll) ?? sAll;
    const rents = lookup("rents");
    const goods = lookup("goods");
    const other = lookup("other");

    // Both sides of the ratio use the same weighting, so the state's own
    // housing mix divides out exactly as its all-items parity used to.
    const placeIndex = blend({ rents, goods, other }, all);
    const stateIndex = blend(
      { rents: state.rents.values.get(sKey) ?? null, goods: state.goods.values.get(sKey) ?? null, other: state.other.values.get(sKey) ?? null },
      sAll,
    );
    if (stateIndex <= 0) {
      unmatched.push(`${city.name} — no usable state index for ${stateName}`);
      continue;
    }

    cities.push({
      key: city.key,
      name: city.name,
      col: Math.round((pce * (placeIndex / stateIndex)) / 100) * 100,
      rpp: all,
      rppBlended: Math.round(placeIndex * 1000) / 1000,
      rppRents: rents,
      rppGoods: goods,
      rppOther: other,
      basis: matched ? "metro" : "state",
      geo: matched
        ? (metro.all.names.get(matched) ?? matched).replace(/\s*\(metropolitan statistical area\)/i, "")
        : stateName,
      previous: city.col,
    });
  }

  return {
    year, cities, unmatched,
    metroCount: cities.filter((c) => c.basis === "metro").length,
    components,
  };
}
