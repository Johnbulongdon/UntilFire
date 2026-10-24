/**
 * What happens once someone is signed in, however they signed in: Google
 * sends them through /auth/callback, an emailed code finishes on /login.
 */

import type { Session } from '@supabase/supabase-js'
import { identifyUser, trackSignupCompleted } from './analytics'
import { isFirstSignIn, type SignInMethod } from './auth-user'

/**
 * Where sign-in lands. A page can ask to be returned to (the creator invite
 * page does, so "Sign in to get your link" ends on the link), but only paths
 * on this list: a free-form return URL would be an open redirect.
 */
export const RETURN_TO_KEY = 'uf_return_to'
const RETURNABLE = new Set(['/invite'])

export function rememberReturnTo(path: string): void {
  try { if (RETURNABLE.has(path)) localStorage.setItem(RETURN_TO_KEY, path) } catch { /* private mode */ }
}

export function afterSignInPath(): string {
  try {
    const path = localStorage.getItem(RETURN_TO_KEY)
    localStorage.removeItem(RETURN_TO_KEY)
    if (path && RETURNABLE.has(path)) return path
  } catch { /* private mode */ }
  return '/dashboard'
}

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
    window.location.href = afterSignInPath()
  }, 300)
}
