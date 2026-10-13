import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { SUB_CATEGORIES } from '@/engine'
import { haptic } from '@/lib/haptics'
import { expenseCategories } from '@/lib/money-data'
import { colors } from '@/theme/colors'

export type DragTarget = { category: string; sub: string | null }
export type DragPickerHandle = { move: (x: number, y: number) => void; end: () => DragTarget | null }

const PAD = 16, ROW = 82, TOP = 96, SUB_ROW = 46, HOLD_MS = 450

/**
 * Hold a category pill and drag (Oct 2026 QA): the categories fan out as a
 * grid; resting on one for a moment opens its kinds below; letting go picks
 * whatever is under the finger, and letting go anywhere else changes nothing.
 * The tap-to-open sheet stays the main way; this is the quick one.
 */
export const DragCategoryPicker = forwardRef<DragPickerHandle, { open: boolean }>(function DragCategoryPicker({ open }, ref) {
  const { width } = useWindowDimensions()
  const cats = useMemo(() => expenseCategories(), [])
  const box = useRef<View>(null)
  const origin = useRef({ x: 0, y: 0 })
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const [kinds, setKinds] = useState<string | null>(null)
  const cell = (width - PAD * 2) / 4
  const gridBottom = TOP + Math.ceil(cats.length / 4) * ROW
  const subTop = gridBottom + 34
  const subs = kinds ? SUB_CATEGORIES[kinds] ?? [] : []

  // What's under the finger: a category cell, or one of the open category's kinds (two columns).
  let target: DragTarget | null = null
  if (at) {
    const col = Math.floor((at.x - PAD) / cell), row = Math.floor((at.y - TOP) / ROW)
    if (at.y >= TOP && at.y < gridBottom && col >= 0 && col < 4 && cats[row * 4 + col]) target = { category: cats[row * 4 + col].key, sub: null }
    else if (kinds && at.y >= subTop) {
      const i = Math.floor((at.y - subTop) / SUB_ROW) * 2 + (at.x > width / 2 ? 1 : 0)
      if (subs[i]) target = { category: kinds, sub: subs[i] }
    }
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
    {open && <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,14,8,0.6)' }]}>
      <Text className="px-4 text-center text-[15px] font-bold text-white" style={{ marginTop: TOP - 36 }}>Drag to a category, let go to pick</Text>
      <View className="flex-row flex-wrap" style={{ paddingHorizontal: PAD }}>
        {cats.map(c => {
          const on = target?.category === c.key || kinds === c.key
          return (
            <View key={c.key} style={{ width: cell, height: ROW }} className="p-1">
              <View className="flex-1 items-center justify-center gap-1 rounded-2xl" style={{ backgroundColor: on ? colors.card : 'rgba(255,255,255,0.1)', transform: [{ scale: target?.category === c.key && !target.sub ? 1.08 : 1 }] }}>
                <CategoryGlyph cat={c} size={24} />
                <Text numberOfLines={1} className={`text-[11px] font-bold ${on ? 'text-ink' : 'text-white'}`}>{c.label}</Text>
              </View>
            </View>
          )
        })}
      </View>
      {kinds && subs.length > 0 && (
        <Animated.View entering={FadeIn.duration(150)} style={{ position: 'absolute', top: subTop - 26, left: PAD, right: PAD }}>
          <Text className="mb-1 text-[12px] font-extrabold uppercase tracking-[1.5px] text-white/70">Kind of {cats.find(c => c.key === kinds)?.label}</Text>
          <View className="flex-row flex-wrap">
            {subs.map(sc => {
              const on = target?.sub === sc
              return (
                <View key={sc} style={{ width: '50%', height: SUB_ROW }} className="p-1">
                  <View className="flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: on ? colors.green : 'rgba(255,255,255,0.14)' }}>
                    <Text numberOfLines={1} className="text-[14px] font-bold text-white">{sc}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </Animated.View>
      )}
    </Animated.View>}
    </View>
  )
})
