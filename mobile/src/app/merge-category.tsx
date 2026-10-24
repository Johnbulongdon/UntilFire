import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { categoryOf, expenseCategories } from '@/lib/money-data'
import { mergeCategory } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/** Pick the category to merge one into; the old one is gone afterwards. */
export default function MergeCategory() {
  const { key } = useLocalSearchParams<{ key: string }>()
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const [busy, setBusy] = useState(false)
  const from = categoryOf(key ?? '')
  const count = data?.transactions.filter(t => t.category === key).length ?? 0
  const targets = expenseCategories().filter(c => c.key !== key)

  const pick = (to: string) => {
    if (!session || !key || busy) return
    haptic.warn()
    const label = categoryOf(to).label
    Alert.alert(`Merge ${from.label} into ${label}?`, `${count} transaction${count === 1 ? '' : 's'} move to ${label}, and ${from.label} is removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Merge', style: 'destructive', onPress: async () => {
        setBusy(true)
        const problem = await mergeCategory(session.user.id, key, to)
        if (problem) { setBusy(false); Alert.alert(problem); return }
        haptic.success(); await refresh(); router.back()
      } },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Cancel</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Merge {from.label}</Text>
        <View style={{ width: 52 }} />
      </View>
      <Text className="px-5 pt-4 text-[14px] text-ink-2">Move it into…</Text>
      <ScrollView contentContainerClassName="gap-2 px-5 pb-10 pt-3">
        {targets.map(c => (
          <Pressable accessibilityRole="button" key={c.key} disabled={busy} onPress={() => pick(c.key)}
            className="flex-row items-center gap-3 rounded-card border border-border bg-card px-4 py-3">
            <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: `${c.color}22` }}><CategoryGlyph cat={c} size={20} /></View>
            <Text className="flex-1 text-[15px] font-semibold text-ink">{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
