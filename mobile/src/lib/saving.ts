import type { AccountData } from '@/state/account'

import { spendingBasis } from './budget-split'
import { goalsMonthly } from './goals'

/**
 * What you save each month, the one figure every screen shows (audit round 3,
 * Oct 17 2026): take-home less real spending, the same spending the freedom
 * date runs on (spendingBasis). Goals take their monthly share first; the rest
 * is invested. The budget version is only ever a what-if.
 */
export function monthlySaving(data: AccountData) {
  const basis = spendingBasis(data)
  const saving = data.income - basis.monthly
  const toGoals = Math.min(Math.max(0, saving), goalsMonthly(data.goals))
  return {
    saving,
    spending: basis.monthly,
    source: basis.source,
    months: basis.months,
    budget: basis.budget,
    budgetSaving: basis.budget > 0 ? data.income - basis.budget : null,
    toGoals,
    toInvest: Math.max(0, saving - toGoals),
  }
}
