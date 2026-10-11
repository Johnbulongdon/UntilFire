import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { colors } from '@/theme/colors'

/** Fills from the previous step's width to this one's, so progress visibly moves forward. */
export function ProgressBar({ step, steps }: { step: number; steps: number }) {
  const width = useSharedValue(Math.max(0, step - 1) / steps)
  useEffect(() => {
    width.value = withTiming(step / steps, { duration: 550, easing: Easing.out(Easing.cubic) })
  }, [step, steps, width])
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }))
  return (
    <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
      <Animated.View style={[{ height: '100%', borderRadius: 999, backgroundColor: colors.teal }, fill]} />
    </View>
  )
}
