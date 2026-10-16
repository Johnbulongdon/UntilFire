import { expandExpected, isoDay, type ExpectedItem, type ForecastEvent } from '@/engine'
import { spentUSD, toUSD, type Bill, type Transaction } from '@/state/account'

import { isSpend } from './money-data'

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

const words = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]{3,}|[\u4e00-\u9fff]+/g) ?? []))

/**
 * Bills and paydays less the bill occurrences already paid: a spending
 * transaction in that occurrence's month (for an overdue one, from a week
 * before its due date) within 3% of the amount and sharing a word with the
 * bill's name. Without it a bill paid early (BILT on the 2nd, due the 31st)
 * counted twice in Budget's set-aside and free to spend (Oct 16 2026).
 */
export function unpaid(events: BillEvent[], bills: Bill[], transactions: Transaction[]): BillEvent[] {
  const byId = new Map(bills.map(b => [b.id, b]))
  const used = new Set<string>()
  const spends = transactions.filter(isSpend)
  return events.filter(e => {
    const bill = byId.get(e.billId)
    if (e.type !== 'expense' || !bill) return true
    const due = Math.abs(e.amount)
    const name = words(bill.description)
    const from = e.overdue ? isoDay(new Date(new Date(`${bill.due_date}T00:00:00`).getTime() - 7 * 864e5)) : `${e.iso.slice(0, 7)}-01`
    const to = e.overdue ? today() : `${e.iso.slice(0, 7)}-31`
    const paid = spends.find(t => !used.has(t.id) && t.date >= from && t.date <= to
      && Math.abs(spentUSD(t) - due) <= due * 0.03 && [...words(t.description)].some(w => name.has(w)))
    if (paid) used.add(paid.id)
    return !paid
  })
}

export const today = () => isoDay(new Date())
