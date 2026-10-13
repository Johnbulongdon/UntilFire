import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

const COLORS = ['#F5A24F', '#0E9C86', '#3866C9', '#E2763A', '#7E4FAA', '#F2C14E', '#F27D61', '#5FDCC4']

/**
 * A one-off shower of confetti over the whole screen, for the biggest moment
 * (the year reveal). Pieces burst up from the middle, then drift down and fade.
 * Only transforms and opacity animate, on the UI thread.
 */
export function ConfettiBurst({ count = 46, play = true }: { count?: number; play?: boolean }) {
  const { width, height } = useWindowDimensions()
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    color: COLORS[i % COLORS.length],
    x: (Math.random() - 0.5) * width * 1.1,
    up: height * (0.18 + Math.random() * 0.22),
    fall: height * (0.55 + Math.random() * 0.35),
    spin: (Math.random() - 0.5) * 1080,
    delay: Math.random() * 180,
    w: 7 + Math.random() * 6,
    round: i % 3 === 0,
  })), [count, width, height])
  if (!play) return null
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => <Piece key={i} p={p} originX={width / 2} originY={height * 0.42} />)}
    </View>
  )
}

function Piece({ p, originX, originY }: { p: { color: string; x: number; up: number; fall: number; spin: number; delay: number; w: number; round: boolean }; originX: number; originY: number }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(p.delay, withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }))
  }, [p.delay, t])
  const style = useAnimatedStyle(() => {
    // Up fast in the first quarter, then a slow fall: a simple throw.
    const rise = Math.min(1, t.value / 0.22)
    const y = -p.up * (1 - (1 - rise) * (1 - rise)) + Math.max(0, t.value - 0.22) / 0.78 * (p.fall + p.up)
    return {
      opacity: t.value === 0 ? 0 : t.value < 0.8 ? 1 : (1 - t.value) / 0.2,
      transform: [{ translateX: p.x * Math.min(1, t.value * 2.2) }, { translateY: y }, { rotate: `${p.spin * t.value}deg` }],
    }
  })
  return (
    <Animated.View style={[{ position: 'absolute', left: originX, top: originY, width: p.w, height: p.round ? p.w : p.w * 0.55, borderRadius: p.round ? p.w : 2, backgroundColor: p.color }, style]} />
  )
}
