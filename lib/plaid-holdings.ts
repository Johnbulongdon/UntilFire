/**
 * Which connections to ask for investment holdings, and what a refusal means.
 *
 * The holdings request used to go to every connection. A bank with only
 * current and savings accounts has no holdings and never granted investments
 * access, so Plaid refused with ADDITIONAL_CONSENT_REQUIRED — and Net Worth
 * told the user to "Reconnect to enable holdings data" for their bank, on
 * every visit, logging an error each time. Only a connection that holds an
 * investment account has anything to ask for.
 */

export interface AccountLink {
  /** Our plaid_items.id the account belongs to. */
  plaid_item_id: string | null;
  type: string;
}

/** The connections that hold at least one investment account. */
export function itemsWithInvestments(accounts: AccountLink[]): Set<string> {
  return new Set(
    accounts
      .filter((a) => a.type === "investment" && a.plaid_item_id)
      .map((a) => a.plaid_item_id as string),
  );
}

/** What a refused holdings request means; shared with the daily refresh. */
export { plaidErrorOutcome as holdingsOutcome, type PlaidErrorOutcome as HoldingsOutcome } from "./plaid-errors.ts";
