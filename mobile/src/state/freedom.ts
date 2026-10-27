import { useMemo } from 'react'

import { CITIES, engineMortgages, freedomDebt, moveBeforeFreedomChange, quickFreedom, retirementLocationMonthlySpend } from '@/engine'
import { isMortgageAccount } from '@/lib/balances'
import { spendingBasis } from '@/lib/budget-split'
import { retirementCash } from '@engine/freedom-cash.ts'
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
  /** Year by year, retirement portfolio against the target (account only). */
  series: { year: number; invested: number; target: number; reachable: number }[]
  /** Money that can be reached before the pension opens, when it decides the date (D-59). */
  bridge: { needed: number; reachable: number; locked: number; years: number } | null
  /** The engine's inputs, so what-ifs change one thing and run the same maths. */
  inputs: Inputs | null
  /** A planned move to the retirement city (D-82): the year and where, for the chart's flag. */
  move: { year: number; city: string; flag: string } | null
}

/**
 * The projection inputs exactly as the dashboard builds them (projectionInputs
 * in app/dashboard/page.tsx): balances with connected accounts replacing typed
 * ones, debts by the same rule, mortgages with their terms, and the target from
 * the retirement goal, then today's spending moved to a retirement city (D-82),
 * then today's spending; an earlier move reprices spending from its year.
 * Spending is the 12-month average of real spending (lib/budget-split spendingBasis).
 */
export function inputsFor(data: AccountData): Inputs {
  const p = data.profile
  const monthlyExpenses = spendingBasis(data).monthly
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
    // Use raw typed savings, not balances already replaced by linked checking.
    ...retirementCash(data.plaidAccounts, data.spendToggles ?? {}, data.typed.cashSavings),
    // Loans, plus cards carried at a rate, at their own rates (lib/freedom-debt), as on the website.
    ...(({ balance, rate }) => ({ totalDebt: balance, debtRate: rate }))(freedomDebt({
      otherDebt: data.debts.otherDebt,
      loans: data.plaidAccounts.filter(a => a.type === 'loan' && !isMortgageAccount(a)).map(a => ({ name: a.name || 'Loan', balance: a.balance_current ?? 0 })),
      cards: data.plaidAccounts.filter(a => a.type === 'credit').map(a => ({ name: a.name || 'Credit card', balance: a.balance_current ?? 0 })),
      ladderDebts: data.contributionPlan?.ladder?.debts ?? [],
    })),
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

/**
 * Where and when they move, as Home's web chart shows it: the retirement city
 * when it differs from where they live, in the year they set (only when both
 * cities are priced and it comes before freedom), otherwise the freedom year.
 */
function moveFor(data: AccountData, freeYear: number | null): Freedom['move'] {
  const p = data.profile
  const to = CITIES.find(c => c.name === p.retirementCityName)
  if (!to || to.name === p.cityName) return null
  const from = CITIES.find(c => c.name === p.cityName)
  const early = p.plan.moveYear && from && (freeYear == null || p.plan.moveYear < freeYear) ? p.plan.moveYear : null
  const year = early ?? freeYear
  return year != null ? { year, city: to.name.split(',')[0], flag: to.flag } : null
}

/** Runs the engine and reads off the date, the way the dashboard's freedomProjection does. */
export function project(inputs: Inputs, age: number | null) {
  const r = calcProjection(inputs)
  const date = exactFreedomDateFrom(r.data, r.fireYear, r.fireTarget)
  const years = date ? Math.max(0, (date.getTime() - Date.now()) / (365.25 * 864e5)) : r.fireYear === 0 ? 0 : null
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
      const invested = data.balances.k401 + data.balances.rothIRA + data.balances.taxable + (inputs.cashSavings ?? 0)
      return {
        source: 'account', date, year, years, ageAtFreedom, target: r.fireTarget, invested,
        monthlyIncome: data.income, monthlySpending: inputs.monthlyExpenses,
        series: r.data.map(d => ({ year: d.year, invested: d['Investable'], target: d['FIRE Target'], reachable: d['Reachable'] })),
        bridge: r.bridge, inputs, move: moveFor(data, year),
      } satisfies Freedom
    }
    if (!plan) return null
    const q = quickFreedom(plan)
    return {
      source: 'answers', date: null, year: q.year, years: q.years, ageAtFreedom: plan.age != null && q.years != null ? Math.floor(plan.age + q.years) : null,
      target: q.target, invested: plan.invested, monthlyIncome: plan.monthlyIncome, monthlySpending: plan.monthlySpending,
      series: [], bridge: null, inputs: null, move: null,
    } satisfies Freedom
  }, [data, plan])
}
