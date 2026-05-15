'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { identifyUser, trackSignupCompleted } from '@/lib/analytics'

export default function AuthCallback() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        const session = data.session
        if (session) {
          identifyUser(session.user.id)
          trackSignupCompleted()
          fetch("/api/email/welcome", {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {})
        }
        // Brief delay so the PostHog XHR for funnel_signup_completed can
        // flush before the hard navigation. Without this, the in-flight
        // request is cancelled by the page change and the event is dropped.
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 300)
      })
    }
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
