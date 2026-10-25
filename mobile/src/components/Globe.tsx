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
 * turns it and keeps the near side. Land is clipped where it crosses the
 * horizon and the hidden stretch follows the rim as an arc (Oct 2026: joining
 * far points with straight lines cut chords across the globe). Dragging, the flick's momentum, the
 * idle spin and the fly-to all run on the UI thread. The web preview uses
 * Globe.web.tsx (the SVG globe), since Skia on the web needs its own loader.
 */
// `frame` widens the canvas past the globe, so a zoomed globe fills it rather than a square (Oct 2026 QA).
type Props = Parameters<typeof GlobeSvg>[0] & { frame?: { w: number; h: number } }

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

function GlobeSkia({ size, frame, focus, pins = [], cities, onCenter, onTap, colors }: Props) {
  const R0 = size / 2 - 2
  const W = frame?.w ?? size, H = frame?.h ?? size
  const cx = W / 2, cy = H / 2
  // Pinch to zoom (Oct 2026 QA: close cities were hard to tap); the canvas crops the rest.
  const zoom = useSharedValue(1)
  const pinchFrom = useSharedValue(1)
  const rz = useDerivedValue(() => R0 * zoom.value)
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

  // One worklet turns rings of unit vectors into screen points, clipped at the horizon.
  const draw = useDerivedValue(() => {
    const R = R0 * zoom.value
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    // Skia 2.14 paths are read-only; builders collect the points, then detach() a path.
    const land = Skia.PathBuilder.Make()
    const grid = Skia.PathBuilder.Make()
    const dots = Skia.PathBuilder.Make()
    const rim = Skia.XYWHRect(cx - R, cy - R, 2 * R, 2 * R)
    // Point i of a ring as [depth, across, up]; depth > 0 is the near side.
    const at = (pts: number[], i: number) => {
      const X = pts[i] * cl - pts[i + 1] * sl
      const Y = pts[i + 1] * cl + pts[i] * sl
      const Z = pts[i + 2]
      return [X * cp - Z * sp, Y, Z * cp + X * sp]
    }
    // Screen angle (Skia degrees, clockwise from +x) of a direction on the rim.
    const angle = (Y: number, z: number) => Math.atan2(-z, Y) / RAD
    const turn = (d: number) => ((d + 540) % 360) - 180
    const line = (pts: number[], out: typeof land) => {
      let started = false
      for (let i = 0; i < pts.length; i += 3) {
        const [x, Y, z] = at(pts, i)
        if (x <= 0) { started = false; continue }
        if (!started) { out.moveTo(cx + R * Y, cy - R * z); started = true } else out.lineTo(cx + R * Y, cy - R * z)
      }
    }
    // A closed ring (first point repeated last), started from a visible point.
    // Leaving the near side it goes to the exact crossing; the hidden stretch
    // becomes an arc along the rim. Pass 1 measures each stretch's sweep and how
    // often the ring winds round the view axis: winding the counter-clockwise way
    // means it circles the far pole, not the middle, so one full turn comes off
    // its widest stretch (Oct 2026 QA: Eurasia filled the whole disc for a frame
    // whenever the far side of the globe sat inside it).
    const sweeps: number[] = []
    const area = (pts: number[], out: typeof land) => {
      const m = pts.length / 3 - 1
      let k = -1
      for (let j = 0; j < m; j++) if (at(pts, j * 3)[0] > 0) { k = j; break }
      if (k < 0) return false
      sweeps.length = 0
      let [px, pY, pz] = at(pts, k * 3)
      let pa = angle(pY, pz), total = 0, sweep = 0
      for (let j = 1; j <= m; j++) {
        const [x, Y, z] = at(pts, ((k + j) % m) * 3)
        const a = angle(Y, z)
        total += turn(a - pa)
        if (x > 0 !== px > 0) {
          const t = px / (px - x)
          const cut = angle(pY + t * (Y - pY), pz + t * (z - pz))
          if (px > 0) sweep = turn(a - cut); else sweeps.push(sweep + turn(cut - pa))
        } else if (x <= 0) sweep += turn(a - pa)
        px = x; pY = Y; pz = z; pa = a
      }
      const W = Math.round(total / 360)
      if (W < 0 && sweeps.length > 0) {
        let b = 0
        for (let i = 1; i < sweeps.length; i++) if (Math.abs(sweeps[i]) > Math.abs(sweeps[b])) b = i
        sweeps[b] -= 360 * W
      }
      // Pass 2: draw it.
      ;[px, pY, pz] = at(pts, k * 3)
      out.moveTo(cx + R * pY, cy - R * pz)
      let from = 0, n = 0
      for (let j = 1; j <= m; j++) {
        const [x, Y, z] = at(pts, ((k + j) % m) * 3)
        if (x > 0 !== px > 0) {
          const t = px / (px - x)
          const cut = angle(pY + t * (Y - pY), pz + t * (z - pz))
          if (px > 0) { out.arcToOval(rim, cut, 0, false); from = cut } else out.arcToOval(rim, from, sweeps[n++], false)
        }
        if (x > 0) out.lineTo(cx + R * Y, cy - R * z)
        px = x; pY = Y; pz = z
      }
      out.close()
      return true
    }
    for (const r of LAND_RINGS) {
      const sub = Skia.PathBuilder.Make()
      if (area(r, sub)) land.addPath(sub.detach())
    }
    for (const g of GRID_LINES) line(g, grid)
    for (let i = 0; i < cityVecs.length; i += 3) {
      const X = cityVecs[i] * cl - cityVecs[i + 1] * sl
      const Y = cityVecs[i + 1] * cl + cityVecs[i] * sl
      const Z = cityVecs[i + 2]
      const x = X * cp - Z * sp
      // Hidden near the rim too, where dots would bunch into a line.
      if (x < 0.2) continue
      dots.addCircle(cx + R * Y, cy - R * (Z * cp + X * sp), 2.6 + Math.min(3, (zoom.value - 1) * 0.25))
    }
    return { land: land.detach(), grid: grid.detach(), dots: dots.detach() }
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
    const R = R0 * zoom.value
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    const X = cityVecs[i * 3] * cl - cityVecs[i * 3 + 1] * sl
    const Y = cityVecs[i * 3 + 1] * cl + cityVecs[i * 3] * sl
    const Z = cityVecs[i * 3 + 2]
    return { x: cx + R * Y, y: cy - R * (Z * cp + X * sp) }
  })
  const nearX = useDerivedValue(() => nearXY.value.x)
  const nearY = useDerivedValue(() => nearXY.value.y)

  // Drag to spin, flick to keep it turning; a tap picks the nearest dot.
  const start = useSharedValue({ l: 0, p: 0 })
  const k = 180 / size // degrees per point at 1×; divided by the zoom while dragging
  const pickAt = (key: string) => onTap?.(key)
  const pan = Gesture.Pan()
    .minDistance(4)
    .onBegin(() => {
      cancelAnimation(lam); cancelAnimation(phi)
      flying.value = false; touched.value = true
      start.value = { l: lam.value, p: phi.value }
    })
    .onUpdate(e => {
      lam.value = start.value.l + e.translationX * k / zoom.value
      phi.value = Math.max(-70, Math.min(70, start.value.p - e.translationY * k / zoom.value))
    })
    .onEnd(e => {
      lam.value = withDecay({ velocity: e.velocityX * k / zoom.value, deceleration: 0.994 })
      phi.value = withDecay({ velocity: -e.velocityY * k / zoom.value, deceleration: 0.99, clamp: [-70, 70] })
    })
  const pinch = Gesture.Pinch()
    .onBegin(() => { pinchFrom.value = zoom.value; touched.value = true })
    .onUpdate(e => { zoom.value = Math.max(1, Math.min(16, pinchFrom.value * e.scale)) })
  const tap = Gesture.Tap().onEnd(e => {
    if (!onTap || cityVecs.length === 0) return
    const R = R0 * zoom.value
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    let best = -1, d = 26
    for (let i = 0; i < cityVecs.length; i += 3) {
      const X = cityVecs[i] * cl - cityVecs[i + 1] * sl
      const Y = cityVecs[i + 1] * cl + cityVecs[i] * sl
      const Z = cityVecs[i + 2]
      if (X * cp - Z * sp < 0.2) continue
      const dd = Math.hypot(cx + R * Y - e.x, cy - R * (Z * cp + X * sp) - e.y)
      if (dd < d) { d = dd; best = i / 3 }
    }
    if (best >= 0) runOnJS(pickAt)(cityKeys[best])
  })
  const gesture = cities ? Gesture.Simultaneous(pinch, Gesture.Race(pan, tap)) : Gesture.Tap().enabled(false)

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width: W, height: H }}>
          <Circle cx={cx} cy={cy} r={rz} color={colors.sea} />
          <Path path={grid} color={colors.line} style="stroke" strokeWidth={0.6} />
          <Path path={land} color={colors.land} />
          <Circle cx={cx} cy={cy} r={rz} color={colors.edge} style="stroke" strokeWidth={1.5} />
          <Path path={dots} color={colors.dot ?? '#FFFFFF'} opacity={0.85} />
          <Circle cx={nearX} cy={nearY} r={5} color={colors.pin} />
          {pinList.map((p, i) => <Pin key={i} v={p.v} color={p.color} r={p.r} lam={lam} phi={phi} cx={cx} cy={cy} R0={R0} zoom={zoom} />)}
        </Canvas>
      </GestureDetector>
    </View>
  )
}

