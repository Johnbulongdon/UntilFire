#!/usr/bin/env node
/**
 * Cost-of-living figures for US cities, from the Bureau of Economic Analysis.
 *
 * Why this is a script and not a runtime fetch: BEA publishes Regional Price
 * Parities once a year. Calling an API on every page load for a number that
 * changes each December would buy latency, rate limits and an outage
 * dependency, in exchange for nothing. This runs when you choose, writes a
 * file, and the site reads the file.
 *
 *   node scripts/import-bea-col.mjs --report    inspect BEA, write nothing
 *   node scripts/import-bea-col.mjs --write     write lib/city-col.generated.ts
 *
 * --report discovers rather than assumes: the real table names, the LineCode
 * for each row, the years actually covered, and the columns of a live data
 * call. The table codes below were confirmed by running it — the first pass
 * guessed SAPCE1 and the report is what caught that it should be SAPCE2.
 */

const KEY = process.env.BEA_API_KEY;
const BASE = "https://apps.bea.gov/api/data/";

/**
 * Confirmed against a live GetParameterValues call, not guessed:
 *
 *   MARPP   Regional price parities by MSA        — ~384 metros
 *   PARPP   Regional price parities by portion    — metro AND non-metro parts
 *           of each state, so a city outside any MSA still gets a price level
 *   SARPP   Regional price parities by state
 *   SAPCE2  PER CAPITA personal consumption expenditures by major type
 *
 * SAPCE2, not SAPCE1. SAPCE1 is a state's total consumer spending — using it
 * as one household's annual expenses yields a figure in the hundreds of
 * billions, which would have propagated into every city page as a confident,
 * sourced, absurd number.
 */
/**
 * Our state keys to the names BEA uses in GeoName.
 *
 * Written out rather than derived: STATE_TAX stores a prose label
 * ("California — ~7.20% effective"), not a state name, so there is nothing
 * there to parse. The _us suffixes disambiguate states from countries sharing
 * a code — ar is Argentina, de Germany, in India. "nyc" is a tax key rather
 * than a state, and maps to New York; the metro match handles the city itself.
 */
