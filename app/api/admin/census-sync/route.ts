import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  NON_HOUSING_ANNUAL_USD,
  fetchCityRents,
  inspectRentTables,
  inspectTableVariables,
} from "@/lib/census";
import { JOBS, finishJobRun, startJobRun } from "@/lib/lifecycle";
import { BUDGET_WEIGHTS } from "@/lib/bea";

/**
 * GET  — what is stored, so the tab renders without calling Census.
 * POST — fetch rents, compute, store.
 *
 * Nothing a visitor sees changes here. Promoting into fire-data.ts is a
 * separate reviewed step, as with every other importer.
 */

// Two requests per state, sequential by state so a partial failure is legible.
export const maxDuration = 300;

/**
 * ACS 5-year estimates land about a year behind. Walk back from the most
 * recent plausible vintage rather than pinning one, so this keeps working next
 * year without an edit — and so a year that is not published yet falls back
 * instead of failing.
 */
function candidateYears(): number[] {
  const current = new Date().getFullYear();
  return [current - 1, current - 2, current - 3];
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;

  // ?inspect=1 lists rent tables cut by when the tenant moved in; ?inspect=B25xxx
  // lists that table's variables. Read-only — it writes nothing and changes
  // nothing, so a wrong guess costs a page refresh rather than 226 wrong rows.
  const inspect = new URL(req.url).searchParams.get("inspect");
  if (inspect) {
    if (!process.env.CENSUS_API_KEY) {
      return NextResponse.json({ error: "CENSUS_API_KEY is not set in this deployment." }, { status: 503 });
    }
    const year = new Date().getFullYear() - 2;
    try {
      const tables =
        inspect === "1"
          ? await inspectRentTables(year, process.env.CENSUS_API_KEY)
          : await inspectTableVariables(year, process.env.CENSUS_API_KEY, inspect);
      return NextResponse.json({ year, inspect, tables });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
    }
  }

  const { data, error } = await auth.admin.from("city_rent").select("*").order("col", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({
    cities: rows,
    year: rows[0]?.acs_year ?? null,
    syncedAt: rows[0]?.synced_at ?? null,
    placeCount: rows.filter((r) => r.basis === "place").length,
    marketCount: rows.filter((r) => r.rent_source === "market").length,
    cappedCount: rows.filter((r) => r.rent_capped).length,
    nonHousing: NON_HOUSING_ANNUAL_USD,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  if (!process.env.CENSUS_API_KEY) {
    return NextResponse.json(
      {
        error:
          "CENSUS_API_KEY is not set in this deployment. Request one free at api.census.gov/data/key_signup.html — it arrives by email in a minute. Add it in Vercel, then redeploy, since Vercel applies env vars at deploy time.",
      },
      { status: 503 },
    );
  }

  const runId = await startJobRun(admin, JOBS.CENSUS_SYNC);

  try {
    // Non-housing price level per city, from the BEA components already stored.
    // Rents are excluded on purpose — housing is the other half of the sum and
    // including it here would price the same thing twice. Cities with no BEA
    // row simply carry the national baseline unscaled.
    const { data: parities } = await admin
      .from("city_col")
      .select("city_key, rpp_goods, rpp_other");

    const weight = BUDGET_WEIGHTS.goods + BUDGET_WEIGHTS.other;
    const nonHousingIndex = new Map<string, number>();
    for (const p of parities ?? []) {
      const goods = Number(p.rpp_goods);
      const other = Number(p.rpp_other);
      if (!Number.isFinite(goods) || !Number.isFinite(other)) continue;
      nonHousingIndex.set(
        p.city_key,
        (goods * BUDGET_WEIGHTS.goods + other * BUDGET_WEIGHTS.other) / weight,
      );
    }

    let result: Awaited<ReturnType<typeof fetchCityRents>> | null = null;
    const failures: string[] = [];

    for (const year of candidateYears()) {
      try {
        const attempt = await fetchCityRents(year, process.env.CENSUS_API_KEY, nonHousingIndex);
        if (attempt.cities.length) { result = attempt; break; }
        failures.push(`${year}: matched nothing`);
      } catch (err) {
        failures.push(`${year}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!result) {
      const distinct = [...new Set(failures.map((f) => f.replace(/^\d{4}: /, "")))];
      throw new Error(
        distinct.length === 1
          ? distinct[0]
          : `No ACS vintage returned usable rents. Tried — ${failures.join(" | ")}`,
      );
    }

    const syncedAt = new Date().toISOString();
    const { error } = await admin.from("city_rent").upsert(
      result.cities.map((c) => ({
        city_key: c.key,
        name: c.name,
        rent: c.rent,
        market_rent: c.marketRent,
        rent_source: c.rentSource,
        col: c.col,
        housing_annual: c.housingAnnual,
        non_housing_annual: c.nonHousingAnnual,
        non_housing_index: c.nonHousingIndex,
        rent_capped: c.capped,
        geo: c.geo,
        basis: c.basis,
        matched_by: c.matchedBy,
        previous: c.previous,
        acs_year: result.year,
        synced_at: syncedAt,
      })),
      { onConflict: "city_key" },
    );
    if (error) throw new Error(`Could not store: ${error.message}`);

    await finishJobRun(admin, runId, {
      status: "ok",
      considered: result.cities.length + result.unmatched.length,
      acted: result.cities.length,
    });

    return NextResponse.json({
      year: result.year,
      count: result.cities.length,
      placeCount: result.cities.filter((c) => c.basis === "place").length,
      looseCount: result.cities.filter((c) => c.matchedBy === "prefix" || c.matchedBy === "contains").length,
      marketCount: result.cities.filter((c) => c.rentSource === "market").length,
      cappedCount: result.cities.filter((c) => c.capped).length,
      scaledCount: result.cities.filter((c) => c.nonHousingIndex !== null).length,
      moverLabel: result.moverLabel,
      nonHousing: NON_HOUSING_ANNUAL_USD,
      unmatched: result.unmatched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishJobRun(admin, runId, { status: "error", error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
