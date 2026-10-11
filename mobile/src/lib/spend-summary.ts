import { bucketFor, isoDay, monthOf, usualForRange, type DateRange } from '@/engine'
import { spentUSD, toUSD, type Transaction } from '@/state/account'

import { isIncome, isSpend } from './money-data'

export interface Bucket { label: string; usd: number }

const shortMonth = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' })

/**
 * What a range of transactions adds up to, drawn the way the website's
 * SpendCard does: buckets of days, weeks or months, the usual for the same
 * range (median of past months, lib/spend-range.ts), and the categories that
 * moved most against their own usual.
 */
export function summarise(all: Transaction[], range: DateRange, today: string) {
  const inRange = all.filter(t => t.date >= range.start && t.date <= range.end)
  const spend = inRange.filter(isSpend)
  const out = spend.reduce((s, t) => s + spentUSD(t), 0)
  const inn = inRange.filter(isIncome).reduce((s, t) => s + toUSD(t.amount, t.currency), 0)

  const history = all.filter(isSpend).map(t => ({ date: t.date, usd: spentUSD(t), category: t.category }))
  const usual = usualForRange(history, range, today)

  // Bars: days for a month, weeks for a quarter, months beyond.
  const kind = bucketFor(range.months.length)
  const buckets: Bucket[] = []
  if (kind === 'month') {
    for (const m of range.months) buckets.push({ label: shortMonth(m), usd: spend.filter(t => monthOf(t.date) === m).reduce((s, t) => s + spentUSD(t), 0) })
  } else {
    const start = new Date(`${range.start}T00:00:00`)
    const end = new Date(`${range.end}T00:00:00`)
    const step = kind === 'day' ? 1 : 7
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
      const from = isoDay(d)
      const toD = new Date(d); toD.setDate(toD.getDate() + step - 1)
      const to = isoDay(toD)
      buckets.push({
        label: kind === 'day' ? String(d.getDate()) : `${d.getDate()} ${shortMonth(from.slice(0, 7))}`,
        usd: spend.filter(t => t.date >= from && t.date <= to).reduce((s, t) => s + spentUSD(t), 0),
      })
    }
  }

  // Categories against their own usual, biggest moves first.
  const cats = [...new Set(spend.map(t => t.category))]
  const moved = cats
    .map(key => {
      const now = spend.filter(t => t.category === key).reduce((s, t) => s + spentUSD(t), 0)
      const usualCat = usualForRange(history.filter(h => h.category === key), range, today, true)
      return { key, now, usual: usualCat, diff: usualCat == null ? 0 : now - usualCat }
    })
    .filter(c => c.usual != null && Math.abs(c.diff) >= 20)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3)

  return { inRange, out, inn, usual, buckets, kind, moved }
}
