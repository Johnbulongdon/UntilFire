import { paydaySpending } from '@engine/payday-spending.ts'
import { paysBill, type Bill as ForecastBill } from '@engine/spend-forecast.ts'
import { expandExpected, isoDay, looksLikeCardPayment, type ExpectedItem, type ForecastEvent } from '@/engine'
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

/**
 * Bills and paydays less the bill occurrences already paid, by the website's
 * rule (lib/spend-forecast paysBill, D-148): a spending transaction named like
 * the bill, or under the bank name it was linked to (rent paid as
 * "BILT PAYMENT", D-133), within 15% of the amount, from a few days before
 * that due date to today. Each payment pays one occurrence.
 */
export function unpaid(events: BillEvent[], bills: Bill[], transactions: Transaction[]): BillEvent[] {
  const byId = new Map(bills.map(b => [b.id, b]))
  const used = new Set<string>()
  const spends = transactions.filter(isSpend)
  const now = today()
  return events.filter(e => {
    const bill = byId.get(e.billId)
    if (e.type !== 'expense' || !bill) return true
    const due = e.overdue ? bill.due_date.slice(0, 10) : e.iso
    const b = { description: bill.description, merchant: bill.match_merchant, usd: Math.abs(e.amount), recurrence: bill.recurrence as ForecastBill['recurrence'] }
    const paid = spends.find(t => !used.has(t.id) && paysBill(b, due, { date: t.date.slice(0, 10), usd: spentUSD(t), description: t.description ?? '' }, now))
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
  const payday = events.find(e => e.type === 'income' && e.counted && !e.overdue && e.iso > isoDay(now) && data.bills.find(b=>b.id===e.billId)?.recurrence !== 'none')
  if (!payday) return null
  const before = events.filter(e => e.type === 'expense' && e.iso < payday.iso)
  const billsBefore = before.reduce((s, e) => s - e.amount, 0)
  // A card bill names a card: "Comcast autopay" reads like a card payment but isn't one (audit round 2).
  const cardBill = data.bills.some(b => looksLikeCardPayment({ description: b.description, transaction_type: b.transaction_type })
    && /card|credit|amex|discover|capital one|visa|mastercard|信用卡/i.test(b.description))
  const cardsOwed = cardBill ? 0 : data.debts.cards
  const { spending } = cashByRole(data.plaidAccounts, data.spendToggles ?? {}, data.balances.cashSavings)
  if (spending == null) return null
  const end = new Date(payday.iso + 'T12:00:00')
  const days = Math.max(1, Math.round((Date.UTC(end.getFullYear(),end.getMonth(),end.getDate()) - Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())) / 864e5))
  const forecastBills: ForecastBill[] = data.bills.filter(b=>b.transaction_type==='expense').map(b=>({description:b.description,category:b.category,usd:Math.abs(toUSD(b.amount,b.currency)),due:b.due_date,recurrence:b.recurrence as ForecastBill['recurrence']}))
  const values = Object.entries(data.budget).filter(([k,v])=>!k.startsWith('_')&&Number.isFinite(v)&&v>0).map(([,v])=>v)
  const everyday = paydaySpending({ today: now, days, rows: data.transactions.filter(t=>t.transaction_type==='expense').map(t=>({date:t.date.slice(0,10),usd:spentUSD(t),description:t.description??'',category:t.category??'other'})), bills:forecastBills, budget:data.budget, monthlyBudget:values.length?values.reduce((a,b)=>a+b,0):null })
  return { free: spending - billsBefore - cardsOwed, spending, billsBefore, cardsOwed, payday, days, bills: before, everyday }
}
