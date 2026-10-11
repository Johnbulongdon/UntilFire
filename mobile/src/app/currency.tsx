import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Text } from '@/components/Text'
import { CURRENCY_NAMES, SUPPORTED_CURRENCIES } from '@/engine'
import { currencySymbol } from '@/lib/display-currency'
import { haptic } from '@/lib/haptics'
import { saveCurrency } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/** Pick the currency money is shown in. Amounts are stored in dollars and converted at today's rate, as on the website. */
export default function CurrencySheet() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const [busy, setBusy] = useState<string | null>(null)
  const current = data?.currency ?? 'USD'

  const pick = async (code: string) => {
    if (!session || busy) return
    haptic.select(); setBusy(code)
    const problem = await saveCurrency(session.user.id, code)
    if (problem) { setBusy(null); haptic.warn(); return }
    await refresh()
    haptic.success(); router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Cancel</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Currency</Text>
        <View style={{ width: 52 }} />
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="rounded-card border border-border bg-card px-4">
          {SUPPORTED_CURRENCIES.map((c, i) => (
            <Pressable accessibilityRole="button" key={c} onPress={() => pick(c)} className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <Text className="w-10 font-mono text-[15px] text-ink-2">{currencySymbol(c).trim()}</Text>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{CURRENCY_NAMES[c] ?? c}</Text>
                <Text className="text-[12px] text-ink-3">{c}</Text>
              </View>
              {busy === c ? <ActivityIndicator color={colors.green} /> : current === c ? <Text className="text-[16px] text-pos-ink">✓</Text> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
