/**
 * Which budget categories hold a bill, one rule for the phone and the website
 * (D-41, D-86): a repeating expense bill's own category, or the one its name
 * suggests when it has none. A one-off doesn't make a category fixed.
 */
import { guessBillCategory } from "./spend-forecast.ts";

export type BillLike = { category?: string | null; description?: string | null; recurrence?: string | null; transaction_type?: string | null };

/** The budget category a bill belongs to. */
export const billCategoryOf = (b: BillLike) => b.category || guessBillCategory(b.description ?? "") || "other";

export function billCategorySet(bills: BillLike[]): Set<string> {
  return new Set(bills
    .filter((b) => (b.transaction_type ?? "expense") === "expense" && (b.recurrence ?? "monthly") !== "none")
    .map(billCategoryOf));
}

const words = (s: string | null | undefined) => new Set(((s ?? "").toLowerCase().match(/[a-z0-9]{3,}|[一-鿿]+/g) ?? []));

/** How far a payment may differ from its bill and still be that bill: a price rise of a few dollars is still Netflix. */
export const BILL_MATCH_TOLERANCE = 0.15;

/**
 * Is this spend a bill's payment (audit round 2)? Its name shares a word with
 * a repeating bill in the same category and the amount is within 15%. Only
 * these count as bills; the rest of a bill's category stays everyday
 * spending, so a Spotify bill no longer hides every other Entertainment spend.
 */
export function matchesBill(t: { description?: string | null; usd: number; category?: string | null },
  bills: (BillLike & { usd: number })[]): boolean {
  const name = words(t.description);
  return bills.some((b) => (b.recurrence ?? "monthly") !== "none" && billCategoryOf(b) === (t.category ?? "other")
    && Math.abs(t.usd - b.usd) <= b.usd * BILL_MATCH_TOLERANCE && [...words(b.description)].some((w) => name.has(w)));
}
