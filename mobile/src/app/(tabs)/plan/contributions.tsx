import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { useMemo, useState } from 'react'
import { View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, Label, ProgressTrack } from '@/components/Screen'
import { Text } from '@/components/Text'
import { brand, colors } from '@/theme/colors'
import { MoneyRow } from '@/components/MoneyRow'
import { monthlySaving } from '@/lib/saving'
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
  const [showHow, setShowHow] = useState(false)
  const plan = data?.contributionPlan ?? EMPTY_PLAN
  const view = useMemo(() => (data ? ladderViewFromPlan(plan, contributionFacts(data)) : null), [data, plan])

  if (!session) {
    return (
      <DetailScreen back="Plan" title="Contributions">
        <Card soft>
          <Text className="text-[15px] leading-6 text-ink-2">Sign in to see where each month&apos;s saving should go, worked out from your accounts and bills.</Text>
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
  const saving = monthlySaving(data).saving

  return (
    <DetailScreen back="Plan" title="Contributions" refreshing={loading} onRefresh={refresh}>
      {/* Simplified Oct 2026 QA: the amount, when, one button; the working is one tap away. */}
      <Card>
        <Label>{a.done ? 'Made this time' : `Put in by ${a.nextDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}`}</Label>
        <Text className="mt-1 font-mono text-[34px] text-ink">{money(a.done ? a.done.amount : view.budget)}</Text>
        {!a.done && <Text className="text-[13px] text-ink-3">{view.budgetIsCustom ? 'Your amount' : `Safe after bills · ${countdownLabel(a.daysUntil)}`}</Text>}
        {/* Tied to the one monthly saving (lib/saving, audit round 3), so this isn't a third number. */}
        {!a.done && !view.budgetIsCustom && saving > 0 && view.budget > 0 && (
          <View className="mt-2">
            <MoneyRow first icon="arrow.up.right" fallback="↗" label="You save each month" value={money(saving)} tint={colors.teal} />
            {Math.abs(view.budget - saving) >= 1 && (
              <MoneyRow icon="banknote.fill" fallback="$" label={view.budget > saving ? 'Extra cash on hand' : 'Kept back for bills'}
                value={`${view.budget > saving ? '+' : '−'}${money(Math.abs(view.budget - saving))}`} />
            )}
          </View>
        )}
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
        {!view.budgetIsCustom && !a.done && !showHow && view.budget > 0 && (
          <Button small kind="quiet" style={{ marginTop: 10 }} label="How it's worked out" onPress={() => { haptic.tick(); setShowHow(true) }} />
        )}
        {/* At $0 the working is the answer, so it shows without a tap. */}
        {!view.budgetIsCustom && !a.done && (showHow || view.budget <= 0) && (
          <View className="mt-3 gap-1 border-t border-border pt-3">
            <Line label="Cash outside your emergency fund" value={money(a.cash)} />
            {a.income > 0 && <Line label="Income before then" value={`+${money(a.income)}`} tone="pos" />}
            {a.committed > 0 && <Line label="Bills and day-to-day before then" value={`−${money(a.committed)}`} />}
            {!a.hasExpectedData && <Text className="mt-1 text-[12px] text-ink-3">Add bills and paydays in Money → Calendar so this counts what&apos;s already spoken for.</Text>}
          </View>
        )}
        <View className="mt-4 flex-row items-center justify-between border-t border-border pt-3">
          <Label>Where it goes</Label>
          <Button small kind="quiet" label="Edit" onPress={() => { haptic.tick(); router.push('/contribution-edit') }} />
        </View>
        <Ladder fills={view.waterfall.fills} next={view.next?.kind}
          met={[...(view.efBalance >= view.efFloor ? ['emergency-floor'] : []), ...(view.efBalance >= view.efTarget ? ['emergency-target'] : [])]} />
      </Card>

      <Card>
        <View className="flex-row items-baseline justify-between">
          <Label>Emergency fund</Label>
          <Text className="font-mono text-[13px] text-ink-3">of {money(view.efTarget)}</Text>
        </View>
        <Text className="mt-1 font-mono text-[22px] text-ink">{money(view.efBalance)}</Text>
        <View className="mt-2"><ProgressTrack share={efShare} /></View>
      </Card>

      <Card>
        <Label>Your investing mix</Label>
        {!mix ? (
          <Text className="mt-2 text-[14px] leading-5 text-ink-2">
            {plan.targets.length === 0 ? 'Set a mix, like 80% VTI and 20% BND.' : 'Nothing reaches investing this time.'}
          </Text>
        ) : mix.assets.map((s, i) => (
          <View key={s.symbol} className={`gap-1.5 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="flex-row justify-between">
              <Text className="text-[15px] font-semibold text-ink">{s.symbol} <Text className="font-mono text-[12px] text-ink-3">{Math.round(s.currentPct * 100)}→{Math.round(s.targetPct * 100)}%</Text></Text>
              <Text className="font-mono text-[15px] text-ink">{money(s.adjusted)}</Text>
            </View>
            <ProgressTrack share={s.targetPct ? s.currentPct / s.targetPct : 0} height={6} />
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
 * the whole, and the rest named in one line. Rungs are numbered, so the shades are never the only cue.
 */
function Ladder({ fills, next, met = [] }: { fills: Fill[]; next?: string; met?: string[] }) {
  const funded = fills.filter(f => f.enabled && f.amount > 0)
  const later = fills.filter(f => f.enabled && f.amount <= 0)
  const total = funded.reduce((t, f) => t + f.amount, 0)
  // Labels and numbers preserve order independently of the decorative colours.
  const shade = (i: number) => ({ backgroundColor: [brand.lilac, brand.blue, brand.mint, brand.yellow, brand.pink][i % 5] })
  // With nothing free yet, still show the order money will go in, saving first (Oct 2026 QA: "invest" includes saving).
  if (funded.length === 0) {
    return (
      <View className="mt-2 gap-2.5">
        <Text className="text-[13px] leading-5 text-ink-3">When money&apos;s free, it fills these in order:</Text>
        {later.slice(0, 4).map((f, i) => (
          <View key={f.kind} className="flex-row items-center gap-2.5">
            <View className="h-6 w-6 items-center justify-center rounded-full border-[1.5px]" style={{ borderColor: colors.border2 }}>
              <Text className="text-[12px] font-bold" style={{ color: colors.ink }}>{i + 1}</Text>
            </View>
            <Text className="flex-1 text-[15px] font-semibold text-ink">{f.label}</Text>
          </View>
        ))}
      </View>
    )
  }
  return (
    <View className="mt-3 gap-4">
      <View accessibilityLabel={funded.map(f => `${f.label} ${money(f.amount)}`).join(', ')} className="h-4 flex-row gap-0.5 overflow-hidden rounded-full">
        {funded.map((f, i) => <View key={f.kind} style={[{ flex: f.amount }, shade(i)]} />)}
      </View>
      {funded.map((f, i) => (
        <View key={f.kind} className="gap-1.5">
          <View className="flex-row items-center gap-2.5">
            <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: brand.lilac }}>
              <Text style={{ color: brand.deep }} className="text-[12px] font-bold">{i + 1}</Text>
            </View>
            <Text className={`flex-1 text-[15px] ${f.kind === next ? 'font-bold' : 'font-semibold'} text-ink`}>{f.label}</Text>
            <Text className="font-mono text-[15px] text-ink">{money(f.amount)}</Text>
          </View>
          <View className="ml-[34px] h-2 overflow-hidden rounded-full bg-surface-2">
            <View className="h-full rounded-full" style={[{ width: `${Math.max(3, (f.amount / total) * 100)}%` }, shade(i)]} />
          </View>
        </View>
      ))}
      {/* The rest of the ladder as more numbered steps, one per line, not a run-on list (audit round 3). */}
      {later.map((f, i) => (
        <View key={f.kind} className="flex-row items-center gap-2.5">
          <View className="h-6 w-6 items-center justify-center rounded-full border-[1.5px]" style={{ borderColor: colors.border2 }}>
            <Text className="text-[12px] font-bold" style={{ color: colors.ink }}>{met.includes(f.kind) ? '✓' : funded.length + i + 1}</Text>
          </View>
          <Text className={`flex-1 text-[14px] ${met.includes(f.kind) ? 'text-ink-3 line-through' : 'text-ink-2'}`}>{f.label}</Text>
          {met.includes(f.kind) && <Text className="text-[13px] font-semibold text-ink-3">Done</Text>}
        </View>
      ))}
    </View>
  )
}
