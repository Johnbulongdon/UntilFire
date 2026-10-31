import { everydayLeft } from './everyday-left.ts';
import { everydayRate, isBill, type Bill, type DayAmount } from './spend-forecast.ts';
import { monthlyAllowance, type ExpectedItem } from './cashflow-forecast.ts';

/** Remaining normal costs, not a savings target or a budget spending limit. */
export function paydaySpending(input: { today: Date; days: number; rows: DayAmount[]; bills: Bill[]; monthlyBudget: number | null; budget?: Record<string, number> }) {
  const month = `${input.today.getFullYear()}-${String(input.today.getMonth() + 1).padStart(2, '0')}`;
  const rate = recentRate(input.rows, input.bills, input.today) ?? everydayRate(input.rows, input.bills, month);
  if (rate !== null) return { amount: Math.max(0, rate * input.days), source: 'history' as const };
  if (input.monthlyBudget === null || !Number.isFinite(input.monthlyBudget)) return null;
  const items: ExpectedItem[] = input.bills.map(b => ({ description: b.description ?? 'Bill', amountUSD: b.usd, type: 'expense', dueDate: b.due, recurrence: b.recurrence }));
  // Step by local calendar day: varying month lengths and DST do not shift dates.
  let amount = 0;
  const monthly = input.budget ? everydayLeft({budget: input.budget, bills: input.bills, monthRows: []}).everydayBudget : monthlyAllowance(input.monthlyBudget, items);
  for (let i = 0; i < input.days; i++) {
    const d = new Date(input.today.getFullYear(), input.today.getMonth(), input.today.getDate() + i);
    amount += monthly / new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }
  return { amount, source: 'budget' as const };
}

const RECENT_DAYS = 30;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The daily rate from the last 30 days (D-129): how the person spends now,
 * not a six-month middle that is slow to see a cut-back. Bills, travel and
 * any one payment over 15% of the window are left out: a trip or a vet bill
 * can't be predicted, so it shouldn't shrink every payday. Null without 30
 * days of history or with under 10 payments in them (likely not imported
 * yet), so the six-month rate stands in.
 */
export function recentRate(rows: DayAmount[], bills: Bill[], today: Date): number | null {
  const to = iso(today);
  const from = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - RECENT_DAYS));
  if (!rows.some((r) => r.date < from)) return null;
  const window = rows.filter((r) => r.date >= from && r.date < to && r.usd > 0 && r.category !== 'travel' && !isBill(r, bills));
  // A handful of payments can't say which is the one-off; the six-month rate is safer.
  if (window.length < 10) return null;
  const total = window.reduce((s, r) => s + r.usd, 0);
  const everyday = window.filter((r) => r.usd <= 0.15 * total).reduce((s, r) => s + r.usd, 0);
  return everyday / RECENT_DAYS;
}

export function paydayRemainder(afterBills: number, everyday: number | null, cushion = 0) {
  if (everyday === null || !Number.isFinite(everyday) || everyday < 0 || !Number.isFinite(cushion) || cushion < 0) return null;
  return afterBills - everyday - cushion;
}
