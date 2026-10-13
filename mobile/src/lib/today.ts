import { buildMerchantMemory, findFlags, isoDay, ladderViewFromPlan, monthOf, suggestFromHistory, type FlagKind } from '@/engine'
import { upcoming } from '@/lib/bills'
import { contributionFacts, EMPTY_PLAN } from '@/lib/contribution-facts'
import { saveFireProfile } from '@/lib/mutations'
import { monthSpend } from '@/lib/money-data'
import { defaultNeed, isFiled } from '@/lib/review'
import { spentUSD, toUSD, type AccountData, type Goal, type TodayProgress, type Transaction } from '@/state/account'

/**
 * The Today list (D-73): a short list of one-tap items made from the last few
 * days of money. Clearing it marks the day complete; days are counted, never
 * streaked. Items that come from a transaction disappear once the transaction
 * is answered (filed, or a flag resolved); the rest are answered with an ack
 * saved in the FIRE profile beside the finished days.
 */
export type TodayKind = 'big' | 'flag' | 'category' | 'need' | 'backlog' | 'bill' | 'payday' | 'goal' | 'number'

export interface Filing { category: string; sub_category: string | null; need: 'need' | 'want' }

export interface TodayItem {
  key: string
  kind: TodayKind
  tx?: Transaction
  flag?: FlagKind
  /** Category items: the suggested filing first, then other likely categories. */
  suggestion?: Filing
  choices?: string[]
  /** Big one: what went over and where the money could come from. */
  over?: { category: string; by: number; from: string | null }
  bill?: { id: string; description: string; amount: number; iso: string }
  goal?: Goal
  /** Payday: what's safe to invest; number: what's safe to spend today; backlog: how many more. */
  amount?: number
  count?: number
}

/** The items a free account gets; Pro adds the money-smart ones (D-73, question 5). */
export const PRO_KINDS: TodayKind[] = ['big', 'payday']

const MAX_FILING = 6
const FLAG_KINDS: FlagKind[] = ['card_payment', 'duplicate', 'large']

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return isoDay(d)
}

/**
 * Which day the list is for. Until noon, a yesterday that wasn't finished can
 * still be finished (question 4); after that, or once it's done, it's today.
 * Anything that arrives after a day is finished simply joins the next list.
 */
export function listDay(done: string[], now = new Date()): string {
  const today = isoDay(now)
  const yesterday = addDays(today, -1)
  return now.getHours() < 12 && !done.includes(yesterday) && !done.includes(today) ? yesterday : today
}

/** What's left to spend each day for the rest of this month, from the budget. Null without a budget. */
export function safeToSpendToday(data: AccountData, now = new Date()): number | null {
  const budget = Object.values(data.budget).reduce((s, v) => s + v, 0)
  if (budget <= 0) return null
  const today = isoDay(now)
  const spent = monthSpend(data.transactions, monthOf(today)).total
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = end - now.getDate() + 1
  return Math.max(0, (budget - spent) / daysLeft)
}

