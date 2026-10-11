import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/Text'
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { haptic } from '@/lib/haptics'
import { scheduleMonthlyCheckIn } from '@/lib/reminders'
import { useAuth } from '@/state/auth'

export default function Reminder() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const swing = useSharedValue(0)

  // The bell rings twice, with a tap each time, then rests.
  useEffect(() => {
    swing.value = withDelay(
      400,
      withRepeat(withSequence(
        withTiming(-14, { duration: 90 }), withTiming(14, { duration: 120 }),
        withTiming(-8, { duration: 110 }), withTiming(0, { duration: 120 }),
        withTiming(0, { duration: 500 }),
      ), 2),
    )
    const t1 = setTimeout(haptic.tick, 420)
    const t2 = setTimeout(haptic.tick, 1360)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [swing])
  const bell = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }))

  // Next: keep the plan by signing in (or skip), unless already signed in.
  const finish = () => router.replace(session ? '/(tabs)' : '/save-plan')

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <View className="flex-1 justify-between px-6 pb-4 pt-10">
        <View className="flex-1 items-center justify-center">
          <Animated.View style={[{ marginBottom: 32 }, bell]}>
            <View className="h-32 w-32 items-center justify-center rounded-full bg-green-50">
              <Text className="text-[64px]">🔔</Text>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text className="text-center font-display text-[30px] font-bold leading-9 tracking-tight text-ink">Check in once a month</Text>
            <Text className="mt-3 text-center text-[17px] leading-6 text-ink-2">
              On the 1st, we'll nudge you to update your numbers. It takes two minutes and keeps your freedom date honest.
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ gap: 12 }}>
          <PrimaryButton
            label={busy ? 'Setting it up…' : 'Remind me monthly'}
            disabled={busy}
            onPress={async () => {
              setBusy(true)
              const ok = await scheduleMonthlyCheckIn().catch(() => false)
              if (ok) haptic.success()
              finish()
            }}
          />
          <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); finish() }} className="items-center py-2">
            <Text className="text-[15px] text-ink-2">Not now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
