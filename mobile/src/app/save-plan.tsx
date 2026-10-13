import { router } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Sunrise } from '@/components/Sunrise'
import { Text } from '@/components/Text'
import { useAuth } from '@/state/auth'
import { brand } from '@/theme/colors'

/**
 * The last onboarding step (V2): an invitation, not a warning. Someone who
 * downloaded the app and finished onboarding wants in, so this welcomes them
 * to the daily habit. Never a wall: "Maybe later" goes straight to Home, and
 * the answers carry into an account whenever they join.
 */
export default function SavePlan() {
  // Joined from the sheet: on to Home.
  const { session } = useAuth()
  useEffect(() => { if (session) router.replace('/(tabs)') }, [session])

  return (
    <SafeAreaView className="flex-1 bg-brand">
      <View className="flex-1 justify-center px-6">
        <Animated.View entering={FadeIn.duration(700)}>
          <Sunrise share={0.6} height={130} sun={brand.sun} horizon={brand.aqua} sky={brand.aqua} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text className="mt-6 font-display text-[38px] font-bold leading-[44px] tracking-tight text-white">Your path starts today.</Text>
          <View className="mt-6 gap-3">
            {[
              ['sun.max.fill', '☀', 'Today: one minute a day keeps your plan on track'],
              ['chart.line.uptrend.xyaxis', '↗', 'Watch your freedom date move as you go'],
              ['laptopcomputer.and.iphone', '⇄', 'The same account on untilfire.com'],
            ].map(([icon, fallback, t]) => (
              <View key={t} className="flex-row items-center gap-3">
                <Icon name={icon as 'sun.max.fill'} fallback={fallback} size={20} color={brand.aqua} />
                <Text className="flex-1 text-[16px] leading-6 text-mint">{t}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
      <View className="gap-3 px-6 pb-4">
        <Button kind="onDark" label="Create my free account" onPress={() => router.push('/sign-in')} />
        <Button kind="onDarkQuiet" label="Maybe later" onPress={() => router.replace('/(tabs)')} />
      </View>
    </SafeAreaView>
  )
}
