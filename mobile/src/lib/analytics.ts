import PostHog from 'posthog-react-native'
import { Platform } from 'react-native'

/**
 * Product analytics and crash reports, into the same PostHog project as the
 * website so one funnel covers both. Event names reuse lib/analytics-events.ts
 * where the moment is the same; every event carries `surface: 'ios_app'`.
 *
 * Off until EXPO_PUBLIC_POSTHOG_KEY is set (mobile/.env), so development and
 * Expo Go stay out of the numbers unless you turn it on. Never send amounts,
 * names or emails: only steps, choices and coarse buckets.
 */
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export const posthog: PostHog | null = KEY && Platform.OS !== 'web'
  ? new PostHog(KEY, {
      host: HOST,
      captureAppLifecycleEvents: true,
      // Uncaught JS errors and promise rejections become $exception events, as on the website.
      errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false } },
    })
  : null

posthog?.register({ surface: 'ios_app' })

export const Events = {
  ONBOARDING_STEP_VIEWED: 'funnel_calculator_step_viewed',
  ONBOARDING_REVEALED: 'funnel_calculator_revealed',
  SIGNUP_STARTED: 'funnel_signup_started',
  SIGNUP_COMPLETED: 'funnel_signup_completed',
  DATA_EXPORTED: 'funnel_data_exported',
  SCREEN_VIEWED: 'app_screen_viewed',
  TRANSACTION_SAVED: 'app_transaction_saved',
  REMINDER_TOGGLED: 'app_reminder_toggled',
  ACCOUNT_DELETED: 'app_account_deleted',
} as const

export function track(event: (typeof Events)[keyof typeof Events], props?: Record<string, string | number | boolean | null>) {
  posthog?.capture(event, props ?? undefined)
}

export function identify(userId: string | null) {
  if (!posthog) return
  if (userId) posthog.identify(userId)
  else posthog.reset()
}

/** Years to freedom in the website's coarse buckets, never the exact figure. */
export function yearsBucket(years: number | null) {
  if (years == null) return 'unknown'
  if (years <= 5) return '0-5'
  if (years <= 10) return '6-10'
  if (years <= 20) return '11-20'
  if (years <= 30) return '21-30'
  return '30+'
}
