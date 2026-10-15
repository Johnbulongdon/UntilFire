import { useMemo } from 'react'

import { CITIES, engineMortgages, moveBeforeFreedomChange, quickFreedom, retirementLocationMonthlySpend } from '@/engine'
import { isMortgageAccount } from '@/lib/balances'
import { addMonths } from '@/engine'
import { monthSpend, thisMonth } from '@/lib/money-data'
import { calcProjection, exactFreedomDateFrom } from '@/lib/projection'
import { useAccount, type AccountData } from '@/state/account'
import { usePlan } from '@/state/plan'

type Inputs = Parameters<typeof calcProjection>[0]

export interface Freedom {
  /** Where the numbers came from: the full engine on the account, or the quick estimate on onboarding answers. */
  source: 'account' | 'answers'
  date: Date | null
  year: number | null
  /** Years from now, fractional. */
  years: number | null
  ageAtFreedom: number | null
  target: number
  invested: number
  monthlyIncome: number
  monthlySpending: number
  /** Year by year, invested money against the target (account only). */
  series: { year: number; invested: number; target: number; reachable: number }[]
  /** Money that can be reached before the pension opens, when it decides the date (D-59). */
  bridge: { needed: number; reachable: number; locked: number; years: number } | null
  /** The engine's inputs, so what-ifs change one thing and run the same maths. */
  inputs: Inputs | null
}

/**
 * The projection inputs exactly as the dashboard builds them (projectionInputs
 * in app/dashboard/page.tsx): balances with connected accounts replacing typed
 * ones, debts by the same rule, mortgages with their terms, and the target from
 * the retirement goal, then today's spending moved to a retirement city (D-81),
 * then today's spending; an earlier move reprices spending from its year.
 */
export function inputsFor(data: AccountData): Inputs {
  const p = data.profile
  const budget = Object.values(data.budget).reduce((s, v) => s + v, 0)
  const monthlyExpenses = budget > 0 ? budget : monthSpend(data.transactions, addMonths(thisMonth(), -1)).total
  const currentCityCol = CITIES.find(c => c.name === p.cityName)?.col ?? 0
  const targetMonthlyExpenses = (p.plan.retirementAnnualSpend ?? 0) > 0 ? p.plan.retirementAnnualSpend! / 12
    : retirementLocationMonthlySpend({ monthlySpend: monthlyExpenses, currentCityCol, retirementCityCol: p.retirementCityCol, lifestyleMultiplier: p.lifestyleMultiplier })
  const move = moveBeforeFreedomChange({ moveYear: p.plan.moveYear, thisYear: new Date().getFullYear(), monthlySpend: monthlyExpenses,
    currentCityCol, retirementCityCol: p.retirementCityCol, payMonthly: p.plan.movePayMonthly })
  const connectedMortgages = data.plaidAccounts.filter(isMortgageAccount).map(a => ({ id: a.id, balance: Math.max(0, a.balance_current ?? 0) }))
  return {
    ...p.plan,
    currentAge: data.age ?? undefined,
    taxFreeGainsLocked: true,
    mortgages: engineMortgages(data.typed.mortgages, connectedMortgages, p.mortgageTerms),
    annualIncome: data.income * 12,
    monthlyExpenses,
    ...data.balances,
    totalDebt: data.debts.otherDebt,
    mortgageBalance: data.debts.mortgage,
    mortgageMonthly: p.mortgageMonthly,
    growthRate: p.growthRate,
    withdrawalRate: p.withdrawalRate,
    targetMonthlyExpenses,
    taxEnabled: p.taxEnabled,
    retirementTaxRate: p.retirementTaxRate,
    rothPct: p.rothPct,
    ...(move ? { changes: [move] } : {}),
  }
}

/** Runs the engine and reads off the date, the way the dashboard's freedomProjection does. */
export function project(inputs: Inputs, age: number | null) {
  const r = calcProjection(inputs)
  const date = exactFreedomDateFrom(r.data, r.fireYear, r.fireTarget)
  const years = date ? (date.getTime() - Date.now()) / (365.25 * 864e5) : r.fireYear === 0 ? 0 : null
  return { r, date, years, year: date ? date.getFullYear() : r.fireYear === 0 ? new Date().getFullYear() : null, ageAtFreedom: age != null && years != null ? Math.round(age + years) : null }
}

/** The freedom date everywhere in the app: the full engine when signed in with numbers, else the quick estimate. */
export function useFreedom(): Freedom | null {
  const { plan } = usePlan()
  const { data } = useAccount()

  return useMemo(() => {
    if (data && data.income > 0) {
      const inputs = inputsFor(data)
      const { r, date, years, year, ageAtFreedom } = project(inputs, data.age)
      const invested = data.balances.k401 + data.balances.rothIRA + data.balances.taxable + data.balances.cashSavings
      return {
        source: 'account', date, year, years, ageAtFreedom, target: r.fireTarget, invested,
        monthlyIncome: data.income, monthlySpending: inputs.monthlyExpenses,
        series: r.data.map(d => ({ year: d.year, invested: d['Investable'], target: d['FIRE Target'], reachable: d['Reachable'] })),
        bridge: r.bridge, inputs,
      } satisfies Freedom
    }
    if (!plan) return null
    const q = quickFreedom(plan)
    return {
      source: 'answers', date: null, year: q.year, years: q.years, ageAtFreedom: plan.age != null && q.years != null ? Math.floor(plan.age + q.years) : null,
      target: q.target, invested: plan.invested, monthlyIncome: plan.monthlyIncome, monthlySpending: plan.monthlySpending,
      series: [], bridge: null, inputs: null,
    } satisfies Freedom
  }, [data, plan])
}
