import { CITIES, isUS, type City } from "./fire-data";

/**
 * Cost-of-living figures for US cities, from the Bureau of Economic Analysis.
 *
 * col = state per-capita consumer spending, re-priced to the place:
 *
 *     statePCE x (placeRPP / stateRPP)
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
  /** The place's regional price parity, US average = 100. */
  rpp: number;
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
async function findLineCode(key: string, table: string, matcher: RegExp, label: string): Promise<string> {
  const res = await bea(key, {
    method: "GetParameterValuesFiltered",
    datasetname: "Regional",
    TargetParameter: "LineCode",
    TableName: table,
  });
  const lines = (res.ParamValue ?? []) as Record<string, string>[];
  const hit = lines.find((l) => matcher.test(String(l.Desc ?? l.Description ?? "")));
  if (!hit) {
    throw new Error(
      `No ${label} line in ${table}. Available: ${lines.map((l) => `${l.Key}=${l.Desc}`).join(" | ").slice(0, 400)}`,
    );
  }
  return String(hit.Key ?? hit.LineCode);
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
 * Match one of our cities to a BEA metro area.
 *
 * BEA names metros like "San Francisco-Oakland-Berkeley, CA (Metropolitan
 * Statistical Area)" — hyphenated principal cities, then the state codes. So a
 * match needs BOTH: our city among the principals, and our state among its
 * states. Name alone is not enough — "Columbus" hits both Ohio and Georgia,
 * and matching the wrong one prices a city off the other side of the country.
 */
function matchMetro(city: City, metros: { name: string; rpp: number }[]) {
  const alias = CITY_ALIASES[city.key];
  const cityName = alias ? alias.place : city.name.split(",")[0].trim().toLowerCase();
  const stateAbbr = alias ? alias.state : (city.name.split(",")[1] ?? "").trim().toLowerCase();
  if (!stateAbbr) return null;

  for (const m of metros) {
    const [placePart, statePart = ""] = m.name.split(/,\s*/);
    const states = statePart.replace(/\(.*/, "").split("-").map((x) => x.trim().toLowerCase());
    if (!states.includes(stateAbbr)) continue;
    const principals = placePart.split("-").map((x) => x.trim().toLowerCase());
    if (principals.includes(cityName)) return m;
  }
  return null;
}

export async function fetchCityCosts(key: string): Promise<SyncResult> {
  const year = await latestYear(key, TABLES.metroRpp);
  const yr = String(year);

  const [rppLine, pceLine] = await Promise.all([
    findLineCode(key, TABLES.metroRpp, /all items/i, "all-items"),
    findLineCode(key, TABLES.statePce, /^total|personal consumption expenditures$/i, "total PCE"),
  ]);

  const [metroRaw, stateRppRaw, statePceRaw] = await Promise.all([
    bea(key, { method: "GetData", datasetname: "Regional", TableName: TABLES.metroRpp, LineCode: rppLine, GeoFips: "MSA", Year: yr }),
    bea(key, { method: "GetData", datasetname: "Regional", TableName: TABLES.stateRpp, LineCode: rppLine, GeoFips: "STATE", Year: yr }),
    bea(key, { method: "GetData", datasetname: "Regional", TableName: TABLES.statePce, LineCode: pceLine, GeoFips: "STATE", Year: yr }),
  ]);

  const metros = ((metroRaw.Data ?? []) as BeaRow[])
    .map((r) => ({ name: String(r.GeoName ?? ""), rpp: numeric(r.DataValue) }))
    .filter((m): m is { name: string; rpp: number } => m.rpp !== null);

  const byState = (rows: BeaRow[]) => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const v = numeric(r.DataValue);
      if (v !== null) map.set(String(r.GeoName ?? "").trim().toLowerCase(), v);
    }
    return map;
  };
  const stateRpp = byState((stateRppRaw.Data ?? []) as BeaRow[]);
  const statePce = byState((statePceRaw.Data ?? []) as BeaRow[]);

  const cities: CityCol[] = [];
  const unmatched: string[] = [];

  for (const city of CITIES.filter((c) => isUS(c.state))) {
    const stateName = STATE_TO_BEA[city.state];
    if (!stateName) { unmatched.push(`${city.name} — no BEA state mapped for "${city.state}"`); continue; }

    const pce = statePce.get(stateName.toLowerCase());
    const sRpp = stateRpp.get(stateName.toLowerCase());
    if (pce == null || sRpp == null || sRpp === 0) {
      unmatched.push(`${city.name} — BEA returned no PCE or RPP for ${stateName}`);
      continue;
    }

    const metro = matchMetro(city, metros);
    const rpp = metro ? metro.rpp : sRpp;

    cities.push({
      key: city.key,
      name: city.name,
      col: Math.round((pce * (rpp / sRpp)) / 100) * 100,
      rpp,
      basis: metro ? "metro" : "state",
      geo: metro ? metro.name.replace(/\s*\(Metropolitan Statistical Area\)/, "") : stateName,
      previous: city.col,
    });
  }

  return { year, cities, unmatched, metroCount: cities.filter((c) => c.basis === "metro").length };
}
