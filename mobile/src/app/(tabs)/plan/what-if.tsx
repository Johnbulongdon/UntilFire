import Slider from '@react-native-community/slider'
import { Button } from '@/components/Button'
import { useRef, useState } from 'react'
import { View } from 'react-native'

import { Bouncy } from '@/components/Bouncy'
import { DetailScreen } from '@/components/DetailScreen'
import { Icon } from '@/components/Icon'
import { BeforeYouBuy } from '@/components/HomeAccountCards'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { money, roundNice } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useLivePlan } from '@/state/live-plan'
import { project, useFreedom } from '@/state/freedom'
import { freedomFor, type Plan as PlanData } from '@/state/plan'
import { TAB_COLOR } from '@/theme/colors'
import { colors } from '@/theme/colors'

/** "3 years sooner", "Same as today" — the freedom-date delta, in teal when it's good news. */
function deltaLabel(base: number | null, next: number | null): { text: string; good: boolean } {
  if (base == null || next == null) return { text: next == null ? 'More than 65 years' : 'Within reach', good: next != null }
  const d = base - next
  if (d === 0) return { text: 'Same as today', good: false }
  return d > 0
    ? { text: `${d} ${d === 1 ? 'year' : 'years'} sooner`, good: true }
    : { text: `${-d} ${d === -1 ? 'year' : 'years'} later`, good: false }
}

/** How can I reach freedom? (docs/design/app-structure.md) */
export default function WhatIf() {
  const { plan } = useLivePlan()
  const f = useFreedom()
  const full = f?.source === 'account' && f.inputs ? f.inputs : null
  // Signed in, each try runs the website's full projection with only spending or pay changed.
  const yearFor = (p: PlanData) => (full ? project({ ...full, monthlyExpenses: p.monthlySpending, annualIncome: p.monthlyIncome * 12 }, null).year : freedomFor(p).year)
  const [spending, setSpending] = useState(plan?.monthlySpending ?? 0)
  const [income, setIncome] = useState(plan?.monthlyIncome ?? 0)
  const lastYear = useRef<number | null>(null)
  if (!plan) return null

  const now = { year: yearFor(plan) }
  const tried: PlanData = { ...plan, monthlySpending: spending, monthlyIncome: income }
  const whatIf = { year: yearFor(tried) }
  const delta = deltaLabel(now.year, whatIf.year)
  const changed = spending !== plan.monthlySpending || income !== plan.monthlyIncome

  // The website's next moves (app/dashboard/page.tsx), each one tap to try.
  const moves = [
    { icon: 'banknote.fill' as const, label: `Save ${money(500)} more a month`, apply: () => { setSpending(Math.max(0, plan.monthlySpending - 500)); setIncome(plan.monthlyIncome) } },
    { icon: 'scissors' as const, label: 'Spend 10% less', apply: () => { setSpending(roundNice(plan.monthlySpending * 0.9)); setIncome(plan.monthlyIncome) } },
    { icon: 'chart.line.uptrend.xyaxis' as const, label: 'Earn 10% more', note: 'if the raise is saved', apply: () => { setIncome(roundNice(plan.monthlyIncome * 1.1)); setSpending(plan.monthlySpending) } },
  ]

  const onSlide = (next: PlanData) => {
    const y = yearFor(next)
    if (y !== lastYear.current) { lastYear.current = y; haptic.tick() }
  }

  return (
    <DetailScreen back="Plan" title="What if" subtitle="Try a change and watch your date move">
      <Card>
        <Label>{changed ? 'With this change, work becomes optional in' : 'Work becomes optional in'}</Label>
        <Text className="font-display text-[44px] font-bold leading-[50px] text-teal">{whatIf.year ?? '65+ yrs'}</Text>
        <Text className={`text-[14px] font-semibold ${delta.good ? 'text-teal-deep' : 'text-ink-2'}`}>
          {changed ? delta.text : now.year != null ? 'Your plan today' : 'More than 65 years at this pace'}
        </Text>
      </Card>

      {/* Moved here from Home (V2): what a purchase costs in time is a what-if. */}
      <BeforeYouBuy />

      <View className="gap-2.5">
        <Label>Next moves</Label>
        {moves.map(m => {
          const result = (() => {
            const p = { ...plan }
            if (m.label.startsWith('Earn')) p.monthlyIncome = roundNice(plan.monthlyIncome * 1.1)
            else if (m.label.startsWith('Spend')) p.monthlySpending = roundNice(plan.monthlySpending * 0.9)
            else p.monthlySpending = Math.max(0, plan.monthlySpending - 500)
            return deltaLabel(now.year, yearFor(p))
          })()
          return (
            <Bouncy key={m.label} accessibilityRole="button" onPress={() => { haptic.select(); m.apply() }}>
              <View className="flex-row items-center gap-3 rounded-card border border-border bg-card px-4 py-3.5">
                <Icon name={m.icon} size={26} color={TAB_COLOR.plan} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">{m.label}</Text>
                  {m.note ? <Text className="text-[12px] text-ink-3">{m.note}</Text> : null}
                </View>
                <Text className={`text-[13px] font-bold ${result.good ? 'text-teal-deep' : 'text-ink-3'}`}>{result.text}</Text>
              </View>
            </Bouncy>
          )
        })}
      </View>

      <Card>
        <SliderRow
          label="Monthly spending"
          value={spending}
          max={Math.max(plan.monthlyIncome, plan.monthlySpending) * 1.2}
          onChange={v => { setSpending(v); onSlide({ ...tried, monthlySpending: v }) }}
        />
        <View className="my-4 h-px bg-border" />
        <SliderRow
          label="Monthly take-home"
          value={income}
          max={Math.max(plan.monthlyIncome * 2, plan.monthlySpending)}
          onChange={v => { setIncome(v); onSlide({ ...tried, monthlyIncome: v }) }}
        />
        {changed && (
          <Button small kind="quiet" style={{ marginTop: 16 }} label="Reset to my plan" onPress={() => { setSpending(plan.monthlySpending); setIncome(plan.monthlyIncome) }} />
        )}
      </Card>
    </DetailScreen>
  )
}

function SliderRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <View>
      <View className="flex-row justify-between">
        <Text className="text-[15px] font-semibold text-ink">{label}</Text>
        <Text className="font-mono text-[15px] text-ink">{money(value)}</Text>
      </View>
      <Slider
        style={{ marginTop: 8, height: 36 }}
        minimumValue={0}
        maximumValue={max}
        step={roundNice(max / 100) || 10}
        value={value}
        minimumTrackTintColor={colors.teal}
        maximumTrackTintColor={colors.surface2}
        thumbTintColor={colors.green}
        onValueChange={onChange}
      />
    </View>
  )
}
