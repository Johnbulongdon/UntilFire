import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { currencySymbol } from '@/lib/display-currency'
import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { PrimaryButton } from './PrimaryButton'
import { Text } from './Text'

/** The frame every edit sheet shares: Cancel, a title, the form, and one save button. */
export function SheetFrame({ title, children, saveLabel, onSave, canSave, busy, error }: {
  title: string
  children: ReactNode
  saveLabel: string
  onSave: () => void
  canSave: boolean
  busy: boolean
  error?: string
}) {
  return (
    <SafeAreaView className="flex-1 bg-ground">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
            <Text className="text-[16px] font-semibold text-ink-2">Cancel</Text>
          </Pressable>
          <Text className="text-[16px] font-bold text-ink">{title}</Text>
          <View style={{ width: 52 }} />
        </View>
        <ScrollView contentContainerClassName="px-5 pb-6 pt-5" keyboardShouldPersistTaps="handled">
          {children}
          {error ? <Text className="mt-4 text-[14px] text-neg-ink">{error}</Text> : null}
        </ScrollView>
        <View className="px-5 pb-4">
          {busy ? <View className="h-14 items-center justify-center"><ActivityIndicator color={colors.green} /></View>
            : <PrimaryButton label={saveLabel} onPress={onSave} disabled={!canSave} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/** A labelled money field on a card row: the currency symbol, then digits in DM Mono. */
export function MoneyRow({ label, note, value, onChange, first, suffix }: {
  label: string
  note?: string
  value: string
  onChange: (v: string) => void
  first?: boolean
  suffix?: string
}) {
  return (
    <View className={`flex-row items-center gap-3 py-3 ${first ? '' : 'border-t border-border'}`}>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{label}</Text>
        {note ? <Text className="text-[12px] text-ink-3">{note}</Text> : null}
      </View>
      <View className="flex-row items-center rounded-control bg-surface px-3">
        {suffix ? null : <Text className="font-mono text-[15px] text-ink-3">{currencySymbol().trim()}</Text>}
        <TextInput
          accessibilityLabel={label}
          className="w-28 py-2 text-right text-[15px] text-ink"
          style={{ fontFamily: 'DMMono_500Medium' }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.border2}
          value={value}
          onChangeText={t => onChange(t.replace(/[^0-9.]/g, ''))}
        />
        {suffix ? <Text className="font-mono text-[15px] text-ink-3">{suffix}</Text> : null}
      </View>
    </View>
  )
}
