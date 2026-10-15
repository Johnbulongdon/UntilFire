import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session } from '@supabase/supabase-js'
import { makeRedirectUri } from 'expo-auth-session'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as WebBrowser from 'expo-web-browser'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isFirstSignIn } from '@/engine'
import { whileAway } from '@/lib/app-lock'
import { supabase } from '@/lib/supabase'
import { Events, identify, track } from '@/lib/analytics'

/**
 * App Review can't receive our emails, so this one account signs in with a
 * fixed 6-digit code: its Supabase password, given to Apple in the Review Notes.
 * Every other address gets the normal emailed code.
 */
const REVIEW_EMAIL = 'appreview@untilfire.com'
const isReviewEmail = (email: string) => email.trim().toLowerCase() === REVIEW_EMAIL

const SITE = 'https://www.untilfire.com'

WebBrowser.maybeCompleteAuthSession()

interface AuthContextValue {
  session: Session | null
  /** False until the saved session has been read. */
  ready: boolean
  /** Emails a 6-digit code; creates the account if it's new, as the website does. */
  sendCode: (email: string) => Promise<string | null>
  /** Checks the code; returns an error message, or null when signed in. */
  verifyCode: (email: string, code: string) => Promise<string | null>
  /** Google in a secure in-app browser; returns an error message, or null when signed in or cancelled. */
  signInWithGoogle: () => Promise<string | null>
  /**
   * Sign in with Apple, native sheet. Only offered in the app's own build (not Expo Go),
   * and Supabase's Apple provider must list the bundle ID com.untilfire.app.
   */
  signInWithApple: () => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); identify(next?.user.id ?? null) })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    ready,
    sendCode: async email => {
      // App Review's account signs in with a fixed code instead of an email (docs/ios-launch.md).
      if (isReviewEmail(email)) return null
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
      return error ? friendly(error.message) : null
    },
    verifyCode: async (email, code) => {
      const { data, error } = isReviewEmail(email)
        ? await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: code })
        : await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })
      if (error) return friendly(error.message)
      if (data.session) welcomeIfNew(data.session)
      return null
    },
    signInWithGoogle: async () => {
      // untilfire://auth in the real app, exp://.../--/auth in Expo Go. Both must be
      // listed in Supabase under Authentication, URL Configuration, Redirect URLs.
      const redirectTo = makeRedirectUri({ scheme: 'untilfire', path: 'auth' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data.url) return friendly(error?.message ?? '')
      const result = await whileAway(() => WebBrowser.openAuthSessionAsync(data.url, redirectTo))
      if (result.type !== 'success') return null
      const params = new URL(result.url).searchParams
      const code = params.get('code')
      if (!code) return params.get('error_description') ?? "Google sign-in didn't finish. Please try again."
      const exchanged = await supabase.auth.exchangeCodeForSession(code)
      if (exchanged.error) return friendly(exchanged.error.message)
      if (exchanged.data.session) welcomeIfNew(exchanged.data.session)
      return null
    },
    signInWithApple: async () => {
      try {
        // A one-time nonce: Apple signs its hash, Supabase checks the original.
        const raw = Crypto.randomUUID()
        const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw)
        const cred = await whileAway(() => AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
          nonce: hashed,
        }))
        if (!cred.identityToken) return "Apple sign-in didn't finish. Please try again."
        const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw })
        if (error) return friendly(error.message)
        if (data.session) welcomeIfNew(data.session)
        return null
      } catch (e) {
        // Closing Apple's sheet is not an error.
        if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null
        return "Apple sign-in didn't finish. Please try again."
      }
    },
    signOut: async () => {
      // The saved copy of the account leaves the phone with the sign-in.
      const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[])
      await AsyncStorage.multiRemove(keys.filter(k => k.startsWith('account-cache:'))).catch(() => {})
      await supabase.auth.signOut()
    },
  }), [session, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** As lib/auth-finish.ts does on the website: a first sign-in gets the welcome email. */
function welcomeIfNew(session: Session) {
  if (!isFirstSignIn(session.user)) return
  track(Events.SIGNUP_COMPLETED, { method: session.user.app_metadata?.provider ?? 'email' })
  fetch(`${SITE}/api/email/welcome`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  }).catch(() => {})
}

function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('expired') || m.includes('invalid')) return "That code didn't work. Check it, or send a new one."
  if (m.includes('rate') || m.includes('seconds')) return 'Please wait a moment before asking for another code.'
  if (m.includes('email')) return 'Check the email address and try again.'
  return 'Something went wrong. Please try again.'
}
