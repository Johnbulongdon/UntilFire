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
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg'

export type Mood = 'hello' | 'think' | 'done' | 'quiet' | 'win' | 'rise'

const SUN = '#F5A24F'
const SUN_EDGE = '#E2763A'
const RAY = '#F7B65C'
const INK = '#3A2414'
const CHEEK = '#F27D61'

/**
 * Option A sketch: Sunny, the logo's sun with a face. Each part is its own
 * layer and only View transforms and opacity animate, so Reanimated runs it
 * on the UI thread (animating SVG props directly crashed on iPhone before).
 */
export function Sunny({ mood, size = 200 }: { mood: Mood; size?: number }) {
  const spin = useSharedValue(0)
  const rayScale = useSharedValue(1)
  const rayOpacity = useSharedValue(1)
  const bob = useSharedValue(0)
  const jump = useSharedValue(0)
  const squash = useSharedValue(1)
  const tilt = useSharedValue(0)
  const blink = useSharedValue(1)
  const lookX = useSharedValue(0)
  const lookY = useSharedValue(0)
  const rise = useSharedValue(0)
  const burst = useSharedValue(0)
  const face = {
    open: useSharedValue(1), happy: useSharedValue(0), closed: useSharedValue(0),
    smile: useSharedValue(1), big: useSharedValue(0), o: useSharedValue(0), calm: useSharedValue(0),
  }

  // Always on: the rays turn slowly and the body breathes.
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1)
    return () => cancelAnimation(spin)
  }, [spin])

  useEffect(() => {
    const show = (on: (keyof typeof face)[]) => {
      for (const k of Object.keys(face) as (keyof typeof face)[]) face[k].value = withTiming(on.includes(k) ? 1 : 0, { duration: 140 })
    }
    const breathe = (amp: number, ms: number) => {
      bob.value = withRepeat(withSequence(withTiming(-amp, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) })), -1)
    }
    const blinking = () => {
      blink.value = withRepeat(withSequence(withDelay(2600, withTiming(0.08, { duration: 70 })), withTiming(1, { duration: 110 })), -1)
    }
    cancelAnimation(blink); blink.value = 1
    cancelAnimation(tilt); tilt.value = withTiming(0, { duration: 200 })
    lookX.value = withTiming(0); lookY.value = withTiming(0)
    rayScale.value = withSpring(1); rayOpacity.value = withTiming(1)
    rise.value = 0
    burst.value = 0

    if (mood === 'hello') {
      show(['open', 'smile']); breathe(4, 900); blinking()
      jump.value = withSequence(withTiming(-18, { duration: 180, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 13 }))
      tilt.value = withSequence(withTiming(-12, { duration: 160 }), withTiming(12, { duration: 220 }), withTiming(-8, { duration: 200 }), withSpring(0))
    } else if (mood === 'think') {
      show(['open', 'o']); breathe(2, 1400); blinking()
      lookX.value = withTiming(6, { duration: 300 }); lookY.value = withTiming(-6, { duration: 300 })
      tilt.value = withRepeat(withSequence(withTiming(7, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(2, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1)
    } else if (mood === 'done') {
      show(['happy', 'big']); breathe(3, 700)
      squash.value = withSequence(withTiming(0.86, { duration: 120 }), withSpring(1, { damping: 11 }))
      jump.value = withSequence(withDelay(100, withTiming(-26, { duration: 220, easing: Easing.out(Easing.quad) })), withSpring(0, { damping: 12 }))
      rayScale.value = withSequence(withTiming(1.22, { duration: 220 }), withSpring(1))
    } else if (mood === 'quiet') {
      show(['closed', 'calm']); breathe(2, 2000)
      rayScale.value = withTiming(0.72, { duration: 600 }); rayOpacity.value = withTiming(0.35, { duration: 600 })
      tilt.value = withTiming(-4, { duration: 600 })
    } else if (mood === 'win') {
      show(['happy', 'big']); breathe(3, 600)
      squash.value = withSequence(withTiming(0.8, { duration: 140 }), withSpring(1, { damping: 11 }))
      jump.value = withSequence(withDelay(120, withTiming(-40, { duration: 260, easing: Easing.out(Easing.quad) })), withSpring(0, { damping: 12 }))
      tilt.value = withSequence(withDelay(120, withTiming(360, { duration: 520, easing: Easing.out(Easing.cubic) })), withTiming(0, { duration: 0 }))
      rayScale.value = withSequence(withTiming(1.35, { duration: 260 }), withSpring(1, { damping: 12 }))
      burst.value = withDelay(160, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }))
    } else if (mood === 'rise') {
      show(['closed', 'calm']); breathe(0, 1000)
      rise.value = withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) })
      const wake = setTimeout(() => {
        show(['open', 'smile']); blinking(); breathe(3, 1000)
        jump.value = withSequence(withTiming(-14, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 13 }))
      }, 1500)
      return () => clearTimeout(wake)
    }
  }, [mood]) // eslint-disable-line react-hooks/exhaustive-deps

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value + jump.value + (mood === 'rise' ? size * 0.1 + (1 - rise.value) * size * 0.7 : 0) },
      { rotate: `${tilt.value}deg` },
      { scaleX: 2 - squash.value },
      { scaleY: squash.value },
    ],
  }))
  const raysStyle = useAnimatedStyle(() => ({ opacity: rayOpacity.value, transform: [{ rotate: `${spin.value}deg` }, { scale: rayScale.value }] }))
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lookX.value * size / 200 }, { translateY: lookY.value * size / 200 }] }))
  const blinkStyle = useAnimatedStyle(() => ({ opacity: face.open.value, transform: [{ scaleY: blink.value }] }))
  const fade = (v: SharedValue<number>) => useAnimatedStyle(() => ({ opacity: v.value })) // eslint-disable-line react-hooks/rules-of-hooks
  const happyStyle = fade(face.happy)
  const closedStyle = fade(face.closed)
  const smileStyle = fade(face.smile)
  const bigStyle = fade(face.big)
  const oStyle = fade(face.o)
  const calmStyle = fade(face.calm)

  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: mood === 'rise' ? size * 0.8 : size, overflow: mood === 'rise' ? 'hidden' : 'visible' }}>
      <Confetti progress={burst} size={size} />
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Layer style={raysStyle}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(d => (
            <Rect key={d} x={93} y={14} width={14} height={30} rx={7} fill={RAY} transform={`rotate(${d} 100 100)`} />
          ))}
        </Layer>
        <Layer>
          <Circle cx={100} cy={100} r={54} fill={SUN} stroke={SUN_EDGE} strokeWidth={5} />
          <Ellipse cx={84} cy={78} rx={16} ry={9} fill="#FFFFFF" opacity={0.28} transform="rotate(-25 84 78)" />
          <Circle cx={70} cy={112} r={9} fill={CHEEK} opacity={0.55} />
          <Circle cx={130} cy={112} r={9} fill={CHEEK} opacity={0.55} />
        </Layer>
        <Animated.View style={[StyleSheet.absoluteFill, eyesStyle]}>
          <Layer style={[blinkStyle, { transformOrigin: '50% 47%' }]}>
            <Circle cx={82} cy={94} r={8} fill={INK} /><Circle cx={118} cy={94} r={8} fill={INK} />
            <Circle cx={85} cy={91} r={2.6} fill="#FFFFFF" /><Circle cx={121} cy={91} r={2.6} fill="#FFFFFF" />
          </Layer>
        </Animated.View>
        <Layer style={happyStyle}>
          <Path d="M73 97q9-11 18 0M109 97q9-11 18 0" stroke={INK} strokeWidth={5.5} fill="none" strokeLinecap="round" />
        </Layer>
        <Layer style={closedStyle}>
          <Path d="M73 95q9 6 18 0M109 95q9 6 18 0" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
        </Layer>
        <Layer style={smileStyle}><Path d="M86 113q14 13 28 0" stroke={INK} strokeWidth={5.5} fill="none" strokeLinecap="round" /></Layer>
        <Layer style={bigStyle}>
          <Path d="M82 110q18 26 36 0z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M91 122q9 6 18 0q-9-7-18 0z" fill="#F2786A" />
        </Layer>
        <Layer style={oStyle}><Ellipse cx={104} cy={117} rx={6} ry={7} fill={INK} /></Layer>
        <Layer style={calmStyle}><Path d="M90 115q10 6 20 0" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" /></Layer>
      </Animated.View>
      </View>
      {mood === 'rise' && <View style={{ position: 'absolute', left: -size * 0.1, right: -size * 0.1, top: size * 0.8 - 2, height: 4, borderRadius: 2, backgroundColor: '#0E9C86' }} />}
    </View>
  )
}

