import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { fetchCityCosts } from "@/lib/bea";
import { JOBS, finishJobRun, startJobRun } from "@/lib/lifecycle";

/**
 * GET  — what is currently stored, so the tab renders without calling BEA.
 * POST — fetch from BEA, compute, store. Nothing a visitor sees changes until
 *        the figures are promoted into fire-data.ts, which is a separate
 *        reviewed step: these numbers appear on ~236 public pages.
 */

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.admin
    .from("city_col")
    .select("*")
    .order("col", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({
    cities: rows,
    year: rows[0]?.bea_year ?? null,
    syncedAt: rows[0]?.synced_at ?? null,
    metroCount: rows.filter((r) => r.basis === "metro").length,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  if (!process.env.BEA_API_KEY) {
    return NextResponse.json(
      { error: "BEA_API_KEY is not set in this deployment. Add it in Vercel, then redeploy — Vercel applies env vars at deploy time." },
      { status: 503 },
    );
  }

  // Recorded like any other job, so a failed sync leaves a trace in the
  // Retention tab rather than only in a toast that has already been dismissed.
  const runId = await startJobRun(admin, JOBS.BEA_SYNC);

  try {
    const result = await fetchCityCosts(process.env.BEA_API_KEY);
    if (!result.cities.length) throw new Error("BEA returned no usable rows — nothing was written.");

    const syncedAt = new Date().toISOString();
    const { error } = await admin.from("city_col").upsert(
      result.cities.map((c) => ({
        city_key: c.key,
        name: c.name,
        col: c.col,
        rpp: c.rpp,
        rpp_blended: c.rppBlended,
        rpp_rents: c.rppRents,
        rpp_goods: c.rppGoods,
        rpp_other: c.rppOther,
        basis: c.basis,
        geo: c.geo,
        previous: c.previous,
        bea_year: result.year,
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
      metroCount: result.metroCount,
      components: result.components,
      unmatched: result.unmatched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishJobRun(admin, runId, { status: "error", error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
