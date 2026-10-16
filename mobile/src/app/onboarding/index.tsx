import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Sunny } from '@/components/Sunny'
import { Text } from '@/components/Text'
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

/**
 * Welcome (V2): the wordmark (without the logo's own sun, so there is one sun),
 * Sunny coming up, one punchline. Both buttons sign in first (account first,
 * Oct 16 2026); a set-up account goes straight to Home, a new one answers the
 * questions next.
 */
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

  // Account first (Oct 16 2026, the founder: someone who downloaded the app has
  // already committed). Both buttons sign in; the questions follow for a new account.
  const start = () => {
    haptic.tick()
    if (session) { router.push('/onboarding/goal'); return }
    asked.current = true
    router.push('/sign-in')
  }

  // A soft tap as the sun rises.
  useEffect(() => {
    const t = setTimeout(haptic.tick, 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-brand">
      <View className="flex-1 justify-between px-6 pb-4 pt-6">
        <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', marginTop: 24 }}>
          <Text className="font-display text-[30px] font-bold tracking-tight text-white">UntilFire</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600).duration(900)}>
          <View style={{ alignItems: 'center' }}><Sunny mood="rise" size={190} /></View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1300).duration(700)}>
          <Text className="font-display text-[42px] font-bold leading-[48px] tracking-tight text-white">
            Find the year work becomes optional.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1800).duration(600)}>
          <Button kind="onDark" label="Get started" onPress={start} />
          <Button kind="onDarkQuiet" small style={{ marginTop: 10 }} label="I already have an account" onPress={start} />
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
