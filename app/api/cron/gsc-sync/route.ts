import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { JOBS, finishJobRun, startJobRun } from "@/lib/lifecycle";
import {
  dayOffset,
  gscConfig,
  querySearchAnalytics,
  type GscDimension,
  type GscRow,
} from "@/lib/search-console";

/**
 * Pull Search Console into our own database, once a day.
 *
 * Three windows rather than one, because the three shapes have different
 * costs and different half-lives:
 *
 *  - totals, 90 days: 90 rows. Cheap enough to re-read in full every run, and
 *    it is the trend anyone actually looks at.
 *  - pages and queries, 10 days: the per-day breakdown is the expensive one,
 *    and only the recent end of it changes. Older days were already captured
 *    by earlier runs and are settled.
 *
 * Ten days rather than three: Search Console is incomplete for about three
 * days and keeps revising for a few more, and a run that fails silently for a
 * week should heal itself on the next success rather than leave a hole.
 */
const TOTALS_DAYS = 90;
const BREAKDOWN_DAYS = 10;
const ROW_LIMIT = 5000;

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = gscConfig();
  if (!config) {
    // Not an error: the job is switched off until the service account exists.
    return NextResponse.json(
      { status: "not_configured", need: ["GSC_CLIENT_EMAIL", "GSC_PRIVATE_KEY", "GSC_SITE_URL"] },
      { status: 503 },
    );
  }

  // ?days= backfills further on a manual run. Google serves at most 16 months.
  const requested = Number(new URL(req.url).searchParams.get("days"));
  const totalsDays = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 480) : TOTALS_DAYS;
  const breakdownDays = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 480) : BREAKDOWN_DAYS;

  const admin = adminClient();
  const runId = await startJobRun(admin, JOBS.GSC_SYNC);

  try {
    const endDate = dayOffset(1);
    const plan: Array<{ dimension: "total" | "page" | "query"; dimensions: GscDimension[]; days: number }> = [
      { dimension: "total", dimensions: ["date"], days: totalsDays },
      { dimension: "page", dimensions: ["date", "page"], days: breakdownDays },
      { dimension: "query", dimensions: ["date", "query"], days: breakdownDays },
    ];

    let written = 0;
    for (const step of plan) {
      const rows: GscRow[] = await querySearchAnalytics(config, {
        startDate: dayOffset(step.days),
        endDate,
        dimensions: step.dimensions,
        rowLimit: ROW_LIMIT,
      });

      const records = rows.map((row) => ({
        date: row.keys[0],
        dimension: step.dimension,
        // '' for totals, never null — the unique constraint that makes this
        // upsert idempotent cannot compare nulls.
        dimension_value: row.keys[1] ?? "",
        clicks: Math.round(row.clicks ?? 0),
        impressions: Math.round(row.impressions ?? 0),
        ctr: row.ctr ?? null,
        position: row.position ?? null,
        fetched_at: new Date().toISOString(),
      }));

      // Chunked: a 5,000-row upsert in one statement is a large request body
      // and one bad row fails the lot.
      for (let i = 0; i < records.length; i += 500) {
        const chunk = records.slice(i, i + 500);
        const { error } = await admin
          .from("seo_search_console")
          .upsert(chunk, { onConflict: "date,dimension,dimension_value" });
        if (error) throw new Error(`Upsert failed for ${step.dimension}: ${error.message}`);
        written += chunk.length;
      }
    }

    await finishJobRun(admin, runId, { status: "ok", considered: written, acted: written });
    return NextResponse.json({ status: "ok", rows: written, through: endDate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishJobRun(admin, runId, { status: "error", error: message });
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
