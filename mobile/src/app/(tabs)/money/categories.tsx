import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Alert, Pressable, View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { EXPENSE_CATEGORIES } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { monthSpend, thisMonth } from '@/lib/money-data'
import { saveCustomCategories } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'

/** The website's Categories: every category with this month's spending, and your own to add or remove. */
export default function Categories() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  if (!data) return <DetailScreen back="Money" title="Categories"><LoadingState /></DetailScreen>

  const spent = new Map(monthSpend(data.transactions, thisMonth()).categories.map(c => [c.key, c.usd]))
  const used = (key: string) => data.transactions.some(t => t.category === key)

  const remove = (key: string, label: string) => {
    if (!session) return
    haptic.warn()
    Alert.alert(`Remove ${label}?`, used(key) ? 'Transactions already in it keep the category; it just won\'t be offered any more.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const problem = await saveCustomCategories(session.user.id, data.customCategories.filter(c => c.key !== key))
        if (problem) { Alert.alert(problem); return }
        haptic.success(); refresh()
      } },
    ])
  }

  return (
    <DetailScreen back="Money" title="Categories" subtitle="This month's spending in each" refreshing={loading} onRefresh={refresh}>
      <Card>
        <View className="flex-row justify-between">
          <Label>Your own</Label>
          <Button small kind="quiet" label="+ Add" onPress={() => { haptic.tick(); router.push('/category') }} />
        </View>
        {data.customCategories.length === 0 ? (
          <Text className="mt-2 text-[14px] text-ink-2">Add a category for anything the standard ones don't fit, like Kids or Side business.</Text>
        ) : data.customCategories.map((c, i) => (
          <View key={c.key} className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: `${c.color}22` }}><Text className="text-[17px]">{c.emoji}</Text></View>
            <Text className="flex-1 text-[15px] font-semibold text-ink">{c.label}</Text>
            <Text className="font-mono text-[14px] text-ink-2">{money(spent.get(c.key) ?? 0)}</Text>
            <Button small kind="quiet" label="Remove" onPress={() => remove(c.key, c.label)} />
          </View>
        ))}
      </Card>

      <Card>
        <Label>Standard</Label>
        {EXPENSE_CATEGORIES.map((c, i) => (
          <View key={c.key} className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: `${c.color}22` }}><Text className="text-[17px]">{c.emoji}</Text></View>
            <Text className="flex-1 text-[15px] text-ink">{c.label}</Text>
            <Text className="font-mono text-[14px] text-ink-2">{money(spent.get(c.key) ?? 0)}</Text>
          </View>
        ))}
      </Card>
    </DetailScreen>
  )
}
