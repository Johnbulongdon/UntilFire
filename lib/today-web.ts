/**
 * The website's Today strip (D-73, D-89): the phone's Today list cut to the
 * three kinds that need no extra screens — need or want on a recent spend, a
 * bill due tomorrow, and the closing "safe to spend today". Keys and the saved
 * progress are the phone's (mobile/src/lib/today.ts), so an answer on one
 * counts on the other and a day finished on either is counted once. Days are
 * counted, never streaked.
 */
import { occurrences, type Bill } from "./spend-forecast.ts";

export interface TodayProgress { done: string[]; acks: string[] }

export interface TodayRow { id: string; date: string; description: string; usd: number; category: string; tags: string[]; transaction_type: string }

export type WebTodayItem =
  | { key: string; kind: "need"; row: TodayRow }
  | { key: string; kind: "bill"; label: string; usd: number; iso: string }
  | { key: string; kind: "number"; perDay: number | null };

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

export function webTodayItems({ rows, bills, progress, perDay, now = new Date() }: {
  /** Recent expense rows, newest first. */
  rows: TodayRow[];
  bills: Bill[];
  progress: TodayProgress;
  /** What's safe to spend each day for the rest of the month; null without a budget. */
  perDay: number | null;
  now?: Date;
}): { day: string; items: WebTodayItem[] } {
  const day = listDay(progress.done, now);
  const acked = new Set(progress.acks);
  const from = addDays(day, -2);
  const out: WebTodayItem[] = [];

  const unsorted = rows.filter((r) => r.transaction_type === "expense" && r.date >= from && r.date <= isoDay(now)
    && !r.tags.includes("sys:pending") && !r.tags.some((g) => g === "need" || g === "want"));
  for (const row of unsorted.slice(0, MAX_NEED)) out.push({ key: `need:${row.id}`, kind: "need", row });

  const tomorrow = addDays(day, 1);
  for (const b of bills) {
    if (!b.id || occurrences(b, tomorrow, tomorrow).length === 0) continue;
    const key = `bill:${b.id}:${tomorrow}`;
    if (!acked.has(key)) out.push({ key, kind: "bill", label: b.description || "A bill", usd: b.usd, iso: tomorrow });
  }

  // Always last, so a quiet day can still be finished.
  if (!acked.has(`day:${day}`)) out.push({ key: `day:${day}`, kind: "number", perDay });
  return { day, items: out };
}

/** Finished days this month, for "11 of 13 days". */
export function monthCount(done: string[], now = new Date()) {
  const month = isoDay(now).slice(0, 7);
  return { done: done.filter((d) => d.startsWith(month)).length, of: now.getDate() };
}
