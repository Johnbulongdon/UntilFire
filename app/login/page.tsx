'use client'
import Logo from '@/app/components/Logo'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { peekCalculatorPrefill, type CalculatorPrefill } from '@/lib/journey'
import { afterSignInPath } from '@/lib/auth-finish'
import HomeBackdrop from '@/app/components/auth/HomeBackdrop'
import SignInCard, { isFinishingWithCode } from '@/app/components/auth/SignInCard'

// Sign up and sign in are the same page: the real Home, blurred, behind one
// card. The calculator's last step shows the same card (RevealFlow), so most
// visitors arrive here only directly or after the "unreachable" result.
export default function LoginPage() {
  const router = useRouter()
  const [prefill, setPrefill] = useState<CalculatorPrefill | null>(null)
  const prefillYear = prefill?.retireYear ?? null

  useEffect(() => {
    setPrefill(peekCalculatorPrefill())
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(afterSignInPath())
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !isFinishingWithCode()) router.push(afterSignInPath())
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--uf-ground)',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      padding: '48px 0',
    }}>
      <HomeBackdrop prefill={prefill} />

      <Link href="/" aria-label="Back to calculator" style={{
        position: 'absolute', top: 20, left: 20, zIndex: 2,
        fontSize: 13, color: 'var(--uf-ink-2)', textDecoration: 'none',
      }}>
        ← Back
      </Link>

      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 10 }}>
            <Logo variant="auto" size={28} />
          </div>
          <h1 className="uf-t-h1" style={{ margin: 0, color: 'var(--uf-ink)', textWrap: 'balance' }}>
            {prefillYear
              ? <><span style={{ color: 'var(--uf-teal)' }}>{prefillYear}</span> is just your starting point</>
              : prefill ? <>Your starting point is ready</> : <>Start your journey to freedom</>}
          </h1>
        </div>
        <SignInCard verb={prefill ? 'Save' : 'Continue'} />
      </div>
    </div>
  )
}
