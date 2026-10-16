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
  // Home Depot is shopping, not rent: in Housing, a rent bill hid it from everyday spending (audit round 2).
  HOME_IMPROVEMENT:          "shopping",
  GENERAL_MERCHANDISE:       "shopping",
  ENTERTAINMENT:             "entertainment",
  PERSONAL_CARE:             "personal_care",
  MEDICAL:                   "healthcare",
  SUBSCRIPTION:              "subscriptions",
  INCOME:                    "salary",
};

// Nothing is skipped any more: transfers are kept as transfers (see classifyPlaid).
export const PLAID_SKIP_CATEGORIES = new Set<string>();

export interface PlaidClass {
  transaction_type: "expense" | "income" | "transfer";
  category: string;
  /** Overrides the prettified detailed category when set. */
  sub_category?: string;
  tags: string[];
}

/**
 * What one bank transaction is (money logic audit round 2, Oct 16 2026).
 * Every row is kept, so nothing quietly disappears from spending:
 * - Moves between your own accounts, savings, investments and card payments
 *   are transfers, which no budget, income or spending figure counts.
 * - Cash withdrawals and Venmo/Zelle-style payments to people are spending
 *   in Other, so Today asks what they were (rent paid by Zelle is real).
 * - Loan payments are spending: mortgage in Housing (left out of the freedom
 *   date's spending, which pays it separately), car in Transport, student in
 *   Education.
 * - Money back from a shop is a refund, not income: a transfer tagged
 *   sys:refund, which sync applies to the purchase it came back to.
 * - Income is only what Plaid calls income, plus deposits it can't place
 *   (Wise and international payouts), never a transfer between your accounts.
 * `amount` is Plaid's sign: positive is money out.
 */
export function classifyPlaid(primary: string, detailed: string, amount: number): PlaidClass {
  const moneyIn = amount < 0;
  const d = detailed || "";
  if (primary === "TRANSFER_OUT") {
    if (d === "TRANSFER_OUT_WITHDRAWAL" || d === "TRANSFER_OUT_OTHER_TRANSFER_OUT") {
      return { transaction_type: "expense", category: "other", sub_category: d === "TRANSFER_OUT_WITHDRAWAL" ? "Cash" : "Payment to someone", tags: [] };
    }
    return { transaction_type: "transfer", category: "transfer", tags: [] };
  }
  if (primary === "TRANSFER_IN") {
    if (d === "TRANSFER_IN_DEPOSIT" || d === "TRANSFER_IN_OTHER_TRANSFER_IN") return { transaction_type: "income", category: "other_income", tags: [] };
    return { transaction_type: "transfer", category: "transfer", tags: [] };
  }
  if (primary === "LOAN_PAYMENTS") {
    if (d === "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" || moneyIn) return { transaction_type: "transfer", category: "transfer", tags: [] };
    if (d === "LOAN_PAYMENTS_MORTGAGE_PAYMENT") return { transaction_type: "expense", category: "housing", sub_category: "Mortgage", tags: [] };
    if (d === "LOAN_PAYMENTS_CAR_PAYMENT") return { transaction_type: "expense", category: "transport", sub_category: "Car loan", tags: [] };
    if (d === "LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT") return { transaction_type: "expense", category: "education", sub_category: "Student loan", tags: [] };
    return { transaction_type: "expense", category: "other", sub_category: "Loan payment", tags: [] };
  }
  if (primary === "INCOME" || (moneyIn && !primary)) {
    if (!moneyIn) return { transaction_type: "expense", category: "other", tags: [] };
    const category = d === "INCOME_WAGES" || d === "INCOME_SALARY" ? "salary"
      : d === "INCOME_DIVIDENDS" || d === "INCOME_INTEREST_EARNED" || d === "INCOME_RETIREMENT_PENSION" ? "investment"
      : primary === "INCOME" && !d ? "salary" : "other_income";
    return { transaction_type: "income", category, tags: [] };
  }
  if (primary === "RENT_AND_UTILITIES" && !moneyIn) {
    return { transaction_type: "expense", category: d === "RENT_AND_UTILITIES_RENT" || !d ? "housing" : "utilities", tags: [] };
  }
  const category = PLAID_CATEGORY_MAP[primary] ?? "other";
  if (moneyIn) return { transaction_type: "transfer", category, tags: ["sys:refund"] };
  return { transaction_type: "expense", category, tags: [] };
}

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

