'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { identifyUser, trackSignupCompleted } from '@/lib/analytics'

export default function AuthCallback() {
  useEffect(() => {
    // Only run when this is an actual OAuth callback (Supabase PKCE flow puts
    // the one-time code in ?code=). If the code param is absent, do nothing.
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) return

    // Supabase JS (detectSessionInUrl: true) automatically exchanges the code
    // during client init — before this useEffect runs. Calling
    // exchangeCodeForSession manually would consume an already-spent code and
    // return session: null. Instead we subscribe to onAuthStateChange and
    // react to the session Supabase already established.
    let handled = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (handled) return
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          handled = true
          identifyUser(session.user.id)
          const isNewUser =
            Date.now() - new Date(session.user.created_at).getTime() < 60_000
          trackSignupCompleted({ isNewUser, authProvider: 'google' })
          if (isNewUser) {
            fetch("/api/email/welcome", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
            }).catch(() => {})
          }
          // Brief delay so the PostHog XHR for funnel_signup_completed can
          // flush before the hard navigation.
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 300)
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <main className="uf-app-frame">
      <div className="uf-app-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="uf-surface" style={{ width: '100%', maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <div className="uf-chip" style={{ marginBottom: 16 }}>Secure sign-in</div>
          <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.04em' }}>Signing you in</h1>
          <p style={{ margin: '14px 0 0', color: 'var(--color-gray-500)' }}>
            We&apos;re finishing your Google login and sending you to the dashboard.
          </p>
        </div>
      </div>
    </main>
  )
}