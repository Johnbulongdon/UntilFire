import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'

import { calcPurchaseImpact, compareNetWorth, countdownLabel, formatDelay, REAL_RETURN, ladderViewFromPlan, NET_WORTH_BENCHMARKS, NET_WORTH_INFLATION } from '@/engine'
import { unpaid, upcoming } from '@/lib/bills'
import { contributionFacts, EMPTY_PLAN } from '@/lib/contribution-facts'
import { currencySymbol, fromInput } from '@/lib/display-currency'
import { compactMoney, money } from '@/lib/format'
import { safetyMonths, thisMonth } from '@/lib/money-data'
import { haptic } from '@/lib/haptics'
import { netWorthOf } from '@/lib/net-worth'
import type { AccountData } from '@/state/account'
import { useFreedom } from '@/state/freedom'
import { useFlags } from './WorthALook'

import { colors } from '@/theme/colors'

import { HouseholdCard } from './HouseholdCard'
import { Icon } from './Icon'
import { Ring } from './Ring'
import { Card, Label, ProgressTrack, useFlat } from './Screen'
import { Text } from './Text'

/** The glance row (net worth, emergency fund), each opening its page. Home only reads. */
export function GlanceRow({ data }: { data: AccountData }) {
  const nw = netWorthOf(data)
  const efMonths = useMemo(() => safetyMonths(data), [data])
  return (
    <View className="flex-row gap-3">
      <Tile icon="building.columns.fill" fallback="🏛️" tint={colors.teal} label="Net worth" value={compactMoney(nw.netWorth)} negative={nw.netWorth < 0} onPress={() => router.push('/money/net-worth')} />
      <Tile icon="shield.lefthalf.filled" fallback="🛡️" tint={efMonths != null && efMonths >= 6 ? colors.green : colors.warn} label="Safety"
        value={efMonths == null ? '—' : `${efMonths.toFixed(1)} mo`} onPress={() => router.push('/money/net-worth')} />
    </View>
  )
}

type SymbolName = Parameters<typeof Icon>[0]['name']

function Tile({ icon, fallback, tint, label, value, negative, onPress }: { icon: SymbolName; fallback: string; tint: string; label: string; value: string; negative?: boolean; onPress: () => void }) {
  const flat = useFlat()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => { haptic.tick(); onPress() }}
      className={`flex-1 active:opacity-70 ${flat ? '' : 'rounded-card border border-border bg-card p-4'}`}>
      <Icon name={icon} fallback={fallback} size={22} color={tint} />
      <Text className={`mt-2 font-mono text-[22px] ${negative ? 'text-neg-ink' : 'text-ink'}`}>{value}</Text>
      <Text className="text-[12px] text-ink-3">{label}</Text>
    </Pressable>
  )
}

/** FreeToSpendHome (D-29): one sentence, the cash free until payday once bills before it are set aside. */
export function FreeToSpend({ data }: { data: AccountData }) {
  const events = unpaid(upcoming(data.bills, 45), data.bills, data.transactions)
  const payday = events.find(e => e.type === 'income' && e.counted)
  if (!payday) return null
  const before = events.filter(e => e.type === 'expense' && e.iso < payday.iso).reduce((s, e) => s - e.amount, 0)
  const free = data.balances.cashSavings - before
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/money/budget') }}>
      <Card>
        <View className="flex-row items-center gap-3">
          <Icon name="creditcard.fill" fallback="💳" size={22} color={free < 0 ? colors.neg : colors.green} />
          <View className="flex-1">
            <Text className={`font-mono text-[24px] ${free < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(free)}</Text>
            <Text className="text-[12px] text-ink-3">free until {new Date(`${payday.iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  )
}

/** NextContributionCard: this month's contribution, from the same ladder as Plan → Contributions. */
export function NextContribution({ data }: { data: AccountData }) {
  const view = useMemo(() => ladderViewFromPlan(data.contributionPlan ?? EMPTY_PLAN, contributionFacts(data)), [data])
  if (!view || view.budget <= 0) return null
  const next = view.next
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/plan/contributions') }}>
      <Card>
        <View className="flex-row items-center gap-3">
          <Icon name="arrow.up.forward.circle.fill" fallback="📥" size={24} color={colors.green} />
          <View className="flex-1">
            <Text className="font-mono text-[24px] text-ink">{money(view.budget)}</Text>
            <Text numberOfLines={1} className="text-[12px] text-ink-3">{next ? `to ${next.label}` : 'to invest'}</Text>
          </View>
          <View className="rounded-full bg-surface px-3 py-1"><Text className="text-[12px] font-semibold text-ink-2">{countdownLabel(view.available.daysUntil)}</Text></View>
        </View>
      </Card>
    </Pressable>
  )
}

