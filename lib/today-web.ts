/**
 * The website's Today strip (D-73, D-89): the phone's Today list cut to the
 * kinds that need no extra screens — the payday plan when pay lands (D-150,
 * lib/payday-plan), last month's story once it is ready (D-151,
 * lib/month-story), the one-time "We sorted your buys" and
 * need or want on a spend from a shop that sells both (D-106), a bill
 * due tomorrow, the lease's "Stay or move?" (lib/lease.ts) and the one-time Rent
 * or Mortgage question. Safe to spend today is shown beside the list, not asked
 * (D-108); a day with nothing to answer counts once it is opened. Keys and the saved
 * progress are the phone's (mobile/src/lib/today.ts), so an answer on one
 * counts on the other and a day finished on either is counted once. Days are
 * counted, never streaked.
 */
import { occurrences, type Bill } from "./spend-forecast.ts";
import { leaseAsk, noticeDeadline, type LeaseDecision } from "./lease.ts";
import { asksShop } from "./needs.ts";
import type { PaydayPlan } from "./payday-plan.ts";

export interface TodayProgress { done: string[]; acks: string[] }

export interface TodayRow { id: string; date: string; description: string; usd: number; category: string; sub_category?: string | null; tags: string[]; transaction_type: string }

/** A Rent bill with a lease on it (0059), as the strip reads it. */
export interface TodayLease { id: string; ends_on: string; notice_days: number | null; decision: LeaseDecision | null }

export type WebTodayItem =
  | { key: string; kind: "payday"; plan: PaydayPlan }
  | { key: string; kind: "story"; monthName: string }
  | { key: string; kind: "lease"; billId: string; deadline: string }
  | { key: string; kind: "renttag" }
  | { key: string; kind: "sorted"; count: number }
  | { key: string; kind: "need"; row: TodayRow }
  | { key: string; kind: "bill"; label: string; usd: number; iso: string };

/** The strip shows at most this many spends to sort; the phone has the rest. */
const MAX_NEED = 2;

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

/** Until noon an unfinished yesterday can still be finished; after that it's today (the phone's rule). */
export function listDay(done: string[], now = new Date()): string {
  const today = isoDay(now);
  const yesterday = addDays(today, -1);
  return now.getHours() < 12 && !done.includes(yesterday) && !done.includes(today) ? yesterday : today;
}

export function webTodayItems({ rows, bills, progress, leases = [], oldRentTag = false, shopRules = {}, sorted = 0, pay = null, story = null, now = new Date() }: {
  /** Recent expense rows, newest first. */
  rows: TodayRow[];
  bills: Bill[];
  progress: TodayProgress;
  /** Rent bills with a lease end date. */
  leases?: TodayLease[];
  /** Anything still on the old "Rent/Mortgage" tag. */
  oldRentTag?: boolean;
  /** "Always for this shop" answers (merchantRules), so a shop is asked once. */
  shopRules?: Record<string, unknown>;
  /** Bank purchases in the last 30 days: above zero, the one-time "We sorted" card shows. */
  sorted?: number;
  /** Pay that has landed (lib/payday-plan payLanded), by its date, and the plan for it. */
  pay?: { iso: string; plan: PaydayPlan } | null;
  /** Last month's story, when there is one (lib/month-story): its month "2026-10" and name. */
  story?: { month: string; monthName: string } | null;
  now?: Date;
}): { day: string; items: WebTodayItem[] } {
  const day = listDay(progress.done, now);
  const acked = new Set(progress.acks);
  const from = addDays(day, -2);
  const out: WebTodayItem[] = [];

  // First, because the strip shows three and these are rare and dated. The
  // phone's keys (mobile/src/lib/today.ts), so an answer on either counts once.
  if (pay && !acked.has(`pay:${pay.iso}`)) out.push({ key: `pay:${pay.iso}`, kind: "payday", plan: pay.plan });
  if (story && !acked.has(`story:${story.month}`)) out.push({ key: `story:${story.month}`, kind: "story", monthName: story.monthName });
  for (const l of leases) {
    const ask = leaseAsk(l, day);
    const key = `lease:${l.id}:${l.ends_on}:${ask}`;
    if (ask && !acked.has(key)) out.push({ key, kind: "lease", billId: l.id, deadline: noticeDeadline(l) });
  }
  if (oldRentTag && !acked.has("renttag")) out.push({ key: "renttag", kind: "renttag" });

  // Once, when bank spending first shows up; the phone's key, so it's seen on one only.
  if (sorted > 0 && !acked.has("sorted")) out.push({ key: "sorted", kind: "sorted", count: sorted });

  const unsorted = rows.filter((r) => r.transaction_type === "expense" && r.date >= from && r.date <= isoDay(now)
    && !r.tags.includes("sys:pending") && asksShop(r, shopRules));
  for (const row of unsorted.slice(0, MAX_NEED)) out.push({ key: `need:${row.id}`, kind: "need", row });

  const tomorrow = addDays(day, 1);
  for (const b of bills) {
    if (!b.id || occurrences(b, tomorrow, tomorrow).length === 0) continue;
    const key = `bill:${b.id}:${tomorrow}`;
    if (!acked.has(key)) out.push({ key, kind: "bill", label: b.description || "A bill", usd: b.usd, iso: tomorrow });
  }
  return { day, items: out };
}

/**
 * A quiet day counts once it is opened (D-108): with nothing to answer, today
 * is the day to mark, if it isn't already. The phone's rule (mobile/src/lib/today.ts).
 */
export function quietDayToMark(done: string[], openItems: number, now = new Date()): string | null {
  const today = isoDay(now);
  return openItems === 0 && !done.includes(today) ? today : null;
}

/** Finished days this month, for "11 of 13 days". Someone who started this
 * month counts from their first day, not the 1st: a new account read "1 of 3
 * days" on its first visit (walkthrough 3 Nov 2026). */
export function monthCount(done: string[], now = new Date()) {
  const month = isoDay(now).slice(0, 7);
  const first = [...done].sort()[0];
  const startDay = first && first.startsWith(month) ? Number(first.slice(8, 10)) : 1;
  return { done: done.filter((d) => d.startsWith(month)).length, of: Math.max(1, now.getDate() - startDay + 1) };
}
