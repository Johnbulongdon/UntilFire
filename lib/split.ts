/**
 * Split a payment between people (D-135, Nov 2 2026). The person paid for the
 * group, so only their share is their spending. The others' share is kept in
 * split_owed and added to refund_amount, which every total already nets out
 * (0060). Today then checks the money came back: money in from Venmo, Zelle
 * or PayPal after a split asks "Is this a pay-back?" (yes: not income), and a
 * split with no pay-back after 30 days asks once "Did they pay you back?"
 * (no: the full amount counts again). Never an IOU list (Splitwise's job).
 */
import type { TodayRow } from "./today-web.ts";

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export type SplitState = "waiting" | "paid" | "cash";

/** A split payment, as Today reads it. */
export interface SplitRow { id: string; date: string; description: string; owedUsd: number; state: SplitState | null }

/** Payment apps people pay each other back through. */
const PAYBACK_APP = /venmo|zelle|paypal|cash ?app|square cash|apple cash/i;

/** Days after a split that money in can still be its pay-back. */
export const PAYBACK_DAYS = 45;
/** Days a split waits for a pay-back before Today asks about it. */
export const CHECK_DAYS = 30;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The others' share for a split of `paid` (what the person paid, less any real
 * refund): by people, everyone pays the same; by a typed share, the rest.
 * Never below 0 or above what was paid.
 */
export function owedFor(paid: number, by: { people: number } | { share: number }): number {
  if (!(paid > 0)) return 0;
  const mine = "people" in by ? (by.people >= 2 ? paid / by.people : paid) : by.share;
  return round2(Math.min(paid, Math.max(0, paid - mine)));
}

/** The refund_amount and split columns to write for a new split (owed 0 undoes it). */
export function splitPatch(t: { amount: number; refund_amount: number | null; split_owed?: number | null; split_state?: SplitState | null }, owed: number, people: number | null) {
  const realRefund = Math.max(0, (t.refund_amount ?? 0) - (t.split_owed ?? 0));
  const cut = round2(Math.min(Math.max(0, owed), t.amount - realRefund));
  return cut > 0
    ? { refund_amount: round2(realRefund + cut), split_owed: cut, split_count: people && people >= 2 ? people : null, split_state: t.split_state ?? ("waiting" as SplitState) }
    : { refund_amount: round2(realRefund), split_owed: 0, split_count: null, split_state: null };
}

/** Money in from a payment app, newest first, each with the split it most likely pays back. */
export function paybackAsks(rows: TodayRow[], splits: SplitRow[], acked: Set<string>): { key: string; row: TodayRow; split: SplitRow }[] {
  const out: { key: string; row: TodayRow; split: SplitRow }[] = [];
  for (const row of rows) {
    if (row.transaction_type !== "income" || !PAYBACK_APP.test(row.description)) continue;
    const key = `payback:${row.id}`;
    if (acked.has(key)) continue;
    // The latest split before it, within the window, still open, that it fits inside.
    const split = splits
      .filter((s) => s.state !== "cash" && s.date <= row.date && s.date >= addDays(row.date, -PAYBACK_DAYS) && row.usd <= s.owedUsd + 1)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (split) out.push({ key, row, split });
  }
  return out;
}

/** Splits still waiting on a pay-back after CHECK_DAYS, asked once each. */
export function splitChecks(splits: SplitRow[], day: string, acked: Set<string>): { key: string; split: SplitRow }[] {
  const due = addDays(day, -CHECK_DAYS);
  return splits
    .filter((s) => s.state === "waiting" && s.date <= due && !acked.has(`splitcheck:${s.id}`))
    .map((split) => ({ key: `splitcheck:${split.id}`, split }));
}
