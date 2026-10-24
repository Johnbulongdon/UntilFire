import { isCounted, type SpendAccount } from "./free-to-spend.ts";

export const SAFETY_POT_MONTHS = 6;

export interface CashAccountLike { id?: string; name?: string | null; type: string; subtype?: string | null; balance_current?: number | null; apy?: number | null }

/** Savings outside the spending accounts. Typed cash counts as savings while no
 *  savings account is connected: checking alone connected doesn't replace it. */
export function safetyPot(accounts: CashAccountLike[], toggles: Record<string, boolean>, typedCash: number): number {
  const cash = accounts.filter((a) => a.type === "depository");
  const asSpend = (a: CashAccountLike): SpendAccount => ({ id: a.id ?? "", name: a.name ?? "", type: a.type, subtype: a.subtype, balanceUSD: 0 });
  const savings = cash.filter((a) => !isCounted(asSpend(a), toggles));
  if (savings.length === 0) return typedCash;
  return savings.reduce((s, a) => s + (a.balance_current ?? 0), 0);
}

/** All non-spending cash counts once, including the safety pot (D-95). */
export function freedomCash(safety: number): number {
  return Number.isFinite(safety) ? Math.max(0, safety) : 0;
}

/** Same long-run inflation baseline as SP500_HISTORY's since-1928 period.
 * Cash APY is nominal percent (4 means 4%). Unknown APY assumes 0% interest,
 * never equity growth. Rates remain fixed over the illustrative projection. */
export const CASH_INFLATION_RATE = 0.03;
export const DEFAULT_CASH_GROWTH = 1 / (1 + CASH_INFLATION_RATE) - 1;
export function retirementCash(accounts: CashAccountLike[], toggles: Record<string, boolean>, typedCash: number) {
  const savings = accounts.filter(a => a.type === "depository" && !isCounted({
    id: a.id ?? "", name: a.name ?? "", type: a.type, subtype: a.subtype, balanceUSD: 0,
  }, toggles));
  const cashSavings = freedomCash(safetyPot(accounts, toggles, typedCash));
  const interest = savings.reduce((sum, a) => sum + Math.max(0, a.balance_current ?? 0) *
    (a.apy != null && Number.isFinite(a.apy) && a.apy >= 0 ? a.apy / 100 : 0), 0);
  const nominal = cashSavings > 0 ? interest / cashSavings : 0;
  return { cashSavings, cashGrowthRate: (1 + nominal) / (1 + CASH_INFLATION_RATE) - 1 };
}

/** Accessible bridge required in today's money, at the current cash/investment
 * mix. Spend cash first at each year's start, then grow each remaining bucket
 * at its own real return. A fractional final year spends only that fraction. */
export function bridgeRequired(annualSpend: number, years: number, cash: number, investments: number, cashRate: number, investmentRate: number): number {
  if (!(annualSpend > 0) || !(years > 0)) return 0;
  const share = cash + investments > 0 ? cash / (cash + investments) : 0;
  const lasts = (total: number) => {
    let c = total * share, i = total * (1 - share);
    for (let t = 0; t < years; t++) {
      const fraction = Math.min(1, years - t);
      const spend = annualSpend * fraction;
      const fromCash = Math.min(c, spend);
      c -= fromCash;
      i -= spend - fromCash;
      if (i < -1e-7) return false;
      c *= Math.pow(1 + cashRate, fraction);
      i *= Math.pow(1 + investmentRate, fraction);
    }
    return true;
  };
  let lo = 0, hi = annualSpend * years;
  while (!lasts(hi) && hi < Number.MAX_VALUE / 2) hi *= 2;
  for (let n = 0; n < 48; n++) { const mid = (lo + hi) / 2; if (lasts(mid)) hi = mid; else lo = mid; }
  return hi;
}
