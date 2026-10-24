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
      // Screen recordings, to see where new people get stuck. Needs the native
      // @posthog/react-native-plugin, so it starts with a store build. Every
      // text, text box and image is masked, so a recording shows layout and
      // taps but never an amount, name or email; logs and network are off.
      enableSessionReplay: true,
      sessionReplayConfig: {
        maskAllTextInputs: true,
        maskAllImages: true,
        maskAllSandboxedViews: true,
        captureLog: false,
        captureNetworkTelemetry: false,
      },
    })
  : null

// funnel_event_version as on the website (lib/analytics-events.ts), so one funnel reads both.
posthog?.register({ surface: 'ios_app', funnel_event_version: 1 })

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
  // Pro in the app (D-75), named as the website's funnel so both feed one paywall funnel.
  PAYWALL_VIEWED: 'funnel_paywall_viewed',
  CHECKOUT_STARTED: 'funnel_checkout_started',
  PURCHASE_RESULT: 'app_purchase_result',
  REWARD_MONTH_GRANTED: 'app_reward_month_granted',
  // Home → Get set up, as on the website (lib/setup-steps).
  SETUP_CHECKLIST: 'funnel_setup_checklist',
} as const

export function track(event: (typeof Events)[keyof typeof Events], props?: Record<string, string | number | boolean | null>) {
  posthog?.capture(event, props ?? undefined)
}

export function identify(userId: string | null) {
  if (!posthog) return
  if (userId) posthog.identify(userId)
  else posthog.reset()
}

/** Years to freedom in the website's bucketYears values, never the exact figure. */
export function yearsBucket(years: number | null) {
  if (years == null) return 'not_reached'
  if (!Number.isFinite(years) || years < 0) return 'unknown'
  if (years < 5) return 'lt_5'
  if (years < 10) return '5_10'
  if (years < 20) return '10_20'
  if (years < 30) return '20_30'
  return 'gte_30'
}

/**
 * Onboarding question number → the website's step_id and step_index
 * (CALCULATOR_STEP_INDEX), so a breakdown by step lines up across both.
 * Pay and know exist only on the phone, so they carry no website index.
 */
const STEP_IDS: Record<number, [string, number | null]> = {
  1: ['goal', 0], 2: ['city', 1], 3: ['pay', null], 4: ['income', 3],
  5: ['know', null], 6: ['savings', 4], 7: ['portfolio', 5], 8: ['age', 6],
}

export function stepProps(step: number, steps: number) {
  const [step_id, step_index] = STEP_IDS[step] ?? ['unknown', null]
  return { step_id, step_index, step, steps }
}
