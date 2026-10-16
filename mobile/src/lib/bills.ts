import { BILL_MATCH_TOLERANCE, expandExpected, isoDay, looksLikeCardPayment, type ExpectedItem, type ForecastEvent } from '@/engine'
import { spentUSD, toUSD, type AccountData, type Bill, type Transaction } from '@/state/account'

import { cashByRole } from './balances'
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
      && Math.abs(spentUSD(t) - due) <= due * BILL_MATCH_TOLERANCE && [...words(t.description)].some(w => name.has(w)))
    if (paid) used.add(paid.id)
    return !paid
  })
}

export const today = () => isoDay(new Date())

/**
 * Free to spend until the next payday (D-29), the one figure Home and Budget
 * show: spending accounts only (never the safety pot), less the bills before
 * payday, less what the cards owe when no card payment is listed as a bill,
 * since card spending still sits in checking until it's paid (money logic study).
 */
export function freeUntilPayday(data: AccountData, now = new Date()) {
  const events = unpaid(upcoming(data.bills, 62, now), data.bills, data.transactions)
  const payday = events.find(e => e.type === 'income' && e.counted)
  if (!payday) return null
  const billsBefore = events.filter(e => e.type === 'expense' && e.iso < payday.iso).reduce((s, e) => s - e.amount, 0)
  // A card bill names a card: "Comcast autopay" reads like a card payment but isn't one (audit round 2).
  const cardBill = data.bills.some(b => looksLikeCardPayment({ description: b.description, transaction_type: b.transaction_type })
    && /card|credit|amex|discover|capital one|visa|mastercard|信用卡/i.test(b.description))
  const cardsOwed = cardBill ? 0 : data.debts.cards
  const { spending } = cashByRole(data.plaidAccounts, data.spendToggles ?? {}, data.balances.cashSavings)
  if (spending == null) return null
  const days = Math.max(1, Math.round((new Date(`${payday.iso}T00:00:00`).getTime() - now.getTime()) / 864e5))
  return { free: spending - billsBefore - cardsOwed, spending, billsBefore, cardsOwed, payday, days }
}
