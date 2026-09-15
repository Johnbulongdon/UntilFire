import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { fetchHousingCosts, resolveCounties, type CountyRef } from "@/lib/housing";
import { JOBS, finishJobRun, startJobRun } from "@/lib/lifecycle";

/**
 * GET  — what is stored, so the tab renders without calling HUD.
 * POST — resolve counties, fetch Fair Market Rents, store.
 *
 * Nothing a visitor sees changes here. These figures land in city_housing for
 * review and are promoted separately, the same rule the BEA import follows.
 */

// Resolving 226 cities means up to 226 geocoder calls on the first run, and
// each is a round trip. Subsequent runs read the cached counties and are fast.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;

  const [housing, counties] = await Promise.all([
    auth.admin.from("city_housing").select("*").order("monthly_rent", { ascending: false }),
    auth.admin.from("city_county").select("city_key", { count: "exact", head: true }),
  ]);
  if (housing.error) return NextResponse.json({ error: housing.error.message }, { status: 500 });

  const rows = housing.data ?? [];
  return NextResponse.json({
    cities: rows,
    year: rows[0]?.fmr_year ?? null,
    syncedAt: rows[0]?.synced_at ?? null,
    smallAreaCount: rows.filter((r) => r.small_area).length,
    countiesResolved: counties.count ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  if (!process.env.HUD_API_KEY) {
    return NextResponse.json(
      {
        error:
          "HUD_API_KEY is not set in this deployment. Register free at huduser.gov/hudapi/public/register, add the token in Vercel, then redeploy — Vercel applies env vars at deploy time.",
      },
      { status: 503 },
    );
  }

  const year = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear();

  const runId = await startJobRun(admin, JOBS.HOUSING_SYNC);

  try {
    // Counties already resolved — including any corrected by hand, which must
    // not be overwritten by a geocoder guess on the next run.
    const { data: cached } = await admin.from("city_county").select("city_key, county_fips, county_name");
    const known = new Map<string, CountyRef>(
      (cached ?? []).map((c) => [c.city_key, { cityKey: c.city_key, countyFips: c.county_fips, countyName: c.county_name }]),
    );

    // Resolve first, banking each batch. If the function times out during this
    // phase the work survives and a second click carries on from here.
    const { counties, failed } = await resolveCounties(known, async (batch) => {
      await admin.from("city_county").upsert(
        batch.map((c) => ({ city_key: c.cityKey, county_fips: c.countyFips, county_name: c.countyName, source: "geocoder" })),
        { onConflict: "city_key" },
      );
    });

    const result = await fetchHousingCosts(process.env.HUD_API_KEY, year, counties);
    if (!result.cities.length) {
      throw new Error(
        `HUD returned no usable rents for ${year} — nothing was written. First problem: ${result.unresolved[0] ?? failed[0] ?? "none reported"}`,
      );
    }

    const syncedAt = new Date().toISOString();
    const { error } = await admin.from("city_housing").upsert(
      result.cities.map((c) => ({
        city_key: c.key,
        name: c.name,
        county_fips: c.countyFips,
        county_name: c.countyName,
        monthly_rent: c.monthlyRent,
        rent_0br: c.rents["Efficiency"] ?? null,
        rent_1br: c.rents["One-Bedroom"] ?? null,
        rent_2br: c.rents["Two-Bedroom"] ?? null,
        rent_3br: c.rents["Three-Bedroom"] ?? null,
        rent_4br: c.rents["Four-Bedroom"] ?? null,
        small_area: c.smallArea,
        fmr_year: c.fmrYear,
        synced_at: syncedAt,
      })),
      { onConflict: "city_key" },
    );
    if (error) throw new Error(`Could not store: ${error.message}`);

    await finishJobRun(admin, runId, {
      status: "ok",
      considered: result.cities.length + result.unresolved.length,
      acted: result.cities.length,
    });

    return NextResponse.json({
      year: result.year,
      count: result.cities.length,
      newlyResolved: counties.size - known.size,
      unresolved: [...failed, ...result.unresolved],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishJobRun(admin, runId, { status: "error", error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
