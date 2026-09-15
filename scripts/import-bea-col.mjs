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
const TABLES = {
  metroRpp: "MARPP",
  portionRpp: "PARPP",
  stateRpp: "SARPP",
  statePce: "SAPCE2",
};

// Confirmed by the report before this is trusted.
const METRO_ALL_ITEMS_LINE = "1";

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
      LineCode: METRO_ALL_ITEMS_LINE,
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

async function write() {
  console.error("--write is not implemented yet, deliberately.");
  console.error("Run --report first: the table codes above are guesses, and an");
  console.error("importer built on a wrong guess writes plausible nonsense into");
  console.error("every city page. Once the report confirms the shape, this gets");
  console.error("filled in against real columns.");
  process.exit(1);
}

try {
  await (MODE === "write" ? write() : report());
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exit(1);
}
