import { router } from 'expo-router'
import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { useAuth } from '@/state/auth'

/**
 * The last onboarding step: keep the plan by signing in. Never a wall (DESIGN:
 * "don't gate the aha moment"); "Not now" goes straight to Home, and the
 * answers carry into a new account whenever you do sign in.
 */
export default function SavePlan() {
  const { session } = useAuth()
  // Signed in from the sheet: on to Home.
  useEffect(() => { if (session) router.replace('/(tabs)') }, [session])

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <View className="flex-1 justify-between px-6 pb-4 pt-10">
        <View className="flex-1 justify-center">
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text className="text-[44px]">🔒</Text>
            <Text className="mt-4 font-display text-[32px] font-bold leading-10 tracking-tight text-ink">Keep your plan</Text>
            <Text className="mt-3 text-[17px] leading-6 text-ink-2">
              Sign in to save it to your UntilFire account, see it on untilfire.com too, and bring in your real spending, budget and net worth.
            </Text>
            <View className="mt-6 gap-2.5">
              {['Your answers become your account\'s starting point', 'One account for the app and the website', 'Free; no card needed'].map(t => (
                <View key={t} className="flex-row items-center gap-2.5">
                  <Text className="text-[15px] text-pos-ink">✓</Text>
                  <Text className="text-[15px] text-ink">{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ gap: 12 }}>
          <PrimaryButton label="Sign in or create account" onPress={() => router.push('/sign-in')} />
          <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.replace('/(tabs)') }} className="items-center py-2">
            <Text className="text-[15px] text-ink-2">Not now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
