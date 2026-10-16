/**
 * Which cash counts toward freedom (money logic study, Oct 16 2026, the
 * founder's call). Spending accounts never do: that money pays this month's
 * bills. Savings are the safety pot, kept out of the date and earning
 * nothing, up to six months of needs. Only cash above that is invested.
 */
import { isCounted, type SpendAccount } from "./free-to-spend.ts";

export const SAFETY_POT_MONTHS = 6;

export interface CashAccountLike { id?: string; name?: string | null; type: string; subtype?: string | null; balance_current?: number | null }

/** Savings outside the spending accounts. Typed cash counts as savings while no
 *  savings account is connected: checking alone connected doesn't replace it. */
export function safetyPot(accounts: CashAccountLike[], toggles: Record<string, boolean>, typedCash: number): number {
  const cash = accounts.filter((a) => a.type === "depository");
  const asSpend = (a: CashAccountLike): SpendAccount => ({ id: a.id ?? "", name: a.name ?? "", type: a.type, subtype: a.subtype, balanceUSD: 0 });
  const savings = cash.filter((a) => !isCounted(asSpend(a), toggles));
  if (savings.length === 0) return typedCash;
  return savings.reduce((s, a) => s + (a.balance_current ?? 0), 0);
}

/** The cash the freedom date treats as invested: the safety pot above six months of needs. */
export function freedomCash(safety: number, monthlyNeeds: number): number {
  return Math.max(0, safety - SAFETY_POT_MONTHS * Math.max(0, monthlyNeeds));
}
