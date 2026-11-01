import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { useMemo, useState } from 'react'
import { View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, Label, ProgressTrack } from '@/components/Screen'
import { Text } from '@/components/Text'
import { brand } from '@/theme/colors'
import { countdownLabel, ladderViewFromPlan, planContribution } from '@/engine'
import { contributionFacts, EMPTY_PLAN } from '@/lib/contribution-facts'
import { money } from '@/lib/format'
import { contributionDestinations, contributionWarnings } from '@engine/contribution-presentation.ts'
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
  const [showMix, setShowMix] = useState(false)
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
  const warnings = contributionWarnings(view)
  const primaryWarning = warnings[0]

  return (
    <DetailScreen back="Plan" title="Contributions" refreshing={loading} onRefresh={refresh}>
      {primaryWarning && <Card>
        <Text className="text-[16px] font-bold text-ink">{primaryWarning.action === 'accounts' ? 'Update your balances first' : 'Review your cash flow first'}</Text>
        <Text className="mt-2 text-[14px] leading-5 text-ink-2">{warnings.map(w => w.text).join(' ')}</Text>
        <Button style={{ marginTop: 12 }} label={primaryWarning.action === 'accounts' ? 'Review balances' : 'Review cash flow'}
          onPress={() => router.push(primaryWarning.action === 'accounts' ? '/money/net-worth' : '/money/calendar')} />
      </Card>}
      {/* Simplified Oct 2026 QA: the amount, when, one button; the working is one tap away. */}
      <Card>
        <Label>{a.done ? 'Made this cycle' : `Planned for ${a.nextDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}`}</Label>
        <Text className="mt-1 font-mono text-[34px] text-ink">{money(a.done ? a.done.amount : view.budget)}</Text>
        {!a.done && <Text className="text-[13px] text-ink-3">{warnings.length ? 'Estimate · review needed' : view.budgetIsCustom ? 'Your amount' : `Estimate after bills · ${countdownLabel(a.daysUntil)}`}</Text>}
        {session && (a.done || view.budget > 0) && (
          <Button style={{ marginTop: 12 }} kind={a.done || warnings.length ? 'quiet' : 'primary'} disabled={marking} label={a.done ? 'Undo' : `Mark ${money(view.budget)} as made`}
            onPress={async () => {
              setMarking(true)
              const problem = await saveFireProfile(session.user.id, { contributionDone: a.done ? null : { iso: a.forecast.contributionIso, amount: Math.round(view.budget) } })
              setMarking(false)
              if (problem) { haptic.warn(); return }
              haptic.success(); refresh()
            }} />
        )}
        {!showHow && (
          <Button small kind="quiet" style={{ marginTop: 10 }} label="How calculated" onPress={() => { haptic.tick(); setShowHow(true) }} />
        )}
        {/* The calculation remains available without filling the main screen. */}
        {showHow && (
          <View className="mt-3 gap-1 border-t border-border pt-3">
            <Button small kind="quiet" label="Hide calculation" onPress={() => setShowHow(false)} />
            <Line label="Emergency savings now" value={money(view.efBalance)} />
            <Line label="Emergency target" value={money(view.efTarget)} />
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
        <Ladder fills={view.waterfall.fills} />
      </Card>

      {!primaryWarning && view.budget > 0 && view.next && ['emergency-floor', 'emergency-target', 'taxable', 'tax-advantaged'].includes(view.next.kind) && <Button kind="quiet" label="Choose destination account" onPress={() => router.push(('/plan/account-setup?goal=' + (view.next?.kind === 'taxable' || view.next?.kind === 'tax-advantaged' ? 'invest' : 'save')) as never)} />}
      <Card>
        <Button kind="quiet" label={showMix ? 'Hide investment allocation' : 'Investment allocation'} onPress={() => setShowMix(v => !v)} />
        {showMix && <View>
        <Label>Your investing mix</Label>
        {!mix ? (
          <Text className="mt-2 text-[14px] leading-5 text-ink-2">
            {plan.targets.length === 0 ? 'Set your investment targets.' : 'Nothing reaches investing this time.'}
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
        </View>}
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
function Ladder({ fills }: { fills: Fill[] }) {
  const funded = contributionDestinations(fills)
  const total = funded.reduce((t,f) => t + f.amount, 0)
  const shades = [brand.mint, brand.lilac, brand.blue, brand.pink]
  return <View className="mt-3 gap-3">
    {total > 0 && <View accessibilityRole="image" accessibilityLabel={funded.map(f => f.label + ' ' + money(f.amount)).join(', ')} className="h-3 flex-row gap-0.5 overflow-hidden rounded-full">
      {funded.map((f,i) => <View key={f.kind} style={{ flex: f.amount, backgroundColor: shades[i % shades.length] }} />)}
    </View>}
    {funded.map(f => <View key={f.kind} className="flex-row items-center justify-between gap-3 border-b border-border py-3">
      <Text className="flex-1 text-[16px] font-semibold text-ink">{f.label}</Text>
      <Text className="font-mono text-[20px] font-bold text-ink">{money(f.amount)}</Text>
    </View>)}
    {total === 0 && <Text className="text-[14px] text-ink-2">Nothing allocated this cycle.</Text>}
    {total > 0 && !funded.some(f => f.kind === 'taxable') && <Text className="text-[13px] text-ink-2">Investments · $0 this cycle</Text>}
  </View>
}