function Layer({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">{children}</Svg>
    </Animated.View>
  )
}

const BITS = [
  { a: -80, c: '#0E9C86' }, { a: -40, c: '#F5A24F' }, { a: -10, c: '#3866C9' }, { a: 25, c: '#E2763A' },
  { a: 60, c: '#7E4FAA' }, { a: -125, c: '#12856A' }, { a: -160, c: '#F2C14E' }, { a: 160, c: '#F27D61' },
]

function Confetti({ progress, size }: { progress: SharedValue<number>; size: number }) {
  return (
    <>
      {BITS.map((b, i) => <Bit key={i} angle={b.a} color={b.c} progress={progress} size={size} square={i % 2 === 0} />)}
    </>
  )
}

function Bit({ angle, color, progress, size, square }: { angle: number; color: string; progress: SharedValue<number>; size: number; square: boolean }) {
  const style = useAnimatedStyle(() => {
    const r = progress.value * size * 0.62
    const rad = (angle - 90) * Math.PI / 180
    return {
      opacity: progress.value === 0 ? 0 : 1 - progress.value * progress.value,
      transform: [
        { translateX: Math.cos(rad) * r },
        { translateY: Math.sin(rad) * r + progress.value * progress.value * size * 0.25 },
        { rotate: `${progress.value * 540}deg` },
      ],
    }
  })
  const d = size * 0.055
  return <Animated.View style={[{ position: 'absolute', left: size / 2 - d / 2, top: size / 2 - d / 2, width: d, height: square ? d : d * 0.5, borderRadius: square ? 2 : d, backgroundColor: color }, style]} />
}
