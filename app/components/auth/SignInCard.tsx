'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { siteUrl } from '@/lib/site'
import { getAcquisitionSource } from '@/lib/acquisition'
import { trackSignupStarted } from '@/lib/analytics'
import { peekCalculatorPrefill } from '@/lib/journey'
import { finishSignIn, afterSignInPath } from '@/lib/auth-finish'
import { useAuth } from '@/lib/auth-context'
import { isPlausibleEmail, normaliseCode } from '@/lib/auth-user'
import { Button, Field, Input } from '@/components/ui'

// The one sign-up / sign-in card: Google, Apple (a placeholder until it is
// set up in Supabase) and an email code. Used on /login and as the last
// calculator step, so saving a result and signing up is a single page.

// Email sign-in stays off until Supabase can send the code: custom SMTP
// (its built-in sender is for testing only) and a template that includes
// {{ .Token }}. See docs/DECISIONS.md D-18.
const EMAIL_SIGNIN = process.env.NEXT_PUBLIC_EMAIL_SIGNIN === 'on'
const RESEND_AFTER_S = 60

const errorText: React.CSSProperties = { fontSize: 12, color: 'var(--uf-neg)' }
const bigButton: React.CSSProperties = { fontSize: 16, padding: '16px 28px' }

function sendErrorMessage(error: { status?: number; message?: string }): string {
  if (error.status === 429 || /rate|security purposes|too many/i.test(error.message ?? '')) {
    return 'Too many codes asked for. Wait a minute, then try again.'
  }
  return "We couldn't send a code just now. Try again, or continue with Google."
}

const GOOGLE_G = (
  <span aria-hidden style={{ display: 'inline-flex', background: '#fff', borderRadius: 6, padding: 3 }}>
    <svg width={18} height={18} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  </span>
)

const APPLE_LOGO = (
  <svg aria-hidden width={18} height={20} viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
)

// Set while a code is being checked, so a page's sign-in listener leaves the
// redirect to finishSignIn, which records the signup first.
let finishingWithCode = false
export const isFinishingWithCode = () => finishingWithCode

const oauthRedirectTo = () => {
  if (typeof window === 'undefined') return siteUrl('/auth/callback')
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  return isLocalHost ? `${window.location.origin}/auth/callback` : siteUrl('/auth/callback')
}

export default function SignInCard({ verb, onStart }: {
  /** "Save" on the calculator's last step, "Continue" elsewhere. */
  verb: 'Save' | 'Continue'
  /** Runs before any sign-in starts, e.g. to keep the calculator result in this browser. */
  onStart?: () => void
}) {
  const {user}=useAuth()
  const [oauthError,setOAuthError]=useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [appleSoon, setAppleSoon] = useState(false)

  const started = (authProvider: 'google' | 'email') => {
    onStart?.()
    const prefill = peekCalculatorPrefill()
    trackSignupStarted({
      fromCalculator: Boolean(prefill),
      authProvider,
      stateKey: prefill?.stateKey,
      landingSource: prefill?.landingSource ?? getAcquisitionSource(),
    })
  }

  async function signInWithGoogle() {
    if(busy)return
    setBusy(true);setOAuthError('')
    try {
      started('google')
      const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:oauthRedirectTo(),skipBrowserRedirect:true}})
      if(error||!data?.url)throw error??new Error('Missing sign-in URL')
      window.location.assign(data.url)
    } catch {
      setOAuthError('Could not start Google sign-in. Check your connection and try again.')
      setBusy(false)
    }
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
    if (!isResend) started('email')
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: true,
        // If the email also carries a link, it signs in through the callback.
        emailRedirectTo: `${oauthRedirectTo()}?via=email`,
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
    finishingWithCode = true
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    if (error || !data?.session) {
      finishingWithCode = false
      setBusy(false)
      setCodeError("That code didn't work. Check it, or send a new one.")
      return
    }
    // The calculator result is still in this browser, so the dashboard picks
    // it up exactly as it does after Google.
    finishSignIn(data.session, 'email')
  }

  if(user)return <div style={{background:'var(--uf-card)',border:'1px solid var(--uf-border)',borderRadius:16,padding:'28px'}}><p style={{margin:'0 0 18px',color:'var(--uf-ink-2)',fontSize:14}}>You’re already signed in.</p><Button variant="primary" size="lg" fullWidth onClick={()=>{onStart?.();window.location.assign(afterSignInPath())}}>Continue to Home</Button></div>

  return (
    <div style={{
      background: 'var(--uf-card)',
      border: '1px solid var(--uf-border)',
      borderRadius: 16,
      padding: '32px 28px',
      boxShadow: 'var(--uf-e2)',
    }}>
      {stage === 'email' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <Button variant="primary" size="lg" fullWidth onClick={signInWithGoogle} disabled={busy} aria-busy={busy} style={bigButton}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{GOOGLE_G}{busy?'Connecting…':`${verb} with Google`}</span>
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => setAppleSoon(true)} aria-describedby={appleSoon ? 'apple-soon' : undefined}
            style={{ ...bigButton, background: 'var(--uf-ink)', borderColor: 'var(--uf-ink)', color: 'var(--uf-card)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{APPLE_LOGO}{verb} with Apple</span>
          </Button>
          {appleSoon && (
            <p id="apple-soon" role="status" style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--uf-ink-2)' }}>
              Apple sign-in is coming soon. Use Google or email for now.
            </p>
          )}
        </div>
      )}

      {oauthError&&<p role="alert" style={errorText}>{oauthError}</p>}
      {EMAIL_SIGNIN && (
        <>
          {stage === 'email' && (
            <div role="separator" aria-label="or" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--uf-ink-3)', fontSize: 12 }}>
              <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--uf-border)' }} />
              or
              <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--uf-border)' }} />
            </div>
          )}

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

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--uf-ink-3)', lineHeight: 1.6 }}>
        By continuing you agree to our{' '}
        <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link> &amp;{' '}
        <Link href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</Link>.
      </div>
    </div>
  )
}
