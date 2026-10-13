import { useEffect } from 'react'
import { Button } from './Button'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

import { haptic } from '@/lib/haptics'
import { useAccount } from '@/state/account'

import { Text } from './Text'

/**
 * What an account page shows before its numbers arrive: soft placeholder cards
 * in the page's shape, or, when loading failed with nothing saved, why and a
 * way to try again. Never a bare "Loading…".
 */
export function LoadingState({ cards = 3 }: { cards?: number }) {
  const { error, offline, loading, refresh } = useAccount()
  const pulse = useSharedValue(0.55)
  useEffect(() => { pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true) }, [pulse])
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }))

  if ((error || offline) && !loading) {
    return (
      <View accessibilityRole="alert" className="items-center rounded-card bg-surface px-6 py-8">
        <Text className="text-[32px]">{offline ? '📡' : '🔌'}</Text>
        <Text className="mt-2 text-center text-[16px] font-semibold text-ink">{offline ? "You're offline" : "Couldn't load your account"}</Text>
        <Text className="mt-1 text-center text-[14px] leading-5 text-ink-2">
          {offline ? 'Your numbers will appear when you reconnect.' : 'Check your connection and try again.'}
        </Text>
        <Button small style={{ marginTop: 16, alignSelf: 'center' }} label="Try again" onPress={() => refresh()} />
      </View>
    )
  }

  return (
    <Animated.View accessibilityLabel="Loading" accessibilityRole="progressbar" style={[{ gap: 16 }, style]}>
      {Array.from({ length: cards }, (_, i) => (
        <View key={i} className="rounded-card border border-border bg-card p-5">
          <View className="h-3 w-24 rounded-full bg-surface-2" />
          <View className="mt-3 h-6 w-40 rounded-full bg-surface-2" />
          {i === 0 && <View className="mt-4 h-2 w-full rounded-full bg-surface-2" />}
        </View>
      ))}
    </Animated.View>
  )
}
