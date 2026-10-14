import { useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Line, Rect } from 'react-native-svg'

import { freedomPath } from '@/engine'
import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { Freedom } from '@/state/freedom'
import { colors } from '@/theme/colors'

import { Text } from './Text'

const RANGES = [{ key: 5, label: '5Y' }, { key: 15, label: '15Y' }, { key: 0, label: 'All' }] as const
const HEIGHT = 168
const PAD_TOP = 26

/**
 * Home's freedom chart: invested money as one bar per year against the dashed
 * target (Oct 2026 QA: was a line; a bar a year makes each year's step
 * visible). Bars short of the target are paler; from the freedom year they
 * are full. Drag a finger along it to read any year, with a haptic tick as
 * each year passes; 5Y / 15Y / All below.
 */
/** `onDark` draws it in white and aqua for the teal hero card on Home. */
export function FreedomLineChart({ f, onDark }: { f: Freedom; onDark?: boolean }) {
  const c = onDark
    ? { line: '#62FAE3', target: 'rgba(255,255,255,0.55)', ring: '#06412F', scrub: '#FFFFFF', label: 'rgba(255,255,255,0.75)' }
    : { line: colors.teal, target: colors.ink, ring: colors.card, scrub: colors.tealDeep, label: colors.ink3 }
  const [range, setRange] = useState<number>(0)
  const [width, setWidth] = useState(0)
  const [scrub, setScrub] = useState<number | null>(null)
  const [tipW, setTipW] = useState(100)
  const lastIndex = useRef<number | null>(null)

  const series = useMemo(() => (f.series.length > 1
    ? f.series.map(s => ({ year: s.year, invested: s.invested }))
    : freedomPath({ monthlyIncome: f.monthlyIncome, monthlySpending: f.monthlySpending, invested: f.invested }).map((v, i) => ({ year: i, invested: v }))), [f])
  const end = range > 0 ? range : Math.min(40, Math.max(5, Math.ceil((f.years ?? 30) + 3)))
  const pts = series.filter(s => s.year <= end)
  const top = Math.max(...pts.map(s => s.invested), 1)
  const peak = range > 0 && f.target > top * 1.15 ? top * 1.15 : Math.max(top, f.target) * 1.04
  const thisYear = new Date().getFullYear()

  const slot = width / Math.max(pts.length, 1)
  const barW = Math.max(2, Math.min(18, slot * 0.68))
  const x = (i: number) => slot * (i + 0.5)
  const y = (v: number) => PAD_TOP + (1 - v / peak) * (HEIGHT - PAD_TOP - 4)
  const targetY = f.target <= peak ? y(f.target) : null
  const freeAt = pts.findIndex(p => p.invested >= f.target)

  // Dragging: the nearest year to the finger, a tick each time it changes.
  const indexAt = (px: number) => Math.max(0, Math.min(pts.length - 1, Math.floor(px / Math.max(slot, 1))))
  const move = (px: number) => {
    const i = indexAt(px)
    if (i !== lastIndex.current) { lastIndex.current = i; haptic.select() }
    setScrub(i)
  }
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => move(e.nativeEvent.locationX),
    onPanResponderMove: e => move(e.nativeEvent.locationX),
    onPanResponderRelease: () => { setScrub(null); lastIndex.current = null },
    onPanResponderTerminate: () => { setScrub(null); lastIndex.current = null },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [width, pts.length, slot])

  const s = scrub != null ? pts[scrub] : null
  // The label is as wide as its text ($71,028 needs more room than $485K), kept inside the chart.
  const tipLeft = s ? Math.max(0, Math.min(width - tipW, x(scrub!) - tipW / 2)) : 0

  return (
    <View>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }} {...responder.panHandlers}
        accessible accessibilityLabel={`Invested money over ${end} years, reaching ${compactMoney(f.target)}. Drag to read a year.`}>
        {width > 0 && pts.length > 1 && (
          <Svg width={width} height={HEIGHT}>
            {pts.map((p, i) => {
              const top = Math.min(y(p.invested), HEIGHT - 2)
              const free = freeAt >= 0 && i >= freeAt
              return <Rect key={p.year} x={x(i) - barW / 2} y={top} width={barW} height={HEIGHT - top} rx={Math.min(3, barW / 2)}
                fill={scrub === i ? c.scrub : c.line} opacity={scrub === i || free ? 1 : 0.45} />
            })}
            {targetY != null && <Line x1={0} x2={width} y1={targetY} y2={targetY} stroke={c.target} strokeDasharray="4 4" strokeWidth={1} />}
            {/* The first bar to reach the target: the freedom year. */}
            {freeAt >= 0 && !s && <Circle cx={x(freeAt)} cy={y(pts[freeAt].invested) - 7} r={4} fill={c.line} stroke={c.ring} strokeWidth={2} />}
          </Svg>
        )}
        {s && (
          <View pointerEvents="none" onLayout={e => setTipW(e.nativeEvent.layout.width)}
            className="absolute top-0 h-[22px] justify-center rounded-lg bg-ink px-2.5" style={{ left: tipLeft }}>
            <Text numberOfLines={1} className="font-mono text-[11px] text-ground">{thisYear + s.year} · {compactMoney(s.invested)}</Text>
          </View>
        )}
        {!s && targetY != null && (
          <Text pointerEvents="none" className="font-mono text-[10px]" style={{ color: c.label, position: 'absolute', left: 0, top: Math.max(0, targetY - 16) }}>Target {compactMoney(f.target)}</Text>
        )}
      </View>
      <View className="mt-3 flex-row justify-center gap-2">
        {RANGES.map(r => (
          <Pressable key={r.key} accessibilityRole="button" accessibilityState={{ selected: range === r.key }} hitSlop={6}
            onPress={() => { haptic.select(); setRange(r.key) }}
            className={onDark ? 'rounded-full px-3.5 py-1' : `rounded-full px-3.5 py-1 ${range === r.key ? 'bg-ink' : 'bg-surface'}`}
            style={onDark ? { backgroundColor: range === r.key ? '#FFFFFF' : 'rgba(255,255,255,0.14)' } : undefined}>
            <Text style={onDark ? { color: range === r.key ? '#06412F' : '#FFFFFF' } : undefined} className={`font-mono text-[12px] font-semibold ${onDark ? '' : range === r.key ? 'text-ground' : 'text-ink-2'}`}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
