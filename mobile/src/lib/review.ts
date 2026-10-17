import { categoryNeed, type NeedOverrides } from '@/engine'
import type { Transaction } from '@/state/account'

/**
 * Filed means the transaction has a category (money logic study, Oct 16
 * 2026): need or want now comes from the category, so Today asks one
 * question, not two. "Other" counts once it's tagged: only filing adds the
 * tag, so it's a choice for something you don't recognise (Oct 2026 QA).
 */
export const isFiled = (t: Transaction) =>
  !!t.category && (t.category !== 'other' || t.tags.some(g => g === 'need' || g === 'want'))

export function reviewCounts(rows: Transaction[]) {
  const expenses = rows.filter(t => t.transaction_type === 'expense')
  const filed = expenses.filter(isFiled).length
  return { filed, need: expenses.length - filed }
}

// The one need rule, shared with the website (lib/needs), unless the person changed a category.
let overrides: NeedOverrides = {}
/** The account's own need/want per category (FIRE profile categoryNeeds), set when the account loads. */
export function setCategoryNeeds(next: NeedOverrides) { overrides = next }
export const needOverrides = () => overrides
export const defaultNeed = (category: string, subCategory?: string | null): 'need' | 'want' => categoryNeed(category, overrides, subCategory)
