import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Transaction as PlaidTransaction } from "plaid";

/**
 * Which countries Plaid Link offers banks from.
 *
 * Was hardcoded to US, which meant a UK user was shown an empty institution
 * list and no reason why — Plaid serves GB perfectly well, the request simply
 * never asked for it.
 *
 * Environment-driven rather than a wider hardcoded default, because a country
 * has to be enabled on the Plaid dashboard before Link will accept it: asking
 * for one you are not approved for fails the whole token request, so turning
 * GB on here without turning it on there would break the connect flow for
 * everyone rather than just leaving it unavailable. Set PLAID_COUNTRY_CODES
 * once the countries are live on the account, e.g. "US,GB,IE,CA".
 *
 * Plaid has no coverage in Hong Kong or mainland China at all, which is why
 * connecting a bank cannot be the only route into the product — see the
 * import path in the Cashflow tab.
 */
const SUPPORTED = new Set<string>(Object.values(CountryCode));

export function plaidCountries(): CountryCode[] {
  const configured = (process.env.PLAID_COUNTRY_CODES ?? "US")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => SUPPORTED.has(c)) as CountryCode[];

  // An empty or entirely invalid setting falls back rather than sending Plaid
  // a request with no countries in it, which fails as a bad request.
  return configured.length ? Array.from(new Set(configured)) : [CountryCode.Us];
}

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

// Fetches a bank's real logo (base64 152x152 PNG) and brand color from
// Plaid's institutions API. Best-effort — not all institutions have one,
// and the caller should treat a null result as "fall back to a monogram."
export async function getInstitutionBranding(
  institutionId: string,
): Promise<{ logo: string | null; color: string | null }> {
  try {
    const plaid = getPlaidClient();
    const resp = await plaid.institutionsGetById({
      institution_id: institutionId,
      country_codes: plaidCountries(),
      options: { include_optional_metadata: true },
    });
    const institution = resp.data.institution;
    const color = institution.primary_color
      ? `#${institution.primary_color.replace(/^#/, "")}`
      : null;
    return { logo: institution.logo ?? null, color };
  } catch (err) {
    console.error("[plaid] getInstitutionBranding", institutionId, err);
    return { logo: null, color: null };
  }
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

