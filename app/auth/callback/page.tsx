'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { finishSignIn } from '@/lib/auth-finish'
import { callbackMethod } from '@/lib/auth-user'

export default function AuthCallback() {
  useEffect(() => {
    // Only run when this is an actual sign-in callback (Supabase's PKCE flow
    // puts the one-time code in ?code=, from Google or from the link in a
    // sign-in email). If the code param is absent, do nothing.
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
          finishSignIn(session, callbackMethod(window.location.search))
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
            We&apos;re finishing your sign-in and sending you to the dashboard.
          </p>
        </div>
      </div>
    </main>
  )
}