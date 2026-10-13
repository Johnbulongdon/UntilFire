import type { Transaction } from '@/state/account'

/** Filed means a real category and a need or want tag (the website's reviewCounts in TransactionsTab). */
export const isFiled = (t: Transaction) =>
  !!t.category && t.category !== 'other' && t.tags.some(g => g === 'need' || g === 'want')

export function reviewCounts(rows: Transaction[]) {
  const expenses = rows.filter(t => t.transaction_type === 'expense')
  const filed = expenses.filter(isFiled).length
  return { filed, need: expenses.length - filed }
}

// With nothing in the person's history, a category's usual answer.
const NEED_CATEGORIES = new Set(['housing', 'food', 'transport', 'healthcare', 'utilities', 'education'])
export const defaultNeed = (category: string): 'need' | 'want' => (NEED_CATEGORIES.has(category) ? 'need' : 'want')
