import { calcFIRE } from './fire/strategies/traditional';
import type { CalculatorPrefill } from './journey';

/** A what-if only: fixed income, spending and the retirement target move together. */
export function savingsPace(prefill: CalculatorPrefill, savings: number) {
  const income = Math.max(0, prefill.monthlyIncome ?? 0);
  const original = prefill.monthlySavings ?? 0;
  const amount = Math.min(income, Math.max(0, Number.isFinite(savings) ? savings : original));
  const changed = amount !== original;
  const spending = Math.max(0, income - amount);
  const annualCost = changed ? spending * 12 : (prefill.annualCost ?? spending * 12);
  const result = calcFIRE(amount, annualCost, prefill.currentAge, prefill.portfolioBalance ?? 0, prefill.realReturn);
  const plan: CalculatorPrefill = changed ? {
    ...prefill, monthlySavings: amount, monthlySpendEstimate: spending,
    annualCost, fireTarget: result.fireTarget, retireYear: result.retireYear ?? undefined,
  } : prefill;
  return { amount, spending, changed, result, plan, rate: income > 0 ? amount / income * 100 : 0 };
}

export function paceDate(years: number | null, now: number) {
  if (years === null) return 'Not reached yet';
  if (years === 0) return 'Now';
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(now + years * 365.25 * 864e5));
}
