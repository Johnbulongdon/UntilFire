'use client'
import Logo from '@/app/components/Logo'
import { supabase } from '@/lib/supabase'
import { siteUrl } from '@/lib/site'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAcquisitionSource } from '@/lib/acquisition'
import { trackSignupStarted } from '@/lib/analytics'
import { peekCalculatorPrefill } from '@/lib/journey'
import { afterSignInPath, finishSignIn } from '@/lib/auth-finish'
import { isPlausibleEmail, normaliseCode } from '@/lib/auth-user'
import { Button, Field, Input } from '@/components/ui'

// Email sign-in stays off until Supabase can send the code: custom SMTP
// (its built-in sender is for testing only) and a template that includes
// {{ .Token }}. See docs/DECISIONS.md D-18.
const EMAIL_SIGNIN = process.env.NEXT_PUBLIC_EMAIL_SIGNIN === 'on'
const RESEND_AFTER_S = 60

const errorText: React.CSSProperties = { fontSize: 12, color: 'var(--uf-neg)' }

function sendErrorMessage(error: { status?: number; message?: string }): string {
  if (error.status === 429 || /rate|security purposes|too many/i.test(error.message ?? '')) {
    return 'Too many codes asked for. Wait a minute, then try again.'
  }
  return "We couldn't send a code just now. Try again, or continue with Google."
}

