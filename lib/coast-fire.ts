/**
 * The Coast FIRE target, with income that arrives after work stops: Social
 * Security, a pension, a partner's benefit.
 *
 * Income that starts at retirement simply shrinks the spending the portfolio
 * pays for. Income that starts later (Social Security at 67 for someone
 * retiring at 55) leaves a gap: the portfolio pays everything until then. The
 * target covers both: the lasting share at the withdrawal rate, plus the cost
 * of bridging each benefit until it starts, at the same real return.
 *
 * Everything is in today's money, as in the calculator: the return is real,
 * and benefits are entered in today's dollars (Social Security rises with
 * inflation, so a real figure is the honest one). See D-25.
 */

export interface RetirementIncome {
  /** A year of income in today's money. */
  annual: number
  /** Age it starts, for the person whose ages the calculator uses. */
  startAge: number
}

const clean = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0)

/** The income arriving at an age, from every benefit that has started. */
export function incomeAt(age: number, incomes: RetirementIncome[]): number {
  return incomes.reduce((sum, i) => sum + (age >= i.startAge ? clean(i.annual) : 0), 0)
}

/**
 * What the portfolio needs at retirement.
 *
 * lasting = (spending − all income) ÷ withdrawal rate, never below zero
 * bridge  = each benefit × the value at retirement of paying it yourself for
 *           the years before it starts: (1 − (1 + r)^−n) ÷ r, or n at r = 0
 */
export function coastTarget(
  annualSpending: number,
  withdrawalRate: number,
  realReturn: number,
  retireAge: number,
  incomes: RetirementIncome[] = [],
): number {
  const spending = clean(annualSpending)
  if (!(withdrawalRate > 0)) return 0
  const lasting = Math.max(0, spending - incomeAt(Infinity, incomes)) / withdrawalRate
  // Income beyond spending cannot fund the bridge years of another benefit, so
  // cap what the benefits replace at the spending they replace.
  let covered = Math.min(spending, incomeAt(Infinity, incomes))
  let bridge = 0
  for (const i of [...incomes].sort((a, b) => a.startAge - b.startAge)) {
    const amount = Math.min(clean(i.annual), covered)
    covered -= amount
    const years = Math.max(0, i.startAge - retireAge)
    if (!amount || !years) continue
    bridge += amount * (realReturn === 0 ? years : (1 - Math.pow(1 + realReturn, -years)) / realReturn)
  }
  return lasting + bridge
}

/** The Coast number at an age: the target discounted back from retirement. */
export function coastNumberAt(target: number, realReturn: number, age: number, retireAge: number): number {
  return target / Math.pow(1 + realReturn, Math.max(0, retireAge - age))
}
