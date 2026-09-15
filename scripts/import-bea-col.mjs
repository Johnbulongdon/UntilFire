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
 * --report exists because the person who wrote this could not reach BEA to
 * check its shape. It discovers the real table names, years and row format and
 * prints them, so the first run proves what is there instead of trusting the
 * table codes guessed below.
 */

const KEY = process.env.BEA_API_KEY;
const BASE = "https://apps.bea.gov/api/data/";

// Best guesses, to be confirmed by --report. MARPP/SARPP are the Regional
// Price Parity tables; SAPCE1 is per-capita personal consumption expenditure.
const GUESS = {
  metroRpp: "MARPP",
  stateRpp: "SARPP",
  statePce: "SAPCE1",
  allItemsLineCode: "1",
};

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
  console.log("\nGuessed codes:", JSON.stringify(GUESS));

  head("4. Which years are available? (settles the 2008 question)");
  for (const table of [GUESS.metroRpp, GUESS.stateRpp]) {
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
      TableName: GUESS.metroRpp,
      LineCode: GUESS.allItemsLineCode,
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
      TableName: GUESS.statePce,
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
