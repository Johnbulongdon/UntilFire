/**
 * Need or want, one rule for the phone and the website (money logic study,
 * round 2, Oct 16 2026). It lives on the category, changeable per category
 * (FIRE profile `categoryNeeds`); a need/want tag on one transaction still
 * wins for that transaction. Months of safety, the safety pot and the
 * contribution ladder's needs all read this, so the two apps agree.
 */
export const NEED_CATEGORIES = ["housing", "food", "transport", "healthcare", "utilities", "education"] as const;

export type Need = "need" | "want";
export type NeedOverrides = Record<string, Need>;

const NEEDS = new Set<string>(NEED_CATEGORIES);

/** Eating out inside a need category is a want: groceries are the need (audit round 3: DoorDash and coffee aren't essential). */
export const WANT_SUBCATEGORIES = new Set(["Restaurants", "Takeout & Delivery", "Drinks & Bars"]);

/** A category's own setting wins; otherwise an eating-out sub-category is a want, then the category's default. */
export const categoryNeed = (category: string | null | undefined, overrides: NeedOverrides = {}, subCategory?: string | null): Need =>
  (category && overrides[category]) || (subCategory && WANT_SUBCATEGORIES.has(subCategory) ? "want" : category && NEEDS.has(category) ? "need" : "want");

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
