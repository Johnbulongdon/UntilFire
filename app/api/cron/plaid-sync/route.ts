import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient } from "@/lib/plaid";
import { syncPlaidItem } from "@/lib/plaid-sync";
import { plaidErrorCode, plaidErrorOutcome, summariseRefresh, type ItemRun } from "@/lib/plaid-errors";
import { fetchAllPages } from "@/lib/supabase-pages";
import { JOBS, finishJobRun, startJobRun } from "@/lib/lifecycle";

/**
 * Refresh every connected bank once a day.
 *
 * Balances and transactions used to move only when someone pressed Sync on a
 * connection, so the figures built on them — the contribution that is safe to
 * make, the emergency fund, last month's needs — were as old as the last
 * press, which in practice was weeks or months. This runs the same work as
 * the Sync button (lib/plaid-sync.ts) for every connection, at 09:00 UTC.
 *
 * Longest-unsynced first, and no new connection is started once the run is
 * near its time limit: if there are ever too many to finish in one run, the
 * ones left over go first tomorrow instead of being starved.
 */
export const maxDuration = 300;
const STOP_STARTING_AFTER_MS = 240_000;

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

  const startedAt = Date.now();
  const admin = adminClient();
  const runId = await startJobRun(admin, JOBS.PLAID_SYNC);

  try {
    const { data: items, error } = await fetchAllPages((from, to) => admin
      .from("plaid_items")
      .select("id, user_id, plaid_access_token, cursor, institution_name, last_synced_at")
      .order("last_synced_at", { ascending: true, nullsFirst: true })
      .order("id")
      .range(from, to));
    if (error || !items) throw new Error(`could not read connections: ${error?.message ?? "no data"}`);

    const plaid = getPlaidClient();
    const runs: ItemRun[] = [];
    let deferred = 0;
    for (const item of items) {
      if (Date.now() - startedAt > STOP_STARTING_AFTER_MS) { deferred++; continue; }
      const institution = item.institution_name ?? "a connection";
      try {
        await syncPlaidItem(admin, plaid, {
          id: item.id, user_id: item.user_id,
          plaid_access_token: item.plaid_access_token, cursor: item.cursor ?? null,
        });
        runs.push({ institution, ok: true });
      } catch (err) {
        const errorCode = plaidErrorCode(err);
        runs.push({ institution, ok: false, errorCode });
        if (plaidErrorOutcome(errorCode) === "unexpected") console.error("[cron/plaid-sync]", institution, errorCode ?? err);
      }
    }

    const summary = summariseRefresh(runs);
    const note = deferred ? `${deferred} left for the next run (time limit)` : null;
    await finishJobRun(admin, runId, {
      ...summary,
      error: [summary.error, note].filter(Boolean).join("; ") || undefined,
    });
    return NextResponse.json({ refreshed: summary.acted, of: items.length, deferred, status: summary.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/plaid-sync]", message);
    await finishJobRun(admin, runId, { status: "error", error: message });
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
