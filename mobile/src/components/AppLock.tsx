import { useEffect, useRef, useState } from 'react'
import { AppState, Modal, View } from 'react-native'

import { isAway, isLockOn, unlock } from '@/lib/app-lock'
import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { Icon } from './Icon'
import { PrimaryButton } from './PrimaryButton'
import { Text } from './Text'

/**
 * Covers the app when Face ID lock is on. Leaving the app (background) locks
 * it until Face ID or the passcode. A brief interruption such as Control
 * Center only hides your numbers, and system sheets the app opened itself
 * (whileAway) change nothing. It's a Modal so it also covers open sheets.
 */
export function AppLock() {
  const [state, setState] = useState<'open' | 'cover' | 'locked'>('open')
  const asking = useRef(false)
  const stateRef = useRef(state)
  const to = (v: 'open' | 'cover' | 'locked') => { stateRef.current = v; setState(v) }

  const ask = async () => {
    if (asking.current) return
    asking.current = true
    const ok = await unlock().catch(() => false)
    asking.current = false
    if (ok) { haptic.success(); to('open') }
  }

  useEffect(() => {
    isLockOn().then(on => { if (on) { to('locked'); ask() } })
    const sub = AppState.addEventListener('change', async next => {
      // The Face ID sheet itself makes the app inactive; don't react to that.
      if (asking.current || isAway()) return
      if (next === 'background') {
        if (await isLockOn()) to('locked')
      } else if (next === 'inactive') {
        if (stateRef.current === 'open' && (await isLockOn())) to('cover')
      } else if (next === 'active') {
        if (stateRef.current === 'locked') ask()
        else if (stateRef.current === 'cover') to('open')
      }
    })
    return () => sub.remove()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Modal visible={state !== 'open'} animationType="fade" presentationStyle="overFullScreen" transparent={false} onRequestClose={() => {}}>
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.ground }}>
        <Icon name="lock.fill" size={56} color={colors.tealDeep} />
        <Text className="mt-3 font-display text-[26px] font-bold text-ink">UntilFire is locked</Text>
        {state === 'locked' ? <View className="mt-8 w-full"><PrimaryButton label="Unlock" onPress={ask} /></View> : null}
      </View>
    </Modal>
  )
}
