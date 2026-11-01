import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '@/components/Text'
import { Row } from '@/components/SettingsRow'
import { Icon } from '@/components/Icon'
import { ThemeScope } from '@/components/ThemeScope'
import { useAppearance } from '@/state/appearance'
import { colors } from '@/theme/colors'
import { haptic } from '@/lib/haptics'
import type { AppearancePreference } from '@/lib/appearance-preference'

const choices: { value: AppearancePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function AppearanceControl() {
  const { preference, select, error } = useAppearance()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return <>
    <Row first icon="circle.lefthalf.filled" fallback="◐" label="Appearance"
      value={choices.find(choice => choice.value === preference)?.label ?? 'System'} onPress={() => setOpen(true)} />
    {error ? <Text accessibilityRole="alert" className="pb-3 text-[13px] text-neg-ink">{error}</Text> : null}
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <ThemeScope style={{ justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss appearance picker" onPress={close}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <SafeAreaView edges={['bottom']} style={{ width: '100%', maxWidth: 420, alignSelf: 'center', maxHeight: '85%' }}>
          <View accessibilityViewIsModal onAccessibilityEscape={close}
            style={{ margin: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, borderRadius: 24, backgroundColor: colors.card, flexShrink: 1 }}>
            <Text accessibilityRole="header" className="mb-3 text-[18px] font-semibold text-ink">Appearance</Text>
            <ScrollView bounces={false} style={{ flexGrow: 0 }}>
              <View accessibilityRole="radiogroup" accessibilityLabel="Appearance">
                {choices.map(choice => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label}
                  accessibilityState={{ checked: preference === choice.value }}
                  onPress={() => { haptic.select(); void select(choice.value); close() }}
                  style={{ minHeight: 52, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text className="flex-1 text-[16px] text-ink">{choice.label}</Text>
                  {preference === choice.value ? <Icon name="checkmark" fallback="✓" size={18} color={colors.ink} /> : null}
                </Pressable>)}
              </View>
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={close}
              style={{ minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderColor: colors.border }}>
              <Text className="text-center text-[15px] text-ink-2">Cancel</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemeScope>
    </Modal>
  </>
}
