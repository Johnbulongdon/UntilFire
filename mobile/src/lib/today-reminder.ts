import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { isoDay } from '@/engine'
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return isoDay(d) }

const KEY = 'today-reminder'
const PREFIX = 'today-'
/** 9pm, like Duolingo's evening nudge (founder's call, D-73). */
const HOUR = 21

export async function todayReminderOn() {
  return (await AsyncStorage.getItem(KEY).catch(() => null)) === '1'
}

/**
 * A 9pm reminder on each of the next seven days that isn't finished yet.
 * Rebuilt when the account loads and when a day is finished, so a finished day
 * stays quiet. Local only; nothing is sent to a server.
 */
export async function scheduleTodayReminders(done: string[]) {
  if (Platform.OS === 'web') return
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [])
  await Promise.all(all.filter(n => n.identifier.startsWith(PREFIX)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})))
  if (!(await todayReminderOn())) return
  const today = isoDay(new Date())
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i)
    if (done.includes(day)) continue
    const [y, m, d] = day.split('-').map(Number)
    const at = new Date(y, m - 1, d, HOUR, 0)
    if (at.getTime() <= Date.now()) continue
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${day}`,
      content: { title: 'Today in UntilFire', body: 'A minute on today\'s money keeps your plan up to date.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    }).catch(() => {})
  }
}

/** Signed out: no Today list, so no nudges (the choice is kept for next sign-in). */
export async function cancelTodayReminders() {
  if (Platform.OS === 'web') return
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [])
  await Promise.all(all.filter(n => n.identifier.startsWith(PREFIX)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})))
}

/** Turn the daily reminder on (asking permission first) or off. Returns whether it's on. */
/**
 * `schedule` false only records the choice (and asks permission): before sign-in
 * there is no Today list yet, so the reminders start when the account loads.
 */
export async function setTodayReminder(on: boolean, done: string[], schedule = true): Promise<boolean> {
  if (on && Platform.OS !== 'web') {
    const current = await Notifications.getPermissionsAsync()
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted
    if (!granted) return false
  }
  await AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {})
  if (schedule) await scheduleTodayReminders(done)
  return on
}
