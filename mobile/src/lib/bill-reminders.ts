import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { upcoming } from '@/lib/bills'
import { money } from '@/lib/format'
import type { Bill } from '@/state/account'

const KEY = 'bill-reminders'
const PREFIX = 'bill-'

export async function billRemindersOn() {
  return (await AsyncStorage.getItem(KEY).catch(() => null)) === '1'
}

/**
 * Local reminders for the next two weeks of bills and paydays: a bill the
 * evening before it's due (6pm), a payday that morning (9am). Rebuilt each
 * time the account loads, so edits and paid bills are reflected. Nothing is
 * sent to a server.
 */
export async function scheduleBillReminders(bills: Bill[]) {
  if (Platform.OS === 'web') return
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [])
  await Promise.all(all.filter(n => n.identifier.startsWith(PREFIX)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})))
  if (!(await billRemindersOn())) return

  const now = Date.now()
  for (const e of upcoming(bills, 14).slice(0, 40)) {
    const [y, m, d] = e.iso.split('-').map(Number)
    const income = e.type === 'income'
    const at = income ? new Date(y, m - 1, d, 9, 0) : new Date(y, m - 1, d - 1, 18, 0)
    if (at.getTime() <= now) continue
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${e.billId}-${e.iso}`,
      content: income
        ? { title: `Payday: ${e.description}`, body: `${money(e.amount)} expected today.` }
        : { title: `Due tomorrow: ${e.description}`, body: `${money(Math.abs(e.amount))} is due tomorrow.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    }).catch(() => {})
  }
}

/** Turn reminders on (asking permission first) or off. Returns whether they're on. */
export async function setBillReminders(on: boolean, bills: Bill[]): Promise<boolean> {
  if (on && Platform.OS !== 'web') {
    const current = await Notifications.getPermissionsAsync()
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted
    if (!granted) return false
  }
  await AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {})
  await scheduleBillReminders(bills)
  return on
}
