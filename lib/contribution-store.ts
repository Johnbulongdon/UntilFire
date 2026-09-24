/**
 * Persistence for the Next contribution plan.
 *
 * Two stores, deliberately. Supabase is the record: it survives a cleared
 * browser, follows the user to another device, and is what a server-side
 * monthly email will read. localStorage stays as a cache, so the tab renders
 * instantly and still works signed out or offline.
 *
 * The plan is stored as numbers rather than the strings the inputs hold.
 * The email step reads this server-side, and asking a cron to parse "1,060"
 * out of a text field is the kind of thing that works until someone types a
 * currency symbol.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  newerPlan, planHasContent, rowsToPlan, sanitiseLadder, type AssetPlan,
  type ContributionPlan, type Frequency, type PlanRow, type StoredPlan,
} from "@/lib/contribution";
import type { ContributionSchedule } from "@/lib/contribution-schedule";

export {
  EMPTY_LADDER, ladderToStored, newerPlan, planHasContent, planToRows,
  rowsToPlan, sanitiseLadder, stampPlan, storedToLadder,
} from "@/lib/contribution";
export type { DebtRow, LadderFields, PlanRow, StoredPlan } from "@/lib/contribution";

export const PLAN_STORAGE_KEY = "uf_contribution_v1";

/* This store rebuilds the plan field by field rather than spreading it, so
   every new field has to be added here too — forgetting one is silent, and
   looks exactly like "my setting did not save". */
export function sanitiseSchedule(raw: unknown): ContributionSchedule | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Partial<ContributionSchedule>;
  const cadence = c.cadence === "weekly" ? "weekly" : "monthly";
  const max = cadence === "weekly" ? 6 : 31;
  const min = cadence === "weekly" ? 0 : 1;
  const day = typeof c.anchorDay === "number" && Number.isFinite(c.anchorDay)
    ? Math.min(max, Math.max(min, Math.round(c.anchorDay)))
    : min;
  return { cadence, anchorDay: day };
}

/** `undefined` means the field was never written and the legacy `budget`
 *  still applies; `null` means the user chose to follow their cash. */
export function sanitiseOverride(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return undefined;
}

export function readLocalPlan(): StoredPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPlan> & { rows?: PlanRow[] };
    // The first version of the tab stored the UI rows verbatim, with
    // percentages as display strings. Anyone who used it between that release
    // and this one has a plan in that shape; read it rather than drop it.
    if (!Array.isArray(parsed.targets) && Array.isArray(parsed.rows)) {
      return rowsToPlan(
        parsed.rows,
        String((parsed as { budget?: unknown }).budget ?? ""),
        parsed.frequency ?? "monthly",
      );
    }
    if (!Array.isArray(parsed.targets)) return null;
    return {
      targets: parsed.targets,
      holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
      budget: typeof parsed.budget === "number" ? parsed.budget : 0,
      frequency: parsed.frequency ?? "monthly",
      ladder: sanitiseLadder(parsed.ladder),
      contribution: sanitiseSchedule(parsed.contribution),
      budgetOverride: sanitiseOverride(parsed.budgetOverride),
      updatedAt: typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;   // blocked storage, or a shape from before this version
  }
}

export function writeLocalPlan(plan: StoredPlan): void {
  try { localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan)); } catch { /* private mode */ }
}

/* The column and table arrive in 0041. Code and migrations do not land at the
   same instant, so every call below treats a missing schema as "no cloud
   plan" rather than an error — the tab keeps working off localStorage until
   the migration is applied. */
let schemaWarned = false;
function tolerate(where: string, error: unknown): null {
  if (!schemaWarned) {
    schemaWarned = true;
    console.info(`[contribution] ${where} unavailable — using local storage only.`, error);
  }
  return null;
}

async function userId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch { return null; }
}

export async function loadCloudPlan(): Promise<StoredPlan | null> {
  const uid = await userId();
  if (!uid) return null;
  try {
    const { data, error } = await supabase
      .from("profiles").select("contribution_plan").eq("user_id", uid).maybeSingle();
    if (error) return tolerate("profiles.contribution_plan", error);
    const plan = data?.contribution_plan as StoredPlan | null | undefined;
    if (!plan || !Array.isArray(plan.targets)) return null;
    return {
      ...plan,
      ladder: sanitiseLadder(plan.ladder),
      contribution: sanitiseSchedule(plan.contribution),
      budgetOverride: sanitiseOverride(plan.budgetOverride),
    };
  } catch (err) { return tolerate("profiles.contribution_plan", err); }
}

/** Why a save did not reach the account, when it did not. "signed-out" and
 *  "failed" are different things to tell a user: one of them is fixed by
 *  signing in, and telling the other to sign in is simply wrong. */
export type SaveResult = "saved" | "signed-out" | "failed";

export async function saveCloudPlan(plan: StoredPlan): Promise<SaveResult> {
  const uid = await userId();
  if (!uid) return "signed-out";
  try {
    const { error } = await supabase.from("profiles").update({ contribution_plan: plan }).eq("user_id", uid);
    if (error) { tolerate("profiles.contribution_plan", error); return "failed"; }
    return "saved";
  } catch (err) { tolerate("profiles.contribution_plan", err); return "failed"; }
}

/** First of the current month, as the date the snapshot is keyed by. */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * One row per user per month, upserted — a second visit in the same month
 * updates it rather than adding a row, so the snapshot is the most recent
 * state of that month rather than whichever visit happened to be first.
 *
 * Written when the tab is opened, not by a cron, so a month with no visit has
 * no row. That gap is honest: holdings are priced live and stored nowhere
 * else, so a month nobody looked at cannot be reconstructed after the fact.
 */
export async function saveSnapshot(
  computed: ContributionPlan,
  budget: number,
  frequency: Frequency,
  now = new Date(),
): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  const totalValue = computed.assets.reduce((sum, a) => sum + a.value, 0);
  if (totalValue <= 0) return false;   // nothing held yet; no state worth recording
  try {
    const { error } = await supabase.from("contribution_snapshots").upsert({
      user_id: uid,
      month: currentMonthKey(now),
      total_value: totalValue,
      budget,
      frequency,
      assets: computed.assets.map((a: AssetPlan) => ({
        symbol: a.symbol, value: a.value, targetPct: a.targetPct,
        currentPct: a.currentPct, deviation: a.deviation,
        allocated: a.adjusted, status: a.status,
      })),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,month" });
    if (error) { tolerate("contribution_snapshots", error); return false; }
    return true;
  } catch (err) { tolerate("contribution_snapshots", err); return false; }
}

/**
 * Which accounts the user has chosen as their emergency fund, from the saved
 * plan, for surfaces other than the Contributions page.
 *
 * The emergency fund used to have two definitions: Contributions followed the
 * accounts ticked there, while Net Worth counted savings accounts only — so
 * ticking a checking account changed one page and not the other. Reading the
 * same saved choice keeps them one answer. `null` means no choice has been
 * made, which resolves to savings accounts, exactly as on Contributions.
 */
export function useSavedEmergencyAccountIds(): string[] | null {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const local = readLocalPlan();
    if (local?.ladder) setIds(local.ladder.efAccountIds);
    void loadCloudPlan().then((cloud) => {
      if (cancelled) return;
      const winner = newerPlan(local, cloud);
      if (winner?.ladder) setIds(winner.ladder.efAccountIds);
    });
    return () => { cancelled = true; };
  }, []);
  return ids;
}
