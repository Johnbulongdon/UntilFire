import { useMemo } from 'react'

import { addMonths } from '@/engine'
import { monthSpend, thisMonth } from '@/lib/money-data'
import { useAccount } from '@/state/account'
import { usePlan, type Plan } from '@/state/plan'

/**
 * The numbers the freedom date runs on. Signed in, they come from the
 * account, as on the website's dashboard: income from the budget, spending
 * from the budget (or last month's actual spending when there is no budget),
 * and invested money from the balances. Signed out, the onboarding answers.
 */
export function useLivePlan(): { plan: Plan | null; fromAccount: boolean } {
  const { plan } = usePlan()
  const { data } = useAccount()

  return useMemo(() => {
    if (!data || !plan || data.income <= 0) return { plan, fromAccount: false }
    const budget = Object.values(data.budget).reduce((s, v) => s + v, 0)
    const lastMonth = monthSpend(data.transactions, addMonths(thisMonth(), -1)).total
    const spending = budget > 0 ? budget : lastMonth > 0 ? lastMonth : plan.monthlySpending
    const { k401, rothIRA, taxable, cashSavings } = data.balances
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
