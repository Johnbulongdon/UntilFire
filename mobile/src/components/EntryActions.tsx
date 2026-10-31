import { useEffect, useState } from 'react'
import { ActivityIndicator, Keyboard, Platform, View } from 'react-native'
import { colors } from '@/theme/colors'
import { Button } from './Button'
import { PrimaryButton } from './PrimaryButton'

/** A real keypad toolbar plus the existing pinned save action. */
export function EntryActions({ label, busy, canSave, keyboardActive, onNext, onDone, onSave }: {
  label: string; busy: boolean; canSave: boolean; keyboardActive: boolean
  onNext?: () => void; onDone: () => void; onSave: () => void
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  return <View className="bg-ground px-5 pb-4 pt-2">
    {(Platform.OS === 'web' ? keyboardActive : keyboardOpen) && <View className="mb-2 flex-row justify-end gap-2">
      {onNext && <Button small kind="quiet" label="Next field" disabled={busy} onPress={onNext} />}
      <Button small kind="quiet" label="Done" onPress={onDone} />
    </View>}
    {busy ? <View accessibilityLabel="Saving" accessibilityRole="progressbar" className="h-14 items-center justify-center"><ActivityIndicator color={colors.green} /></View>
      : <PrimaryButton label={label} disabled={!canSave} onPress={onSave} />}
  </View>
}
