import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { addMonths, isoDay, monthOf, rangeFor } from '@/engine'
import { compactMoney, money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, isIncome, isSpend, thisMonth } from '@/lib/money-data'
import { summarise } from '@/lib/spend-summary'
import { spentUSD, toUSD, useAccount } from '@/state/account'

const PERIODS = [3, 6, 12] as const

/** The website's Insights: one month explained, then spending and income over 3, 6 or 12 months. */
export default function Insights() {
  const { data, loading, refresh } = useAccount()
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(6)
  const month = thisMonth()
  const today = isoDay(new Date())

  const explained = useMemo(() => (data ? summarise(data.transactions, rangeFor(1, month), today) : null), [data, month, today])
  const trend = useMemo(() => {
    if (!data) return []
    return Array.from({ length: period }, (_, i) => addMonths(month, i - period + 1)).map(m => {
      const inMonth = data.transactions.filter(t => monthOf(t.date) === m)
      const out = inMonth.filter(isSpend).reduce((s, t) => s + spentUSD(t), 0)
      const inn = inMonth.filter(isIncome).reduce((s, t) => s + toUSD(t.amount, t.currency), 0)
      return { m, out, inn }
    })
  }, [data, period, month])

  if (!data || !explained) return <DetailScreen back="Money" title="Insights"><LoadingState /></DetailScreen>

  const monthTx = explained.inRange.filter(isSpend)
  const biggest = [...monthTx].sort((a, b) => spentUSD(b) - spentUSD(a))[0]
  const merchants = new Map<string, number>()
  for (const t of monthTx) merchants.set(t.description || categoryOf(t.category).label, (merchants.get(t.description || categoryOf(t.category).label) ?? 0) + spentUSD(t))
  const topMerchants = [...merchants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const saved = explained.inn - explained.out
  const rate = explained.inn > 0 ? saved / explained.inn : null
  const peak = Math.max(...trend.map(t => Math.max(t.out, t.inn)), 1)
  // Average over months that have any money in them, so a new account isn't dragged down by empty months.
  const active = trend.filter(t => t.inn > 0 || t.out > 0)
  const avgOut = active.reduce((s, t) => s + t.out, 0) / Math.max(1, active.length)
  const avgIn = active.reduce((s, t) => s + t.inn, 0) / Math.max(1, active.length)
  const monthName = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long' })

  return (
    <DetailScreen back="Money" title="Insights" refreshing={loading} onRefresh={refresh}>
      <Card>
        <Label>{monthName} so far</Label>
        <Text className="mt-1 text-[16px] leading-6 text-ink">
          You've spent <Text className="font-mono text-[16px]">{money(explained.out)}</Text>
          {explained.usual != null
            ? <>, {explained.out > explained.usual ? <Text className="font-bold text-warn">{money(explained.out - explained.usual)} more</Text> : <Text className="font-bold text-pos-ink">{money(explained.usual - explained.out)} less</Text>} than usual by today</>
            : null}
          {rate != null ? <>, and kept <Text className="font-bold text-teal-deep">{Math.round(Math.max(0, rate) * 100)}%</Text> of what came in</> : null}.
        </Text>
        {explained.moved.length > 0 && (
          <View className="mt-3 border-t border-border pt-3">
            <Text className="mb-1 text-[13px] text-ink-3">What moved</Text>
            {explained.moved.map(m => (
              <View key={m.key} className="flex-row justify-between py-0.5">
                <Text className="text-[14px] text-ink">{categoryOf(m.key).emoji}  {categoryOf(m.key).label}</Text>
                <Text className={`font-mono text-[14px] ${m.diff > 0 ? 'text-warn' : 'text-pos-ink'}`}>{m.diff > 0 ? '+' : '−'}{money(Math.abs(m.diff))}</Text>
              </View>
            ))}
          </View>
        )}
        {topMerchants.length > 0 && (
          <View className="mt-3 border-t border-border pt-3">
            <Text className="mb-1 text-[13px] text-ink-3">Where it went most</Text>
            {topMerchants.map(([name, usd]) => (
              <View key={name} className="flex-row justify-between py-0.5">
                <Text numberOfLines={1} className="flex-1 pr-3 text-[14px] text-ink">{name}</Text>
                <Text className="font-mono text-[14px] text-ink">{money(usd)}</Text>
              </View>
            ))}
          </View>
        )}
        {biggest && (
          <Text className="mt-3 text-[13px] text-ink-2">Biggest single spend: {biggest.description || categoryOf(biggest.category).label}, <Text className="font-mono text-[13px]">{money(spentUSD(biggest))}</Text>.</Text>
        )}
      </Card>

      <Card>
        <View className="flex-row items-center justify-between">
          <Label>In and out</Label>
          <View className="flex-row rounded-full bg-surface-2 p-0.5">
            {PERIODS.map(p => (
              <Pressable accessibilityRole="button" key={p} onPress={() => { haptic.select(); setPeriod(p) }} className={`rounded-full px-3 py-1 ${period === p ? 'bg-card' : ''}`}>
                <Text className={`text-[12px] font-bold ${period === p ? 'text-ink' : 'text-ink-3'}`}>{p}M</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="mt-4 h-32 flex-row items-end" style={{ gap: period === 12 ? 4 : 8 }}>
          {trend.map(t => (
            <View key={t.m} className="flex-1 flex-row items-end" style={{ gap: 2, height: '100%' }}>
              <View className="flex-1 rounded-t bg-green" style={{ height: `${Math.max(1, (t.inn / peak) * 100)}%` }} />
              <View className="flex-1 rounded-t bg-sun" style={{ height: `${Math.max(1, (t.out / peak) * 100)}%` }} />
            </View>
          ))}
        </View>
        <View className="mt-1 flex-row" style={{ gap: period === 12 ? 4 : 8 }}>
          {trend.map(t => (
            <Text key={t.m} className="flex-1 text-center text-[10px] text-ink-3">{new Date(`${t.m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'narrow' })}</Text>
          ))}
        </View>
        <View className="mt-3 flex-row gap-4">
          <View className="flex-row items-center gap-1.5"><View className="h-2 w-2 rounded-full bg-green" /><Text className="text-[13px] text-ink-2">In, avg {compactMoney(avgIn)}</Text></View>
          <View className="flex-row items-center gap-1.5"><View className="h-2 w-2 rounded-full bg-sun" /><Text className="text-[13px] text-ink-2">Out, avg {compactMoney(avgOut)}</Text></View>
        </View>
        {avgIn > 0 && (
          <Text className="mt-2 text-[13px] text-ink-2">
            Over {active.length === trend.length ? `${period} months` : `${active.length} ${active.length === 1 ? 'month' : 'months'}`} you kept <Text className="font-bold text-teal-deep">{Math.round(Math.max(0, (avgIn - avgOut) / avgIn) * 100)}%</Text> of what came in.
          </Text>
        )}
      </Card>
    </DetailScreen>
  )
}
