/**
 * Google Pay payments on Android (D-142). The native listener
 * (modules/wallet-alerts) keeps Google Wallet's payment alerts; this turns
 * them into transactions when the app opens, skipping any the bank already
 * sent. The bank sync folds a Google Pay row into the bank's copy later
 * (lib/plaid-sync), so a payment never counts twice.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

import { GPAY_TAG, findTwin, parseWalletAlert } from '@engine/wallet-alerts.ts'
import { supabase } from '@/lib/supabase'
import { WalletAlerts, type WalletAlert } from '../../modules/wallet-alerts'

/** Only the Android store build has the listener; iPhone, web and Expo Go never show any of this. */
export const walletAvailable = Platform.OS === 'android' && WalletAlerts != null

/** On means both switches: UntilFire's own, and Android's notification access. */
export function walletOn(): boolean {
  if (!WalletAlerts) return false
  try { return WalletAlerts.isActive() && WalletAlerts.hasAccess() } catch { return false }
}

export function walletHasAccess(): boolean {
  try { return WalletAlerts?.hasAccess() ?? false } catch { return false }
}

/** Turn on: our switch first, then Android's page if access isn't allowed yet. */
export function turnWalletOn() {
  if (!WalletAlerts) return
  WalletAlerts.setActive(true)
  if (!WalletAlerts.hasAccess()) WalletAlerts.openAccessSettings()
}

/** Turn off: nothing more is read, and Android's page opens so access can be removed too. */
export function turnWalletOff() {
  if (!WalletAlerts) return
  WalletAlerts.setActive(false)
  if (WalletAlerts.hasAccess()) WalletAlerts.openAccessSettings()
}

const LAST_KEY = 'gpay-last'
export interface LastWalletPayment { amount: number; currency: string; merchant: string; date: string }
export async function lastWalletPayment(): Promise<LastWalletPayment | null> {
  try { return JSON.parse((await AsyncStorage.getItem(LAST_KEY)) ?? 'null') } catch { return null }
}

const localDay = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Save the waiting alerts as transactions. Returns how many were added.
 * Alerts that aren't a payment are dropped; a failed save leaves them waiting
 * for next time.
 */
let running: Promise<number> | null = null
export function ingestWalletAlerts(userId: string, currency: string): Promise<number> {
  // One at a time: two overlapping runs would read the same alerts and save them twice.
  if (!running) running = ingest(userId, currency).finally(() => { running = null })
  return running
}

async function ingest(userId: string, currency: string): Promise<number> {
  if (!WalletAlerts || !walletOn()) return 0
  let alerts: WalletAlert[] = []
  try { alerts = JSON.parse(WalletAlerts.pending()) } catch { return 0 }
  if (alerts.length === 0) return 0

  const handled: string[] = []
  const rows = alerts.flatMap(a => {
    const p = parseWalletAlert(a.title, a.text)
    if (!p) { handled.push(a.id); return [] }
    return [{ alert: a.id, date: localDay(a.postedAt), occurred_at: new Date(a.postedAt).toISOString(), amount: p.amount, currency: p.currency ?? currency, description: p.merchant }]
  })
  if (rows.length === 0) { WalletAlerts.remove(handled); return 0 }

  // The bank may already have sent it (the app wasn't opened for a few days).
  const from = rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0].date)
  const { data: bank, error: readErr } = await supabase.from('expenses')
    .select('id, date, amount, currency, description')
    .eq('user_id', userId).eq('source', 'plaid').gte('date', localDay(Date.parse(`${from}T12:00:00`) - 3 * 86_400_000))
  if (readErr) return 0
  const fresh = rows.filter(r => !findTwin({ id: r.alert, ...r }, bank ?? []))

  if (fresh.length > 0) {
    const { error } = await supabase.from('expenses').insert(fresh.map(r => ({
      user_id: userId, date: r.date, occurred_at: r.occurred_at, amount: r.amount, refund_amount: 0,
      currency: r.currency, description: r.description, category: 'other', sub_category: null,
      transaction_type: 'expense', notes: '', source: 'manual', tags: [GPAY_TAG],
    })))
    if (error) return 0
    const last = fresh[fresh.length - 1]
    await AsyncStorage.setItem(LAST_KEY, JSON.stringify({ amount: last.amount, currency: last.currency, merchant: last.description, date: last.date })).catch(() => {})
  }
  WalletAlerts.remove([...handled, ...rows.map(r => r.alert)])
  return fresh.length
}

/** The Transactions card: "Not now" hides it 30 days, and it comes back only once. */
const CARD_KEY = 'gpay-card'
export async function walletCardHidden(): Promise<boolean> {
  try {
    const s = JSON.parse((await AsyncStorage.getItem(CARD_KEY)) ?? '{}') as { n?: number; until?: number }
    return (s.n ?? 0) >= 2 || (s.until ?? 0) > Date.now()
  } catch { return false }
}
export async function hideWalletCard() {
  try {
    const s = JSON.parse((await AsyncStorage.getItem(CARD_KEY)) ?? '{}') as { n?: number }
    await AsyncStorage.setItem(CARD_KEY, JSON.stringify({ n: (s.n ?? 0) + 1, until: Date.now() + 30 * 86_400_000 }))
  } catch { /* the card shows again next time */ }
}
