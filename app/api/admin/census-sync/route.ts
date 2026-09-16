import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { NON_HOUSING_ANNUAL_USD, fetchCityRents } from "@/lib/census";
import { JOBS, finishJobRun, startJobRun } from "@/lib/lifecycle";

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

  const { data, error } = await auth.admin.from("city_rent").select("*").order("col", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({
    cities: rows,
    year: rows[0]?.acs_year ?? null,
    syncedAt: rows[0]?.synced_at ?? null,
    placeCount: rows.filter((r) => r.basis === "place").length,
    nonHousing: NON_HOUSING_ANNUAL_USD,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const runId = await startJobRun(admin, JOBS.CENSUS_SYNC);

  try {
    let result: Awaited<ReturnType<typeof fetchCityRents>> | null = null;
    const failures: string[] = [];

    for (const year of candidateYears()) {
      try {
        const attempt = await fetchCityRents(year);
        if (attempt.cities.length) { result = attempt; break; }
        failures.push(`${year}: matched nothing`);
      } catch (err) {
        failures.push(`${year}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!result) {
      throw new Error(`No ACS vintage returned usable rents. Tried — ${failures.join(" | ")}`);
    }

    const syncedAt = new Date().toISOString();
    const { error } = await admin.from("city_rent").upsert(
      result.cities.map((c) => ({
        city_key: c.key,
        name: c.name,
        rent: c.rent,
        col: c.col,
        geo: c.geo,
        basis: c.basis,
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
      nonHousing: NON_HOUSING_ANNUAL_USD,
      unmatched: result.unmatched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishJobRun(admin, runId, { status: "error", error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
