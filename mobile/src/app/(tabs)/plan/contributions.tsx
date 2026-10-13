import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, Label, ProgressTrack } from '@/components/Screen'
import { Text } from '@/components/Text'
import { TAB_COLOR } from '@/theme/colors'
import { countdownLabel, ladderViewFromPlan, planContribution } from '@/engine'
import { contributionFacts, EMPTY_PLAN } from '@/lib/contribution-facts'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { saveFireProfile } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'

/**
 * The website's Contributions: what is safe to put in at the next
 * contribution, and the ladder it fills in order (emergency floor, employer
 * match, expensive debt, full emergency fund, tax-advantaged room, cheap debt,
 * then investing), with the investing split by your target mix.
 */
export default function Contributions() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  const [marking, setMarking] = useState(false)
  const plan = data?.contributionPlan ?? EMPTY_PLAN
  const view = useMemo(() => (data ? ladderViewFromPlan(plan, contributionFacts(data)) : null), [data, plan])

  if (!session) {
    return (
      <DetailScreen back="Plan" title="Contributions">
        <Card soft>
          <Text className="text-[15px] leading-6 text-ink-2">Sign in to see where each month's saving should go, worked out from your accounts and bills.</Text>
          <View className="mt-4"><PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} /></View>
        </Card>
      </DetailScreen>
    )
  }
  if (!data || !view) return <DetailScreen back="Plan" title="Contributions"><LoadingState /></DetailScreen>

  const a = view.available
  const mix = plan.targets.length > 0 && view.investable > 0
    ? planContribution(plan.targets.map(t => ({ symbol: t.symbol, targetPct: t.targetPct })), plan.holdings, view.investable)
    : null
  const efShare = view.efTarget > 0 ? view.efBalance / view.efTarget : 0

  return (
    <DetailScreen back="Plan" title="Contributions" subtitle="Where each month's saving goes, in order" refreshing={loading} onRefresh={refresh}>
      <Card>
        <Label>Next contribution · {a.nextDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} ({countdownLabel(a.daysUntil)})</Label>
        <Text className="mt-1 font-mono text-[32px] text-ink">{money(view.budget)}</Text>
        <Text className="text-[13px] text-ink-3">
          {a.done ? `Already made: ${money(a.done.amount)}` : view.budgetIsCustom ? 'The amount you set' : 'Safe to put in, after bills before then'}
        </Text>
        {session && (a.done || view.budget > 0) && (
          <Button style={{ marginTop: 12 }} kind={a.done ? 'quiet' : 'primary'} disabled={marking} label={a.done ? 'Undo' : `Mark ${money(view.budget)} as made`}
            onPress={async () => {
              setMarking(true)
              const problem = await saveFireProfile(session.user.id, { contributionDone: a.done ? null : { iso: a.forecast.contributionIso, amount: Math.round(view.budget) } })
              setMarking(false)
              if (problem) { haptic.warn(); return }
              haptic.success(); refresh()
            }} />
        )}
        {!view.budgetIsCustom && !a.done && (
          <View className="mt-3 gap-1 border-t border-border pt-3">
            <Line label="Cash outside your emergency fund" value={money(a.cash)} />
            {a.income > 0 && <Line label="Coming in before then" value={`+${money(a.income)}`} tone="pos" />}
            {a.committed > 0 && <Line label="Bills and day-to-day before then" value={`−${money(a.committed)}`} />}
            {!a.hasExpectedData && <Text className="mt-1 text-[12px] text-ink-3">Add bills and paydays in Money → Calendar so this counts what's already spoken for.</Text>}
          </View>
        )}
      </Card>

      <Card>
        <View className="flex-row justify-between">
          <Label>Where it goes</Label>
          <Button small kind="quiet" label="Edit" onPress={() => { haptic.tick(); router.push('/contribution-edit') }} />
        </View>
        <Ladder fills={view.waterfall.fills} next={view.next?.kind} />
      </Card>

      <Card>
        <Label>Emergency fund</Label>
        <Text className="mt-1 font-mono text-[22px] text-ink">{money(view.efBalance)}</Text>
        <View className="mt-2"><ProgressTrack share={efShare} /></View>
        <Text className="mt-1.5 text-[12px] text-ink-3">
          Floor {money(view.efFloor)} · target {money(view.efTarget)} ({money(view.expenses)}/mo of needs{view.expensesAreCustom ? ', set by you' : ''})
        </Text>
      </Card>

      <Card>
        <Label>Your investment mix</Label>
        {!mix ? (
          <Text className="mt-2 text-[14px] leading-5 text-ink-2">
            {plan.targets.length === 0 ? 'Set a target mix (for example 80% VTI, 20% BND) and each contribution is split to keep you on it.' : 'Nothing reaches investing this time; the rungs above take it first.'}
          </Text>
        ) : mix.assets.map((s, i) => (
          <View key={s.symbol} className={`py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="flex-row justify-between">
              <Text className="text-[15px] font-semibold text-ink">{s.symbol}</Text>
              <Text className="font-mono text-[15px] text-ink">{money(s.adjusted)}</Text>
            </View>
            <Text className={`text-[12px] ${s.status === 'on-track' ? 'text-ink-3' : 'text-warn'}`}>
              {Math.round(s.currentPct * 100)}% now · target {Math.round(s.targetPct * 100)}%{s.status === 'under' ? ' · under, topped up' : s.status === 'over' ? ' · over, held back' : ''}
            </Text>
          </View>
        ))}
        <View className="mt-2"><Button small kind="quiet" label={plan.targets.length ? 'Change your mix' : 'Set a mix'} onPress={() => router.push('/contribution-edit')} /></View>
      </Card>
    </DetailScreen>
  )
}

function Line({ label, value, tone }: { label: string; value: string; tone?: 'pos' }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-[13px] text-ink-2">{label}</Text>
      <Text className={`font-mono text-[13px] ${tone === "pos" ? "text-pos-ink" : "text-ink"}`}>{value}</Text>
    </View>
  )
}

type Fill = { kind: string; label: string; why: string; amount: number; enabled: boolean }

/**
 * The ladder as a picture (Oct 2026 QA: the rows of text hid the order of
 * magnitude): one bar split by rung, each funded rung's own bar sized against
 * the whole, the reason shown only for the rung up next, and the rest named in
 * one line. Rungs are numbered, so the shades are never the only cue.
 */
function Ladder({ fills, next }: { fills: Fill[]; next?: string }) {
  const funded = fills.filter(f => f.enabled && f.amount > 0)
  const later = fills.filter(f => f.enabled && f.amount <= 0)
  const off = fills.length - funded.length - later.length
  const total = funded.reduce((t, f) => t + f.amount, 0)
  // Plan's colour, lighter for each later rung's bar; badges stay solid so their numbers stay readable.
  const shade = (i: number) => ({ backgroundColor: `${TAB_COLOR.plan}${Math.round(Math.max(0.4, 1 - i * 0.2) * 255).toString(16).padStart(2, '0')}` })
  if (funded.length === 0) {
    return <Text className="mt-2 text-[14px] leading-5 text-ink-2">Nothing to put in this time. Each rung fills in order once there is.</Text>
  }
  return (
    <View className="mt-3 gap-4">
      <View accessibilityLabel={funded.map(f => `${f.label} ${money(f.amount)}`).join(', ')} className="h-4 flex-row gap-0.5 overflow-hidden rounded-full">
        {funded.map((f, i) => <View key={f.kind} style={[{ flex: f.amount }, shade(i)]} />)}
      </View>
      {funded.map((f, i) => (
        <View key={f.kind} className="gap-1.5">
          <View className="flex-row items-center gap-2.5">
            <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: TAB_COLOR.plan }}>
              <Text className="text-[12px] font-bold text-white">{i + 1}</Text>
            </View>
            <Text className={`flex-1 text-[15px] ${f.kind === next ? 'font-bold' : 'font-semibold'} text-ink`}>{f.label}</Text>
            <Text className="font-mono text-[15px] text-ink">{money(f.amount)}</Text>
          </View>
          <View className="ml-[34px] h-2 overflow-hidden rounded-full bg-surface-2">
            <View className="h-full rounded-full" style={[{ width: `${Math.max(3, (f.amount / total) * 100)}%` }, shade(i)]} />
          </View>
          {f.kind === next && <Text className="ml-[34px] text-[12px] leading-4 text-ink-3">{f.why}</Text>}
        </View>
      ))}
      {(later.length > 0 || off > 0) && (
        <Text className="text-[12px] leading-4 text-ink-3">
          {later.length > 0 ? `After that: ${later.map(f => f.label).join(', ')}.` : ''}{later.length > 0 && off > 0 ? ' ' : ''}{off > 0 ? `${off} switched off.` : ''}
        </Text>
      )}
    </View>
  )
}
