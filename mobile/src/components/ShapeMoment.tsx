import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

import type { Mood } from './Sunny'

const TEAL = '#0E9C86'
const DEEP = '#0A7665'
const SUN = '#F5A24F'

/**
 * Option C sketch: no character, bold shapes that move for the same moments.
 * Same technique as Sunny: SVG layers moved by View transforms, and lines
 * "drawn" by widening a clipping View rather than animating the path.
 */
export function ShapeMoment({ mood, size = 200 }: { mood: Mood; size?: number }) {
  const a = useSharedValue(0)
  const b = useSharedValue(0)
  const loop = useSharedValue(0)

  useEffect(() => {
    cancelAnimation(loop)
    a.value = 0; b.value = 0; loop.value = 0
    const out = Easing.out(Easing.cubic)
    if (mood === 'hello' || mood === 'rise') {
      a.value = withTiming(1, { duration: mood === 'rise' ? 1800 : 1100, easing: out })
      b.value = withDelay(mood === 'rise' ? 1200 : 700, withTiming(1, { duration: 500 }))
      loop.value = withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1)
    } else if (mood === 'think') {
      a.value = withTiming(1, { duration: 400 })
      loop.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), withDelay(600, withTiming(0, { duration: 0 }))), -1)
    } else if (mood === 'done') {
      a.value = withSpring(1, { damping: 7 })
      b.value = withDelay(220, withTiming(1, { duration: 380, easing: out }))
    } else if (mood === 'quiet') {
      a.value = withTiming(1, { duration: 600 })
      loop.value = withRepeat(withSequence(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })), -1)
    } else if (mood === 'win') {
      a.value = withSequence(withTiming(1.25, { duration: 260, easing: out }), withSpring(1, { damping: 5 }))
      b.value = withDelay(120, withTiming(1, { duration: 900, easing: out }))
    }
  }, [mood]) // eslint-disable-line react-hooks/exhaustive-deps

  const sunUp = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - a.value) * size * 0.45 }] }))
  const rays = useAnimatedStyle(() => ({ opacity: b.value, transform: [{ rotate: `${loop.value}deg` }, { scale: 0.7 + b.value * 0.3 }] }))
  const card = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ scale: 0.9 + a.value * 0.1 }] }))
  const chartClip = useAnimatedStyle(() => ({ width: size * (0.1 + loop.value * 0.9) }))
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: a.value }] }))
  const tickClip = useAnimatedStyle(() => ({ width: size * b.value }))
  const breathe = useAnimatedStyle(() => ({ opacity: a.value * (0.75 + loop.value * 0.25), transform: [{ scale: 0.94 + loop.value * 0.06 }] }))
  const star = useAnimatedStyle(() => ({ transform: [{ scale: a.value }, { rotate: `${(1 - Math.min(a.value, 1)) * -90}deg` }] }))
  const sparks = useAnimatedStyle(() => ({ opacity: b.value === 0 ? 0 : 1 - b.value, transform: [{ scale: 0.6 + b.value * 0.9 }] }))

  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      {(mood === 'hello' || mood === 'rise') && (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: size * 0.68, overflow: 'hidden' }}>
            <Full size={size} style={rays}>
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(d => <Rect key={d} x={97} y={22} width={6} height={22} rx={3} fill={SUN} opacity={0.7} transform={`rotate(${d} 100 136)`} />)}
            </Full>
            <Full size={size} style={sunUp}><Circle cx={100} cy={136} r={46} fill={SUN} /></Full>
          </View>
          <Full size={size}><Rect x={20} y={134} width={160} height={6} rx={3} fill={TEAL} /><Rect x={50} y={152} width={100} height={6} rx={3} fill={TEAL} opacity={0.45} /><Rect x={76} y={170} width={48} height={6} rx={3} fill={TEAL} opacity={0.2} /></Full>
        </>
      )}
      {mood === 'think' && (
        <Animated.View style={[StyleSheet.absoluteFill, card]}>
          <Full size={size}><Rect x={24} y={40} width={152} height={120} rx={24} fill="#D3F1EA" /></Full>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, chartClip]}>
            <Svg width={size} height={size} viewBox="0 0 200 200">
              <Path d="M44 134l30-34 24 18 30-40 28 10" stroke={TEAL} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        </Animated.View>
      )}
      {mood === 'done' && (
        <>
          <Full size={size} style={ring}><Circle cx={100} cy={100} r={66} fill={DEEP} /></Full>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, tickClip]}>
            <Svg width={size} height={size} viewBox="0 0 200 200">
              <Path d="M68 102l22 22 44-48" stroke="#FFFFFF" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        </>
      )}
      {mood === 'quiet' && (
        <Full size={size} style={breathe}><Circle cx={100} cy={100} r={56} fill="#F0E5D5" /><Rect x={78} y={95} width={44} height={10} rx={5} fill="#9C8E78" /></Full>
      )}
      {mood === 'win' && (
        <>
          <Full size={size} style={sparks}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map(d => <Rect key={d} x={96} y={8} width={8} height={20} rx={4} fill={d % 90 === 0 ? TEAL : SUN} transform={`rotate(${d} 100 100)`} />)}
          </Full>
          <Full size={size} style={star}><Path d="M100 34l18 38 42 5-31 29 8 42-37-21-37 21 8-42-31-29 42-5z" fill={SUN} stroke="#E2763A" strokeWidth={5} strokeLinejoin="round" /></Full>
        </>
      )}
    </View>
  )
}

function Full({ children, style, size }: { children: React.ReactNode; style?: object; size: number }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">{children}</Svg>
    </Animated.View>
  )
}
