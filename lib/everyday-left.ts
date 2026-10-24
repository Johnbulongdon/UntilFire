/**
 * The one "left" (D-86, audit round 3): the everyday budget less everyday
 * spending this month. Bills from Calendar are set aside: a bill category's
 * budget beyond its bills, and its spending that isn't the bill's own payment,
 * stay everyday. Spread-over-the-year categories are judged over 12 months, not
 * here. The phone's lib/budget-split splitBudget is the same rule; website
 * Home and Budget both read this, so they show the phone's number.
 */
import { billCategoryOf, billCategorySet, matchesBill, type BillLike } from "./bill-categories.ts";
import { recurrenceToMonthly, type Recurrence } from "./recurring-detect.ts";

export interface EverydayRow { category?: string | null; description?: string | null; transaction_type?: string | null; usd: number }

export function everydayLeft({ budget, bills, monthRows, spreadCategories = [] }: {
  /** Monthly budget per category, USD. */
  budget: Record<string, number>;
  /** Bills with their amount in USD. */
  bills: (BillLike & { usd: number })[];
  /** This month's rows, amounts in USD after refunds. */
  monthRows: EverydayRow[];
  spreadCategories?: string[];
}) {
  const billKeys = billCategorySet(bills);
  const spread = new Set(spreadCategories.filter((k) => !billKeys.has(k)));
  const billMonthlyOf = (k: string) => bills
    .filter((b) => (b.transaction_type ?? "expense") === "expense" && (b.recurrence ?? "monthly") !== "none" && billCategoryOf(b) === k)
    .reduce((t, b) => t + recurrenceToMonthly(Math.abs(b.usd), (b.recurrence ?? "monthly") as Recurrence), 0);
  const everydayBudget = Object.entries(budget)
    .filter(([k, v]) => v > 0 && !k.startsWith("_") && !spread.has(k))
    .reduce((t, [k, v]) => t + Math.max(0, v - (billKeys.has(k) ? billMonthlyOf(k) : 0)), 0);
  const everydaySpent = monthRows.filter(isEveryday(bills, spread)).reduce((t, r) => t + r.usd, 0);
  return { everydayBudget, everydaySpent, left: everydayBudget - everydaySpent };
}

/** Is this row everyday spending: an expense, not spread over the year, and not a bill's own payment. */
function isEveryday(bills: (BillLike & { usd: number })[], spread: Set<string>) {
  const billKeys = billCategorySet(bills);
  return (t: EverydayRow) => (t.transaction_type ?? "expense") === "expense" && !spread.has(t.category ?? "other")
    && !(billKeys.has(t.category ?? "other") && matchesBill({ description: t.description, usd: t.usd, category: t.category ?? "other" }, bills));
}

/**
 * Everyday spending so far, summed day by day (index 0 is the 1st) up to
 * `days`, by the same rule as everydayLeft, so the last point is its
 * everydaySpent. Home's pace line draws this against an even pace.
 */
export function everydayByDay({ bills, monthRows, spreadCategories = [], days }: {
  bills: (BillLike & { usd: number })[];
  monthRows: (EverydayRow & { date: string })[];
  spreadCategories?: string[];
  days: number;
}): number[] {
  const billKeys = billCategorySet(bills);
  const keep = isEveryday(bills, new Set(spreadCategories.filter((k) => !billKeys.has(k))));
  const perDay = new Array<number>(days).fill(0);
  for (const r of monthRows) {
    const d = Number(r.date.slice(8, 10)) - 1;
    if (d >= 0 && d < days && keep(r)) perDay[d] += r.usd;
  }
  for (let i = 1; i < days; i++) perDay[i] += perDay[i - 1];
  return perDay;
}
