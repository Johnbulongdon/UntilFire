import { REAL_RETURN, yearsToTarget } from './fire/strategies/traditional.ts'

/**
 * The embeddable calculator's answer (D-27): three numbers in, a freedom
 * date out. Same maths as the free result, the 4% rule for the target and
 * the shared projection at the recommended growth, so a reader who clicks
 * through sees the same date, not a different one.
 */
export function quickFreedom(input: { monthlyIncome: number; monthlySpending: number; invested: number }, now: Date = new Date()) {
  const income = Math.max(0, input.monthlyIncome || 0)
  const spending = Math.max(0, input.monthlySpending || 0)
  const invested = Math.max(0, input.invested || 0)
  const target = spending * 12 * 25
  const saving = income - spending
  const savingsRate = income > 0 ? Math.max(0, saving / income) : 0
  const years = spending > 0 ? yearsToTarget(invested, Math.max(0, saving) * 12, target, REAL_RETURN) : null
  return {
    target,
    savingsRate,
    years,
    // Rounded like the free result and the dashboard (lib/fire calcFIRE):
    // rounding up put the embed a year later than the page it links to (D-37).
    year: years === null ? null : now.getFullYear() + Math.floor(years),
  }
}

/**
 * The embed's growth curve: invested money at the start of each year, grown
 * at the same rate and saving as quickFreedom, until it reaches the target
 * (at most 65 years). The last point is the year the chart ends on.
 */
export function freedomPath(input: { monthlyIncome: number; monthlySpending: number; invested: number }): number[] {
  const spending = Math.max(0, input.monthlySpending || 0)
  const target = spending * 12 * 25
  const saving = Math.max(0, (input.monthlyIncome || 0) - spending) * 12
  let balance = Math.max(0, input.invested || 0)
  const points = [balance]
  while (balance < target && points.length <= 65) {
    balance = balance * (1 + REAL_RETURN) + saving
    points.push(balance)
  }
  return points
}