/** CompareCard: net worth against US households of the same age (Federal Reserve survey, inflation-adjusted). */
export function Peers({ data }: { data: AccountData }) {
  const netWorth = netWorthOf(data).netWorth
  const c = compareNetWorth({ netWorthUsd: netWorth, age: data.age, ageAssumed: !(data.age && data.age > 0), currency: data.currency }, NET_WORTH_BENCHMARKS, NET_WORTH_INFLATION)
  if (!c) return null
  return (
    <Card>
      <View className="flex-row items-center gap-5">
        <Ring share={c.aheadOfPct / 100} size={84} stroke={10} color={colors.teal} track={colors.surface2}>
          <Text className="font-mono text-[17px] font-bold text-ink">{c.aboveTop ? '99+' : c.aheadOfPct}%</Text>
        </Ring>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-ink">Ahead of US households</Text>
          <Text className="text-[12px] text-ink-3">{c.bandLabel} · Fed survey {c.surveyYear}</Text>
        </View>
      </View>
    </Card>
  )
}

/** Worth a look (D-31): how many of this month's rows may be making the numbers wrong; opens Transactions to answer. */
export function WorthCard({ data }: { data: AccountData }) {
  const month = thisMonth()
  const rows = useMemo(() => data.transactions.filter(t => t.date.startsWith(month)), [data, month])
  const n = useFlags(rows).size
  if (n === 0) return null
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/money/transactions') }}
      className="flex-row items-center gap-3 rounded-card border border-border bg-warn-bg px-4 py-3 active:opacity-70">
      <Text className="text-[16px] text-warn">⚑</Text>
      <Text className="flex-1 text-[15px] text-ink"><Text className="font-bold text-ink">{n} {n === 1 ? 'transaction' : 'transactions'}</Text> worth a look this month</Text>
      <Text className="text-[16px] text-ink-3">›</Text>
    </Pressable>
  )
}

/**
 * Before you buy (D-42): a price, then one sentence: what it does to your
 * freedom date, on the same growth model as the date. The cost is time.
 */
export function BeforeYouBuy() {
  const f = useFreedom()
  const [price, setPrice] = useState('')
  if (!f) return null
  const monthly = f.monthlyIncome - f.monthlySpending
  const growth = f.inputs?.growthRate ?? REAL_RETURN
  const usd = fromInput(price.replace(/[^d.]/g, ''))
  const result = usd > 0 ? calcPurchaseImpact(usd, f.invested, Math.max(0, monthly), f.target, growth) : null
  return (
    <Card>
      <Label>Before you buy</Label>
      <Text className="mt-1 text-[15px] text-ink">Thinking of buying something?</Text>
      <View className="mt-2 w-44 flex-row items-center rounded-control border border-border-2 bg-ground px-3 py-2">
        <Text className="font-mono text-[17px] text-ink-3">{currencySymbol().trim()}</Text>
        <TextInput accessibilityLabel="Purchase price" placeholder="Price" placeholderTextColor={colors.ink3} keyboardType="decimal-pad"
          value={price} onChangeText={t => setPrice(t.replace(/[^d.,]/g, ''))} className="ml-1 text-[17px] text-ink" style={{ flex: 1, fontFamily: 'DMMono_400Regular' }} />
      </View>
      {result && (
        <Text accessibilityLiveRegion="polite" className="mt-3 text-[15px] leading-6 text-ink">
          It moves your freedom date <Text className="font-mono font-bold text-warn">{formatDelay(result.delayDays)} later</Text>.
        </Text>
      )}
      <Text className="mt-1.5 text-[12px] leading-4 text-ink-3">
        {monthly <= 0 || f.target <= 0 ? 'Add income, savings and spending for your own numbers.'
          : result ? `Invested instead, it would be worth ${money(result.futureValue)} by your freedom date, at ${Math.round(growth * 1000) / 10}% a year after inflation.`
          : 'Type a price to see what it costs you in time.'}
      </Text>
    </Card>
  )
}

/** Your goals (the website's "goals" Home card): each target and how far along it is. */
export function GoalsCard({ data }: { data: AccountData }) {
  if (data.goals.length === 0) return null
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/plan/goals') }}>
      <Card>
        <Label>Your goals</Label>
        {data.goals.slice(0, 4).map(g => (
          <View key={g.id} className="mt-2.5">
            <View className="flex-row justify-between">
              <Text className="text-[15px] text-ink">{g.emoji ?? '🎯'}  {g.name}</Text>
              <Text className="font-mono text-[13px] text-ink-2">{Math.round((g.current_saved / Math.max(g.target_amount, 1)) * 100)}%</Text>
            </View>
            <View className="mt-1"><ProgressTrack share={g.current_saved / Math.max(g.target_amount, 1)} height={6} /></View>
          </View>
        ))}
      </Card>
    </Pressable>
  )
}
