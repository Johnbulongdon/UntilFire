/**
 * Pure helpers for signing in. No imports, so guards can load them directly.
 */

interface SignInUser {
  created_at: string
  email_confirmed_at?: string | null
  confirmed_at?: string | null
}

/**
 * Whether this sign-in is the account's first.
 *
 * Not `created_at`: an emailed code creates the account when the code is
 * sent, so anyone who takes more than a minute to type it would count as
 * returning. The email is confirmed at the first successful sign-in by
 * either method, and Google accounts are confirmed as they are created.
 */
export function isFirstSignIn(user: SignInUser, now = Date.now()): boolean {
  const firstIn = user.email_confirmed_at ?? user.confirmed_at ?? user.created_at
  return now - new Date(firstIn).getTime() < 60_000
}

export type SignInMethod = 'google' | 'email'

/**
 * How someone signed in this time. Supabase's `app_metadata.provider` is the
 * provider the account was first created with, so it can't say this.
 * Links in sign-in emails come back to /auth/callback carrying `via=email`.
 */
export function callbackMethod(search: string): SignInMethod {
  return new URLSearchParams(search).get('via') === 'email' ? 'email' : 'google'
}

/** Enough of a check to catch a typo before sending; Supabase decides the rest. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** The digits of a pasted or typed code: "123 456" and "123-456" both work. */
export function normaliseCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10)
}
