import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, View } from 'react-native'
import Svg, { Circle, G, Path } from 'react-native-svg'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'

import { haptic } from '@/lib/haptics'

import landTopo from '../../../lib/geo/land-110m.json'

// The website's globe (app/components/landing/WorldGlobe.tsx): d3-geo's
// orthographic projection over real land geometry, drawn here with SVG.
const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>
const LAND = feature(topo, topo.objects.land) as FeatureCollection
const GRATICULE = geoGraticule10()

export type LngLat = { lng: number; lat: number }
export type GlobeCity = LngLat & { key: string }
const TILT = -18

/**
 * A globe that turns slowly on its own and, given a place, flies there and
 * stops with a pin on it. With `cities` it becomes a picker: drag to spin it,
 * tap a dot to choose that city, and `onCenter` reports the city nearest the
 * middle as you spin. Used behind "Where do you live?" and the abroad reveal.
 */
export function GlobeSvg({ size, focus, pins = [], cities, onCenter, onTap, colors }: {
  size: number
  focus?: LngLat | null
  pins?: (LngLat & { color: string; r?: number })[]
  cities?: GlobeCity[]
  onCenter?: (key: string) => void
  onTap?: (key: string) => void
  colors: { sea: string; land: string; line: string; edge: string; pin: string; dot?: string }
}) {
  // Rotation is [lambda, phi]: the globe faces longitude -lambda, latitude -phi.
  const [rot, setRot] = useState<[number, number]>([-20, TILT])
  const rotRef = useRef(rot)
  rotRef.current = rot
  const [touched, setTouched] = useState(false)

  // Fly to the focus: ease the shortest way round over about a second.
  useEffect(() => {
    if (!focus) return
    const from = rotRef.current
    const target: [number, number] = [-focus.lng, Math.max(-60, Math.min(60, -focus.lat))]
    const dl = ((target[0] - from[0] + 540) % 360) - 180
    const dp = target[1] - from[1]
    const start = Date.now()
    const ms = 1100
    let raf = 0
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / ms)
      const e = 1 - Math.pow(1 - t, 3)
      setRot([from[0] + dl * e, from[1] + dp * e])
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [focus?.lng, focus?.lat]) // eslint-disable-line react-hooks/exhaustive-deps

  // With nowhere to go and nobody touching it, a calm spin, frame by frame.
  useEffect(() => {
    if (focus || touched) return
    let raf = 0, last = 0
    const step = (now: number) => {
      if (last) setRot(([l, p]) => [l + (now - last) * 0.008, p])
      last = now
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [focus, touched])

  // Dragging: touches arrive faster than frames, so keep only the latest and
  // draw once per frame. Letting go keeps it turning and slows it down
  // (momentum), so a flick spins it like a real globe.
  const pending = useRef<[number, number] | null>(null)
  const frame = useRef(0)
  const drawSoon = (next: [number, number]) => {
    pending.current = next
    if (frame.current) return
    frame.current = requestAnimationFrame(() => { frame.current = 0; if (pending.current) setRot(pending.current) })
  }
  const coast = useRef(0)
  const stopCoast = () => { cancelAnimationFrame(coast.current); coast.current = 0 }
  const startCoast = (vx: number, vy: number) => {
    const k = 180 / size
    let v: [number, number] = [vx * k * 16, -vy * k * 16] // degrees per frame
    const step = () => {
      v = [v[0] * 0.94, v[1] * 0.9]
      if (Math.abs(v[0]) < 0.05 && Math.abs(v[1]) < 0.05) { coast.current = 0; return }
      const [l, p] = rotRef.current
      const next: [number, number] = [l + v[0], Math.max(-70, Math.min(70, p + v[1]))]
      rotRef.current = next
      setRot(next)
      coast.current = requestAnimationFrame(step)
    }
    coast.current = requestAnimationFrame(step)
  }
  useEffect(() => () => { stopCoast(); cancelAnimationFrame(frame.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const projection = useMemo(() => geoOrthographic().scale(size / 2 - 2).translate([size / 2, size / 2]).rotate(rot).clipAngle(90), [rot, size])
  const center: [number, number] = [-rot[0], -rot[1]]

  // Cities on the side facing you, with where they land on screen.
  const visible = useMemo(() => (cities ?? [])
    .filter(c => geoDistance([c.lng, c.lat], center) < Math.PI / 2 - 0.05)
    .map(c => { const xy = projection([c.lng, c.lat]); return xy ? { key: c.key, x: xy[0], y: xy[1] } : null })
    .filter((c): c is { key: string; x: number; y: number } => !!c),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [cities, projection])

  // The city nearest the middle, reported once someone has spun the globe.
  const nearest = useMemo(() => {
    if (!cities?.length || !touched) return null
    let best: GlobeCity | null = null, d = Infinity
    for (const c of cities) { const k = geoDistance([c.lng, c.lat], center); if (k < d) { d = k; best = c } }
    return best && d < 0.35 ? best.key : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, rot, touched])
  const lastCenter = useRef<string | null>(null)
  useEffect(() => {
    if (nearest && nearest !== lastCenter.current) { lastCenter.current = nearest; haptic.select(); onCenter?.(nearest) }
  }, [nearest]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drag to spin; a tap that barely moves picks the nearest dot.
  const grab = useRef<{ rot: [number, number]; moved: number }>({ rot: [0, 0], moved: 0 })
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !!cities,
    onMoveShouldSetPanResponder: () => !!cities,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { stopCoast(); setTouched(true); grab.current = { rot: rotRef.current, moved: 0 } },
    onPanResponderMove: (_e, g) => {
      grab.current.moved = Math.max(grab.current.moved, Math.abs(g.dx) + Math.abs(g.dy))
      const k = 180 / size
      const next: [number, number] = [grab.current.rot[0] + g.dx * k, Math.max(-70, Math.min(70, grab.current.rot[1] - g.dy * k))]
      rotRef.current = next
      drawSoon(next)
    },
    onPanResponderRelease: (e, g) => {
      if (grab.current.moved > 6) { startCoast(g.vx, g.vy); return }
      if (!onTap) return
      const { locationX: x, locationY: y } = e.nativeEvent
      let best: string | null = null, d = 26
      for (const c of visibleRef.current) { const k = Math.hypot(c.x - x, c.y - y); if (k < d) { d = k; best = c.key } }
      if (best) onTap(best)
    },
  }), [cities, size, onTap])

  const { land, grid, dots } = useMemo(() => {
    const path = geoPath(projection).digits(0)
    const all = [...(focus ? [{ ...focus, color: colors.pin, r: 7 }] : []), ...pins]
    return {
      land: path(LAND) ?? '',
      grid: path(GRATICULE) ?? '',
      // A pin only shows on the side of the globe facing you.
      dots: all.map(p => {
        const shown = path({ type: 'Point', coordinates: [p.lng, p.lat] })
        const xy = projection([p.lng, p.lat])
        return shown && xy ? { x: xy[0], y: xy[1], color: p.color, r: p.r ?? 5 } : null
      }).filter((d): d is { x: number; y: number; color: string; r: number } => !!d),
    }
  }, [projection, focus, pins, colors.pin])

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...responder.panHandlers}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={colors.sea} stroke={colors.edge} strokeWidth={1.5} />
        <Path d={grid} stroke={colors.line} strokeWidth={0.6} fill="none" />
        <Path d={land} fill={colors.land} />
        {visible.map(c => (
          <Circle key={c.key} cx={c.x} cy={c.y} r={c.key === nearest ? 5 : 2.6} fill={c.key === nearest ? colors.pin : colors.dot ?? '#FFFFFF'} opacity={c.key === nearest ? 1 : 0.85} />
        ))}
        <G>
          {dots.map((d, i) => (
            <G key={i}>
              <Circle cx={d.x} cy={d.y} r={d.r + 5} fill={d.color} opacity={0.25} />
              <Circle cx={d.x} cy={d.y} r={d.r} fill={d.color} stroke="#FFFFFF" strokeWidth={2} />
            </G>
          ))}
        </G>
      </Svg>
    </View>
  )
}



