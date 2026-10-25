/**
 * Need or want, one rule for the phone and the website (money logic study,
 * round 2, Oct 16 2026). It lives on the category, changeable per category
 * (FIRE profile `categoryNeeds`); a need/want tag on one transaction still
 * wins for that transaction. Months of safety, the safety pot and the
 * contribution ladder's needs all read this, so the two apps agree.
 *
 * Sorted for you (D-106, Oct 25 2026): the most specific answer wins. One
 * purchase's tag, then the shop ("Always for Target", merchantRules, which
 * bank sync writes as that tag), then a sub-category ("food/Restaurants"
 * in `categoryNeeds`), then eating out as a want, then the category. Today
 * only asks about a shop that sells both, once, and only for a real amount.
 */
import { merchantKey } from "./merchant-memory.ts";

export const NEED_CATEGORIES = ["housing", "food", "transport", "healthcare", "utilities", "education"] as const;

export type Need = "need" | "want";
export type NeedOverrides = Record<string, Need>;

const NEEDS = new Set<string>(NEED_CATEGORIES);

/** Eating out inside a need category is a want: groceries are the need (audit round 3: DoorDash and coffee aren't essential). */
export const WANT_SUBCATEGORIES = new Set(["Restaurants", "Takeout & Delivery", "Drinks & Bars"]);

/** A sub-category's own setting, then eating out as a want, then the category's setting, then its default. */
export const categoryNeed = (category: string | null | undefined, overrides: NeedOverrides = {}, subCategory?: string | null): Need =>
  (category && subCategory && overrides[`${category}/${subCategory}`])
  || (subCategory && WANT_SUBCATEGORIES.has(subCategory) ? "want" : null)
  || (category && overrides[category]) || (category && NEEDS.has(category) ? "need" : "want");

/** The Needs & wants screen's one extra row: eating out, pulled out of Food. */
export const EATING_OUT = "food/eating-out";

/** What a Needs & wants row (a category, or EATING_OUT) counts as now. */
export const rowNeed = (row: string, overrides: NeedOverrides = {}): Need =>
  row === EATING_OUT ? categoryNeed("food", overrides, "Restaurants") : categoryNeed(row, overrides);

/** The overrides after moving a row; eating out is saved on each of its sub-categories. */
export const withRowNeed = (row: string, need: Need, overrides: NeedOverrides = {}): NeedOverrides =>
  row === EATING_OUT
    ? { ...overrides, ...Object.fromEntries([...WANT_SUBCATEGORIES].map((s) => [`food/${s}`, need])) }
    : { ...overrides, [row]: need };

/**
 * Shops that sell both under one name, as merchantKey reads them: a Target
 * run can be groceries or a lamp. Gas stations stay with their category; a
 * snack at the pump is too small to ask about.
 */
const MIXED_SHOPS = ["amazon", "amzn", "target", "walmart", "costco", "sams club", "bjs", "cvs", "walgreens", "rite aid", "dollar general", "dollar tree", "eleven", "wawa", "sheetz"];

export const isMixedShop = (description: string | null | undefined): boolean => {
  const key = ` ${merchantKey(description ?? "")} `;
  return MIXED_SHOPS.some((s) => key.includes(` ${s} `));
};

/** Below this (in US dollars) a mixed shop follows its category: a few dollars either way don't move a plan. */
export const MIXED_ASK_USD = 20;

/** Whether Today asks "usually a need or a want?" about this spend: a mixed shop, a real amount, never answered. */
export const asksShop = (t: { description?: string | null; usd: number; tags?: string[] | null }, shopRules: Record<string, unknown> = {}): boolean =>
  isMixedShop(t.description) && t.usd >= MIXED_ASK_USD
  && !(t.tags ?? []).some((g) => g === "need" || g === "want")
  && !(merchantKey(t.description ?? "") in shopRules);

export const transactionNeed = (t: { category?: string | null; sub_category?: string | null; tags?: string[] | null }, overrides: NeedOverrides = {}): Need =>
  t.tags?.includes("need") ? "need" : t.tags?.includes("want") ? "want" : categoryNeed(t.category, overrides, t.sub_category);

/** The monthly budget of the need categories. */
export const budgetNeeds = (budget: Record<string, unknown>, overrides: NeedOverrides = {}): number =>
  Object.entries(budget).filter(([k, v]) => !k.startsWith("_") && typeof v === "number" && categoryNeed(k, overrides) === "need")
    .reduce((s, [, v]) => s + (v as number), 0);

/** Average need spending over the complete months in the last 12 that have any, or 0. */
export function averageNeeds(byMonth: Map<string, number>): number {
  const vals = [...byMonth.values()].filter((v) => v > 0);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

/** Months to count: the 12 complete months before `current` (YYYY-MM). */
export function inLastTwelve(month: string, current: string): boolean {
  const [y, m] = current.split("-").map(Number);
  const start = new Date(y, m - 1 - 12, 1);
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  return month >= from && month < current;
}
