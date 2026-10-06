/**
 * Where a period's spending is heading, and how the budget is laid out over
 * it, using the bills the person has listed in Upcoming (D-31).
 *
 * The first version shaped both from past months. That counted rent twice
 * for anyone whose rent moved: past months paid it on the 30th, this month on
 * the 1st, so "so far" already held it and "the rest of a typical month"
 * held it again. Bills have dates; the person told us them in Upcoming. So:
 *
 *   forecast    = spent so far
 *               + bills still due before the end of the period
 *               + everyday spending for the days left, at the usual daily rate
 *   budget path = each bill on its due day, the rest of the budget spread
 *                 evenly across the days of the month
 *
 * "Everyday" is spending that is not one of the listed bills, so a bill is
 * never in both the dated part and the daily rate.
 */
import { addRecurrence, isoDay } from "./cashflow-forecast.ts";
import { type Recurrence, sameMerchant } from "./recurring-detect.ts";
import { addMonths, daysInMonth, median, monthOf } from "./spend-range.ts";

export type Bill = {
  description: string | null;
  category: string | null;
  /** One payment, USD. */
  usd: number;
  due: string; // YYYY-MM-DD: the next date it is due, or the one date of a one-off
  recurrence: Recurrence; // "none" for a one-off
};

/**
 * Every date a bill falls on between `from` and `to` (inclusive): stepping
 * back and forward from its due date by its recurrence, so a monthly rent
 * whose next due date is Nov 1 also lands on Sep 1 and Oct 1. A one-off is
 * just its own date.
 */
export function occurrences(b: Bill, from: string, to: string): string[] {
  const [y, m, d] = b.due.split("-").map(Number);
  const anchor = new Date(y, m - 1, d);
  if (b.recurrence === "none") return b.due >= from && b.due <= to ? [b.due] : [];
  const out: string[] = [];
  for (let n = -60; n <= 60; n++) {
    const iso = isoDay(addRecurrence(anchor, b.recurrence, n));
    if (iso > to) break;
    if (iso >= from) out.push(iso);
  }
  return out;
}
export type DayAmount = { date: string; usd: number; category: string; description: string };

/** Whether a transaction is one of the listed bills: same merchant, or the bill's category when it has no name. */
export function isBill(t: Pick<DayAmount, "description" | "category">, bills: Bill[]): boolean {
  return bills.some((b) => (b.description ? sameMerchant(b.description, t.description ?? "") : !!b.category && b.category === t.category));
}

/**
 * Usual everyday spending per day: the median, over past complete months,
 * of non-bill spending divided by that month's days. Null with fewer than
 * two months, where a single month is too thin to call usual.
 */
export function everydayRate(spend: DayAmount[], bills: Bill[], currentMonth: string, lookback = 6): number | null {
  const first = addMonths(currentMonth, -lookback);
  const byMonth = new Map<string, number>();
  for (const s of spend) {
    const m = monthOf(s.date);
    if (m >= currentMonth || m < first) continue;
    byMonth.set(m, (byMonth.get(m) ?? 0) + (isBill(s, bills) ? 0 : s.usd));
  }
  const rates = [...byMonth].map(([m, total]) => total / daysInMonth(m));
  return rates.length >= 2 ? median(rates) : null;
}

/** Every day of the months, in order. */
export const daysOfMonths = (months: string[]) =>
  months.flatMap((m) => Array.from({ length: daysInMonth(m) }, (_, i) => `${m}-${String(i + 1).padStart(2, "0")}`));

/**
 * Cumulative budget through each day: every bill steps up on the date it
 * falls in that month (whatever its recurrence, one-offs included), and the
 * rest of the monthly budget accrues evenly. Bills beyond the budget are
 * scaled to it, so the line never ends above the budget.
 */
export function budgetPath(months: string[], budgetMonth: number, bills: Bill[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const m of months) {
    const n = daysInMonth(m), first = `${m}-01`, last = `${m}-${String(n).padStart(2, "0")}`;
    const hits = bills.flatMap((b) => occurrences(b, first, last).map((date) => ({ date, usd: b.usd })));
    const raw = hits.reduce((s, h) => s + h.usd, 0);
    const billTotal = Math.min(budgetMonth, raw);
    const scale = raw > 0 ? billTotal / raw : 0;
    const everyday = (budgetMonth - billTotal) / n;
    for (let d = 1; d <= n; d++) {
      const iso = `${m}-${String(d).padStart(2, "0")}`;
      run += everyday + hits.filter((h) => h.date === iso).reduce((s, h) => s + h.usd * scale, 0);
      out.push(run);
    }
  }
  return out;
}

/**
 * The forecast from today to the last day: what is already spent, plus each
 * bill still due on its date, plus everyday spending at `rate` per day.
 * Returns values for days after today only (NaN before), for drawing.
 */
export function forecastPath(days: string[], today: string, spentSoFar: number, bills: Bill[], rate: number): number[] {
  const end = days[days.length - 1];
  const due = bills.flatMap((b) => occurrences(b, today, end).filter((d) => d > today).map((date) => ({ date, usd: b.usd })));
  let run = spentSoFar;
  return days.map((d) => {
    if (d < today) return NaN;
    if (d === today) return spentSoFar;
    run += rate + due.filter((h) => h.date === d).reduce((s, h) => s + h.usd, 0);
    return run;
  });
}

/**
 * Bills from Upcoming plus repeating payments spotted in the history, without
 * counting one twice: a spotted payment is dropped when a listed one has the
 * same merchant, or the same category and an amount within 10% (Upcoming
 * says "Rent", the bank says "BILT PAYMENT").
 */
export function mergeBills(listed: Bill[], spotted: Bill[]): Bill[] {
  const dup = (s: Bill) => listed.some((b) =>
    (b.description && s.description && sameMerchant(b.description, s.description))
    || (!!b.category && b.category === s.category && Math.abs(b.usd - s.usd) <= 0.1 * Math.max(b.usd, s.usd)));
  return [...listed, ...spotted.filter((s) => !dup(s))];
}
