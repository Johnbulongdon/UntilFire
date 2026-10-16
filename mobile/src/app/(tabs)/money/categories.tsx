import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { Alert, Pressable, View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { addMonths, ALL_CATEGORIES } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, monthSpend, needOf, thisMonth, typicalBy, typicalByCategory } from '@/lib/money-data'
import { saveCustomCategories } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'

const monthName = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
// What has to come out of checking every month, outside the emergency fund (John, Oct 2026: "how much on food and transport").
const DAY_TO_DAY = ['food', 'transport']

/** Spending by category, one month at a time against a typical month, and your own categories to add or remove. */
export default function Categories() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  const [month, setMonth] = useState(thisMonth())
  const typical = useMemo(() => (data ? typicalByCategory(data.transactions) : new Map<string, number>()), [data])
  // The wants inside day-to-day: the part you could flex in a tight month.
  const dayToDayWants = useMemo(() => (data ? typicalBy(data.transactions, t => (DAY_TO_DAY.includes(t.category) ? needOf(t) : null)).get('want') ?? 0 : 0), [data])
  if (!data) return <DetailScreen back="Money" title="Categories"><LoadingState /></DetailScreen>

  const { total, categories } = monthSpend(data.transactions, month)
  const spent = new Map(categories.map(c => [c.key, c.usd]))
  // Everything spent in this month, largest first, then categories that usually have spending but don't yet.
  const rows = [...categories.map(c => c.key), ...[...typical.keys()].filter(k => !spent.has(k) && (typical.get(k) ?? 0) >= 1)]
  const peak = Math.max(...rows.map(k => Math.max(spent.get(k) ?? 0, typical.get(k) ?? 0)), 1)
  const dayToDay = DAY_TO_DAY.reduce((s, k) => s + (typical.get(k) ?? 0), 0)
  const oldest = addMonths(thisMonth(), -12)
  const step = (dir: -1 | 1) => { haptic.tick(); setMonth(m => addMonths(m, dir)) }
  const isCurrent = month === thisMonth()
  const used = (key: string) => data.transactions.some(t => t.category === key)
  // Your own categories, then leftover labels nothing defines any more (an
  // old "Dog" still on transactions or the budget), so each can be merged away.
  const known = new Set([...ALL_CATEGORIES, ...data.customCategories].map(c => c.key))
  const leftovers = [...new Set([...data.transactions.filter(t => t.transaction_type === 'expense').map(t => t.category), ...Object.keys(data.budget)])]
    .filter(k => k && !known.has(k)).map(k => categoryOf(k))
  const own = [...data.customCategories.map(c => ({ cat: c, custom: true })), ...leftovers.map(c => ({ cat: c, custom: false }))]

  const remove = (key: string, label: string) => {
    if (!session) return
    haptic.warn()
    Alert.alert(`Remove ${label}?`, used(key) ? 'Transactions already in it keep the category. To move them, use Merge instead.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const problem = await saveCustomCategories(session.user.id, data.customCategories.filter(c => c.key !== key))
        if (problem) { Alert.alert(problem); return }
        haptic.success(); refresh()
      } },
    ])
  }

  // The less common actions behind one ••• button (Oct 16 2026, the founder).
  const options = (key: string, label: string, custom: boolean) => {
    haptic.tick()
    Alert.alert(label, undefined, [
      { text: 'Merge into another category', onPress: () => router.push({ pathname: '/merge-category', params: { key } }) },
      ...(custom ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => remove(key, label) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

  return (
    <DetailScreen back="Money" title="Categories" subtitle="Where your money goes each month" refreshing={loading} onRefresh={refresh}>
      {dayToDay > 0 && (
        <Card soft>
          <Label>Day-to-day, a typical month</Label>
          <Text className="mt-1 font-mono text-[26px] text-ink">{money(dayToDay)}</Text>
          <Text className="mt-1 text-[14px] leading-5 text-ink-2">
            {DAY_TO_DAY.map(k => `${categoryOf(k).label} ${money(typical.get(k) ?? 0)}`).join(' + ')}. That's the money to keep in checking each month, apart from your emergency fund.
          </Text>
          {dayToDayWants >= 1 && (
            <Text className="mt-1 text-[14px] leading-5 text-ink-2">
              Of that, <Text className="font-mono text-[14px] text-ink">{money(dayToDayWants)}</Text> is usually wants, the part you can trim in a tight month.
            </Text>
          )}
          <Text className="mt-1 text-[12px] text-ink-3">Middle of your last six months, so one big month doesn't skew it. Need or want comes from your answers in Today.</Text>
        </Card>
      )}

      <Card>
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} disabled={month <= oldest} onPress={() => step(-1)} className="px-2">
            <Text className={`text-[20px] ${month > oldest ? 'text-ink' : 'text-border-2'}`}>‹</Text>
          </Pressable>
          <View className="items-center">
            <Text className="text-[15px] font-bold text-ink">{monthName(month)}</Text>
            <Text className="font-mono text-[13px] text-ink-2">{money(total)} spent{isCurrent ? ' so far' : ''}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} disabled={isCurrent} onPress={() => step(1)} className="px-2">
            <Text className={`text-[20px] ${!isCurrent ? 'text-ink' : 'text-border-2'}`}>›</Text>
          </Pressable>
        </View>
        {rows.length === 0 ? (
          <Text className="mt-3 text-[14px] text-ink-2">Nothing spent in {monthName(month)}.</Text>
        ) : rows.map((key, i) => {
          const cat = categoryOf(key)
          const now = spent.get(key) ?? 0
          const usual = typical.get(key)
          return (
            <Pressable key={key} accessibilityRole="button"
              accessibilityLabel={`${cat.label}, ${money(now)}${usual != null ? `, usually ${money(usual)} a month` : ''}. Show transactions`}
              onPress={() => { haptic.tick(); router.push({ pathname: '/money/transactions', params: { category: key, month } }) }}
              className={`py-2.5 active:opacity-70 ${i === 0 ? 'mt-3 border-t border-border' : 'border-t border-border'}`}>
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: `${cat.color}22` }}><CategoryGlyph cat={cat} size={20} /></View>
                <View className="flex-1">
                  <Text className="text-[15px] text-ink">{cat.label}</Text>
                  {usual != null && <Text className="text-[12px] text-ink-3">usually <Text className="font-mono text-[12px] text-ink-3">{money(usual)}</Text></Text>}
                </View>
                <Text className="font-mono text-[15px] text-ink">{money(now)}</Text>
              </View>
              <View className="ml-12 mt-1.5 h-1.5 rounded-full bg-surface-2">
                <View className="h-1.5 rounded-full bg-ink-3" style={{ width: `${(now / peak) * 100}%` }} />
              </View>
            </Pressable>
          )
        })}
      </Card>

      <Card>
        <View className="flex-row justify-between">
          <Label>Your own</Label>
          <Button small kind="quiet" label="+ Add" onPress={() => { haptic.tick(); router.push('/category') }} />
        </View>
        {own.length === 0 ? (
          <Text className="mt-2 text-[14px] text-ink-2">Add a category for anything the standard ones don't fit, like Kids or Side business.</Text>
        ) : own.map(({ cat: c, custom }, i) => (
          <View key={c.key} className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: `${c.color}22` }}><CategoryGlyph cat={c} size={20} /></View>
            <Text className="flex-1 text-[15px] font-semibold text-ink">{c.label}</Text>
            <Text className="font-mono text-[14px] text-ink-2">{money(spent.get(c.key) ?? 0)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${c.label} options`} hitSlop={8} onPress={() => options(c.key, c.label, custom)}
              className="h-8 w-10 items-center justify-center rounded-control border border-border">
              <Text className="text-[16px] font-bold text-ink-2">•••</Text>
            </Pressable>
          </View>
        ))}
      </Card>

    </DetailScreen>
  )
}
