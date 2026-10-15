// What retiring somewhere else does to the spending a FIRE target is priced on
// (D-81). The person's own spending is the starting point; the move only
// changes prices. Living costs in `CITIES` are annual USD, so their ratio has
// no units and works whatever currency the spending is in.

export type RetirementLocationSpendInput = {
  /** Today's monthly spending, in the person's currency, work costs already removed. */
  monthlySpend: number;
  /** Annual living costs where they live now; 0 when unknown. */
  currentCityCol: number;
  /** Annual living costs where they plan to retire; 0 when not chosen. */
  retirementCityCol: number;
  /** Lifestyle in retirement against today's (1 = the same). */
  lifestyleMultiplier: number;
};

/**
 * Monthly spending once free in the retirement city, or undefined when no
 * retirement city is chosen. With both cities known it is today's spending ×
 * (retirement city ÷ current city) × lifestyle. Without a current city there is
 * nothing to scale from, so it falls back to the retirement city's typical
 * cost × lifestyle, which is what the target used before D-81.
 */
export function retirementLocationMonthlySpend({
  monthlySpend, currentCityCol, retirementCityCol, lifestyleMultiplier,
}: RetirementLocationSpendInput): number | undefined {
  if (!(retirementCityCol > 0)) return undefined;
  if (currentCityCol > 0 && monthlySpend > 0) {
    return monthlySpend * (retirementCityCol / currentCityCol) * lifestyleMultiplier;
  }
  return (retirementCityCol * lifestyleMultiplier) / 12;
}

/**
 * Moving before freedom (D-81): from the move year, today's spending is priced
 * at the new city and, when they say they will earn a different take-home
 * there, pay switches to it. Never a guessed city salary. Returns the engine's
 * dated change, or null when there is no earlier move or nothing to price it by.
 */
export function moveBeforeFreedomChange({
  moveYear, thisYear, monthlySpend, currentCityCol, retirementCityCol, payMonthly,
}: {
  /** Calendar year of the move; unset means they move when free. */
  moveYear?: number; thisYear: number; monthlySpend: number;
  currentCityCol: number; retirementCityCol: number;
  /** Take-home a month in the new city; unset keeps today's pay. */
  payMonthly?: number;
}): { startYear: number; annualSpend: number; annualIncome?: number } | null {
  if (!moveYear || !(currentCityCol > 0) || !(retirementCityCol > 0)) return null;
  return {
    startYear: Math.max(0, moveYear - thisYear),
    annualSpend: monthlySpend * 12 * (retirementCityCol / currentCityCol),
    ...(payMonthly && payMonthly > 0 ? { annualIncome: payMonthly * 12 } : {}),
  };
}
