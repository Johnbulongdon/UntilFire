import * as Notifications from 'expo-notifications'
import { router, useRootNavigationState } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

/**
 * Tapping a reminder opens what it was about, from a cold start too:
 * the Today reminder opens Today, a bill or payday opens Calendar. Routed by
 * the identifier each reminder is scheduled with (lib/today-reminder,
 * lib/bill-reminders), so ones already scheduled work as well.
 */
export function routeFor(identifier: string): string | null {
  if (identifier.startsWith('today-')) return '/today'
  if (identifier.startsWith('bill-')) return '/money/calendar'
  return null
}

export function NotificationTaps() {
  if (Platform.OS === 'web') return null
  return <Taps />
}

function Taps() {
  const response = Notifications.useLastNotificationResponse()
  const ready = !!useRootNavigationState()?.key
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
    const id = `${response.notification.request.identifier}@${response.notification.date}`
    if (handled.current === id) return
    handled.current = id
    const to = routeFor(response.notification.request.identifier)
    if (to) router.push(to as never)
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {})
  }, [ready, response])
  return null
}
