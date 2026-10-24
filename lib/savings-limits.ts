/**
 * Banks known to still cap savings withdrawals each month, as of March 2026
 * (Bankrate). Only a suggestion: the person sets the limit they actually have,
 * since banks change these rules and some list a cap they do not enforce
 * (Capital One 360 says it is "currently not enforcing" its six).
 */
const KNOWN_LIMITS: { match: RegExp; limit: number }[] = [
  { match: /\bchase\b/i, limit: 6 },
  { match: /bank of america/i, limit: 6 },
  { match: /wells fargo/i, limit: 6 },
];

/** The usual monthly limit at this institution, or null when none is known. */
export function knownWithdrawalLimit(institutionName: string | null | undefined): number | null {
  if (!institutionName) return null;
  return KNOWN_LIMITS.find((k) => k.match.test(institutionName))?.limit ?? null;
}

/** A typed limit, or null for blank, zero or nonsense. */
export function parseWithdrawalLimit(raw: string): number | null {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n >= 1 && n <= 99 ? n : null;
}

/** The fields of a Plaid transaction this needs; kept loose so it tests
 *  without the SDK. */
export interface WithdrawalTxLike {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  pending: boolean;
  merchant_name?: string | null;
  name: string;
}

/**
 * Money that left a savings account. Plaid signs amounts from the account's
 * side: positive is money out. Deposits never count against a limit, so a
 * transfer in from Bilt or payroll is dropped here. Pending rows are kept:
 * the person wants to know a withdrawal is spoken for before it posts, and
 * when it posts Plaid gives it a new id that replaces this one on the next
 * month refresh.
 */
export function pickWithdrawals(txs: WithdrawalTxLike[], savingsAccountIds: Set<string>, userId: string) {
  return txs
    .filter((t) => savingsAccountIds.has(t.account_id) && t.amount > 0)
    .map((t) => ({
      user_id: userId,
      plaid_account_id: t.account_id,
      plaid_transaction_id: t.transaction_id,
      date: t.date,
      amount: t.amount,
      description: t.merchant_name ?? t.name,
      pending: t.pending,
    }));
}

/** First day of the month holding `today`, as YYYY-MM-DD. Calendar month, not
 *  statement cycle: Plaid does not report cycle dates for depository accounts. */
export function monthStart(today: string): string {
  return `${today.slice(0, 7)}-01`;
}

/** "4 of 6 withdrawals left" for the account line; past the limit it says how
 *  many over, since some banks charge per extra withdrawal. */
export function withdrawalsLeftLabel(limit: number, used: number): string {
  if (used > limit) return `${used - limit} over the ${limit}-withdrawal limit this month`;
  return `${limit - used} of ${limit} withdrawals left this month`;
}
