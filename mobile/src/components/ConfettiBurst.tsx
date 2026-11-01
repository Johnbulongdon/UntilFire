import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

// Next Horizon: freedom yellow, ink and the four pastel card colours (a shade deeper so they show on white).
const COLORS = ['#FFE58A', '#151719', '#F2C94C', '#9FD9C2', '#C3B5EE', '#9CC6F2', '#F2B3D4', '#FFE58A']

/**
 * A one-off shower of confetti over the whole screen, for the biggest moment
 * (the year reveal). Like Robinhood's: pieces rain down from above the top
 * edge across the full width, swaying and tumbling as they fall (Oct 2026 QA;
 * it used to burst up from the middle). Only transforms and opacity animate,
 * on the UI thread.
 */
export function ConfettiBurst({ count = 70, play = true }: { count?: number; play?: boolean }) {
  const { width, height } = useWindowDimensions()
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    color: COLORS[i % COLORS.length],
    x: Math.random() * width,
    start: -20 - Math.random() * height * 0.25,
    fall: height * (1.05 + Math.random() * 0.25),
    sway: 12 + Math.random() * 26,
    waves: 1.5 + Math.random() * 2,
    spin: (Math.random() - 0.5) * 1440,
    flip: 2 + Math.random() * 4,
    delay: Math.random() * 600,
    duration: 2400 + Math.random() * 1400,
    w: 7 + Math.random() * 6,
    round: i % 4 === 0,
  })), [count, width, height])
  if (!play) return null
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => <Piece key={i} p={p} />)}
    </View>
  )
}

type P = { color: string; x: number; start: number; fall: number; sway: number; waves: number; spin: number; flip: number; delay: number; duration: number; w: number; round: boolean }

function Piece({ p }: { p: P }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(p.delay, withTiming(1, { duration: p.duration, easing: Easing.in(Easing.quad) }))
  }, [p.delay, p.duration, t])
  const style = useAnimatedStyle(() => ({
    // Falls the whole screen, swaying side to side; the flat pieces flip like paper.
    opacity: t.value === 0 ? 0 : t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [
      { translateX: Math.sin(t.value * Math.PI * 2 * p.waves) * p.sway },
      { translateY: t.value * p.fall },
      { rotate: `${p.spin * t.value}deg` },
      { scaleY: p.round ? 1 : Math.cos(t.value * Math.PI * 2 * p.flip) },
    ],
  }))
  return (
    <Animated.View style={[{ position: 'absolute', left: p.x, top: p.start, width: p.w, height: p.round ? p.w : p.w * 0.55, borderRadius: p.round ? p.w : 2, backgroundColor: p.color }, style]} />
  )
}
