/**
 * Free to spend until payday: how much of the money in your account is
 * actually yours, once the bills due before your next paycheck are set aside.
 *
 * Two sides, and the answer is the lower one:
 *  - Cash: the everyday accounts' balance, less every bill in Upcoming due
 *    before payday (overdue ones included: a bill not ticked off is owed).
 *  - Budget: what is left this month in the flexible categories.
 * The cash side stops rent being spent on groceries; the budget side stops
 * a well-funded account from being an excuse to overspend. Either side can
 * be missing (no bank linked, no budget), and the other one stands alone.
 *
 * Payday is the next date of a repeating paycheck in Upcoming, so weekly,
 * every-two-weeks and monthly pay all work the same way; with two
 * paychecks the sooner one ends the window. Without one, the window runs
 * to the end of the month and says so.
 *
 * Credit cards are not counted from their balance: the payment is a bill in
 * Upcoming like any other. Their balance is returned for context only.
 */

import { startOfDay } from "./contribution-schedule.ts";
import { expandExpected, isoDay, type ExpectedItem, type ForecastEvent } from "./cashflow-forecast.ts";

export interface SpendAccount {
  id: string;
  name: string;
  /** Plaid's account type and subtype: "depository"/"checking", "credit"/… */
  type: string;
  subtype?: string | null;
  /** In USD. Available when the bank reports it, else current. */
  balanceUSD: number;
}

export interface BudgetLeft {
  key: string;
  label: string;
  /** This month's budget for the category, USD. */
  budget: number;
  /** Budget less what has been spent; negative when over. */
  left: number;
}

export interface FreeToSpend {
  free: number;
  perDay: number;
  /** Days from today up to (not including) payday; at least 1. */
  days: number;
  payday: { iso: string; description: string | null; source: "paycheck" | "month-end" };
  limitedBy: "cash" | "budget";
  cash: null | { balance: number; accounts: SpendAccount[]; bills: ForecastEvent[]; free: number };
  budget: null | { left: number; categories: BudgetLeft[]; tightest: BudgetLeft | null };
  cards: { name: string; owedUSD: number }[];
}

const DAY_MS = 86_400_000;

/** Checking counts unless the user turned it off; anything else only when turned on. */
export function countsByDefault(a: SpendAccount): boolean {
  return a.type === "depository" && (a.subtype ?? "checking") === "checking";
}

export function isCounted(a: SpendAccount, toggles: Record<string, boolean> = {}): boolean {
  return a.type !== "credit" && (toggles[a.id] ?? countsByDefault(a));
}

/** The next paycheck after today, or the last day of the month. */
export function nextPayday(items: ExpectedItem[], today: Date): FreeToSpend["payday"] {
  const t = startOfDay(today);
  const paychecks = items.filter((i) => i.type === "income" && i.recurrence !== "none");
  const horizon = new Date(t.getFullYear() + 1, t.getMonth(), t.getDate());
  const next = expandExpected(paychecks, t, horizon)
    .filter((e) => !e.overdue && e.iso > isoDay(t))
    .sort((a, b) => a.iso.localeCompare(b.iso))[0];
  if (next) return { iso: next.iso, description: next.description, source: "paycheck" };
  // On the last day already, the window is the rest of next month.
  let end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  if (end.getTime() === t.getTime()) end = new Date(t.getFullYear(), t.getMonth() + 2, 0);
  return { iso: isoDay(end), description: null, source: "month-end" };
}

export function freeToSpend(input: {
  today: Date;
  accounts: SpendAccount[];
  toggles?: Record<string, boolean>;
  expected: ExpectedItem[];
  /** Flexible categories only; fixed bills belong in Upcoming. */
  budget?: BudgetLeft[];
}): FreeToSpend | null {
  const today = startOfDay(input.today);
  const payday = nextPayday(input.expected, today);
  const [y, m, d] = payday.iso.split("-").map(Number);
  const paydayDate = new Date(y, m - 1, d);
  const days = Math.max(1, Math.round((paydayDate.getTime() - today.getTime()) / DAY_MS));

  const counted = input.accounts.filter((a) => isCounted(a, input.toggles));
  let cash: FreeToSpend["cash"] = null;
  if (counted.length > 0) {
    const balance = counted.reduce((s, a) => s + a.balanceUSD, 0);
    // Bills due on payday are left out: pay lands first on the same day.
    const dayBefore = new Date(paydayDate.getFullYear(), paydayDate.getMonth(), paydayDate.getDate() - 1);
    const bills = expandExpected(input.expected.filter((i) => i.type === "expense"), today, dayBefore)
      .filter((e) => e.counted);
    const free = balance + bills.reduce((s, e) => s + e.amount, 0);
    cash = { balance, accounts: counted, bills, free };
  }

  let budget: FreeToSpend["budget"] = null;
  const cats = (input.budget ?? []).filter((c) => c.budget > 0);
  if (cats.length > 0) {
    const left = cats.reduce((s, c) => s + c.left, 0);
    const tightest = [...cats].sort((a, b) => a.left / a.budget - b.left / b.budget)[0] ?? null;
    budget = { left, categories: cats, tightest };
  }

  if (!cash && !budget) return null;
  const limitedBy: FreeToSpend["limitedBy"] =
    cash && (!budget || cash.free <= budget.left) ? "cash" : "budget";
  const free = limitedBy === "cash" ? cash!.free : budget!.left;
  const cards = input.accounts
    .filter((a) => a.type === "credit")
    .map((a) => ({ name: a.name, owedUSD: Math.abs(a.balanceUSD) }));

  return { free, perDay: free > 0 ? Math.floor(free / days) : 0, days, payday, limitedBy, cash, budget, cards };
}
