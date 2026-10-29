import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { setTodayReminder } from '@/lib/today-reminder'
import { useAuth } from '@/state/auth'
import { TAB_COLOR } from '@/theme/colors'

/**
 * Meet Today (D-73): the daily minute, and iOS's own notification prompt for
 * the 9pm reminder. Replaces the old monthly check-in. Asked once here, so
 * Today doesn't ask again.
 */
export default function Reminder() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const swing = useSharedValue(0)

  // The bell rings twice, with a tap each time, then rests.
  useEffect(() => {
    swing.value = withDelay(400, withRepeat(withSequence(
      withTiming(-14, { duration: 90 }), withTiming(14, { duration: 120 }),
      withTiming(-8, { duration: 110 }), withTiming(0, { duration: 120 }), withTiming(0, { duration: 500 }),
    ), 2))
    const t1 = setTimeout(haptic.tick, 420)
    const t2 = setTimeout(haptic.tick, 1360)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [swing])
  const bell = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }))

  // Onboarding ends on Your plan, not on this ask (peak-end).
  const finish = () => { AsyncStorage.setItem('today-reminder-asked', '1').catch(() => {}); router.push('/onboarding/your-plan') }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View style={[{ marginBottom: 32 }, bell]}>
          <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: TAB_COLOR.home, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell.fill" fallback="🔔" size={60} color="#FFFFFF" />
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text className="text-center font-display text-[32px] font-bold leading-10 tracking-tight text-ink">One minute a day</Text>
          <Text className="mt-3 text-center text-[17px] leading-6 text-ink-2">
            Each evening, Today shows what changed in your money. A nudge at 9pm, only if you haven&apos;t looked.
          </Text>
        </Animated.View>
      </View>
      <View className="gap-3 px-6 pb-4">
        <Button label={busy ? 'Setting it up…' : 'Turn on reminders'} disabled={busy} onPress={async () => {
          setBusy(true)
          const ok = await setTodayReminder(true, [], !!session).catch(() => false)
          if (ok) haptic.success()
          finish()
        }} />
        <Button kind="quiet" label="Not now" onPress={finish} />
      </View>
    </SafeAreaView>
  )
}
