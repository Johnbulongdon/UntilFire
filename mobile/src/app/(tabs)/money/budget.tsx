import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Pressable, View } from 'react-native'

import { BudgetPace } from '@/components/BudgetPace'
import { Button } from '@/components/Button'
import { DetailScreen } from '@/components/DetailScreen'
import { CategoryGlyph } from '@/components/Icon'
import { LoadingState } from '@/components/LoadingState'
import { Card, Label } from '@/components/Screen'
import { SavingsLine } from '@/components/SavingsLine'
import { SetAside } from '@/components/SetAside'
import { splitBudget } from '@/lib/budget-split'
import { Text } from '@/components/Text'
import { addMonths, ALL_CATEGORIES } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, needOf, thisMonth, typicalBy, typicalByCategory } from '@/lib/money-data'
import { saveCustomCategories, saveFireProfile } from '@/lib/mutations'
import { defaultNeed } from '@/lib/review'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { brand, colors } from '@/theme/colors'

const monthName = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
// What has to come out of checking every month, outside the emergency fund (John, Oct 2026: "how much on food and transport").
const DAY_TO_DAY = ['food', 'transport']

/**
 * Budget and Categories in one (Oct 16 2026, the founder): what's left of the
 * everyday budget, then Bills (from Calendar, never typed twice) and one row
 * per everyday category with spent against its budget. Tap a row for its
 * transactions; ••• holds the rarer budget and category actions.
 */
