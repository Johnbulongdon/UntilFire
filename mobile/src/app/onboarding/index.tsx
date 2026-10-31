import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { haptic } from '@/lib/haptics'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'
import { usePlan, type Plan } from '@/state/plan'

/** The plan an existing account already holds, so a returning customer skips the questions. */
function planFromAccount(d: AccountData): Plan | null {
  if (!(d.income > 0)) return null
  const t = d.typed
  return {
    monthlyIncome: d.income,
    monthlySpending: Object.values(d.budget).reduce((s, v) => s + v, 0),
    invested: t.k401 + t.rothIRA + t.taxable + t.cashSavings,
    ...(d.age ? { age: d.age } : {}),
  }
}

/** Welcome presentation; existing plan recovery and navigation stay in this route. */
export default function Welcome() {
  const { session } = useAuth()
  const { data } = useAccount()
  const { plan, savePlan } = usePlan()
  // Only a sign-in started here moves on from here (sign-up at the end of onboarding has its own route), and only once.
  const asked = useRef(false)
  useEffect(() => {
    if (!asked.current || !session || !data) return
    asked.current = false
    if (plan) { router.replace('/(tabs)'); return }
    const fromAccount = planFromAccount(data)
    if (fromAccount) savePlan(fromAccount).then(() => router.replace('/(tabs)'))
    else router.push('/onboarding/goal')
  }, [session, data, plan, savePlan])

  // Restore an existing account through the real sign-in flow.
  const start = () => {
    haptic.tick()
    if (session) { router.push('/onboarding/goal'); return }
    asked.current = true
    router.push('/sign-in')
  }

  return <WelcomeScreen
    onGetStarted={() => { haptic.tick(); router.push('/onboarding/goal') }}
    onSignIn={start}
  />
}