export default function LoginPage() {
  const router = useRouter()
  const [hasPrefill, setHasPrefill] = useState(false)
  const [prefillYear, setPrefillYear] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  // Set while a code is being checked, so the sign-in listener below leaves
  // the redirect to finishSignIn, which records the signup first.
  const finishingWithCode = useRef(false)

  useEffect(() => {
    const prefill = peekCalculatorPrefill()
    if (prefill) {
      setHasPrefill(true)
      if (prefill.retireYear) setPrefillYear(prefill.retireYear)
    }
  }, [])

  const getOAuthRedirectTo = () => {
    if (typeof window === 'undefined') return siteUrl('/auth/callback')

    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    if (isLocalHost) return `${window.location.origin}/auth/callback`

    return siteUrl('/auth/callback')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(afterSignInPath())
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !finishingWithCode.current) router.push(afterSignInPath())
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function signInWithGoogle() {
    const prefill = peekCalculatorPrefill()
    trackSignupStarted({
      fromCalculator: Boolean(prefill),
      authProvider: 'google',
      stateKey: prefill?.stateKey,
      landingSource: prefill?.landingSource ?? getAcquisitionSource(),
    })

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectTo(),
        skipBrowserRedirect: true,
      },
    })

    if (error) throw error
    if (data?.url) window.location.assign(data.url)
  }

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  async function sendCode(isResend = false) {
    const address = email.trim()
    if (!isPlausibleEmail(address)) {
      setEmailError('Check the email address.')
      return
    }
    setBusy(true)
    setEmailError('')
    setCodeError('')
    if (!isResend) {
      const prefill = peekCalculatorPrefill()
      trackSignupStarted({
        fromCalculator: Boolean(prefill),
        authProvider: 'email',
        stateKey: prefill?.stateKey,
        landingSource: prefill?.landingSource ?? getAcquisitionSource(),
      })
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: true,
        // If the email also carries a link, it signs in through the callback.
        emailRedirectTo: `${getOAuthRedirectTo()}?via=email`,
      },
    })
    setBusy(false)
    if (error) {
      const message = sendErrorMessage(error)
      if (isResend) setCodeError(message)
      else setEmailError(message)
      return
    }
    setStage('code')
    setCode('')
    setResendIn(RESEND_AFTER_S)
  }

  async function verifyCode() {
    const token = normaliseCode(code)
    if (token.length < 6) {
      setCodeError('Enter the code from the email.')
      return
    }
    setBusy(true)
    setCodeError('')
    finishingWithCode.current = true
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    if (error || !data?.session) {
      finishingWithCode.current = false
      setBusy(false)
      setCodeError("That code didn't work. Check it, or send a new one.")
      return
    }
    // The calculator result is still in this browser, so the dashboard picks
    // it up exactly as it does after Google.
    finishSignIn(data.session, 'email')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--uf-ground)',
      fontFamily: "'Manrope', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        .login-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 20px;
          background: var(--uf-card);
          border: 1px solid var(--uf-border);
          border-radius: 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          color: var(--uf-ink);
          font-family: 'Manrope', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-btn:hover {
          border-color: var(--uf-green);
          box-shadow: 0 0 0 3px rgba(5,150,105,0.08);
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ marginBottom: 10 }}>
            <Logo variant="auto" size={28} />
          </div>
          {hasPrefill ? (
            <div style={{ fontSize: 15, color: 'var(--uf-ink)', lineHeight: 1.5, fontWeight: 700 }}>
              {prefillYear
                ? <>Your freedom year is <span style={{ color: 'var(--uf-green)' }}>{prefillYear}</span>.<br />Save your starting point to track your progress.</>
                : <>Your starting point is ready.<br /><span style={{ color: 'var(--uf-ink-2)', fontWeight: 400 }}>Sign in to save and track it.</span></>
              }
            </div>
          ) : (
            <div style={{ fontSize: 15, color: 'var(--uf-ink-2)', lineHeight: 1.5 }}>
              Sign in to track your progress<br />toward financial independence
            </div>
          )}
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--uf-card)',
          border: '1px solid var(--uf-border)',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <button className="login-btn" onClick={signInWithGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {EMAIL_SIGNIN && (
            <>
              <div role="separator" aria-label="or" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--uf-ink-3)', fontSize: 12 }}>
                <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--uf-border)' }} />
                or
                <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--uf-border)' }} />
              </div>

              {stage === 'email' ? (
                <form noValidate onSubmit={(e) => { e.preventDefault(); void sendCode() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Field label="Email" htmlFor="login-email">
                    <Input
                      id="login-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? 'login-email-error' : undefined}
                    />
                    {emailError && <span id="login-email-error" role="alert" style={errorText}>{emailError}</span>}
                  </Field>
                  <Button type="submit" variant="secondary" size="lg" fullWidth disabled={busy}>
                    {busy ? 'Sending…' : 'Email me a sign-in code'}
                  </Button>
                </form>
              ) : (
                <form noValidate onSubmit={(e) => { e.preventDefault(); void verifyCode() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p role="status" style={{ margin: 0, fontSize: 13, color: 'var(--uf-ink-2)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                    We sent a code to <strong style={{ color: 'var(--uf-ink)' }}>{email.trim()}</strong>. It can take a minute to arrive.
                  </p>
                  <Field label="Code" htmlFor="login-code">
                    <Input
                      id="login-code"
                      numeric
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      autoFocus
                      value={code}
                      onChange={(e) => { setCode(normaliseCode(e.target.value)); setCodeError('') }}
                      aria-invalid={Boolean(codeError)}
                      aria-describedby={codeError ? 'login-code-error' : undefined}
                      style={{ fontSize: 18, letterSpacing: '0.2em' }}
                    />
                    {codeError && <span id="login-code-error" role="alert" style={errorText}>{codeError}</span>}
                  </Field>
                  <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    {resendIn > 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--uf-ink-2)', padding: '8px 0' }}>
                        You can ask for a new code in {resendIn}s
                      </span>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void sendCode(true)}>
                        Send a new code
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setStage('email'); setCode(''); setCodeError('') }}>
                      Use a different email
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          <div style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--uf-ink-3)',
            lineHeight: 1.6,
            fontFamily: "'Manrope', sans-serif",
          }}>
            No credit card required. Free forever for the core calculator.<br />
            By signing in you agree to our Terms &amp; Privacy Policy.
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--uf-ink-2)', textDecoration: 'none' }}>
            ← Back to calculator
          </Link>
        </div>
      </div>
    </div>
  )
}
