import type { FireInputs, FireOutput, FireStrategy } from '../types';

/**
 * The one growth assumption for the whole product.
 *
 * REAL, not nominal: roughly the ~10% long-run average total return of a broad
 * equity index minus roughly 3% long-run inflation. Because it is real, every
 * target derived from it (25x annual spending) stays in TODAY's dollars, which
 * is both what the FIRE convention quotes and the only version a human can
 * judge — "$1.25M" means something, "$2.24M in 2043 money" does not.
 *
 * Keeping it real also costs one assumption instead of three: a nominal model
 * needs a market return, an inflation rate to inflate the target, AND a wage
 * growth rate to inflate contributions. Both approaches produce the same
 * freedom date when done consistently; only this one is legible.
 *
 * This constant exists because the number used to be written out in six places
 * and two of them said 0.10 — which grew the portfolio at a nominal rate while
 * still comparing it against a today's-dollar target, reporting freedom dates
 * several years too early. Import it; never re-type the literal.
 */
export const REAL_RETURN = 0.07;

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
  expectedRealReturn = REAL_RETURN,
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
  if (bal < fireTarget) {
    return { fireTarget, years: null, retireYear: null };
  }
  // Interpolate to find the exact fractional year when balance crosses FIRE target
  let fractionalYears = yrs;
  if (yrs > 0) {
    const annual = monthlySavings * 12;
    const k = annual / expectedRealReturn;
    const ratio = (fireTarget + k) / (balPrev + k);
    if (expectedRealReturn === 0 && annual > 0) {
      fractionalYears = (yrs - 1) + Math.min(1, Math.max(0, (fireTarget - balPrev) / annual));
    } else if (ratio > 1) {
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
  expectedReturn: number = REAL_RETURN,
): FireOutput {
  return compute({ monthlySavings, annualExpenses, currentAge, startingBalance, expectedRealReturn: expectedReturn });
}
