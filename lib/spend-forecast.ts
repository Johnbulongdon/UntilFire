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
import { sameMerchant } from "./recurring-detect.ts";
import { addMonths, daysInMonth, median, monthOf } from "./spend-range.ts";

export type Bill = {
  description: string | null;
  category: string | null;
  /** Monthly-equivalent amount, USD. */
  usd: number;
  due: string; // YYYY-MM-DD, the next date it is due
  monthly: boolean; // repeats on the same day each month
};
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
 * Cumulative budget through each day: monthly bills step up on their day,
 * the rest of the monthly budget accrues evenly. Bills beyond the budget are
 * capped at it, so the line never ends above the budget.
 */
export function budgetPath(months: string[], budgetMonth: number, bills: Bill[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const m of months) {
    const n = daysInMonth(m);
    const dated = bills.filter((b) => b.monthly);
    const billTotal = Math.min(budgetMonth, dated.reduce((s, b) => s + b.usd, 0));
    const scale = billTotal > 0 ? billTotal / dated.reduce((s, b) => s + b.usd, 0) : 0;
    const everyday = (budgetMonth - billTotal) / n;
    for (let d = 1; d <= n; d++) {
      run += everyday + dated.filter((b) => Math.min(Number(b.due.slice(8, 10)), n) === d).reduce((s, b) => s + b.usd * scale, 0);
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
  const due = bills.filter((b) => b.due > today && b.due <= days[days.length - 1]);
  let run = spentSoFar;
  return days.map((d) => {
    if (d < today) return NaN;
    if (d === today) return spentSoFar;
    run += rate + due.filter((b) => b.due === d).reduce((s, b) => s + b.usd, 0);
    return run;
  });
}
