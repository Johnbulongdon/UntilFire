import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Modal, Platform, useWindowDimensions, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { Button } from './Button'
import { Sunny, type Mood } from './Sunny'
import { Text } from './Text'
import { ThemeScope } from './ThemeScope'
import { measureAnchor, type Rect, type TourAnchor } from './tour-anchors'

const KEY = 'tour-seen'
const PAD = 8

// Home's first-visit tour (Oct 2026): Sunny points at the real parts of the
// screen, one at a time. 'tabs' is the system tab bar, measured from the edge.
const STOPS: { at: TourAnchor | 'tabs'; mood: Mood; title: string; body: string }[] = [
  { at: 'hero', mood: 'hello', title: 'Your freedom date', body: 'The month work becomes optional. Tap it any time to see how it\'s worked out.' },
  { at: 'actions', mood: 'think', title: 'Four quick moves', body: 'Add a spend, review what came in, invest, or try a what-if.' },
  { at: 'today', mood: 'done', title: 'Today, one minute a day', body: 'A short list from your money. Clear it and your plan stays true. Days are counted, never streaked.' },
  { at: 'tabs', mood: 'win', title: 'Money, Plan, Profile', body: 'Money is what you have now, Plan is where you\'re heading, Profile is you. Same account as untilfire.com.' },
]

/** A short first-run tour on Home, shown once; Profile can show it again. */
export const replayTour = () => AsyncStorage.removeItem(KEY).catch(() => {})

export function GuidedTour({ force, onClose }: { force?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(!!force)
  // Only over the screen that asked for it, so landing elsewhere first doesn't show it.
  const [focused, setFocused] = useState(false)
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false) }, []))
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  // Checked each time Home comes into view, so Profile's "Show the tour" can bring you back here for it.
  useEffect(() => {
    if (force || !focused) return
    AsyncStorage.getItem(KEY).then(v => { if (!v) setOpen(true) }).catch(() => {})
  }, [force, focused])

  // Find the part this stop is about; a stop whose part isn't on screen just shows its card.
  const stop = STOPS[i]
  useEffect(() => {
    if (!open || !focused) return
    let live = true
    if (stop.at === 'tabs') {
      const bar = Platform.OS === 'ios' ? 62 : 56
      setRect({ x: 12, y: height - insets.bottom - bar, width: width - 24, height: bar })
    } else {
      setRect(null)
      measureAnchor(stop.at).then(r => { if (live) setRect(r) })
    }
    return () => { live = false }
  }, [i, open, focused, stop.at, width, height, insets.bottom])

  const close = () => {
    setOpen(false); setI(0)
    AsyncStorage.setItem(KEY, '1').catch(() => {})
    onClose?.()
  }
  const last = i === STOPS.length - 1
  const hole = rect && { x: rect.x - PAD, y: rect.y - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 }
  // The card goes on whichever side of the highlighted part has more room.
  const below = !hole || hole.y + hole.h / 2 < height / 2
  const dim = 'rgba(0,0,0,0.55)'

  return (
    <Modal visible={open && focused} transparent animationType="fade" onRequestClose={close}>
      <ThemeScope>
        <View style={{ flex: 1 }}>
          {hole ? (
            <>
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, hole.y), backgroundColor: dim }} />
              <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: dim }} />
              <View style={{ position: 'absolute', left: 0, width: Math.max(0, hole.x), top: hole.y, height: hole.h, backgroundColor: dim }} />
              <View style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: dim }} />
              <Animated.View key={`ring${i}`} entering={FadeIn.duration(200)} style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: 24, borderWidth: 3, borderColor: '#F5A24F' }} />
            </>
          ) : <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: dim }} />}

          <Animated.View key={i} entering={FadeIn.duration(220)}
            style={{ position: 'absolute', left: 16, right: 16, ...(hole ? (below ? { top: hole.y + hole.h + 12 } : { bottom: height - hole.y + 12 }) : { bottom: insets.bottom + 24 }) }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 18, gap: 12 }}>
              <View className="flex-row items-center gap-3">
                <Sunny mood={stop.mood} size={64} />
                <View className="flex-1">
                  <Text className="font-display text-[21px] font-bold leading-6 text-ink">{stop.title}</Text>
                  <Text className="mt-1 text-[15px] leading-5 text-ink-2">{stop.body}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="flex-1 flex-row gap-1.5">
                  {STOPS.map((_, k) => <View key={k} className={`h-1.5 rounded-full ${k === i ? 'w-5 bg-green' : 'w-1.5 bg-border-2'}`} />)}
                </View>
                {!last && <Button small kind="quiet" label="Skip" onPress={close} />}
                <Button small label={last ? 'Got it' : 'Next'} onPress={() => { haptic.tick(); if (last) close(); else setI(i + 1) }} />
              </View>
            </View>
          </Animated.View>
        </View>
      </ThemeScope>
    </Modal>
  )
}
