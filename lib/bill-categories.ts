/**
 * Which budget categories hold a bill, one rule for the phone and the website
 * (D-41, D-86): a repeating expense bill's own category, or the one its name
 * suggests when it has none. A one-off doesn't make a category fixed.
 */
import { guessBillCategory } from "./spend-forecast.ts";
import { sameMerchant } from "./recurring-detect.ts";

/** `merchant` (website) or `match_merchant` (phone) is the bank's name for the bill, once the person confirmed it. */
export type BillLike = { category?: string | null; description?: string | null; recurrence?: string | null; transaction_type?: string | null; merchant?: string | null; match_merchant?: string | null };

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
 * A payment under the bank name the person linked to the bill ("BILT PAYMENT"
 * for "Rent", D-133) is that bill in any category: without it a linked rent
 * counted as day-to-day spending and "left" fell by a whole rent (D-147).
 */
export function matchesBill(t: { description?: string | null; usd: number; category?: string | null },
  bills: (BillLike & { usd: number })[]): boolean {
  const name = words(t.description);
  return bills.some((b) => {
    if ((b.transaction_type ?? "expense") !== "expense" || (b.recurrence ?? "monthly") === "none") return false;
    if (Math.abs(t.usd - b.usd) > b.usd * BILL_MATCH_TOLERANCE) return false;
    const linked = b.merchant ?? b.match_merchant;
    if (linked && t.description && sameMerchant(linked, t.description)) return true;
    return billCategoryOf(b) === (t.category ?? "other") && [...words(b.description)].some((w) => name.has(w));
  });
}
