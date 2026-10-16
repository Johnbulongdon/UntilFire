import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, View } from 'react-native'

import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label, ProgressTrack } from '@/components/Screen'
import { Text } from '@/components/Text'
import { compactMoney, money } from '@/lib/format'
import { reportHtml, shareReport } from '@/lib/freedom-report'
import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'
import { useAccount } from '@/state/account'
import { project, useFreedom } from '@/state/freedom'
import { spendingBasis } from '@/lib/budget-split'

/**
 * The freedom date with everything behind it. Signed in, it is the website's
 * full projection (debts, mortgages, tax, growth, pay growth, pension access);
 * the assumptions and goal that move it are one tap away.
 */
export default function Freedom() {
  const f = useFreedom()
  const { data } = useAccount()
  const [sharing, setSharing] = useState(false)
  if (!f) return null
  const full = f.source === 'account'
  const p = data?.profile
  const share = f.target > 0 ? f.invested / f.target : 0
  const pts = f.series.filter(s => s.year <= Math.max(5, Math.ceil((f.years ?? 30) + 3))).slice(0, 41)
  const peak = Math.max(...pts.map(s => Math.max(s.invested, s.target)), 1)

  return (
    <DetailScreen back="Plan" title="Freedom date" subtitle={full ? 'The full projection, from your account' : 'A quick estimate from your onboarding answers'}>
      <Card>
        <Label>Work becomes optional</Label>
        <Text className="font-display text-[44px] font-bold leading-[50px] text-teal">
          {f.date ? f.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : f.year ?? '65+ yrs'}
        </Text>
        {f.years != null && (
          <Text className="text-[15px] text-ink-2">In {f.years < 1 ? 'under a year' : `${f.years.toFixed(1)} years`}{f.ageAtFreedom != null ? `, at ${f.ageAtFreedom}` : ''}</Text>
        )}
        <View className="mt-4"><ProgressTrack share={share} height={10} /></View>
        <Text className="mt-1.5 text-[13px] text-ink-2">
          <Text className="font-mono text-[13px] text-ink">{compactMoney(f.invested)}</Text> of <Text className="font-mono text-[13px]">{compactMoney(f.target)}</Text> FIRE number
        </Text>

        {pts.length > 1 && (
          <>
            <View className="mt-5 h-32 flex-row items-end" style={{ gap: 2 }}>
              {pts.map(s => (
                <View key={s.year} className="flex-1 justify-end" style={{ height: '100%' }}>
                  <View className={`rounded-t ${s.invested >= s.target ? 'bg-teal' : 'bg-teal-soft'}`} style={{ height: `${Math.max(2, (s.invested / peak) * 100)}%` }} />
                </View>
              ))}
            </View>
            <View className="mt-1 flex-row justify-between">
              <Text className="text-[11px] text-ink-3">Now</Text>
              <Text className="text-[11px] text-ink-3">{new Date().getFullYear() + pts[pts.length - 1].year}</Text>
            </View>
          </>
        )}
        {f.bridge && f.bridge.reachable < f.bridge.needed && (
          <Text className="mt-3 text-[13px] leading-5 text-warn">
            You reach the number earlier, but only {compactMoney(f.bridge.reachable)} of the {compactMoney(f.bridge.needed)} needed to last until your pension opens is reachable, so the date waits for that.
          </Text>
        )}
      </Card>

      {/* Freedom report (D-60): the one-page plan as a PDF, made on the phone. */}
      {full && f.inputs && (
        <Button kind="quiet" disabled={sharing} label={sharing ? 'Making the PDF…' : 'Share your plan as a PDF'}
          onPress={() => {
            const go = async (branded: boolean) => {
              setSharing(true)
              try {
                await shareReport(reportHtml(f, f.inputs!, { age: data?.age ?? null, place: p?.cityName ?? '', branded, usTaxHome: !!p?.taxKey || data?.currency === 'USD' }))
              } catch { Alert.alert("Couldn't make the PDF",'Please try again.') }
              setSharing(false)
            }
            Alert.alert('Share your freedom plan', 'A one-page PDF built only from your numbers.', [
              { text: 'With UntilFire branding', onPress: () => go(true) },
              { text: 'Without branding', onPress: () => go(false) },
              { text: 'Cancel', style: 'cancel' },
            ])
          }} />
      )}

      {full && p && data ? (
        <>
          <Card>
            <View className="flex-row justify-between">
              <Label>Planning assumptions</Label>
              <Button small kind="quiet" label="Edit" onPress={() => { haptic.tick(); router.push('/assumptions') }} />
            </View>
            <Row label="Age" value={data.age ? String(data.age) : 'Not set'} first />
            <Row label="Where you live" value={p.cityName || 'Not set'} />
            <Row label="Freedom priced at" value={p.retirementCityName ? `${p.retirementCityName.split(',')[0]} · ${p.lifestyleMultiplier < 1 ? 'frugal' : p.lifestyleMultiplier > 1 ? 'comfortable' : 'typical'}` : 'Today\'s spending'} />
            <Row label="Growth after inflation" value={`${(p.growthRate * 100).toFixed(1)}%`} />
            <Row label="Withdrawal rate" value={`${(p.withdrawalRate * 100).toFixed(1)}%`} />
            <Row label="Tax on withdrawals" value={p.taxEnabled ? `${Math.round(p.retirementTaxRate * 100)}%${p.rothPct ? `, ${p.rothPct}% Roth` : ''}` : 'Not counted'} />
          </Card>

          <Card>
            <View className="flex-row justify-between">
              <Label>Your goal</Label>
              <Button small kind="quiet" label="Edit" onPress={() => { haptic.tick(); router.push('/plan-goal') }} />
            </View>
            <Row label="Spending a year once free" value={p.plan.retirementAnnualSpend ? money(p.plan.retirementAnnualSpend) : p.retirementCityCol ? money(p.retirementCityCol * p.lifestyleMultiplier) : money(f.monthlySpending * 12)} first />
            <Row label="Pay growth" value={p.plan.payGrowth ? `${(p.plan.payGrowth * 100).toFixed(0)}% a year` : 'Flat'} />
            <Row label="Pension opens at" value={p.plan.accessAge ? String(p.plan.accessAge) : 'No bridge check'} />
          </Card>

          <BudgetWhatIf />
          <SavingSplit />
        </>
      ) : (
        <Card soft>
          <Text className="text-[14px] leading-5 text-ink-2">
            Sign in to use the full projection: your debts, mortgages, tax, growth and pension age, the same as untilfire.com.
          </Text>
        </Card>
      )}
    </DetailScreen>
  )
}

