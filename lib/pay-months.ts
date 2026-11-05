/**
 * Months with an extra payday (Income, 2026-11-05). Paid every 2 weeks gives
 * 26 paydays a year, so two months a year hold 3; weekly pay gives four
 * months with 5. A budget built on a usual month counts 2 (or 4), so the
 * extra one is money the plan never spends.
 */
import { addRecurrence, isoDay, type ExpectedItem } from "./cashflow-forecast.ts";

export interface ExtraPayMonth {
  /** `YYYY-MM`. */
  month: string;
  /** The extra payday, `YYYY-MM-DD`: the last one in the month. */
  extraDate: string;
  /** In USD, the size of one paycheck. */
  amount: number;
  paydays: number;
}

const USUAL: Partial<Record<string, number>> = { biweekly: 2, weekly: 4 };

/** Extra-payday months from the start of `today`'s month and the 11 after. */
export function extraPayMonths(items: ExpectedItem[], today: Date): ExtraPayMonth[] {
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  const byMonth = new Map<string, ExtraPayMonth>();
  for (const item of items) {
    const usual = USUAL[item.recurrence];
    if (item.type !== "income" || !usual || !(item.amountUSD > 0)) continue;
    const [y, m, d] = item.dueDate.split("-").map(Number);
    if (!y || !m || !d) continue;
    // Step back to the first payday on or after `from`, then walk forward.
    let day = new Date(y, m - 1, d);
    while (day >= from) day = addRecurrence(day, item.recurrence, -1);
    while (day < from) day = addRecurrence(day, item.recurrence, 1);
    const counts = new Map<string, string[]>();
    for (; day < to; day = addRecurrence(day, item.recurrence, 1)) {
      const iso = isoDay(day);
      counts.set(iso.slice(0, 7), [...(counts.get(iso.slice(0, 7)) ?? []), iso]);
    }
    for (const [month, days] of counts) {
      if (days.length <= usual) continue;
      const prev = byMonth.get(month);
      if (!prev || item.amountUSD > prev.amount) byMonth.set(month, { month, extraDate: days[days.length - 1], amount: item.amountUSD, paydays: days.length });
    }
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}
