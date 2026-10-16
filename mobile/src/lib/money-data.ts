import { addMonths, ALL_CATEGORIES, isoDay, median, monthOf, type CategoryDef } from '@/engine'
import { customCategories } from './custom-categories'
import { defaultNeed } from './review'
import { spentUSD, toUSD, type Transaction } from '@/state/account'

export { expenseCategories } from './custom-categories'

/** A category's label, emoji and colour; unknown keys fall back to a neutral look. */
export function categoryOf(key: string): CategoryDef {
  return ALL_CATEGORIES.find(c => c.key === key) ?? customCategories().find(c => c.key === key) ?? {
    key,
    label: key.replace(/[_-]/g, ' ').replace(/^\w/, ch => ch.toUpperCase()),
    code: key.slice(0, 2).toUpperCase(),
    color: '#9A8B76',
    emoji: '📦',
  }
}

// Local date, not toISOString (UTC), which is yesterday east of Greenwich early in the day.
export const thisMonth = () => monthOf(isoDay(new Date()))

export const isSpend = (t: Transaction) => t.transaction_type === 'expense'
export const isIncome = (t: Transaction) => t.transaction_type === 'income'

/** Spending in a month, total and by category, largest first. Transfers never count. */
export function monthSpend(transactions: Transaction[], month: string) {
  const byCat = new Map<string, number>()
  let total = 0
  for (const t of transactions) {
    if (!isSpend(t) || monthOf(t.date) !== month) continue
    const usd = spentUSD(t)
    total += usd
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + usd)
  }
  const categories = [...byCat.entries()].map(([key, usd]) => ({ key, usd })).sort((a, b) => b.usd - a.usd)
  return { total, categories }
}

/**
 * A typical month for each key (a category, need or want): the median of the
 * last six complete months that had any spending at all. A month with
 * spending but none under a key counts as $0 there, so an occasional key
 * isn't inflated. Empty below three months of history.
 */
export function typicalBy(transactions: Transaction[], keyOf: (t: Transaction) => string | null, current = thisMonth()): Map<string, number> {
  const first = addMonths(current, -6)
  const totals = new Map<string, Map<string, number>>()
  for (const t of transactions) {
    const m = monthOf(t.date)
    if (!isSpend(t) || m >= current || m < first) continue
    const month = totals.get(m) ?? new Map<string, number>()
    totals.set(m, month)
    const key = keyOf(t)
    if (key != null) month.set(key, (month.get(key) ?? 0) + spentUSD(t))
  }
  const out = new Map<string, number>()
  if (totals.size < 3) return out
  const keys = new Set([...totals.values()].flatMap(m => [...m.keys()]))
  for (const key of keys) out.set(key, median([...totals.values()].map(m => m.get(key) ?? 0)))
  return out
}

export const typicalByCategory = (transactions: Transaction[]) => typicalBy(transactions, t => t.category)

/** Need or want: your answer when you gave one, otherwise the category's usual answer. */
export const needOf = (t: Transaction): 'need' | 'want' =>
  t.tags.includes('need') ? 'need' : t.tags.includes('want') ? 'want' : defaultNeed(t.category)

export function monthIncome(transactions: Transaction[], month: string): number {
  return transactions.filter(t => isIncome(t) && monthOf(t.date) === month).reduce((s, t) => s + toUSD(t.amount, t.currency), 0)
}

/** "Today", "Yesterday", "Mon 6 Oct". */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Transactions grouped by day, newest first. */
export function byDay(transactions: Transaction[]): { date: string; items: Transaction[] }[] {
  const groups: { date: string; items: Transaction[] }[] = []
  for (const t of transactions) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return groups
}
