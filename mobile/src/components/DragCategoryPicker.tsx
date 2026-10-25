import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions, View, type ViewInstance } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { SUB_CATEGORIES } from '@/engine'
import { haptic } from '@/lib/haptics'
import { expenseCategories } from '@/lib/money-data'
import { colors } from '@/theme/colors'

export type DragTarget = { category: string; sub: string | null }
export type DragPickerHandle = { move: (x: number, y: number) => void; end: () => DragTarget | null }

const PAD = 16, ROW = 82, TOP = 96, SUB_ROW = 44, HOLD_MS = 450

/**
 * Hold a category pill and drag (Oct 2026 QA): the categories fan out as a
 * grid on a solid backdrop; resting on one opens its kinds in a popover right
 * against that cell, like the iOS keyboard's accent picker, so the finger
 * only moves a row; letting go picks whatever is under the finger, and
 * letting go anywhere else changes nothing.
 * The tap-to-open sheet stays the main way; this is the quick one.
 */
export const DragCategoryPicker = forwardRef<DragPickerHandle, { open: boolean }>(function DragCategoryPicker({ open }, ref) {
  const { width, height } = useWindowDimensions()
  const cats = useMemo(() => expenseCategories(), [])
  const box = useRef<ViewInstance>(null)
  const origin = useRef({ x: 0, y: 0 })
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const [kinds, setKinds] = useState<string | null>(null)
  const cell = (width - PAD * 2) / 4
  const gridBottom = TOP + Math.ceil(cats.length / 4) * ROW
  const subs = kinds ? SUB_CATEGORIES[kinds] ?? [] : []
  // The kinds popover sits just below its cell, or just above when there isn't room.
  const pop = (() => {
    const i = kinds ? cats.findIndex(c => c.key === kinds) : -1
    if (i < 0 || subs.length === 0) return null
    const w = Math.max(cell * 1.6, 170), h = subs.length * SUB_ROW + 8
    const cellX = PAD + (i % 4) * cell, cellY = TOP + Math.floor(i / 4) * ROW
    const below = cellY + ROW - 6
    const top = below + h < height - origin.current.y - 24 ? below : Math.max(8, cellY - h + 6)
    return { x: Math.min(Math.max(PAD, cellX + cell / 2 - w / 2), width - PAD - w), y: top, w, h }
  })()

  // What's under the finger: one of the open kinds first, then a category cell.
  let target: DragTarget | null = null
  if (at) {
    const col = Math.floor((at.x - PAD) / cell), row = Math.floor((at.y - TOP) / ROW)
    if (pop && kinds && at.x >= pop.x && at.x <= pop.x + pop.w && at.y >= pop.y && at.y <= pop.y + pop.h) {
      const sub = subs[Math.min(subs.length - 1, Math.max(0, Math.floor((at.y - pop.y - 4) / SUB_ROW)))]
      target = { category: kinds, sub }
    } else if (at.y >= TOP && at.y < gridBottom && col >= 0 && col < 4 && cats[row * 4 + col]) target = { category: cats[row * 4 + col].key, sub: null }
  }
  const key = target ? `${target.category}/${target.sub ?? ''}` : ''
  const latest = useRef(target)
  latest.current = target

  useEffect(() => { if (key) haptic.tick() }, [key])
  // Resting on a category with kinds opens them.
  const resting = target && !target.sub && SUB_CATEGORIES[target.category]?.length ? target.category : null
  useEffect(() => {
    if (!resting || resting === kinds) return
    const id = setTimeout(() => { haptic.select(); setKinds(resting) }, HOLD_MS)
    return () => clearTimeout(id)
  }, [resting, kinds])
  useEffect(() => { if (!open) { setAt(null); setKinds(null) } }, [open])

  useImperativeHandle(ref, () => ({
    move: (x, y) => setAt({ x: x - origin.current.x, y: y - origin.current.y }),
    end: () => latest.current,
  }), [])

  // Always mounted (empty when closed) so its place on screen is known before the first drag.
  return (
    <View ref={box} pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={() => box.current?.measureInWindow((x, y) => { origin.current = { x, y } })}>
    {open && <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.ground }]}>
      <Text className="px-4 text-center text-[15px] font-bold text-ink" style={{ marginTop: TOP - 36 }}>Drag to a category, let go to pick</Text>
      <View className="flex-row flex-wrap" style={{ paddingHorizontal: PAD }}>
        {cats.map(c => {
          const on = target?.category === c.key || kinds === c.key
          return (
            <View key={c.key} style={{ width: cell, height: ROW }} className="p-1">
              <View className="flex-1 items-center justify-center gap-1 rounded-2xl border-2 bg-card" style={{ borderColor: on ? colors.green : colors.border, transform: [{ scale: target?.category === c.key && !target.sub ? 1.08 : 1 }] }}>
                <CategoryGlyph cat={c} size={24} />
                <Text numberOfLines={1} className="text-[11px] font-bold text-ink">{c.label}</Text>
              </View>
            </View>
          )
        })}
      </View>
      {pop && (
        <Animated.View entering={FadeIn.duration(120)} className="rounded-2xl border border-border-2 bg-card p-1"
          style={{ position: 'absolute', left: pop.x, top: pop.y, width: pop.w, shadowColor: '#78501E', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
          {subs.map(sc => {
            const on = target?.sub === sc
            return (
              <View key={sc} style={{ height: SUB_ROW, backgroundColor: on ? colors.green : 'transparent' }} className="justify-center rounded-xl px-3">
                <Text numberOfLines={1} className={`text-[15px] font-bold ${on ? 'text-white' : 'text-ink'}`}>{sc}</Text>
              </View>
            )
          })}
        </Animated.View>
      )}
    </Animated.View>}
    </View>
  )
})
