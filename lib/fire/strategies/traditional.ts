import type { FireInputs, FireOutput, FireStrategy } from '../types';

/**
 * Traditional FIRE: 25× annual expenses target (4% safe withdrawal), 7% real
 * return assumption, capped at 65 years of accumulation.
 *
 * Year-over-year balance update mirrors the v1 reveal exactly so this seam
 * does not move any user-visible numbers.
 */
function compute({
  monthlySavings,
  annualExpenses,
  currentAge,
  startingBalance = 0,
  expectedRealReturn = 0.07,
  withdrawalRate = 0.04,
  maxYears = 65,
}: FireInputs): FireOutput {
  const fireTarget = annualExpenses * (1 / withdrawalRate);
  let bal = startingBalance;
  let balPrev = startingBalance;
  let yrs = 0;
  while (bal < fireTarget && yrs < maxYears) {
    balPrev = bal;
    bal = bal * (1 + expectedRealReturn) + monthlySavings * 12;
    yrs++;
  }
  // Interpolate to find the exact fractional year when balance crosses FIRE target
  let fractionalYears = yrs;
  if (yrs > 0 && yrs < maxYears) {
    const annual = monthlySavings * 12;
    const k = annual / expectedRealReturn;
    const ratio = (fireTarget + k) / (balPrev + k);
    if (ratio > 1) {
      const t = Math.log(ratio) / Math.log(1 + expectedRealReturn);
      fractionalYears = (yrs - 1) + Math.min(Math.max(t, 0), 1);
    }
  }
  const out: FireOutput = {
    fireTarget,
    years: fractionalYears,
    retireYear: new Date().getFullYear() + Math.floor(fractionalYears),
  };
  if (typeof currentAge === 'number' && currentAge > 0) {
    out.age = currentAge + yrs;
  }
  return out;
}

export const traditionalStrategy: FireStrategy = {
  id: 'traditional',
  label: 'Traditional FIRE',
  description: '25× annual expenses, 4% safe withdrawal rate, 7% real return.',
  compute,
};

/**
 * Drop-in replacement for the legacy positional `calcFIRE` signature so the
 * landing wizard can adopt the engine without rewriting six call sites.
 */
export function calcFIRE(
  monthlySavings: number,
  annualExpenses: number,
  currentAge?: number,
  startingBalance: number = 0,
): FireOutput {
  return compute({ monthlySavings, annualExpenses, currentAge, startingBalance });
}
