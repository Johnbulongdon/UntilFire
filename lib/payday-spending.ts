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

/**
 * The Today strip's two daily figures (D-137). `today` is what is safe to spend
 * today: Until payday over the days to payday (D-90), or the day-to-day budget
 * left over the days left without a payday. `onBudget` is the budget's daily
 * pace, shown beside it as a gentle goal when it is lower, so someone not yet
 * saving much still sees what is safe, and also what keeps them on budget
 * (John, 5 Nov 2026). Rounded like Budget's "about $X a day".
 */
export function safeToSpendToday({ payday, budget }: {
  payday: { remaining: number | null; days: number } | null;
  budget: { left: number; daysLeft: number } | null;
}): { today: number | null; onBudget: number | null } {
  const perDay = (n: number, d: number) => Math.max(0, Math.round(n / d));
  const fromBudget = budget && budget.daysLeft > 0 ? perDay(budget.left, budget.daysLeft) : null;
  if (payday) {
    const today = payday.remaining !== null && payday.days > 0 ? perDay(payday.remaining, payday.days) : null;
    return { today, onBudget: today !== null && fromBudget !== null && fromBudget < today ? fromBudget : null };
  }
  return { today: fromBudget, onBudget: null };
}
