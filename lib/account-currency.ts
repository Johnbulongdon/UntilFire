/**
 * Connected account balances in US dollars.
 *
 * Plaid reports each balance in the account's own currency, and every total
 * on the dashboard — net worth, cash, the emergency fund, the contribution
 * forecast, the freedom-date projection — used to add those numbers together
 * as if they were all dollars. HK$20,000 counted as $20,000. It went unnoticed
 * only because the multi-currency accounts in use happened to hold nothing.
 *
 * Converting once, where the accounts are loaded, fixes every total at once
 * rather than eleven separately, and leaves no total that forgot.
 *
 * `rates` are units of the currency per US dollar — the same convention the
 * dashboard's toUSD uses — so a balance converts as amount / rate.
 */

export interface AccountBalances {
  balance_current: number | null;
  balance_available?: number | null;
  balance_limit?: number | null;
  iso_currency_code?: string | null;
}

export interface ConvertedFields {
  /** The balance as the institution reports it, in `native_currency`. */
  native_balance_current: number | null;
  native_currency: string;
  /**
   * False when the currency has no rate. The shared toUSD returns the amount
   * unchanged in that case, which would count a foreign balance as dollars;
   * for a balance that can be the difference between one won and one dollar.
   * An unconvertible balance is excluded (set to 0) and flagged instead —
   * understating is the safe direction when the total decides what to invest.
   */
  converted: boolean;
}

const toUsd = (amount: number | null | undefined, currency: string, rates: Record<string, number>) => {
  if (amount == null || !Number.isFinite(amount)) return { value: amount ?? null, ok: true };
  if (currency === "USD") return { value: amount, ok: true };
  const rate = rates[currency];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return { value: 0, ok: false };
  return { value: amount / rate, ok: true };
};

export function accountInUSD<T extends AccountBalances>(
  account: T,
  rates: Record<string, number>,
): T & ConvertedFields {
  const currency = (account.iso_currency_code || "USD").trim().toUpperCase();
  const current = toUsd(account.balance_current, currency, rates);
  const available = toUsd(account.balance_available, currency, rates);
  const limit = toUsd(account.balance_limit, currency, rates);
  return {
    ...account,
    balance_current: current.value,
    balance_available: available.value,
    balance_limit: limit.value,
    // The balances above are dollars now; saying so keeps the object honest
    // for anything that reads the currency alongside them.
    iso_currency_code: "USD",
    native_balance_current: account.balance_current,
    native_currency: currency,
    converted: current.ok,
  };
}

/** Days since a balance was last refreshed from the bank, or null if never. */
export function daysSinceSync(syncedAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!syncedAt) return null;
  const t = new Date(syncedAt).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** Older than this and a balance is flagged as possibly out of date. */
export const STALE_AFTER_DAYS = 3;
