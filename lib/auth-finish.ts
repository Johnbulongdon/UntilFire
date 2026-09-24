/**
 * What happens once someone is signed in, however they signed in: Google
 * sends them through /auth/callback, an emailed code finishes on /login.
 */

import type { Session } from '@supabase/supabase-js'
import { identifyUser, trackSignupCompleted } from './analytics'
import { isFirstSignIn, type SignInMethod } from './auth-user'

export function finishSignIn(session: Session, method: SignInMethod): void {
  identifyUser(session.user.id)
  const isNewUser = isFirstSignIn(session.user)
  trackSignupCompleted({ isNewUser, authProvider: method })
  if (isNewUser) {
    fetch('/api/email/welcome', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }).catch(() => {})
  }
  // Brief delay so the PostHog request for funnel_signup_completed can
  // flush before the hard navigation.
  setTimeout(() => {
    window.location.href = '/dashboard'
  }, 300)
}
