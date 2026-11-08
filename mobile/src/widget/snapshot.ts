import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

import { isoDay } from '@/engine'
import { isLockOn } from '@/lib/app-lock'
import { freeUntilPayday } from '@/lib/bills'
import { money, moneyIn } from '@/lib/format'
import { categoryOf } from '@/lib/money-data'
import { inExpoGo } from '@/lib/native-build'
import { monthCount, safeToSpendToday, todayItems, type TodayItem } from '@/lib/today'
import type { AccountData } from '@/state/account'

import { refreshWidget } from './refresh'

/**
 * The home-screen widget (D-145, Android): Safe to spend today, and the first
 * Today items. The app writes this snapshot after each load; the widget only
 * reads it, so it never computes money on its own. Amounts are formatted here,
 * in the account's currency, because the widget runs without the app's state.
 */
export interface WidgetRow {
  key: string
  title: string
  ask: string
  /** One-tap answer: file the transaction as suggested. Absent = the row opens Today. */
  accept?: { id: string; category: string; sub_category: string | null; tags: string[] }
}

export interface WidgetSnapshot {
  /** The day the numbers are for; on a later day the widget asks to be opened instead. */
  day: string
  safe: string | null
  safeIsZero: boolean
  untilPayday: string | null
  paydayInDays: number | null
  rows: WidgetRow[]
  left: number
  daysThisMonth: number
  hasBank: boolean
  hidden: boolean
}

export const WIDGET_NAME = 'Today'
const KEY = 'widget-snapshot'

function rowFor(item: TodayItem): WidgetRow {
  const t = item.tx
  const head = t ? `${t.description} ${moneyIn(Math.abs(t.amount), t.currency)}` : ''
  // Only a category guess is one tap; need-or-want is a real question, answered in the app.
  if (t && item.suggestion && item.kind === 'category') {
    const s = item.suggestion
    return {
      key: item.key,
      title: head,
      ask: `${categoryOf(s.category).label}?`,
      accept: { id: t.id, category: s.category, sub_category: s.sub_category, tags: [...t.tags.filter(g => g !== 'need' && g !== 'want'), s.need] },
    }
  }
  if (item.kind === 'need' && t) return { key: item.key, title: head, ask: 'Need or want?' }
  if (item.kind === 'bill' && item.bill) return { key: item.key, title: `${item.bill.description} ${money(item.bill.amount)}`, ask: 'Due tomorrow' }
  if (item.kind === 'flag' && t) return { key: item.key, title: head, ask: 'Worth a look' }
  if (item.kind === 'setup') return { key: item.key, title: item.setup === 'bank' ? 'Connect your bank' : 'Add a goal', ask: 'First step' }
  return { key: item.key, title: head || 'One thing to check', ask: 'Tap to answer' }
}

export function buildSnapshot(data: AccountData, hidden: boolean, now = new Date()): WidgetSnapshot {
  const { items } = todayItems(data, data.profile.today, now)
  const f = freeUntilPayday(data, now)
  const safe = safeToSpendToday(data, now)
  return {
    day: isoDay(now),
    safe: safe == null ? null : money(safe),
    safeIsZero: safe != null && safe <= 0,
    untilPayday: f ? money(Math.max(0, f.free)) : null,
    paydayInDays: f ? f.days : null,
    rows: items.slice(0, 2).map(rowFor),
    left: items.length,
    daysThisMonth: monthCount(data.profile.today.done, now).done,
    hasBank: data.plaidAccounts.length > 0,
    hidden,
  }
}

export async function readSnapshot(): Promise<WidgetSnapshot | null> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null)
  return raw ? (JSON.parse(raw) as WidgetSnapshot) : null
}

export async function writeSnapshot(s: WidgetSnapshot | null) {
  if (s) await AsyncStorage.setItem(KEY, JSON.stringify(s))
  else await AsyncStorage.removeItem(KEY)
}

/** Called after each account load (and with null on sign-out). Android builds only. */
export async function updateWidget(data: AccountData | null) {
  if (Platform.OS !== 'android' || inExpoGo) return
  const snap = data ? buildSnapshot(data, await isLockOn()) : null
  await writeSnapshot(snap)
  await refreshWidget()
}