/** `forDay` holds the list on a day just finished, so its celebration shows before the next list. */
export function todayItems(data: AccountData, progress: TodayProgress, now = new Date(), forDay?: string): { day: string; items: TodayItem[] } {
  const day = forDay ?? listDay(progress.done, now)
  const today = isoDay(now)
  const acked = new Set(progress.acks)
  const from = addDays(day, -2)
  const recent = data.transactions.filter(t => t.date >= from && t.date <= today)
  const out: TodayItem[] = []

  // A spend that tipped its category over this month's budget.
  if (data.pro) {
    for (const t of recent) {
      if (t.transaction_type !== 'expense' || acked.has(`big:${t.id}`)) continue
      const cap = data.budget[t.category] ?? 0
      if (cap <= 0) continue
      const month = monthOf(t.date)
      const rows = data.transactions
        .filter(r => r.transaction_type === 'expense' && r.category === t.category && monthOf(r.date) === month)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      let before = 0
      for (const r of rows) { if (r.id === t.id) break; before += spentUSD(r) }
      const total = rows.reduce((s, r) => s + spentUSD(r), 0)
      if (before > cap || before + spentUSD(t) <= cap) continue
      const by = Math.round(total - cap)
      const spend = monthSpend(data.transactions, month).categories
      const left = Object.entries(data.budget)
        .filter(([k]) => k !== t.category)
        .map(([k, b]) => ({ k, left: b - (spend.find(c => c.key === k)?.usd ?? 0) }))
        .sort((a, b) => b.left - a.left)[0]
      out.push({ key: `big:${t.id}`, kind: 'big', tx: t, over: { category: t.category, by, from: left && left.left >= by ? left.k : null } })
    }
  }

  // Rows that may be making the numbers wrong (D-31), answered as in Worth a look.
  const flags = findFlags(recent, data.transactions, toUSD)
  const bigIds = new Set(out.map(i => i.tx?.id))
  for (const t of recent) {
    const kind = flags.get(t.id)
    if (!kind || !FLAG_KINDS.includes(kind) || (kind === 'large' && bigIds.has(t.id))) continue
    out.push({ key: `flag:${t.id}`, kind: 'flag', tx: t, flag: kind })
  }

  // New spending to file: a category, then need or want, suggested from the person's own history.
  const memory = buildMerchantMemory(data.transactions.filter(isFiled))
  const usual = topCategories(data.transactions)
  const unfiled = recent.filter(t => t.transaction_type === 'expense' && !isFiled(t) && !flags.has(t.id))
  for (const t of unfiled.slice(0, MAX_FILING)) {
    const s = suggestFromHistory(t, memory)
    const hasCategory = !!t.category && t.category !== 'other'
    const category = s?.category ?? (hasCategory ? t.category : 'other')
    const suggestion: Filing = { category, sub_category: s?.sub_category ?? t.sub_category, need: s?.classification ?? defaultNeed(category) }
    if (hasCategory) out.push({ key: `need:${t.id}`, kind: 'need', tx: t, suggestion: { ...suggestion, category: t.category, sub_category: t.sub_category } })
    else out.push({ key: `cat:${t.id}`, kind: 'category', tx: t, suggestion, choices: [...new Set([category, ...usual].filter(c => c !== 'other'))].slice(0, 3) })
  }
  if (unfiled.length > MAX_FILING && !acked.has(`backlog:${day}`)) {
    out.push({ key: `backlog:${day}`, kind: 'backlog', count: unfiled.length - MAX_FILING })
  }

  // A bill due the day after the list's day.
  const events = upcoming(data.bills, 3, new Date(`${day}T00:00:00`))
  for (const e of events) {
    if (e.type !== 'expense' || e.iso !== addDays(day, 1)) continue
    const key = `bill:${e.billId}:${e.iso}`
    if (!acked.has(key)) out.push({ key, kind: 'bill', bill: { id: e.billId, description: e.description, amount: Math.abs(e.amount), iso: e.iso } })
  }

  // Payday: pay came in, so say what's safe to invest.
  if (data.pro && !acked.has(`pay:${day}`)) {
    const paid = events.some(e => e.type === 'income' && e.iso === day)
      || data.transactions.some(t => t.transaction_type === 'income' && t.date === day)
    const view = paid ? ladderViewFromPlan(data.contributionPlan ?? EMPTY_PLAN, contributionFacts(data)) : null
    if (view && view.budget > 0 && !view.available.done) {
      out.push({ key: `pay:${day}`, kind: 'payday', amount: Math.round(view.budget) })
    }
  }

  for (const g of data.goals) {
    if (g.target_amount > 0 && g.current_saved >= g.target_amount && !acked.has(`goal:${g.id}`)) out.push({ key: `goal:${g.id}`, kind: 'goal', goal: g })
  }

  // Always last, and the only item on a quiet day, so every day can be finished (question 3).
  if (!acked.has(`day:${day}`)) out.push({ key: `day:${day}`, kind: 'number', amount: safeToSpendToday(data, now) ?? undefined })

  return { day, items: out }
}

/** The categories this account uses most, for one-tap choices. */
function topCategories(rows: Transaction[]): string[] {
  const n = new Map<string, number>()
  for (const t of rows.slice(0, 300)) if (t.transaction_type === 'expense' && t.category && t.category !== 'other') n.set(t.category, (n.get(t.category) ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
}

/** Finished days this month, for the count ("11 of 13 days"). */
export function monthCount(done: string[], now = new Date()) {
  const month = monthOf(isoDay(now))
  return { done: done.filter(d => d.startsWith(month)).length, of: now.getDate() }
}

/** Save an answer and, when it finishes the list, the day. Keeps the lists short. */
export async function saveTodayProgress(userId: string, progress: TodayProgress): Promise<string | null> {
  const done = [...new Set(progress.done)].sort().slice(-400)
  const acks = [...new Set(progress.acks)].slice(-300)
  return saveFireProfile(userId, { today: { done, acks } })
}
