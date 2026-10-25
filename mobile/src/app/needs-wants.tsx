import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CategoryGlyph, Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { addMonths, EATING_OUT, isoDay, rowNeed, withRowNeed, type Need } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { expenseCategories, needOf } from '@/lib/money-data'
import { saveFireProfile, saveMerchantRule } from '@/lib/mutations'
import { spentUSD, useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/**
 * Needs & wants (D-106): what we sorted for you, one tap to move a row. Each
 * category is a row, with eating out pulled out of Food, then the shops you
 * answered in Today. Same rows as the website's Categories › Needs & wants.
 */
export default function NeedsWants() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const [busy, setBusy] = useState(false)
  if (!data || !session) return null

  const overrides = data.profile.categoryNeeds
  const rows = expenseCategories().filter(c => c.key !== 'other' && c.key !== 'work').flatMap(c => c.key === 'food'
    ? [{ key: 'food', label: 'Groceries', cat: c }, { key: EATING_OUT, label: 'Eating out & delivery', cat: c }]
    : [{ key: c.key, label: c.label, cat: c }])

  // A month of each side, averaged over the last three full months.
  const from = addMonths(isoDay(new Date()).slice(0, 7), -3), to = isoDay(new Date()).slice(0, 7)
  const recent = data.transactions.filter(t => t.transaction_type === 'expense' && t.date.slice(0, 7) >= from && t.date.slice(0, 7) < to)
  const monthly = (side: Need) => recent.filter(t => needOf(t) === side).reduce((s, t) => s + spentUSD(t), 0) / 3

  const save = async (work: () => Promise<string | null>) => {
    if (busy) return
    haptic.select(); setBusy(true)
    const problem = await work()
    setBusy(false)
    if (problem) { haptic.warn(); Alert.alert(problem); return }
    refresh()
  }
  const move = (row: string) => save(() => saveFireProfile(session.user.id, {
    categoryNeeds: withRowNeed(row, rowNeed(row, overrides) === 'need' ? 'want' : 'need', overrides),
  }))
  const shops = Object.entries(data.profile.merchantRules)
  const flipShop = (key: string) => save(() => {
    const rule = data.profile.merchantRules[key]
    return saveMerchantRule(session.user.id, data.profile.merchantRules, key, { ...rule, need: rule.need === 'need' ? 'want' : 'need' })
  })

  const group = (side: Need) => (
    <View className="rounded-card border border-border bg-card p-5" style={{ gap: 12 }}>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[13px] font-bold uppercase tracking-[1.5px] text-ink-3">{side === 'need' ? 'Needs' : 'Wants'}</Text>
        {recent.length > 0 && <Text className="font-mono text-[13px] text-ink-3">{money(monthly(side))}/mo</Text>}
      </View>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {rows.filter(r => rowNeed(r.key, overrides) === side).map(r => (
          <Pressable key={r.key} accessibilityRole="button" accessibilityLabel={`${r.label}, a ${side}. Move to ${side === 'need' ? 'wants' : 'needs'}`} disabled={busy}
            onPress={() => move(r.key)} className="flex-row items-center gap-1.5 rounded-full border border-border bg-ground px-3 py-2 active:opacity-60">
            <CategoryGlyph cat={r.cat} size={16} />
            <Text className="text-[14px] font-semibold text-ink">{r.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text className="font-display text-[28px] text-ink">Needs &amp; wants</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}
          className="h-11 w-11 items-center justify-center rounded-control border border-border bg-card">
          <Icon name="xmark" size={18} color={colors.ink} fallback="✕" />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-3" contentContainerStyle={{ gap: 14 }}>
        <Text className="text-[15px] leading-6 text-ink-2">We sorted these for you. Tap one to move it.</Text>
        {group('need')}
        {group('want')}
        {shops.length > 0 && (
          <View className="rounded-card border border-border bg-card p-5" style={{ gap: 12 }}>
            <Text className="text-[13px] font-bold uppercase tracking-[1.5px] text-ink-3">Shops you told us</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {shops.map(([key, rule]) => (
                <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key}, a ${rule.need}. Change`} disabled={busy}
                  onPress={() => flipShop(key)} className="flex-row items-center gap-1.5 rounded-full border border-border bg-ground px-3 py-2 active:opacity-60">
                  <Text className="text-[14px] font-semibold capitalize text-ink">{key}</Text>
                  <Text className="text-[13px] text-ink-3">{rule.need === 'need' ? 'Need' : 'Want'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
