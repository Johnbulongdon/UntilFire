import { useEffect, type ReactNode } from 'react'
import { View } from 'react-native'
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/**
 * A progress ring, Apple Fitness style: one arc for a share of a whole,
 * drawn in on appear, with whatever sits in the middle (usually one number).
 * `delay` holds the draw until a screen has finished sliding in, so it is seen
 * starting from empty (Oct 2026 QA).
 */
export function Ring({ share, size = 120, stroke = 14, color, track, delay = 0, duration = 900, children }: {
  share: number; size?: number; stroke?: number; color: string; track: string; delay?: number; duration?: number; children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const t = useSharedValue(0)
  useEffect(() => { t.value = withDelay(delay, withTiming(Math.max(0, Math.min(1, share)), { duration, easing: Easing.out(Easing.cubic) })) }, [share, t, delay, duration])
  const arc = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - t.value), strokeOpacity: t.value > 0.002 ? 1 : 0 }))
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} animatedProps={arc} />
      </Svg>
      {children}
    </View>
  )
}
