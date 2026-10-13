import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { View } from 'react-native'

import { BudgetPace } from '@/components/BudgetPace'
import { SetAside } from '@/components/SetAside'
import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { money } from '@/lib/format'
import { categoryOf, monthSpend, thisMonth } from '@/lib/money-data'
import { useAccount } from '@/state/account'
import { colors } from '@/theme/colors'

/** The website's Budget page: one number left for the month, then each category. */
export default function Budget() {
  const { data, loading, refresh } = useAccount()
  if (!data) return <DetailScreen back="Money" title="Budget"><LoadingState /></DetailScreen>

  const { total, categories } = monthSpend(data.transactions, thisMonth())
  const budget = Object.values(data.budget).reduce((s, v) => s + v, 0)
  const spent = new Map(categories.map(c => [c.key, c.usd]))
  const rows = Object.entries(data.budget)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({ key, amount, spent: spent.get(key) ?? 0 }))
    .sort((a, b) => b.spent / b.amount - a.spent / a.amount)
  const unbudgeted = categories.filter(c => !(data.budget[c.key] > 0))

  return (
    <DetailScreen back="Money" title="Budget" subtitle="This month" refreshing={loading} onRefresh={refresh}>
      {budget > 0 ? (
        <Card>
          <BudgetPace spent={total} budget={budget} />
          <View className="mt-3"><Button small kind="quiet" label="Edit budget" onPress={() => router.push('/budget-edit')} /></View>
        </Card>
      ) : (
        <Card soft>
          <Text className="text-[15px] font-semibold text-ink">No budget yet</Text>
          <Text className="mt-1 text-[14px] leading-5 text-ink-2">Give each category a monthly amount and see what's left as you spend.</Text>
          <View className="mt-3"><Button small kind="quiet" label="Set a budget" onPress={() => router.push('/budget-edit')} /></View>
        </Card>
      )}

      <SetAside data={data} />

      {rows.length > 0 && (
        <Card>
          <Label>By category</Label>
          <View className="mt-2 gap-4">
            {rows.map(r => {
              const cat = categoryOf(r.key)
              const share = r.spent / r.amount
              const over = share > 1
              return (
                <View key={r.key}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2"><CategoryGlyph cat={cat} size={18} /><Text className="text-[15px] text-ink">{cat.label}</Text></View>
                    <Text className="text-[13px] text-ink-2">
                      <Text className={`font-mono text-[13px] ${over ? 'text-neg-ink' : 'text-ink'}`}>{money(r.spent)}</Text> / <Text className="font-mono text-[13px]">{money(r.amount)}</Text>
                    </Text>
                  </View>
                  <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <View className="h-full rounded-full" style={{ width: `${Math.min(1, share) * 100}%`, backgroundColor: over ? colors.neg : cat.color }} />
                  </View>
                  <Text className="mt-1 text-[12px] text-ink-3">{over ? `${money(r.spent - r.amount)} over` : `${money(r.amount - r.spent)} left`}</Text>
                </View>
              )
            })}
          </View>
        </Card>
      )}

      {unbudgeted.length > 0 && (
        <Card soft>
          <Label>Spent outside your budget</Label>
          {unbudgeted.map(c => (
            <View key={c.key} className="mt-2 flex-row justify-between">
              <View className="flex-row items-center gap-2"><CategoryGlyph cat={categoryOf(c.key)} size={16} /><Text className="text-[14px] text-ink">{categoryOf(c.key).label}</Text></View>
              <Text className="font-mono text-[14px] text-ink">{money(c.usd)}</Text>
            </View>
          ))}
        </Card>
      )}
    </DetailScreen>
  )
}
