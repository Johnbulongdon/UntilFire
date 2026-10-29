import { EXPENSE_CATEGORIES, nearestPaletteColor, type CategoryDef } from '@/engine'

// The account's own categories (user_budget.expenses._custom_cats), set when
// the account loads. Its own module so account state and the money helpers
// can both use it without importing each other.
let custom: CategoryDef[] = []
export function setCustomCategories(list: CategoryDef[]) { custom = list.map(c => ({ ...c, color: nearestPaletteColor(c.color) })) }
export const customCategories = () => custom

/** Every expense category: the website's, then the account's own. */
export const expenseCategories = (): CategoryDef[] => [...EXPENSE_CATEGORIES, ...custom]
