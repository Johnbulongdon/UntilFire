import { router } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { compareNetWorth, countdownLabel, ladderViewFromPlan, NET_WORTH_BENCHMARKS, NET_WORTH_INFLATION } from '@/engine'
import { upcoming } from '@/lib/bills'
import { contributionFacts, EMPTY_PLAN } from '@/lib/contribution-facts'
import { compactMoney, money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { netWorthOf } from '@/lib/net-worth'
import type { AccountData } from '@/state/account'

import { Card, Label, ProgressTrack } from './Screen'
import { Text } from './Text'

const NEED_KEYS = ['housing', 'food', 'transport', 'healthcare']

/**
 * Home's account cards, as on the website's Home: the glance row (net worth,
 * emergency fund), free to spend until payday, this month's contribution, and
 * how your net worth compares with US households your age. Home only reads;
 * every card opens the page where its numbers are changed.
 */
export function HomeAccountCards({ data }: { data: AccountData }) {
  const nw = netWorthOf(data)
  const needsBudget = NEED_KEYS.reduce((s, k) => s + (data.budget[k] ?? 0), 0)
  const needs = needsBudget > 0 ? needsBudget : Object.values(data.budget).reduce((s, v) => s + v, 0) * 0.6
  const efMonths = needs > 0 ? data.balances.cashSavings / needs : null

  return (
    <>
      <View className="flex-row gap-3">
        <Tile label="Net worth" value={compactMoney(nw.netWorth)} negative={nw.netWorth < 0} onPress={() => router.push('/money/net-worth')} />
        <Tile label="Emergency fund" value={efMonths == null ? '—' : `${efMonths.toFixed(1)} mo`}
          note={efMonths == null ? 'Set a budget' : efMonths >= 6 ? 'Healthy' : efMonths >= 1.5 ? 'Building' : 'Fragile'}
          onPress={() => router.push('/money/net-worth')} />
      </View>
      <FreeToSpend data={data} />
      <NextContribution data={data} />
      <Peers data={data} netWorth={nw.netWorth} />
    </>
  )
}

function Tile({ label, value, note, negative, onPress }: { label: string; value: string; note?: string; negative?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => { haptic.tick(); onPress() }}
      className="flex-1 rounded-card border border-border bg-card p-4 active:opacity-70">
      <Label>{label}</Label>
      <Text className={`mt-1 font-mono text-[20px] ${negative ? 'text-neg-ink' : 'text-ink'}`}>{value}</Text>
      {note ? <Text className="text-[12px] text-ink-3">{note}</Text> : null}
    </Pressable>
  )
}

/** FreeToSpendHome (D-29): one sentence, the cash free until payday once bills before it are set aside. */
function FreeToSpend({ data }: { data: AccountData }) {
  const events = upcoming(data.bills, 45)
  const payday = events.find(e => e.type === 'income' && e.counted)
  if (!payday) return null
  const before = events.filter(e => e.type === 'expense' && e.iso < payday.iso).reduce((s, e) => s - e.amount, 0)
  const free = data.balances.cashSavings - before
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/money/budget') }}>
      <Card>
        <Label>Free to spend until payday</Label>
        <Text className={`mt-1 font-mono text-[26px] ${free < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(free)}</Text>
        <Text className="text-[13px] text-ink-3">after {money(before)} of bills before {payday.description}</Text>
      </Card>
    </Pressable>
  )
}

/** NextContributionCard: this month's contribution, from the same ladder as Plan → Contributions. */
function NextContribution({ data }: { data: AccountData }) {
  const view = useMemo(() => ladderViewFromPlan(data.contributionPlan ?? EMPTY_PLAN, contributionFacts(data)), [data])
  if (!view || view.budget <= 0) return null
  const next = view.next
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/plan/contributions') }}>
      <Card>
        <Label>Next contribution · {countdownLabel(view.available.daysUntil)}</Label>
        <Text className="mt-1 font-mono text-[26px] text-ink">{money(view.budget)}</Text>
        {next && <Text className="text-[13px] text-ink-2">First to: <Text className="font-semibold text-ink">{next.label}</Text></Text>}
      </Card>
    </Pressable>
  )
}

/** CompareCard: net worth against US households of the same age (Federal Reserve survey, inflation-adjusted). */
function Peers({ data, netWorth }: { data: AccountData; netWorth: number }) {
  const c = compareNetWorth({ netWorthUsd: netWorth, age: data.age, ageAssumed: !(data.age && data.age > 0), currency: data.currency }, NET_WORTH_BENCHMARKS, NET_WORTH_INFLATION)
  if (!c) return null
  return (
    <Card>
      <Label>How you compare</Label>
      <Text className="mt-1 text-[16px] leading-6 text-ink">
        {c.aboveTop ? 'Above the top 1%' : <>Ahead of <Text className="font-bold text-teal-deep">{c.aheadOfPct}%</Text></>} of US households {c.bandLabel}.
      </Text>
      <View className="mt-3"><ProgressTrack share={c.aheadOfPct / 100} height={6} /></View>
      <Text className="mt-1.5 text-[12px] text-ink-3">Federal Reserve Survey of Consumer Finances {c.surveyYear}{c.adjustedThrough ? `, adjusted for inflation through ${c.adjustedThrough}` : ''}.</Text>
    </Card>
  )
}
