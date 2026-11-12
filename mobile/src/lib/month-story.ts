import { monthStory, storyMonth, type MonthStory, type StoryRow } from '@/engine'
import { billCategories, splitBudget } from '@/lib/budget-split'
import { spentUSD, toUSD, type AccountData } from '@/state/account'

/**
 * Last month's story (D-151, lib/month-story) from the account: real income
 * and real spending, transfers left out. Bill and yearly categories are kept
 * out of "biggest change", because they move by the calendar, not by choice.
 * `target` is the freedom number, for the hours page; zero leaves it out.
 */
export function phoneMonthStory(data: AccountData, target: number, now = new Date()): MonthStory | null {
  const month = storyMonth(now)
  const rows: StoryRow[] = []
  for (const t of data.transactions) {
    if (t.transaction_type === 'expense') rows.push({ date: t.date.slice(0, 10), usd: spentUSD(t), type: 'expense', category: t.category })
    else if (t.transaction_type === 'income') rows.push({ date: t.date.slice(0, 10), usd: Math.abs(toUSD(t.amount, t.currency)), type: 'income', category: t.category })
  }
  return monthStory({ month, rows, exclude: new Set([...billCategories(data), ...splitBudget(data, month).spreadKeys]), target })
}
