import { Pressable, View } from 'react-native'
import { Text } from '@/components/Text'
import { useAppearance } from '@/state/appearance'
import { colors } from '@/theme/colors'
import { haptic } from '@/lib/haptics'
import type { AppearancePreference } from '@/lib/appearance-preference'
const choices: { value: AppearancePreference; label: string }[] = [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]
export function AppearanceControl() {
  const { preference, select, error } = useAppearance()
  return <View className="gap-3 py-3">
    <Text className="text-[15px] font-semibold text-ink">Appearance</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" className="flex-row gap-2">
      {choices.map(choice => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label}
        accessibilityState={{ checked: preference === choice.value }}
        onPress={() => { haptic.select(); void select(choice.value) }}
        style={{ flex: 1, minHeight: 48, borderRadius: 999, borderWidth: 1.5, borderColor: preference === choice.value ? colors.ink : colors.border2, backgroundColor: preference === choice.value ? colors.ink : colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: preference === choice.value ? colors.card : colors.ink, fontWeight: preference === choice.value ? '700' : '500' }}>{choice.label}</Text>
      </Pressable>)}
    </View>
    {error ? <Text accessibilityRole="alert" className="text-[13px] text-neg-ink">{error}</Text> : null}
  </View>
}
