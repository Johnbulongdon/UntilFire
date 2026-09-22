/**
 * Which connected accounts hold the emergency fund.
 *
 * Not all cash is a buffer. A current account is this month's spending money
 * and brokerage cash is settlement cash waiting to be invested; counting
 * either would make the fund look fuller than it is, which is the one
 * direction this figure must not be wrong in. So the default is savings and
 * money market, and everything else is a deliberate choice the user makes.
 *
 * A term deposit is deliberately not in the default set either. The money is
 * real but it is locked, and a buffer you cannot reach without breaking it is
 * not doing the job the buffer exists for.
 */

/** The shape this needs from a stored Plaid account, and nothing more. */
export interface PlaidAccountLike {
  id: string;
  name: string;
  official_name?: string | null;
  mask?: string | null;
  type: string;
  subtype?: string | null;
  balance_current?: number | null;
  apy?: number | null;
}

export interface CashAccount {
  id: string;
  /** What to call it on screen: the bank's own name for it. */
  label: string;
  mask: string | null;
  subtype: string;
  balance: number;
  apy: number | null;
  /** In the default set — savings or money market. */
  isSavings: boolean;
}

/** Plaid spells subtypes inconsistently across institutions: money market
 *  arrives as `money market`, `money_market` and `money-market`. */
export function normaliseSubtype(subtype?: string | null): string {
  return (subtype ?? "").toLowerCase().replace(/[_-]/g, " ").trim();
}

const SAVINGS_SUBTYPES = ["savings", "money market"];

export function isSavingsAccount(account: PlaidAccountLike): boolean {
  return account.type === "depository" && SAVINGS_SUBTYPES.includes(normaliseSubtype(account.subtype));
}

/** Every connected account that holds cash, savings first. Current accounts
 *  are included so they can be chosen, not because they count by default. */
export function toCashAccounts(accounts: PlaidAccountLike[]): CashAccount[] {
  return accounts
    .filter((a) => a.type === "depository")
    .map((a) => ({
      id: a.id,
      label: a.name || a.official_name || "Account",
      mask: a.mask ?? null,
      subtype: normaliseSubtype(a.subtype) || "account",
      balance: a.balance_current ?? 0,
      apy: a.apy ?? null,
      isSavings: isSavingsAccount(a),
    }))
    .sort((a, b) => (Number(b.isSavings) - Number(a.isSavings)) || (b.balance - a.balance));
}

/**
 * The accounts the fund is actually being read from.
 *
 * `null` means "whatever my savings accounts are", which keeps tracking as
 * accounts are added. An explicit list is honoured — except when none of its
 * ids exist any more, which happens when an item is relinked and every id is
 * reissued. Reading that as "nothing selected" would report an emergency fund
 * of zero to someone whose money had not moved, so it falls back to the
 * default instead.
 */
export function resolveEmergencyAccounts(
  accounts: CashAccount[],
  selectedIds: string[] | null,
): CashAccount[] {
  const byDefault = accounts.filter((a) => a.isSavings);
  if (!selectedIds) return byDefault;
  const chosen = accounts.filter((a) => selectedIds.includes(a.id));
  return chosen.length > 0 ? chosen : byDefault;
}

export function sumBalances(accounts: CashAccount[]): number {
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

/** How to describe where the figure came from, in the user's own bank names. */
export function describeAccounts(accounts: CashAccount[]): string {
  if (accounts.length === 0) return "";
  const names = accounts.map((a) => a.label);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
