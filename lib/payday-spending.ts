import { everydayLeft } from './everyday-left.ts';
import { everydayRate, type Bill, type DayAmount } from './spend-forecast.ts';
import { monthlyAllowance, type ExpectedItem } from './cashflow-forecast.ts';

/** Remaining normal costs, not a savings target or a budget spending limit. */
export function paydaySpending(input: { today: Date; days: number; rows: DayAmount[]; bills: Bill[]; monthlyBudget: number | null; budget?: Record<string, number> }) {
  const month = `${input.today.getFullYear()}-${String(input.today.getMonth() + 1).padStart(2, '0')}`;
  const rate = everydayRate(input.rows, input.bills, month);
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

export function paydayRemainder(afterBills: number, everyday: number | null, cushion = 0) {
  if (everyday === null || !Number.isFinite(everyday) || everyday < 0 || !Number.isFinite(cushion) || cushion < 0) return null;
  return afterBills - everyday - cushion;
}
