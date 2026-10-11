import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

const CHECK_IN_ID = 'monthly-check-in'

/**
 * Asks for permission and schedules a local check-in on the 1st of each month
 * at 9am. Local only: nothing is sent to a server. Returns false if declined.
 */
export async function scheduleMonthlyCheckIn(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const current = await Notifications.getPermissionsAsync()
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted
  if (!granted) return false

  await Notifications.cancelScheduledNotificationAsync(CHECK_IN_ID).catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: CHECK_IN_ID,
    content: {
      title: 'Your monthly check-in',
      body: 'Two minutes to update your numbers and see if your freedom date moved.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour: 9, minute: 0 },
  })
  return true
}

export async function cancelMonthlyCheckIn() {
  if (Platform.OS === 'web') return
  await Notifications.cancelScheduledNotificationAsync(CHECK_IN_ID).catch(() => {})
}

export async function isCheckInScheduled(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [])
  return all.some(n => n.identifier === CHECK_IN_ID)
}
