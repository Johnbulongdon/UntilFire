import { addMonths, carriedCards, goalRungs, shareOf, monthOf, toCashAccounts, type AccountFacts, type ExpectedItem, type StoredPlan } from '@/engine'
import { spentUSD, toUSD, type AccountData } from '@/state/account'

import { isMortgageAccount } from './balances'
import { monthlyNeeds, needOf, thisMonth } from './money-data'
import { splitBudget } from './budget-split'

/** An empty plan, for an account that has never saved one: the ladder still has an answer. */
export const EMPTY_PLAN: StoredPlan = { targets: [], holdings: [], budget: 0, frequency: 'monthly' }

/**
 * What the contribution ladder reads, built from the account the way the
 * dashboard builds `contributionFacts` (app/dashboard/page.tsx): cash accounts,
 * needs, known debts and the expected bills and paydays.
 */
export function contributionFacts(data: AccountData): AccountFacts {
  // Needs by the shared rule (lib/needs), the same figure months of safety and the safety pot use.
  const lastMonthKey = addMonths(thisMonth(), -1)
  const lastMonthNeeds = data.transactions.filter(t => t.transaction_type === 'expense' && monthOf(t.date) === lastMonthKey && needOf(t) === 'need')
    .reduce((s, t) => s + spentUSD(t) * shareOf(t.plaid_account_id, data.accountShares), 0)
  const { needs: averageNeeds } = monthlyNeeds(data.budget, data.transactions, thisMonth(), data.accountShares)
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
    lastMonthNeeds: lastMonthNeeds > 0 ? lastMonthNeeds : averageNeeds,
    averageNeeds,
    knownDebts: [
      // Cards paid in full each month aren't debts to clear (lib/freedom-debt carriedCards), as on the website.
      ...carriedCards(plaid.filter(a => a.type === 'credit').map(a => ({ plaid_account_id: a.plaid_account_id, name: a.name || 'Credit card', balance: a.balance_current ?? 0 })),
        data.transactions.filter(t => t.transaction_type === 'expense' && t.plaid_account_id)
          .map(t => ({ plaid_account_id: t.plaid_account_id, date: t.date, usd: toUSD(t.amount, t.currency) * shareOf(t.plaid_account_id, data.accountShares) })))
        .map(({ name, balance }) => ({ name, balance })),
      ...plaid.filter(a => a.type === 'loan' && (a.balance_current ?? 0) > 0)
        .map(a => ({ name: a.name || 'Loan', balance: a.balance_current ?? 0 })),
      ...(!connectedLoans && data.typed.totalDebt > 0 ? [{ name: 'Other debt', balance: data.typed.totalDebt }] : []),
      ...(!connectedMortgage ? data.typed.mortgages.filter(m => m.balance > 0).map(m => ({ name: m.name, balance: m.balance })) : []),
    ],
    expectedItems,
    // Bills from Calendar plus the everyday budget (lib/budget-split), so a stale typed rent isn't added again.
    budgetMonthlySpending: splitBudget(data).total,
    contributionDone: data.profile.contributionDone ?? null,
    goals: goalRungs(data.goals),
  }
}
