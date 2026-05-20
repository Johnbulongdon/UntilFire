import { Configuration, PlaidApi, PlaidEnvironments, Transaction as PlaidTransaction } from "plaid";

let _client: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (!_client) {
    const env = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;
    const config = new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
        },
      },
    });
    _client = new PlaidApi(config);
  }
  return _client;
}

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

export function mapPlaidTx(tx: PlaidTransaction, userId: string) {
  const primary = tx.personal_finance_category?.primary ?? "";
  if (PLAID_SKIP_CATEGORIES.has(primary)) return null;

  // Plaid: positive amount = debit (money out), negative = credit (money in)
  const isIncome = tx.amount < 0;
  const absAmount = Math.abs(tx.amount);
  const mappedCategory = PLAID_CATEGORY_MAP[primary] ?? "other";
  const category = isIncome
    ? mappedCategory === "salary" ? "salary" : "other_income"
    : mappedCategory;

  return {
    user_id: userId,
    date: tx.date,
    amount: absAmount,
    currency: tx.iso_currency_code ?? "USD",
    description: tx.merchant_name ?? tx.name,
    category,
    tags: [] as string[],
    sub_category: null as string | null,
    transaction_type: isIncome ? "income" : "expense",
    plaid_transaction_id: tx.transaction_id,
    source: "plaid",
  };
}

