import type { ReactNode } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

const SPRING = { damping: 15, stiffness: 320, mass: 0.6 }

/** A pressable that squashes a little under the finger and springs back. */
export function Bouncy({ children, style, scaleTo = 0.96, ...rest }: PressableProps & {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  scaleTo?: number
}) {
  const scale = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Pressable accessibilityRole="button"
      {...rest}
      style={style}
      onPressIn={e => { scale.value = withSpring(scaleTo, SPRING); rest.onPressIn?.(e) }}
      onPressOut={e => { scale.value = withSpring(1, SPRING); rest.onPressOut?.(e) }}
    >
      <Animated.View style={animated}>{children}</Animated.View>
    </Pressable>
  )
}
