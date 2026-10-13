import { addMonths, toCashAccounts, type AccountFacts, type ExpectedItem, type StoredPlan } from '@/engine'
import { toUSD, type AccountData } from '@/state/account'

import { isMortgageAccount } from './balances'
import { monthSpend, thisMonth } from './money-data'

// The website's needs for the emergency fund: these budgets (EMERGENCY_FUND_BUDGET_NEED_KEYS).
const NEED_KEYS = ['housing', 'food', 'transport', 'healthcare']

/** An empty plan, for an account that has never saved one: the ladder still has an answer. */
export const EMPTY_PLAN: StoredPlan = { targets: [], holdings: [], budget: 0, frequency: 'monthly' }

/**
 * What the contribution ladder reads, built from the account the way the
 * dashboard builds `contributionFacts` (app/dashboard/page.tsx): cash accounts,
 * needs, known debts and the expected bills and paydays.
 */
export function contributionFacts(data: AccountData): AccountFacts {
  const needsBudget = NEED_KEYS.reduce((s, k) => s + (data.budget[k] ?? 0), 0)
  const lastMonth = monthSpend(data.transactions, addMonths(thisMonth(), -1))
  const lastMonthNeeds = NEED_KEYS.reduce((s, k) => s + (lastMonth.categories.find(c => c.key === k)?.usd ?? 0), 0)
  const plaid = data.plaidAccounts
  const expectedItems: ExpectedItem[] = data.bills.map(b => ({
    description: b.description,
    amountUSD: toUSD(b.amount, b.currency),
    type: b.transaction_type === 'income' ? 'income' : 'expense',
    dueDate: b.due_date,
    recurrence: b.recurrence as ExpectedItem['recurrence'],
    category: b.category,
  }))
  const connectedLoans = plaid.some(a => a.type === 'loan' && !isMortgageAccount(a))
  const connectedMortgage = plaid.some(isMortgageAccount)

  return {
    cashAccounts: toCashAccounts(plaid),
    manualCashSavings: data.typed.cashSavings,
    lastMonthNeeds: lastMonthNeeds > 0 ? lastMonthNeeds : needsBudget,
    averageNeeds: needsBudget > 0 ? needsBudget : lastMonthNeeds,
    knownDebts: [
      ...plaid.filter(a => (a.type === 'credit' || a.type === 'loan') && (a.balance_current ?? 0) > 0)
        .map(a => ({ name: a.name || (a.type === 'credit' ? 'Credit card' : 'Loan'), balance: a.balance_current ?? 0 })),
      ...(!connectedLoans && data.typed.totalDebt > 0 ? [{ name: 'Other debt', balance: data.typed.totalDebt }] : []),
      ...(!connectedMortgage ? data.typed.mortgages.filter(m => m.balance > 0).map(m => ({ name: m.name, balance: m.balance })) : []),
    ],
    expectedItems,
    budgetMonthlySpending: Object.values(data.budget).reduce((s, v) => s + v, 0),
    contributionDone: data.profile.contributionDone ?? null,
  }
}
