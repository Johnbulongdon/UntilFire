import { expandExpected, isoDay, type ExpectedItem, type ForecastEvent } from '@/engine'
import { toUSD, type Bill } from '@/state/account'

export type BillEvent = ForecastEvent & { billId: string }

/** Bills and paydays from today to `days` ahead, each repeat expanded, as the website's Calendar does. */
export function upcoming(bills: Bill[], days = 30, now = new Date()): BillEvent[] {
  const to = new Date(now); to.setDate(to.getDate() + days)
  return bills
    .flatMap(b => {
      const item: ExpectedItem = {
        description: b.description,
        amountUSD: toUSD(b.amount, b.currency),
        type: b.transaction_type === 'income' ? 'income' : 'expense',
        dueDate: b.due_date,
        recurrence: b.recurrence as ExpectedItem['recurrence'],
        category: b.category,
      }
      return expandExpected([item], now, to).map(e => ({ ...e, billId: b.id }))
    })
    .sort((a, b) => a.iso.localeCompare(b.iso))
}

export const today = () => isoDay(new Date())
