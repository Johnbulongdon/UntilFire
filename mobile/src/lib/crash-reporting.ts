import * as Sentry from '@sentry/react-native'
import { Platform } from 'react-native'

// Crash reports go to Sentry (org "untilfire"). Off in development and until
// EXPO_PUBLIC_SENTRY_DSN is set as an EAS environment variable.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN
export const crashReportingOn = Boolean(DSN) && !__DEV__ && Platform.OS !== 'web'

// Money never leaves the phone in a report: amounts like $1,234 or 1234.56 are masked.
const AMOUNT = /[$€£¥]\s?\d[\d,.]*|\b\d{1,3}(,\d{3})+(\.\d+)?\b|\b\d+\.\d{2}\b/g
const scrub = (text?: string) => text?.replace(AMOUNT, '[amount]')

if (crashReportingOn) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'production',
    // No IP address, email or request bodies; reports are tied to the account id only.
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeBreadcrumb(crumb) {
      // Console lines and tapped text can carry balances; keep only navigation and network status.
      if (crumb.category === 'console' || crumb.category === 'ui.click') return null
      if (crumb.data?.url) crumb.data.url = String(crumb.data.url).split('?')[0]
      return crumb
    },
    beforeSend(event) {
      event.message = scrub(event.message)
      for (const ex of event.exception?.values ?? []) ex.value = scrub(ex.value)
      if (event.user) event.user = { id: event.user.id }
      return event
    },
  })
}

export function setCrashUser(userId: string | null) {
  if (crashReportingOn) Sentry.setUser(userId ? { id: userId } : null)
}

export function reportError(error: unknown) {
  if (crashReportingOn) Sentry.captureException(error)
}

/** Wraps the root component so native crashes and unhandled errors are caught. */
export const withCrashReporting = (root: React.ComponentType<Record<string, unknown>>) =>
  crashReportingOn ? Sentry.wrap(root) : root