/**
 * The date runs on what you really spend, the last 12 months on average
 * (money logic study, Oct 16 2026). The budget is the what-if: the date if
 * you spent what you plan to instead.
 */
function BudgetWhatIf() {
  const { data } = useAccount()
  const f = useFreedom()
  if (!data || !f || f.source !== 'account' || !f.inputs) return null
  const basis = spendingBasis(data)
  if (basis.source !== 'actual' || basis.budget <= 0 || Math.abs(basis.budget - basis.monthly) < basis.monthly * 0.05) return null
  // A city-based retirement target scales with spending too; one they typed stays as typed.
  const i = f.inputs, typedTarget = (data.profile.plan.retirementAnnualSpend ?? 0) > 0
  const target = !typedTarget && i.targetMonthlyExpenses && i.monthlyExpenses > 0 ? i.targetMonthlyExpenses * (basis.budget / i.monthlyExpenses) : i.targetMonthlyExpenses
  const alt = project({ ...i, monthlyExpenses: basis.budget, targetMonthlyExpenses: target }, data.age)
  const when = alt.date ? alt.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : alt.year != null ? String(alt.year) : null
  return (
    <Card>
      <Label>Based on what you really spend</Label>
      <Text className="mt-1 text-[15px] leading-6 text-ink">
        You spend about <Text className="font-mono text-[15px]">{money(basis.monthly)}</Text> a month (the last {basis.months} months on average).
        {when ? <> Stick to your budget of <Text className="font-mono text-[15px]">{money(basis.budget)}</Text> and you'd be free in <Text className="font-bold text-teal-deep">{when}</Text>.</> : null}
      </Text>
    </Card>
  )
}

/** Where your saving goes (SavingSplitCard, D-59): pension before tax, employer money, tax-free first, the rest taxable. */
function SavingSplit() {
  const { data } = useAccount()
  const f = useFreedom()
  if (!data || !f || f.source !== 'account' || !f.inputs) return null
  const plan = data.profile.plan
  const takeHomeSaving = Math.max(0, (f.monthlyIncome - f.monthlySpending) * 12)
  const taxFree = Math.min(takeHomeSaving, plan.taxFreeAnnual ?? 0)
  const rows = [
    { label: 'Pension, before tax', value: plan.pensionAnnual ?? 0, color: '#c58a4a' },
    { label: 'Employer adds', value: plan.employerAnnual ?? 0, color: '#0E9C86' },
    { label: 'Roth IRA, first', value: taxFree, color: '#6b5bd2' },
    { label: 'Taxable, the rest', value: Math.max(0, takeHomeSaving - taxFree), color: '#2a78d6' },
  ].filter(r => r.value > 0)
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total <= 0) return null
  return (
    <Card>
      <Label>Where your saving goes, a year</Label>
      <Text className="mt-1 font-mono text-[22px] text-ink">{money(total)}</Text>
      <View className="mt-3 h-2.5 flex-row overflow-hidden rounded-full bg-surface-2" style={{ gap: 2 }}>
        {rows.map(r => <View key={r.label} style={{ flex: r.value, backgroundColor: r.color }} />)}
      </View>
      {rows.map(r => (
        <View key={r.label} className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2"><View className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} /><Text className="text-[14px] text-ink">{r.label}</Text></View>
          <Text className="font-mono text-[14px] text-ink">{money(r.value)}</Text>
        </View>
      ))}
    </Card>
  )
}

function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View className={`flex-row justify-between gap-3 py-2.5 ${first ? 'mt-1' : 'border-t border-border'}`}>
      <Text className="text-[14px] text-ink-2">{label}</Text>
      <Text numberOfLines={1} className="flex-1 text-right text-[14px] font-semibold text-ink">{value}</Text>
    </View>
  )
}