export default function Budget() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  const [month, setMonth] = useState(thisMonth())
  const typical = useMemo(() => (data ? typicalByCategory(data.transactions) : new Map<string, number>()), [data])
  const dayToDayWants = useMemo(() => (data ? typicalBy(data.transactions, t => (DAY_TO_DAY.includes(t.category) ? needOf(t) : null)).get('want') ?? 0 : 0), [data])
  if (!data) return <DetailScreen back="Money" title="Budget"><LoadingState /></DetailScreen>

  const split = splitBudget(data, month)
  const custom = new Set(data.customCategories.map(c => c.key))
  const known = new Set([...ALL_CATEGORIES.map(c => c.key), ...custom])
  // Your own and leftover labels (an old "Dog") stay listed at $0 so they can be managed.
  const leftovers = data.transactions.filter(t => t.transaction_type === 'expense' && t.category && !known.has(t.category)).map(t => t.category)
  // Everyday rows: spending that isn't a bill's own payment, against the budget beyond the bills (lib/budget-split).
  // A bill category shows here too when it has everyday money or spending, so the rows add up to the total (audit round 3).
  const everyday = (k: string) => split.everydayBy.get(k) ?? { budget: 0, spent: 0 }
  const keys = [...new Set([...split.everydayBy.keys(), ...custom, ...leftovers])]
    .filter(k => !split.spreadKeys.has(k) && (!split.billKeys.has(k) || everyday(k).budget >= 1 || everyday(k).spent >= 1))
  const share = (k: string) => (everyday(k).budget > 0 ? everyday(k).spent / everyday(k).budget : -1)
  const rows = keys.sort((a, b) => share(b) - share(a) || everyday(b).spent - everyday(a).spent)
  const dayToDay = DAY_TO_DAY.reduce((s, k) => s + (typical.get(k) ?? 0), 0)
  const isCurrent = month === thisMonth()
  const oldest = addMonths(thisMonth(), -12)
  const [y, m] = month.split('-').map(Number)
  const step = (dir: -1 | 1) => { haptic.tick(); setMonth(v => addMonths(v, dir)) }
  const used = (key: string) => data.transactions.some(t => t.category === key)

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
  // Need or want lives on the category, so Today doesn't ask it for every purchase (money logic study).
  const setNeed = async (key: string, need: 'need' | 'want') => {
    if (!session) return
    const problem = await saveFireProfile(session.user.id, { categoryNeeds: { ...data.profile.categoryNeeds, [key]: need } })
    if (problem) { Alert.alert(problem); return }
    haptic.success(); refresh()
  }
  // Yearly costs (insurance, a trip) are judged over 12 months instead of one (money logic study).
  const toggleSpread = async (key: string) => {
    if (!session) return
    const list = data.profile.spreadCategories ?? []
    const problem = await saveFireProfile(session.user.id, { spreadCategories: list.includes(key) ? list.filter(k => k !== key) : [...list, key] })
    if (problem) { Alert.alert(problem); return }
    haptic.success(); refresh()
  }
  const options = (key: string, label: string) => {
    haptic.tick()
    const need = defaultNeed(key)
    Alert.alert(label, `Counted as a ${need}.`, [
      { text: data.budget[key] > 0 ? 'Change budget' : 'Set budget', onPress: () => router.push('/budget-edit') },
      { text: need === 'need' ? 'Count as a want' : 'Count as a need', onPress: () => setNeed(key, need === 'need' ? 'want' : 'need') },
      { text: split.spreadKeys.has(key) ? 'Budget it each month' : 'Spread over the year', onPress: () => toggleSpread(key) },
      { text: 'Merge into another category', onPress: () => router.push({ pathname: '/merge-category', params: { key } }) },
      ...(custom.has(key) ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => remove(key, label) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

  return (
    <DetailScreen back="Money" title="Budget" refreshing={loading} onRefresh={refresh}>
      <View className="flex-row items-center justify-between rounded-control border border-border bg-card px-2 py-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} disabled={month <= oldest} onPress={() => step(-1)} className="px-3">
          <Text className={`text-[20px] ${month > oldest ? 'text-ink' : 'text-border-2'}`}>‹</Text>
        </Pressable>
        <Text className="text-[15px] font-bold text-ink">{monthName(month)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} disabled={isCurrent} onPress={() => step(1)} className="px-3">
          <Text className={`text-[20px] ${!isCurrent ? 'text-ink' : 'text-border-2'}`}>›</Text>
        </Pressable>
      </View>

      {isCurrent && <SavingsLine data={data} />}

      {split.everydayBudget > 0 ? (
        <Card>
          <Label>Day-to-day</Label>
          <BudgetPace spent={split.everydaySpent} budget={split.everydayBudget} now={isCurrent ? new Date() : new Date(y, m, 0)} />
        </Card>
      ) : (
        <Card soft>
          <Text className="text-[15px] font-semibold text-ink">No budget yet</Text>
          <Text className="mt-1 text-[14px] leading-5 text-ink-2">Give each day-to-day category a monthly amount and see what&apos;s left as you spend. Bills come from Calendar.</Text>
          <View className="mt-3"><Button small kind="quiet" label="Set a budget" onPress={() => router.push('/budget-edit')} /></View>
        </Card>
      )}

      {isCurrent && <SetAside data={data} />}

      {split.bills.length > 0 && (
        <Card>
          <View className="flex-row items-baseline justify-between">
            <Label>Bills</Label>
            <Text className="font-mono text-[13px] text-ink-3">{money(split.billsMonthly)} a month</Text>
          </View>
          {split.bills.map(b => {
            const cat = categoryOf(b.key)
            return (
              <Pressable key={b.key} accessibilityRole="button" accessibilityLabel={`${cat.label} bills, ${b.due > 0 ? `${money(b.due)} still due` : 'paid'}. Show transactions`}
                onPress={() => { haptic.tick(); router.push({ pathname: '/money/transactions', params: { category: b.key, month } }) }}
                className="flex-row items-center gap-3 border-t border-border py-3 active:opacity-70">
                <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: cat.color }}><CategoryGlyph cat={cat} size={20} color={brand.deep} /></View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">{cat.label}</Text>
                  <Text className="text-[12px] text-ink-3">{b.due > 0 ? `${money(b.due)} still due${b.next ? ` ${new Date(`${b.next}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}` : isCurrent ? 'Paid this month' : `${money(b.spent)} paid`}</Text>
                </View>
                <Text className="font-mono text-[14px] text-ink">{money(b.monthly)}</Text>
              </Pressable>
            )
          })}
          <Text className="mt-1 text-[12px] text-ink-3">From your bills in Calendar, set aside before day-to-day spending.</Text>
        </Card>
      )}

      <Card>
        {split.bills.length > 0 && <Label>Day-to-day</Label>}
        {rows.length === 0 && <Text className="text-[14px] text-ink-2">Nothing spent in {monthName(month)}.</Text>}
        {rows.map((key, i) => {
          const cat = categoryOf(key)
          const now = everyday(key).spent
          const limit = everyday(key).budget
          const over = limit > 0 && now > limit
          return (
            <View key={key} className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${cat.label}, ${money(now)} spent${limit ? ` of ${money(limit)}` : ''}. Show transactions`}
                onPress={() => { haptic.tick(); router.push({ pathname: '/money/transactions', params: { category: key, month } }) }}
                className="flex-1 flex-row items-center gap-3 active:opacity-70">
                <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: cat.color }}><CategoryGlyph cat={cat} size={20} color={brand.deep} /></View>
                <View className="flex-1">
                  <View className="flex-row items-baseline justify-between">
                    <Text className="text-[15px] font-semibold text-ink">{cat.label}</Text>
                    <Text className="text-[13px] text-ink-2">
                      <Text className={`font-mono text-[14px] ${over ? 'text-neg-ink' : 'text-ink'}`}>{money(now)}</Text>{limit ? <Text className="font-mono text-[13px] text-ink-3"> / {money(limit)}</Text> : null}
                    </Text>
                  </View>
                  {limit ? (
                    <>
                      <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <View className="h-full rounded-full" style={{ width: `${Math.min(1, now / limit) * 100}%`, backgroundColor: over ? colors.neg : cat.color }} />
                      </View>
                      <Text className={`mt-1 text-[12px] ${over ? 'text-neg-ink' : 'text-ink-3'}`}>{over ? `${money(now - limit)} over` : `${money(limit - now)} left`}</Text>
                    </>
                  ) : (
                    <Pressable accessibilityRole="button" hitSlop={6} onPress={() => { haptic.tick(); router.push('/budget-edit') }} className="mt-1 self-start rounded-control bg-green-50 px-2 py-1">
                      <Text className="text-[12px] font-semibold text-green-700">+ Set budget</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`${cat.label} options`} hitSlop={8} onPress={() => options(key, cat.label)}
                className="h-8 w-10 items-center justify-center rounded-control border border-border">
                <Text className="text-[16px] font-bold text-ink-2">•••</Text>
              </Pressable>
            </View>
          )
        })}
      </Card>

      {split.spread.length > 0 && (
        <Card>
          <Label>Spread over the year</Label>
          {split.spread.map(c => {
            const cat = categoryOf(c.key)
            const over = c.yearBudget > 0 && c.yearSpent > c.yearBudget
            return (
              <Pressable key={c.key} accessibilityRole="button" accessibilityLabel={`${cat.label}: ${money(c.yearSpent)} of ${money(c.yearBudget)} over 12 months. Options`}
                onPress={() => options(c.key, cat.label)} className="flex-row items-center gap-3 border-t border-border py-3 active:opacity-70">
                <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: cat.color }}><CategoryGlyph cat={cat} size={20} color={brand.deep} /></View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">{cat.label}</Text>
                  <Text className={`text-[12px] ${over ? 'text-neg-ink' : 'text-ink-3'}`}>{over ? `${money(c.yearSpent - c.yearBudget)} over` : `${money(c.yearBudget - c.yearSpent)} left`} over 12 months</Text>
                </View>
                <Text className="font-mono text-[14px] text-ink">{money(c.yearSpent)}<Text className="font-mono text-[13px] text-ink-3"> / {money(c.yearBudget)}</Text></Text>
              </Pressable>
            )
          })}
        </Card>
      )}

      <View className="flex-row gap-3">
        <View className="flex-1"><Button kind="quiet" label="+ Category" onPress={() => { haptic.tick(); router.push('/category') }} /></View>
        <View className="flex-1"><Button kind="quiet" label="Edit budget" onPress={() => { haptic.tick(); router.push('/budget-edit') }} /></View>
      </View>
      <Button kind="quiet" label="Needs & wants" onPress={() => { haptic.tick(); router.push('/needs-wants') }} />

      {dayToDay > 0 && (
        <Card soft>
          <Label>Day-to-day, a typical month</Label>
          <Text className="mt-1 font-mono text-[26px] text-ink">{money(dayToDay)}</Text>
          <Text className="mt-1 text-[14px] leading-5 text-ink-2">
            {DAY_TO_DAY.map(k => `${categoryOf(k).label} ${money(typical.get(k) ?? 0)}`).join(' + ')}. Keep this in checking each month, apart from your emergency fund.
          </Text>
          {dayToDayWants >= 1 && (
            <Text className="mt-1 text-[14px] leading-5 text-ink-2">
              About <Text className="font-mono text-[14px] text-ink">{money(dayToDayWants)}</Text> is usually wants, the part you can trim.
            </Text>
          )}
        </Card>
      )}
    </DetailScreen>
  )
}
