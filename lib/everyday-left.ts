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
  const everydaySpent = monthRows
    .filter((t) => (t.transaction_type ?? "expense") === "expense" && !spread.has(t.category ?? "other"))
    .filter((t) => !(billKeys.has(t.category ?? "other") && matchesBill({ description: t.description, usd: t.usd, category: t.category ?? "other" }, bills)))
    .reduce((t, r) => t + r.usd, 0);
  return { everydayBudget, everydaySpent, left: everydayBudget - everydaySpent };
}
