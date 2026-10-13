import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { FeatureCollection, Position } from 'geojson'

import { haptic } from '@/lib/haptics'

import type { GlobeSvg } from './GlobeSvg'
import landTopo from '../../../lib/geo/land-110m.json'

export type { GlobeCity, LngLat } from './GlobeSvg'

/**
 * The globe, drawn by Skia on the UI thread (Oct 2026: the SVG version
 * recomputed and re-rendered the whole map in JavaScript on every touch and
 * lagged on iPhone). Each point is kept as a unit vector; every frame a worklet
 * turns it, keeps the near side and pins the far side to the horizon, which is
 * the classic cheap orthographic globe. Dragging, the flick's momentum, the
 * idle spin and the fly-to all run on the UI thread. The web preview uses
 * Globe.web.tsx (the SVG globe), since Skia on the web needs its own loader.
 */
type Props = Parameters<typeof GlobeSvg>[0]

export function Globe(props: Props) {
  return <GlobeSkia {...props} />
}

const RAD = Math.PI / 180
const TILT = -18
// A point as [cos(lat)cos(lng), cos(lat)sin(lng), sin(lat)]: turning by λ is then two multiplies.
const vec = ([lng, lat]: Position): [number, number, number] => {
  const cl = Math.cos(lat * RAD)
  return [cl * Math.cos(lng * RAD), cl * Math.sin(lng * RAD), Math.sin(lat * RAD)]
}

// Land and the 15° grid, flattened once into rings of [a, b, z, a, b, z, ...].
const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>
const LAND_RINGS: number[][] = (() => {
  const land = feature(topo, topo.objects.land) as FeatureCollection
  const rings: number[][] = []
  for (const f of land.features) {
    const g = f.geometry
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
    for (const poly of polys) for (const ring of poly) rings.push(ring.flatMap(vec))
  }
  return rings
})()
const GRID_LINES: number[][] = (() => {
  const lines: number[][] = []
  for (let lng = -180; lng < 180; lng += 15) {
    const pts: number[] = []
    for (let lat = -80; lat <= 80; lat += 4) pts.push(...vec([lng, lat]))
    lines.push(pts)
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts: number[] = []
    for (let lng = -180; lng <= 180; lng += 4) pts.push(...vec([lng, lat]))
    lines.push(pts)
  }
  return lines
})()

