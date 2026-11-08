/**
 * "Your first step" in the website onboarding (after Your monthly picture).
 * Picked only from the calculator answers, never generic advice:
 * a monthly gap first, then the safety pot (6 months of bills), then investing.
 * Amounts are in USD, as CalculatorPrefill stores them.
 */
export const SAFETY_POT_MONTHS = 6

export type FirstStep = {
  kind: 'gap' | 'pot' | 'invest'
  /** Money saved and invested today. */
  have: number
  /** 6 months of bills. */
  need: number
  /** Months of bills already covered, 0–6 (can be fractional). */
  monthsCovered: number
  /** Saved each month; 0 or less when spending is above income. */
  monthlySavings: number
  /** Spending above income each month (gap only). */
  gap: number
  /** Months until the pot is full at today's saving (pot only). */
  monthsToFull: number | null
}

export function pickFirstStep(input: {
  monthlySpend: number
  monthlySavings: number
  saved: number
}): FirstStep | null {
  const spend = Math.max(0, input.monthlySpend)
  if (!(spend > 0)) return null
  const saved = Math.max(0, input.saved || 0)
  const monthlySavings = input.monthlySavings || 0
  const need = spend * SAFETY_POT_MONTHS
  const monthsCovered = Math.min(SAFETY_POT_MONTHS, saved / spend)
  const base = { have: saved, need, monthsCovered, monthlySavings, gap: 0, monthsToFull: null }
  if (monthlySavings <= 0) return { ...base, kind: 'gap', gap: Math.max(0, -monthlySavings) }
  if (saved < need) return { ...base, kind: 'pot', monthsToFull: Math.ceil((need - saved) / monthlySavings) }
  return { ...base, kind: 'invest' }
}

/** The month the pot is full, e.g. "Nov 2027". */
export function fullByLabel(monthsToFull: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + monthsToFull, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
