import { useEffect, useRef, useState } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import Animated, { FadeOut } from 'react-native-reanimated'

import { isLockOn, unlock } from '@/lib/app-lock'
import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { Icon } from './Icon'
import { PrimaryButton } from './PrimaryButton'
import { Text } from './Text'

/**
 * Covers the app with a plain screen when Face ID lock is on: at launch, and
 * whenever the app goes to the background, so the app switcher never shows
 * your numbers. Unlocks with Face ID or the phone's passcode.
 */
export function AppLock() {
  const [locked, setLocked] = useState(false)
  const asking = useRef(false)
  const lockedRef = useRef(false)
  const lock = (v: boolean) => { lockedRef.current = v; setLocked(v) }

  const ask = async () => {
    if (asking.current) return
    asking.current = true
    const ok = await unlock().catch(() => false)
    asking.current = false
    if (ok) { haptic.success(); lock(false) }
  }

  useEffect(() => {
    isLockOn().then(on => { if (on) { lock(true); ask() } })
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'background' || state === 'inactive') {
        // The Face ID sheet itself makes the app inactive; don't re-lock for that.
        if (!asking.current && (await isLockOn())) lock(true)
      } else if (state === 'active') {
        if (lockedRef.current) ask()
      }
    })
    return () => sub.remove()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!locked) return null
  return (
    <Animated.View exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.ground, zIndex: 100 }]}>
      <View className="flex-1 items-center justify-center px-8">
        <Icon name="lock.fill" size={56} color={colors.tealDeep} />
        <Text className="mt-3 font-display text-[26px] font-bold text-ink">UntilFire is locked</Text>
        <View className="mt-8 w-full"><PrimaryButton label="Unlock" onPress={ask} /></View>
      </View>
    </Animated.View>
  )
}
