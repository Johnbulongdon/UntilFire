import { addMonths, billCategoryOf, billCategorySet, matchesBill, monthOf, isMortgagePayment, recurrenceToMonthly, shareOf, spendingAverage, type Recurrence } from '@/engine'
import { spentUSD, toUSD, type AccountData } from '@/state/account'

import { unpaid, upcoming } from './bills'
import { monthSpend, thisMonth } from './money-data'

export interface BillGroup { key: string; monthly: number; spent: number; due: number; next: string | null }

/** Categories holding a repeating bill from Calendar: the website's rule (lib/bill-categories, D-41). */
export function billCategories(data: AccountData): Set<string> {
  return billCategorySet(data.bills)
}

/**
 * The month's budget in two parts, as Monarch's Flex budget does (money logic
 * study, Oct 16 2026): bills come from Calendar, so rent isn't typed twice;
 * everyday is the typed budget of every other category. What's left and the
 * pace bar read everyday only, so a rent paid on the 1st isn't "ahead of pace"
 * all month and unpaid rent never reads as money to spend.
 */
/** The budget a month had: its own saved copy, else the latest before it, else today's. */
export function budgetFor(data: AccountData, month: string): Record<string, number> {
  const earlier = Object.keys(data.budgetHistory ?? {}).filter(m => m <= month).sort().pop()
  return month >= thisMonth() || !earlier ? data.budget : data.budgetHistory[earlier]
}

export function splitBudget(data: AccountData, month = thisMonth()) {
  const billKeys = billCategories(data)
  const budget = budgetFor(data, month)
  const spend = monthSpend(data.transactions, month)
  const spentBy = new Map(spend.categories.map(c => [c.key, c.usd]))
  const isCurrent = month === thisMonth()
  const events = isCurrent ? unpaid(upcoming(data.bills, 62), data.bills, data.transactions) : []
  const categoryOfBill = new Map(data.bills.map(b => [b.id, billCategoryOf(b)]))

  const billRows = data.bills.filter(b => b.transaction_type === 'expense').map(b => ({ ...b, usd: Math.abs(toUSD(b.amount, b.currency)) }))
  const monthRows = data.transactions.filter(t => t.transaction_type === 'expense' && monthOf(t.date) === month)
  const isBillPayment = (t: (typeof monthRows)[number]) => billKeys.has(t.category) && matchesBill({ description: t.description, usd: spentUSD(t), category: t.category }, billRows)
  const billSpentBy = new Map<string, number>()
  for (const t of monthRows) if (isBillPayment(t)) billSpentBy.set(t.category, (billSpentBy.get(t.category) ?? 0) + spentUSD(t))

  const bills: BillGroup[] = [...billKeys].map(key => {
    const monthly = data.bills
      .filter(b => billCategoryOf(b) === key && b.transaction_type === 'expense' && b.recurrence !== 'none')
      .reduce((s, b) => s + recurrenceToMonthly(Math.abs(toUSD(b.amount, b.currency)), b.recurrence as Recurrence), 0)
    const left = events.filter(e => e.type === 'expense' && e.iso.startsWith(month) && categoryOfBill.get(e.billId) === key)
    return { key, monthly, spent: billSpentBy.get(key) ?? 0, due: left.reduce((s, e) => s - e.amount, 0), next: left[0]?.iso ?? null }
  }).sort((a, b) => b.monthly - a.monthly)

  // Spread categories (a yearly trip, insurance) are judged over the last 12 months, so one big month isn't "over".
  const spreadKeys = new Set((data.profile.spreadCategories ?? []).filter(k => !billKeys.has(k)))
  const since = addMonths(month, -11)
  const spread = [...spreadKeys].map(key => ({
    key,
    yearBudget: (budget[key] ?? 0) * 12,
    yearSpent: data.transactions.filter(t => t.transaction_type === 'expense' && t.category === key && t.date.slice(0, 7) >= since && t.date.slice(0, 7) <= month).reduce((s, t) => s + spentUSD(t), 0),
  }))
  /* Only a bill's own payment is a bill (lib/bill-categories matchesBill).
     A bill category's budget beyond its bills, and its other spending, stay
     everyday: a Spotify bill no longer hides every other Entertainment spend. */
  const billMonthlyOf = new Map(bills.map(b => [b.key, b.monthly]))
  const everydayBudget = Object.entries(budget).filter(([k, v]) => v > 0 && !spreadKeys.has(k))
    .reduce((s, [k, v]) => s + Math.max(0, v - (billMonthlyOf.get(k) ?? 0)), 0)
  const everydaySpent = monthRows.filter(t => !spreadKeys.has(t.category) && !isBillPayment(t)).reduce((s, t) => s + spentUSD(t), 0)
  const billsMonthly = bills.reduce((s, b) => s + b.monthly, 0)
  return {
    billKeys,
    spreadKeys,
    spread,
    bills,
    billsMonthly,
    billsDue: bills.reduce((s, b) => s + b.due, 0),
    everydayBudget,
    everydaySpent,
    /** Everyday budget less everyday spending: the one "left" (bills are set aside). */
    left: everydayBudget - everydaySpent,
    total: billsMonthly + everydayBudget + spread.reduce((s, c) => s + c.yearBudget / 12, 0),
    spentTotal: spend.total,
  }
}

/** A mortgage the engine already pays separately (D-61), so spending must leave it out. */
const hasMortgage = (data: AccountData) =>
  data.typed.mortgages.some(m => m.monthly > 0) || data.profile.mortgageMonthly > 0 || data.debts.mortgage > 0

/**
 * The monthly spending the freedom date runs on (money logic study, Oct 16
 * 2026, the founder's call): the average of the last 12 complete months, so
 * trips and yearly bills count; the budget only before three months of data;
 * last month as a last resort. The engine subtracts the mortgage payment on
 * its own, so mortgage spending is left out here and never counted twice.
 */
export function spendingBasis(data: AccountData, current = thisMonth()) {
  const mortgage = hasMortgage(data)
  const firstDate = data.transactions.reduce<string | null>((min, t) => (!min || t.date < min ? t.date : min), null)
  const rows = data.transactions.filter(t => t.transaction_type === 'expense')
    .map(t => ({ date: t.date, usd: spentUSD(t) * shareOf(t.plaid_account_id, data.accountShares), description: t.description, sub_category: t.sub_category }))
  const { average: actual, months } = spendingAverage(rows, current, { excludeMortgage: mortgage, firstDate })

  const split = splitBudget(data, current)
  const mortgageBills = mortgage ? data.bills.filter(b => b.transaction_type === 'expense' && isMortgagePayment(b))
    .reduce((s, b) => s + recurrenceToMonthly(Math.abs(toUSD(b.amount, b.currency)), b.recurrence as Recurrence), 0) : 0
  const typedMortgage = mortgage && !split.billKeys.has('housing') ? Math.min(data.budget.housing ?? 0, data.profile.mortgageMonthly || data.typed.mortgages.reduce((s, m) => s + m.monthly, 0)) : 0
  const budget = Math.max(0, split.total - mortgageBills - typedMortgage)

  if (actual != null) return { monthly: actual, source: 'actual' as const, months, budget }
  if (budget > 0) return { monthly: budget, source: 'budget' as const, months, budget }
  return { monthly: monthSpend(data.transactions, addMonths(current, -1)).total, source: 'last month' as const, months, budget }
}
