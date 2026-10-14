import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient } from "@/lib/plaid";
import { removePlaidItems, type RemovableItem } from "@/lib/plaid-remove";
import { planBankCleanup, type CleanupUser } from "@/lib/bank-cleanup";
import { fetchAllPages } from "@/lib/supabase-pages";

/**
 * Disconnect banks that cost a Plaid fee and earn nothing (lib/bank-cleanup):
 * free accounts idle 30 days, and extra banks 7 days after Pro ends. Runs at
 * 08:00 UTC, before the daily sync, so nothing removed is refreshed first.
 *
 * Disconnecting can't be undone, so it only reports what it would remove
 * until BANK_CLEANUP=on is set. It also does nothing when activity can't be
 * read (the 0051 migration not applied yet): unknown means don't touch.
 */
export const maxDuration = 300;

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
  const admin = adminClient();
  const live = process.env.BANK_CLEANUP === "on";

  const [items, subs, members, profiles] = await Promise.all([
    fetchAllPages((from, to) => admin.from("plaid_items").select("id, user_id, plaid_access_token, institution_name, created_at").order("id").range(from, to)),
    fetchAllPages((from, to) => admin.from("subscriptions").select("user_id, status, plan, updated_at").order("user_id").range(from, to)),
    fetchAllPages((from, to) => admin.from("household_members").select("household_id, user_id").order("user_id").range(from, to)),
    fetchAllPages((from, to) => admin.from("profiles").select("user_id, last_active_at").order("user_id").range(from, to)),
  ]);
  const failedRead = [items, subs, members, profiles].find((r) => r.error || !r.data);
  if (failedRead) {
    console.error("[cron/bank-cleanup] read failed:", failedRead.error?.message ?? "no data");
    return NextResponse.json({ error: "Could not read accounts; nothing removed." }, { status: 500 });
  }

  // Pro on their own subscription, or through anyone in their household.
  const ownPro = new Set(subs.data!.filter((s) => s.status === "active" && s.plan === "pro").map((s) => s.user_id as string));
  const proHouseholds = new Set(members.data!.filter((m) => ownPro.has(m.user_id)).map((m) => m.household_id as string));
  const householdPro = new Set(members.data!.filter((m) => proHouseholds.has(m.household_id)).map((m) => m.user_id as string));
  const subOf = new Map(subs.data!.map((s) => [s.user_id as string, s]));
  const activeOf = new Map(profiles.data!.map((p) => [p.user_id as string, p.last_active_at as string | null]));

  const users = new Map<string, CleanupUser>();
  for (const it of items.data!) {
    const id = it.user_id as string;
    const sub = subOf.get(id);
    users.set(id, {
      pro: ownPro.has(id) || householdPro.has(id),
      proEndedAt: sub && !ownPro.has(id) ? (sub.updated_at as string) : null,
      lastActiveAt: activeOf.get(id) ?? null,
    });
  }
  const ids = new Set(planBankCleanup(items.data! as { id: string; user_id: string; created_at: string }[], users, new Date()));
  const doomed = (items.data! as (RemovableItem & { user_id: string })[]).filter((i) => ids.has(i.id));

  if (!live) return NextResponse.json({ live, wouldRemove: doomed.length, of: items.data!.length });

  const { removed, failed } = await removePlaidItems(getPlaidClient(), doomed);
  // Gone at Plaid, so the rows are only dead tokens now. Transactions stay.
  if (removed.length > 0) await admin.from("plaid_items").delete().in("id", removed);
  for (const f of failed) console.error("[cron/bank-cleanup]", f.institution, f.errorCode ?? "no code");
  return NextResponse.json({ live, removed: removed.length, failed: failed.length, of: items.data!.length });
}
