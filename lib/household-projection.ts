import { calcFIRE, REAL_RETURN } from "./fire";

/** Household estimate keeps non-spending cash at its own real return (D-95).
 * Like the existing household estimate, this does not model pensions or debt
 * schedules. Personal projections retain those individual restrictions. */
export function householdProjection(combined: {
  monthlySavings: number; annualExpenses: number; portfolio: number;
  cashSavings: number; cashGrowthRate: number;
}, now: number = Date.now()) {
  const fireTarget = combined.annualExpenses / 0.04;
  const output = (years: number | null) => ({ fireTarget, years, retireYear: years == null ? null : new Date(now + years * 365.25 * 864e5).getFullYear() });
  if (!(fireTarget > 0)) return output(null);
  if (combined.portfolio >= fireTarget) return output(0);
  if (!(combined.cashSavings > 0)) return calcFIRE(combined.monthlySavings, combined.annualExpenses, undefined, combined.portfolio, REAL_RETURN);
  let cash = combined.cashSavings, invested = Math.max(0, combined.portfolio - cash);
  for (let year = 1; year <= 65; year++) {
    const previous = cash + invested;
    cash *= 1 + combined.cashGrowthRate;
    invested = invested * (1 + REAL_RETURN) + combined.monthlySavings * 12;
    const total = cash + invested;
    if (total >= fireTarget) return output(year - 1 + Math.max(0, Math.min(1, (fireTarget - previous) / (total - previous))));
  }
  return output(null);
}