function GlobeSkia({ size, focus, pins = [], cities, onCenter, onTap, colors }: Props) {
  const R = size / 2 - 2
  const c = size / 2
  // Rotation in degrees, as d3's rotate([λ, φ]): the globe faces longitude -λ, latitude -φ.
  const lam = useSharedValue(-20)
  const phi = useSharedValue(TILT)
  const touched = useSharedValue(false)
  const flying = useSharedValue(false)

  const cityVecs = useMemo(() => (cities ?? []).flatMap(x => vec([x.lng, x.lat])), [cities])
  const cityKeys = useMemo(() => (cities ?? []).map(x => x.key), [cities])
  const pinList = useMemo(() => [
    ...(focus ? [{ v: vec([focus.lng, focus.lat]), color: colors.pin, r: 7 }] : []),
    ...pins.map(p => ({ v: vec([p.lng, p.lat]), color: p.color, r: p.r ?? 5 })),
  ], [focus, pins, colors.pin])

  // Fly to the focus the shortest way round.
  useEffect(() => {
    if (!focus) return
    cancelAnimation(lam); cancelAnimation(phi)
    const target = -focus.lng
    const dl = ((target - lam.value + 540) % 360) - 180
    const ease = { duration: 1100, easing: Easing.out(Easing.cubic) }
    flying.value = true
    lam.value = withTiming(lam.value + dl, ease, () => { flying.value = false })
    phi.value = withTiming(Math.max(-60, Math.min(60, -focus.lat)), ease)
  }, [focus?.lng, focus?.lat]) // eslint-disable-line react-hooks/exhaustive-deps

  // A calm spin while nobody is touching it and it has nowhere to go.
  const idle = useSharedValue(!focus)
  useEffect(() => { idle.value = !focus }, [focus, idle])
  useFrameCallback(info => {
    if (!idle.value || touched.value || flying.value) return
    lam.value += (info.timeSincePreviousFrame ?? 16) * 0.008
  }, true)

  // One worklet turns a ring of unit vectors into screen points; the far side sits on the horizon.
  const draw = useDerivedValue(() => {
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    const land = Skia.Path.Make()
    const grid = Skia.Path.Make()
    const dots = Skia.Path.Make()
    const ring = (pts: number[], closed: boolean, out: typeof land) => {
      let shown = 0
      let started = false
      for (let i = 0; i < pts.length; i += 3) {
        const X = pts[i] * cl - pts[i + 1] * sl
        const Y = pts[i + 1] * cl + pts[i] * sl
        const Z = pts[i + 2]
        const x = X * cp - Z * sp
        const z = Z * cp + X * sp
        let sx = c + R * Y, sy = c - R * z
        if (x > 0) shown++
        else if (closed) {
          const n = Math.sqrt(Y * Y + z * z) || 1
          sx = c + (R * Y) / n; sy = c - (R * z) / n
        } else { started = false; continue }
        if (!started) { out.moveTo(sx, sy); started = true } else out.lineTo(sx, sy)
      }
      return shown
    }
    for (const r of LAND_RINGS) {
      const sub = Skia.Path.Make()
      if (ring(r, true, sub) > 0) { sub.close(); land.addPath(sub) }
    }
    for (const g of GRID_LINES) ring(g, false, grid)
    for (let i = 0; i < cityVecs.length; i += 3) {
      const X = cityVecs[i] * cl - cityVecs[i + 1] * sl
      const Y = cityVecs[i + 1] * cl + cityVecs[i] * sl
      const Z = cityVecs[i + 2]
      const x = X * cp - Z * sp
      if (x < 0.05) continue
      dots.addCircle(c + R * Y, c - R * (Z * cp + X * sp), 2.6)
    }
    return { land, grid, dots }
  })
  const land = useDerivedValue(() => draw.value.land)
  const grid = useDerivedValue(() => draw.value.grid)
  const dots = useDerivedValue(() => draw.value.dots)

  // The city nearest the middle, once someone has spun it (within about 20°).
  const nearest = useDerivedValue(() => {
    if (!touched.value || cityVecs.length === 0) return -1
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    let best = -1, top = 0.94
    for (let i = 0; i < cityVecs.length; i += 3) {
      const X = cityVecs[i] * cl - cityVecs[i + 1] * sl
      const x = X * cp - cityVecs[i + 2] * sp
      if (x > top) { top = x; best = i / 3 }
    }
    return best
  })
  const report = (i: number) => { haptic.select(); onCenter?.(cityKeys[i]) }
  useAnimatedReaction(() => nearest.value, (now, before) => {
    if (now >= 0 && now !== before) runOnJS(report)(now)
  }, [cityKeys, onCenter])
  const nearXY = useDerivedValue(() => {
    const i = nearest.value
    if (i < 0) return { x: -99, y: -99 }
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    const X = cityVecs[i * 3] * cl - cityVecs[i * 3 + 1] * sl
    const Y = cityVecs[i * 3 + 1] * cl + cityVecs[i * 3] * sl
    const Z = cityVecs[i * 3 + 2]
    return { x: c + R * Y, y: c - R * (Z * cp + X * sp) }
  })
  const nearX = useDerivedValue(() => nearXY.value.x)
  const nearY = useDerivedValue(() => nearXY.value.y)

  // Drag to spin, flick to keep it turning; a tap picks the nearest dot.
  const start = useSharedValue({ l: 0, p: 0 })
  const k = 180 / size
  const pickAt = (key: string) => onTap?.(key)
  const pan = Gesture.Pan()
    .minDistance(4)
    .onBegin(() => {
      cancelAnimation(lam); cancelAnimation(phi)
      flying.value = false; touched.value = true
      start.value = { l: lam.value, p: phi.value }
    })
    .onUpdate(e => {
      lam.value = start.value.l + e.translationX * k
      phi.value = Math.max(-70, Math.min(70, start.value.p - e.translationY * k))
    })
    .onEnd(e => {
      lam.value = withDecay({ velocity: e.velocityX * k, deceleration: 0.994 })
      phi.value = withDecay({ velocity: -e.velocityY * k, deceleration: 0.99, clamp: [-70, 70] })
    })
  const tap = Gesture.Tap().onEnd(e => {
    if (!onTap || cityVecs.length === 0) return
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    let best = -1, d = 26
    for (let i = 0; i < cityVecs.length; i += 3) {
      const X = cityVecs[i] * cl - cityVecs[i + 1] * sl
      const Y = cityVecs[i + 1] * cl + cityVecs[i] * sl
      const Z = cityVecs[i + 2]
      if (X * cp - Z * sp < 0.05) continue
      const dd = Math.hypot(c + R * Y - e.x, c - R * (Z * cp + X * sp) - e.y)
      if (dd < d) { d = dd; best = i / 3 }
    }
    if (best >= 0) runOnJS(pickAt)(cityKeys[best])
  })
  const gesture = cities ? Gesture.Race(pan, tap) : Gesture.Tap().enabled(false)

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width: size, height: size }}>
          <Circle cx={c} cy={c} r={R} color={colors.sea} />
          <Path path={grid} color={colors.line} style="stroke" strokeWidth={0.6} />
          <Path path={land} color={colors.land} />
          <Circle cx={c} cy={c} r={R} color={colors.edge} style="stroke" strokeWidth={1.5} />
          <Path path={dots} color={colors.dot ?? '#FFFFFF'} opacity={0.85} />
          <Circle cx={nearX} cy={nearY} r={5} color={colors.pin} />
          {pinList.map((p, i) => <Pin key={i} v={p.v} color={p.color} r={p.r} lam={lam} phi={phi} c={c} R={R} />)}
        </Canvas>
      </GestureDetector>
    </View>
  )
}

/** A pin that follows the globe and hides on the far side. */
function Pin({ v, color, r, lam, phi, c, R }: {
  v: [number, number, number]; color: string; r: number
  lam: { value: number }; phi: { value: number }; c: number; R: number
}) {
  const at = useDerivedValue(() => {
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    const X = v[0] * cl - v[1] * sl
    const Y = v[1] * cl + v[0] * sl
    const x = X * cp - v[2] * sp
    return { x: c + R * Y, y: c - R * (v[2] * cp + X * sp), shown: x > 0.02 ? 1 : 0 }
  })
  const cx = useDerivedValue(() => at.value.x)
  const cy = useDerivedValue(() => at.value.y)
  const op = useDerivedValue(() => at.value.shown)
  return (
    <Group opacity={op}>
      <Circle cx={cx} cy={cy} r={r + 5} color={color} opacity={0.25} />
      <Circle cx={cx} cy={cy} r={r + 2} color="#FFFFFF" />
      <Circle cx={cx} cy={cy} r={r} color={color} />
    </Group>
  )
}

/** Where a city is, from the website's city coordinates (lib/city-coords). */
export { CITY_COORDS } from '../../../lib/city-coords'
