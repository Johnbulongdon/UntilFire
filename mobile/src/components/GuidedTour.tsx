import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'

import { haptic } from '@/lib/haptics'

import { Button } from './Button'
import { PrimaryButton } from './PrimaryButton'
import { Text } from './Text'
import { ThemeScope } from '@/components/ThemeScope'

const KEY = 'tour-seen'

// The website's tour (TourModal), one stop per tab: what lives where.
const STOPS = [
  { emoji: '🏠', title: 'Home', body: 'Your freedom date and four quick actions. The chips at the top and the Today bar at the bottom are on every tab.' },
  { emoji: '💳', title: 'Money', body: 'What you have now: transactions, the calendar of bills and paydays, your budget, income and net worth.' },
  { emoji: '🌅', title: 'Plan', body: 'Where you\'re heading: the freedom date worked out, what-ifs, life changes, goals and where each month\'s saving goes.' },
  { emoji: '👤', title: 'Profile', body: 'Your account, currency, reminders, Face ID and your data. Everything here is shared with untilfire.com.' },
]

/** A short first-run tour, shown once; Profile can show it again. */
export function GuidedTour({ force, onClose }: { force?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(!!force)
  // Only over the screen that asked for it, so landing elsewhere first doesn't show it.
  const [focused, setFocused] = useState(false)
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false) }, []))
  const [i, setI] = useState(0)

  useEffect(() => {
    if (force) return
    AsyncStorage.getItem(KEY).then(v => { if (!v) setOpen(true) }).catch(() => {})
  }, [force])

  const close = () => {
    setOpen(false); setI(0)
    AsyncStorage.setItem(KEY, '1').catch(() => {})
    onClose?.()
  }
  const stop = STOPS[i]
  const last = i === STOPS.length - 1

  return (
    <Modal visible={open && focused} transparent animationType="fade" onRequestClose={close}>
      <ThemeScope>
      <View className="flex-1 justify-end bg-black/40 p-4 pb-10">
        <Animated.View entering={FadeIn}>
          <View className="rounded-modal bg-card p-6">
            <Animated.View key={i} entering={FadeInRight.duration(220)}>
              <Text className="text-[40px]">{stop.emoji}</Text>
              <Text className="mt-2 font-display text-[24px] font-bold text-ink">{stop.title}</Text>
              <Text className="mt-2 text-[16px] leading-6 text-ink-2">{stop.body}</Text>
            </Animated.View>
            <View className="mt-5 flex-row justify-center gap-1.5">
              {STOPS.map((_, k) => <View key={k} className={`h-1.5 rounded-full ${k === i ? 'w-5 bg-green' : 'w-1.5 bg-border-2'}`} />)}
            </View>
            <View className="mt-5"><PrimaryButton label={last ? 'Got it' : 'Next'} onPress={() => { haptic.tick(); if (last) close(); else setI(i + 1) }} /></View>
            {!last && (
              <View className="mt-3"><Button kind="quiet" label="Skip" onPress={close} /></View>
            )}
          </View>
        </Animated.View>
      </View>
      </ThemeScope>
    </Modal>
  )
}
