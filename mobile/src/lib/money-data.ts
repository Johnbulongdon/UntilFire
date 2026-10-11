import { ALL_CATEGORIES, isoDay, monthOf, type CategoryDef } from '@/engine'
import { customCategories } from './custom-categories'
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
