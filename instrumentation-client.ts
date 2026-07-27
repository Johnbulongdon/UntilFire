import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  // Auto-capture unhandled errors and promise rejections as $exception events
  // so client-side crashes (like the dashboard render loop) surface in PostHog
  // Error Tracking with a stack, instead of only appearing as a blank
  // "Application error" to the user.
  capture_exceptions: true,
})
