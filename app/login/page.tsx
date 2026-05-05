'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { peekCalculatorPrefill, type CalculatorPrefill } from '@/lib/journey'
import {
  identifyUser,
  trackSignupCompleted,
  trackSignupStarted,
} from '@/lib/analytics'

export default function LoginPage() {
  const router = useRouter()
  const [prefill, setPrefill] = useState<CalculatorPrefill | null>(null)

  useEffect(() => {
    setPrefill(peekCalculatorPrefill())

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        identifyUser(session.user.id)
        trackSignupCompleted()
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function signInWithGoogle() {
    const prefillNow = peekCalculatorPrefill()
    trackSignupStarted({
      fromCalculator: !!prefillNow,
      stateKey: prefillNow?.stateKey,
    })
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : 'https://untilfire.com/auth/callback',
      },
    })
  }

  return (
    <main className="uf-app-frame">
      <div className="uf-app-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="uf-surface" style={{ width: '100%', maxWidth: 460, padding: 36 }}>
          <div style={{ marginBottom: 24 }}>
            <div className="uf-chip">UntilFire account</div>
            <h1 style={{ margin: '18px 0 10px', fontSize: '2.2rem', lineHeight: 1.05, letterSpacing: '-0.04em' }}>
              {prefill ? 'Save and continue your FIRE plan.' : 'Sign in to keep your FIRE plan in one place.'}
            </h1>
            <p style={{ margin: 0, color: 'var(--color-gray-500)', lineHeight: 1.7 }}>
              {prefill
                ? `We saved your ${prefill.cityName ? `${prefill.cityName} ` : ''}projection so you can pick up inside the dashboard without re-entering everything.`
                : 'Your calculator stays free. Signing in unlocks the dashboard, expense tracking, and your personalized workspace.'}
            </p>
          </div>

          {prefill && (
            <div
              style={{
                marginBottom: 18,
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid rgba(6, 78, 59, 0.12)',
                background: 'rgba(209, 250, 229, 0.45)',
                color: 'var(--color-gray-800)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Ready to carry forward</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-gray-600)' }}>
                {prefill.fireTarget ? `FIRE target ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prefill.fireTarget)}. ` : ''}
                {prefill.monthlyIncome ? `Monthly take-home ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prefill.monthlyIncome)}. ` : ''}
                {prefill.monthlySavings ? `Monthly savings ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prefill.monthlySavings)}.` : ''}
              </div>
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            style={{
              width: '100%',
              minHeight: 52,
              borderRadius: 14,
              border: '1px solid var(--color-gray-200)',
              background: '#ffffff',
              color: 'var(--color-gray-900)',
              fontSize: 15,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              cursor: 'pointer',
              boxShadow: '0 14px 28px rgba(15, 23, 42, 0.06)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p style={{ margin: '18px 0 0', color: 'var(--color-gray-500)', fontSize: 13, lineHeight: 1.6 }}>
            No credit card required. The calculator stays free even if you never create an account.
          </p>

          <Link href="/" className="uf-article-back" style={{ marginTop: 22 }}>
            Back to calculator
          </Link>
        </div>
      </div>
    </main>
  )
}
