import { router, useNavigation } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { useEffect, useRef, useState } from 'react'
import { Modal, View } from 'react-native'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { ThemeScope } from '@/components/ThemeScope'

/** Covers Cancel, Android Back and navigator dismissals; successful writes leave once. */
export function useEntryGuard(dirty: boolean, busy: boolean) {
  const navigation = useNavigation()
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [exit, setExit] = useState<(() => void) | null>(null)
  usePreventRemove(!exit && (dirty || busy), ({ data }) => {
    if (!busy) setPending(() => () => navigation.dispatch(data.action))
  })
  const exited = useRef(false)
  // Disable the navigator guard in a render before dispatching a successful exit.
  useEffect(() => { if (exit && !exited.current) { exited.current = true; exit() } }, [exit])
  const finish = () => setExit(() => () => router.back())
  const dialog = <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
    <ThemeScope style={{ justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }} className="rounded-card bg-card p-6">
        <Text accessibilityRole="header" className="text-[22px] font-bold text-ink">Discard changes?</Text>
        <Text className="mt-2 text-[15px] leading-6 text-ink-2">Your changes haven&apos;t been saved.</Text>
        <View className="mt-5 gap-3">
          <Button label="Keep editing" onPress={() => setPending(null)} />
          <Button kind="danger" label="Discard changes" onPress={() => { setExit(() => pending); setPending(null) }} />
        </View>
      </View>
    </ThemeScope>
  </Modal>
  return { finish, dialog }
}
