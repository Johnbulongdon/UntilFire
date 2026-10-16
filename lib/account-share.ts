/**
 * Your share of a joint account, for your own freedom date (money logic audit
 * round 2). A joint checking account connected by both partners used to put
 * all of its money and all of its spending on each person's date. Each
 * connected account can now be marked shared; a shared account counts at
 * half on your own figures. The household date still reads everything once
 * (lib/household-spending). Stored in `_fire_profile.accountShares` as a
 * percent per plaid_account_id; an account not listed is all yours.
 */
export type AccountShares = Record<string, number>;

export const SHARED_PCT = 50;

/** Your fraction of an account, 0–1. */
export function shareOf(accountId: string | null | undefined, shares: AccountShares | undefined): number {
  if (!accountId || !shares) return 1;
  const pct = Number(shares[accountId]);
  return Number.isFinite(pct) && pct > 0 && pct < 100 ? pct / 100 : 1;
}

type Balances = { plaid_account_id?: string | null; balance_current?: number | null; balance_available?: number | null };

/** Accounts with each balance cut to your share. */
export function applyAccountShares<A extends Balances>(accounts: A[], shares: AccountShares | undefined): A[] {
  return accounts.map((a) => {
    const f = shareOf(a.plaid_account_id, shares);
    if (f === 1) return a;
    return {
      ...a,
      balance_current: a.balance_current == null ? a.balance_current : a.balance_current * f,
      balance_available: a.balance_available == null ? a.balance_available : a.balance_available * f,
    };
  });
}

/** Clean what was read from the profile: only real percents below 100 are kept. */
export function readAccountShares(raw: unknown): AccountShares {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number" && v > 0 && v < 100)) as AccountShares;
}
