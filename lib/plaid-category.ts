/**
 * Plaid's category taxonomy, and how it becomes UntilFire's.
 *
 * Separate from lib/plaid.ts because that file imports the Plaid SDK, which
 * ships as CommonJS and cannot be loaded by Node's ESM loader — so anything
 * importing it is untestable outside a bundler. This is data and pure
 * functions with no SDK dependency, which makes it the part worth testing.
 */

// Plaid personal_finance_category.primary → UntilFire category
export const PLAID_CATEGORY_MAP: Record<string, string> = {
  FOOD_AND_DRINK:            "food",
  TRANSPORTATION:            "transport",
  TRAVEL:                    "travel",
  RENT_AND_UTILITIES:        "housing",
  HOME_IMPROVEMENT:          "housing",
  GENERAL_MERCHANDISE:       "shopping",
  ENTERTAINMENT:             "entertainment",
  PERSONAL_CARE:             "healthcare",
  MEDICAL:                   "healthcare",
  SUBSCRIPTION:              "subscriptions",
  INCOME:                    "salary",
};

// TRANSFER_OUT = own-account moves (skip to avoid double counting)
// TRANSFER_IN is kept so that Wise/international bank income shows up correctly
export const PLAID_SKIP_CATEGORIES = new Set([
  "TRANSFER_OUT",
  "LOAN_PAYMENTS",
]);

/**
 * Plaid's `detailed` value, made readable.
 *
 * It arrives as the primary prefixed onto the granular part, in caps with
 * underscores: FOOD_AND_DRINK_COFFEE, TRANSPORTATION_TAXIS_AND_RIDE_SHARES.
 * Dropping the prefix leaves the part the primary does not already say, and
 * the rest is title case. "AND" stays lowercase so "Taxis And Ride Shares"
 * reads as "Taxis and Ride Shares".
 *
 * Returns null rather than a guess when the shape is unexpected — an empty
 * sub-category is better than a mangled one, and the raw value is kept in
 * pfc_detailed either way.
 */
export function prettifyPfcDetailed(primary: string, detailed: string): string | null {
  if (!detailed) return null;
  // Plaid sometimes sends detailed equal to primary. A sub-category that only
  // repeats the category is noise, so say nothing instead.
  if (detailed === primary) return null;

  const tail = detailed.startsWith(`${primary}_`)
    ? detailed.slice(primary.length + 1)
    : detailed;
  if (!tail) return null;

  return tail
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word, i) => (i > 0 && word === "and" ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ") || null;
}

