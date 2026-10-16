import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { CategoryGlyph, Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { addMonths } from '@/engine'
import { categoryOf, expenseCategories, monthSpend, thisMonth, typicalByCategory } from '@/lib/money-data'
import { saveBudget } from '@/lib/mutations'
import { splitBudget } from '@/lib/budget-split'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { currencySymbol, fromInput, toInput } from '@/lib/display-currency'
import { colors } from '@/theme/colors'

/** Set the monthly budget per category, the same numbers the website's Budget uses. */
export default function BudgetEdit() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  // Bills come from Calendar, so their categories aren't typed here (money logic study, Oct 16 2026).
  const split = useMemo(() => (data ? splitBudget(data) : null), [data])
  // Every everyday category with a budget, the website's own keys included, so all of it can be edited here.
  const [rows] = useState(() => [
    ...expenseCategories(),
    ...Object.entries(data?.budget ?? {}).filter(([k, v]) => v > 0 && !expenseCategories().some(c => c.key === k)).map(([k]) => categoryOf(k)),
  ].filter(c => !split?.billKeys.has(c.key)))
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map(c => [c.key, toInput(data?.budget[c.key])])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const spent = new Map(monthSpend(data?.transactions ?? [], thisMonth()).categories.map(c => [c.key, c.usd]))
  // The same "usual" Budget's rows show (median of the last six complete months, lib/money-data typicalBy), so the two never disagree.
  const { averages, months } = useMemo(() => {
    const all = data?.transactions ?? []
    const typical = typicalByCategory(all)
    const months = new Set(all.filter(t => t.transaction_type === 'expense' && t.date.slice(0, 7) < thisMonth() && t.date.slice(0, 7) >= addMonths(thisMonth(), -6)).map(t => t.date.slice(0, 7))).size
    return { averages: new Map([...typical].map(([k, v]) => [k, Math.round(v)])), months: typical.size > 0 ? months : 0 }
  }, [data])
  const useAverages = () => {
    haptic.success()
    setValues(v => ({ ...v, ...Object.fromEntries([...averages].filter(([k]) => rows.some(c => c.key === k)).map(([k, usd]) => [k, toInput(usd)])) }))
  }
  const total = Object.values(values).reduce((s, v) => s + fromInput(v), 0) + (split?.billsMonthly ?? 0)

  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const budget = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Math.max(0, fromInput(v))]))
    const problem = await saveBudget(session.user.id, budget)
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success()
    await refresh()
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
            <Text className="text-[16px] font-semibold text-ink-2">Cancel</Text>
          </Pressable>
          <Text className="text-[16px] font-bold text-ink">Monthly budget</Text>
          <View style={{ width: 52 }} />
        </View>

        <View className="items-center px-5 pb-3 pt-4">
          <Text className="font-mono text-[34px] text-ink">{money(total)}</Text>
          <Text className="text-[13px] text-ink-3">{split?.billsMonthly ? `a month, with ${money(split.billsMonthly)} of bills from Calendar` : 'a month in total'}</Text>
        </View>

        <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
          {months > 0 && (
            <Pressable accessibilityRole="button" onPress={useAverages} className="mb-3 flex-row items-center gap-3 rounded-card bg-surface px-4 py-3 active:opacity-70">
              <Icon name="sparkles" size={24} color={colors.tealDeep} />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">Fill from what you usually spend</Text>
                <Text className="text-[12px] text-ink-3">Your usual month per category, from the last {months} months. Change any before saving.</Text>
              </View>
            </Pressable>
          )}
          <View className="rounded-card border border-border bg-card px-4">
            {rows.map((c, i) => (
              <View key={c.key} className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
                <CategoryGlyph cat={c} size={22} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">{c.label}</Text>
                  {spent.get(c.key) || averages.get(c.key) ? (
                    <Text className="text-[12px] text-ink-3">
                      {[spent.get(c.key) ? `${money(spent.get(c.key)!)} this month` : null, averages.get(c.key) ? `usually ${money(averages.get(c.key)!)}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-center rounded-control bg-surface px-3">
                  <Text className="font-mono text-[15px] text-ink-3">{currencySymbol().trim()}</Text>
                  <TextInput
                    accessibilityLabel={`${c.label} budget`}
                    className="w-20 py-2 text-right text-[15px] text-ink"
                    style={{ fontFamily: 'DMMono_500Medium' }}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.border2}
                    value={values[c.key]}
                    onChangeText={t => setValues(v => ({ ...v, [c.key]: t.replace(/[^0-9]/g, '') }))}
                  />
                </View>
              </View>
            ))}
          </View>
          {error ? <Text className="mt-4 text-[14px] text-neg-ink">{error}</Text> : null}
        </ScrollView>

        <View className="px-5 pb-4">
          {busy ? <View className="h-14 items-center justify-center"><ActivityIndicator color={colors.green} /></View>
            : <PrimaryButton label="Save budget" onPress={save} disabled={!session} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