/** A pin that follows the globe and hides on the far side. */
function Pin({ v, color, r, lam, phi, cx, cy, R0, zoom }: {
  v: [number, number, number]; color: string; r: number
  lam: { value: number }; phi: { value: number }; cx: number; cy: number; R0: number; zoom: { value: number }
}) {
  const at = useDerivedValue(() => {
    const R = R0 * zoom.value
    const cl = Math.cos(lam.value * RAD), sl = Math.sin(lam.value * RAD)
    const cp = Math.cos(phi.value * RAD), sp = Math.sin(phi.value * RAD)
    const X = v[0] * cl - v[1] * sl
    const Y = v[1] * cl + v[0] * sl
    const x = X * cp - v[2] * sp
    return { x: cx + R * Y, y: cy - R * (v[2] * cp + X * sp), shown: x > 0.02 ? 1 : 0 }
  })
  const px = useDerivedValue(() => at.value.x)
  const py = useDerivedValue(() => at.value.y)
  const op = useDerivedValue(() => at.value.shown)
  return (
    <Group opacity={op}>
      <Circle cx={px} cy={py} r={r + 5} color={color} opacity={0.25} />
      <Circle cx={px} cy={py} r={r + 2} color="#FFFFFF" />
      <Circle cx={px} cy={py} r={r} color={color} />
    </Group>
  )
}

/** Where a city is, from the website's city coordinates (lib/city-coords). */
export { CITY_COORDS } from '../../../lib/city-coords'