const STATE_TO_BEA = {
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
 * Both were found by testing the matcher rather than by reading the data:
 * "New York City" falls back to state because BEA's metro principal is plain
 * "New York", and "Washington DC" has no ", ST" suffix to match on at all.
 * Left alone, the two largest US cities would quietly carry a state-level
 * price instead of their own — the failure would look like data, not a bug.
 */
const CITY_ALIASES = {
  nyc: { place: "new york", state: "ny" },
  dc: { place: "washington", state: "dc" },
};

const TABLES = {
  metroRpp: "MARPP",
  portionRpp: "PARPP",
  stateRpp: "SARPP",
  statePce: "SAPCE2",
};

/**
 * LineCode is discovered, not assumed. Every other code here was checked
 * against a live call; this one would otherwise be the last guess, and a wrong
 * LineCode is the quiet kind of wrong — it returns a real number for the wrong
 * row (rents instead of all items) and nothing downstream can tell.
 */
async function findLineCode(table, matcher, label) {
  const res = await bea({
    method: "GetParameterValuesFiltered",
    datasetname: "Regional",
    TargetParameter: "LineCode",
    TableName: table,
  });
  const lines = res.ParamValue ?? [];
  const hit = lines.find((l) => matcher.test(String(l.Desc ?? l.Description ?? "")));
  if (!hit) {
    const available = lines.map((l) => `${l.Key}=${l.Desc}`).join("\n    ");
    throw new Error(
      `Could not find the ${label} line in ${table}. Available:\n    ${available}`,
    );
  }
  const code = String(hit.Key ?? hit.LineCode);
  console.log(`  ${table} ${label}: LineCode ${code} — ${hit.Desc ?? hit.Description}`);
  return code;
}

/** The most recent year BEA actually publishes, rather than a hardcoded one. */
async function latestYear(table) {
  const res = await bea({
    method: "GetParameterValuesFiltered",
    datasetname: "Regional",
    TargetParameter: "Year",
    TableName: table,
  });
  const years = (res.ParamValue ?? []).map((y) => Number(y.Key ?? y.Year)).filter(Number.isFinite);
  if (!years.length) throw new Error(`No years returned for ${table}`);
  return String(Math.max(...years));
}

/** BEA sends numbers as strings with thousands separators, and "(NA)"/"(D)" for gaps. */
function numeric(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned || /^\(.*\)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const args = new Set(process.argv.slice(2));
const MODE = args.has("--write") ? "write" : "report";

if (!KEY) {
  console.error("BEA_API_KEY is not set.");
  console.error("Locally:  put it in .env.local and run with `node --env-file=.env.local`");
  console.error("In CI:    add it as the repository secret BEA_API_KEY");
  process.exit(1);
}

/**
 * BEA reports failures inside a 200 response rather than as an HTTP status, so
 * a naive `res.ok` check treats every error as success and yields an empty
 * import. Errors are unwrapped here and thrown.
 */
async function bea(params) {
  const url = new URL(BASE);
  url.searchParams.set("UserID", KEY);
  url.searchParams.set("ResultFormat", "JSON");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url);
  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // Never print the URL — it carries the key.
    throw new Error(`BEA returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  const api = json?.BEAAPI ?? {};
  const err = api.Error ?? api.Results?.Error;
  if (err) {
    const detail = err.APIErrorDescription ?? err.ErrorDetail?.Description ?? JSON.stringify(err);
    throw new Error(`BEA error: ${detail}`);
  }
  return api.Results ?? api;
}

function head(title) {
  console.log("\n" + "─".repeat(68));
  console.log(title);
  console.log("─".repeat(68));
}

async function report() {
  head("1. Does the key work? (GetDataSetList)");
  const sets = await bea({ method: "GetDataSetList" });
  const names = (sets.Dataset ?? []).map((d) => d.DatasetName);
  console.log(`${names.length} datasets. Regional present: ${names.includes("Regional") ? "yes" : "NO"}`);

  head("2. What parameters does Regional take?");
  const params = await bea({ method: "GetParameterList", datasetname: "Regional" });
  for (const p of params.Parameter ?? []) {
    console.log(`  ${String(p.ParameterName).padEnd(16)} required=${p.ParameterIsRequiredFlag}  ${p.ParameterDescription ?? ""}`.slice(0, 150));
  }

  head("3. Which tables exist? (filtering for RPP and PCE)");
  const tables = await bea({
    method: "GetParameterValues",
    datasetname: "Regional",
    ParameterName: "TableName",
  });
  const all = tables.ParamValue ?? [];
  console.log(`${all.length} tables total. Matching /rpp|pce/i:\n`);
  for (const t of all) {
    const key = t.Key ?? t.TableName ?? "";
    const desc = t.Desc ?? t.Description ?? "";
    if (/rpp|parit|pce|consumption/i.test(key + " " + desc)) {
      console.log(`  ${String(key).padEnd(12)} ${desc}`.slice(0, 150));
    }
  }
  console.log("\nTables in use:", JSON.stringify(TABLES));

  head("3b. Which LineCode is which? (all-items RPP, and total PCE)");
  for (const table of [TABLES.metroRpp, TABLES.statePce]) {
    try {
      const lines = await bea({
        method: "GetParameterValuesFiltered",
        datasetname: "Regional",
        TargetParameter: "LineCode",
        TableName: table,
      });
      console.log(`  ${table}:`);
      for (const l of (lines.ParamValue ?? []).slice(0, 12)) {
        console.log(`     ${String(l.Key ?? l.LineCode ?? "").padEnd(5)} ${l.Desc ?? l.Description ?? ""}`.slice(0, 130));
      }
    } catch (e) {
      console.log(`  ${table}: ${e.message}`);
    }
  }

  head("4. Which years are available? (settles the 2008 question)");
  for (const table of [TABLES.metroRpp, TABLES.stateRpp]) {
    try {
      const years = await bea({
        method: "GetParameterValuesFiltered",
        datasetname: "Regional",
        TargetParameter: "Year",
        TableName: table,
      });
      const list = (years.ParamValue ?? []).map((y) => y.Key ?? y.Year).filter(Boolean);
      console.log(`  ${table}: ${list.length} years, ${list[0]} … ${list[list.length - 1]}`);
    } catch (e) {
      console.log(`  ${table}: ${e.message}`);
    }
  }

  head("5. A real data call — metro RPP, most recent year");
  try {
    const data = await bea({
      method: "GetData",
      datasetname: "Regional",
      TableName: TABLES.metroRpp,
      LineCode: await findLineCode(TABLES.metroRpp, /all items/i, "all-items"),
      GeoFips: "MSA",
      Year: "LAST1",
    });
    const rows = data.Data ?? [];
    console.log(`rows: ${rows.length}`);
    if (rows[0]) {
      console.log("columns:", Object.keys(rows[0]).join(", "));
      console.log("\nfirst five:");
      for (const r of rows.slice(0, 5)) {
        console.log(`  ${String(r.GeoFips ?? "").padEnd(8)} ${String(r.GeoName ?? "").padEnd(46).slice(0, 46)} ${r.TimePeriod ?? ""}  ${r.DataValue ?? ""}`);
      }
    }
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
    console.log("If this is a bad TableName or LineCode, section 3 above lists the real ones.");
  }

  head("6. A real data call — state PCE per capita, most recent year");
  try {
    const data = await bea({
      method: "GetData",
      datasetname: "Regional",
      TableName: TABLES.statePce,
      LineCode: "1",
      GeoFips: "STATE",
      Year: "LAST1",
    });
    const rows = data.Data ?? [];
    console.log(`rows: ${rows.length}`);
    for (const r of rows.slice(0, 5)) {
      console.log(`  ${String(r.GeoFips ?? "").padEnd(8)} ${String(r.GeoName ?? "").padEnd(24)} ${r.TimePeriod ?? ""}  ${r.DataValue ?? ""}  ${r.CL_UNIT ?? ""}`);
    }
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }

  console.log("\n" + "─".repeat(68));
  console.log("Report only — nothing was written.");
  console.log("Paste this output back and the importer gets written against");
  console.log("what BEA actually returns rather than what it was assumed to.");
  console.log("─".repeat(68) + "\n");
}

/**
 * Match one of our cities to a BEA metro area.
 *
 * BEA names metros like "San Francisco-Oakland-Berkeley, CA (Metropolitan
 * Statistical Area)" — a hyphenated list of principal cities plus the state
 * codes. So the match is: our city name appears as one of those principal
 * cities, AND our state code is among the metro's.
 *
 * Requiring both matters. "Columbus" alone hits both Ohio and Georgia;
 * "Kansas City" spans two states. Matching on name alone would silently price
 * a city off the wrong side of the country.
 */
function matchMetro(city, metros) {
  const alias = CITY_ALIASES[city.key];
  const cityName = alias ? alias.place : city.name.split(",")[0].trim().toLowerCase();
  const stateAbbr = alias ? alias.state : (city.name.split(",")[1] ?? "").trim().toLowerCase();
  if (!stateAbbr) return null;

  for (const m of metros) {
    const [placePart, statePart = ""] = String(m.name).split(/,\s*/);
    const states = statePart.replace(/\(.*/, "").split("-").map((x) => x.trim().toLowerCase());
    if (!states.includes(stateAbbr)) continue;

    const principals = placePart.split("-").map((x) => x.trim().toLowerCase());
    if (principals.includes(cityName)) return m;
  }
  return null;
}

async function write() {
  const year = await latestYear(TABLES.metroRpp);
  console.log(`Using BEA year ${year}\n`);

  console.log("Resolving line codes:");
  const rppLine = await findLineCode(TABLES.metroRpp, /all items/i, "all-items");
  const pceLine = await findLineCode(TABLES.statePce, /^total|personal consumption expenditures$/i, "total PCE");

  console.log("\nFetching…");
  const [metroRaw, stateRppRaw, statePceRaw] = await Promise.all([
    bea({ method: "GetData", datasetname: "Regional", TableName: TABLES.metroRpp, LineCode: rppLine, GeoFips: "MSA", Year: year }),
    bea({ method: "GetData", datasetname: "Regional", TableName: TABLES.stateRpp, LineCode: rppLine, GeoFips: "STATE", Year: year }),
    bea({ method: "GetData", datasetname: "Regional", TableName: TABLES.statePce, LineCode: pceLine, GeoFips: "STATE", Year: year }),
  ]);

  const metros = (metroRaw.Data ?? [])
    .map((r) => ({ fips: r.GeoFips, name: String(r.GeoName ?? ""), rpp: numeric(r.DataValue) }))
    .filter((m) => m.rpp !== null);

  const stateRpp = new Map();
  for (const r of stateRppRaw.Data ?? []) {
    const v = numeric(r.DataValue);
    if (v !== null) stateRpp.set(String(r.GeoName ?? "").trim().toLowerCase(), v);
  }

  const statePce = new Map();
  for (const r of statePceRaw.Data ?? []) {
    const v = numeric(r.DataValue);
    if (v !== null) statePce.set(String(r.GeoName ?? "").trim().toLowerCase(), v);
  }

  console.log(`  metros with an RPP: ${metros.length}`);
  console.log(`  states with an RPP: ${stateRpp.size}`);
  console.log(`  states with per-capita PCE: ${statePce.size}`);

  const { CITIES, isUS, STATE_NAMES } = await loadCities();
  const out = [];
  const unmatched = [];

  for (const city of CITIES.filter((c) => isUS(c.state))) {
    const stateName = STATE_NAMES[city.state];
    if (!stateName) { unmatched.push(`${city.name} (no state name for "${city.state}")`); continue; }

    const pce = statePce.get(stateName.toLowerCase());
    const sRpp = stateRpp.get(stateName.toLowerCase());
    if (pce == null || sRpp == null) { unmatched.push(`${city.name} (no state PCE/RPP for ${stateName})`); continue; }

    const metro = matchMetro(city, metros);
    // National per-capita spending, re-priced to this place. The state's own
    // RPP divides out so the metro adjustment is relative to its state, not
    // applied twice.
    const rpp = metro ? metro.rpp : sRpp;
    const col = Math.round((pce * (rpp / sRpp)) / 100) * 100;

    out.push({
      key: city.key,
      name: city.name,
      col,
      rpp,
      basis: metro ? "metro" : "state",
      geo: metro ? metro.name : stateName,
    });
  }

  const cols = out.map((o) => o.col).sort((a, b) => a - b);
  const metroCount = out.filter((o) => o.basis === "metro").length;

  console.log(`\nComputed ${out.length} cities — ${metroCount} priced at metro level, ${out.length - metroCount} at state level.`);
  console.log(`  lowest:  ${cols[0]?.toLocaleString()}`);
  console.log(`  median:  ${cols[Math.floor(cols.length / 2)]?.toLocaleString()}`);
  console.log(`  highest: ${cols[cols.length - 1]?.toLocaleString()}`);
  if (unmatched.length) {
    console.log(`\n${unmatched.length} could not be priced:`);
    for (const u of unmatched.slice(0, 20)) console.log(`  ${u}`);
  }

  console.log("\nSample:");
  for (const o of out.slice(0, 8)) {
    console.log(`  ${o.name.padEnd(24)} ${String(o.col).padStart(7)}  rpp ${o.rpp}  ${o.basis}  ${o.geo.slice(0, 44)}`);
  }

  const file = `// Generated by scripts/import-bea-col.mjs — do not edit by hand.
//
// Source: US Bureau of Economic Analysis, Regional Price Parities (${TABLES.metroRpp}/${TABLES.stateRpp})
// and per-capita Personal Consumption Expenditures (${TABLES.statePce}), ${year}.
// Public domain. https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area
//
// col = state per-capita consumer spending, re-priced to the place:
//         statePCE x (placeRPP / stateRPP)
//
// basis "metro" means the city sits in a metro area with its own price parity.
// basis "state" means it does not, and carries its state's price level — an
// estimate, and labelled as one wherever it is shown.

export const BEA_YEAR = ${year};

export interface BeaCityCol {
  col: number;
  rpp: number;
  basis: "metro" | "state";
  geo: string;
}

export const BEA_CITY_COL: Record<string, BeaCityCol> = {
${out.map((o) => `  ${JSON.stringify(o.key)}: { col: ${o.col}, rpp: ${o.rpp}, basis: ${JSON.stringify(o.basis)}, geo: ${JSON.stringify(o.geo)} },`).join("\n")}
};
`;

  const target = new URL("../lib/city-col.generated.ts", import.meta.url);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(target, file);
  console.log(`\nWrote lib/city-col.generated.ts (${out.length} cities, BEA ${year}).`);
  console.log("Nothing else changed — wiring this into fire-data.ts is a separate, reviewable step.");
}

/** Read CITIES without importing TypeScript: parse the literal out of the source. */
async function loadCities() {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../lib/fire-data.ts", import.meta.url), "utf8");

  const CITIES = [];
  for (const line of src.split("\n")) {
    // Both quote styles: one entry is double-quoted because the name has an
    // apostrophe (Xi'an). A single-quote-only pattern drops it silently.
    const m = line.match(/\{\s*name:\s*(['"])(.+?)\1,\s*key:\s*'([^']+)',\s*col:\s*(\d+),\s*state:\s*'([^']+)'/);
    if (m) CITIES.push({ name: m[2], key: m[3], col: Number(m[4]), state: m[5] });
  }
  if (!CITIES.length) throw new Error("Parsed zero cities out of lib/fire-data.ts — the literal format must have changed.");

  const usIntl = src.match(/US_INTL\s*=\s*new Set\(\[([^\]]*)\]/s);
  const intl = new Set((usIntl?.[1] ?? "").match(/'([^']+)'/g)?.map((x) => x.slice(1, -1)) ?? []);
  const isUS = (state) => !intl.has(state);

  const us = CITIES.filter((c) => isUS(c.state));
  const missing = [...new Set(us.map((c) => c.state))].filter((k) => !STATE_TO_BEA[k]);
  if (missing.length) {
    throw new Error(`No BEA state name mapped for: ${missing.join(", ")} — add them to STATE_TO_BEA.`);
  }

  console.log(`\nParsed ${CITIES.length} cities (${us.length} US) from fire-data.ts`);
  return { CITIES, isUS, STATE_NAMES: STATE_TO_BEA };
}

try {
  await (MODE === "write" ? write() : report());
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exit(1);
}
