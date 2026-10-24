import { useMemo } from 'react'

import { spendingBasis } from '@/lib/budget-split'
import { freedomCash } from '@/lib/money-data'
import { useAccount } from '@/state/account'
import { usePlan, type Plan } from '@/state/plan'

/**
 * The numbers the freedom date runs on. Signed in, they come from the
 * account: income from the budget, spending from the last 12 months of real
 * spending (the budget before three months of data),
 * and invested money from the balances. Signed out, the onboarding answers.
 */
export function useLivePlan(): { plan: Plan | null; fromAccount: boolean } {
  const { plan } = usePlan()
  const { data } = useAccount()

  return useMemo(() => {
    if (!data || !plan || data.income <= 0) return { plan, fromAccount: false }
    // The same spending the freedom date runs on (lib/budget-split spendingBasis).
    const basis = spendingBasis(data).monthly
    const spending = basis > 0 ? basis : plan.monthlySpending
    const { k401, rothIRA, taxable } = data.balances
    const cashSavings = freedomCash(data)
    return {
      plan: {
        ...plan,
        monthlyIncome: data.income,
        monthlySpending: spending,
        invested: Math.max(0, k401 + rothIRA + taxable + cashSavings),
        age: data.age ?? plan.age,
      },
      fromAccount: true,
    }
  }, [data, plan])
}
