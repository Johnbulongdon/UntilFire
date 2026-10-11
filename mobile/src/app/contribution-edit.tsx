import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'

import { MoneyRow, SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { DEFAULT_SCHEDULE, type StoredLadder, type StoredPlan } from '@/engine'
import { EMPTY_PLAN } from '@/lib/contribution-facts'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { saveContributionPlan } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { fromInput, toInput } from '@/lib/display-currency'
import { colors } from '@/theme/colors'

const EMPTY_LADDER: StoredLadder = {
  efOverride: null, expensesOverride: null, thresholdOverride: null, efAccountIds: null, expenseSource: 'last-month',
  monthlyMatch: 0, taxRoom: 0, lowInterestExtra: 0, debts: [], disabled: [],
}
const str = (n: number | null | undefined) => (n ? String(n) : '')

/** Edit the ladder's inputs, your debts' rates, payday and target mix: the website's Contributions inputs. */
export default function ContributionEdit() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const plan: StoredPlan = data?.contributionPlan ?? EMPTY_PLAN
  const ladder = { ...EMPTY_LADDER, ...(plan.ladder ?? {}) }

  const [match, setMatch] = useState(toInput(ladder.monthlyMatch))
  const [taxRoom, setTaxRoom] = useState(toInput(ladder.taxRoom))
  const [extra, setExtra] = useState(toInput(ladder.lowInterestExtra))
  const [ef, setEf] = useState(toInput(ladder.efOverride))
  const [payday, setPayday] = useState(String((plan.contribution ?? DEFAULT_SCHEDULE).anchorDay))
  // Known debts are offered as rows (D-34); their rates are typed here.
  const known = [...(data?.typed.totalDebt ? [{ name: 'Other debt', balance: data.typed.totalDebt }] : []), ...(data?.typed.mortgages ?? []).map(m => ({ name: m.name, balance: m.balance }))]
  const [debts, setDebts] = useState(() => {
    const rows = ladder.debts.map(d => ({ name: d.name, balance: String(d.balance), rate: String(d.ratePct) }))
    for (const k of known) if (!rows.some(r => r.name === k.name)) rows.push({ name: k.name, balance: String(k.balance), rate: '' })
    return rows
  })
  const [mix, setMix] = useState(plan.targets.map(t => ({ symbol: t.symbol, pct: String(Math.round(t.targetPct * 100)) })))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mixTotal = mix.reduce((s, m) => s + (Number(m.pct) || 0), 0)

  const save = async () => {
    if (!session) return
    if (mix.length > 0 && mixTotal !== 100) { setError('Make the target mix add up to 100%.'); return }
    setBusy(true); setError('')
    const next: StoredPlan = {
      ...plan,
      targets: mix.filter(m => m.symbol.trim()).map(m => ({ symbol: m.symbol.trim().toUpperCase(), targetPct: (Number(m.pct) || 0) / 100 })),
      contribution: { ...(plan.contribution ?? DEFAULT_SCHEDULE), anchorDay: Math.min(31, Math.max(1, Number(payday) || 1)) },
      ladder: {
        ...ladder,
        monthlyMatch: fromInput(match),
        taxRoom: fromInput(taxRoom),
        lowInterestExtra: fromInput(extra),
        efOverride: ef ? fromInput(ef) : null,
        debts: debts.filter(d => Number(d.balance) > 0).map(d => ({ name: d.name, balance: Number(d.balance) || 0, ratePct: Number(d.rate) || 0 })),
      },
    }
    const problem = await saveContributionPlan(session.user.id, next)
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="Contribution plan" saveLabel="Save plan" onSave={save} canSave={!!session} busy={busy} error={error}>
      <View className="rounded-card border border-border bg-card px-4">
        <MoneyRow first label="Employer match not yet captured" note="A month" value={match} onChange={setMatch} />
        <MoneyRow label="Tax-advantaged room left" note="This year, e.g. IRA or 401(k)" value={taxRoom} onChange={setTaxRoom} />
        <MoneyRow label="Extra on a cheap loan" note="A month, optional" value={extra} onChange={setExtra} />
        <MoneyRow label="Emergency fund" note="Leave blank to read it from your savings" value={ef} onChange={setEf} />
        <MoneyRow label="Money arrives on day" note="Of each month" value={payday} onChange={setPayday} suffix=" " />
      </View>

      <Text className="mb-2 mt-5 text-[13px] text-ink-3">Debts and their interest rates</Text>
      <View className="rounded-card border border-border bg-card px-4">
        {debts.length === 0 && <Text className="py-3 text-[14px] text-ink-2">No debts known. Add them in Money → Net worth.</Text>}
        {debts.map((d, i) => (
          <MoneyRow key={d.name + i} first={i === 0} label={d.name} note={`${money(Number(d.balance))} owed`} value={d.rate}
            onChange={v => setDebts(prev => prev.map((x, k) => (k === i ? { ...x, rate: v } : x)))} suffix="%" />
        ))}
      </View>

      <Text className="mb-2 mt-5 text-[13px] text-ink-3">Target investment mix</Text>
      <View className="rounded-card border border-border bg-card px-4 py-1">
        {mix.map((m, i) => (
          <View key={i} className={`flex-row items-center gap-2 py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
            <TextInput className="flex-1 text-[15px] text-ink" style={{ fontFamily: 'DMMono_500Medium' }} placeholder="Ticker" placeholderTextColor={colors.ink3}
              autoCapitalize="characters" value={m.symbol} onChangeText={t => setMix(prev => prev.map((x, k) => (k === i ? { ...x, symbol: t } : x)))} />
            <TextInput className="w-14 rounded-control bg-surface px-2 py-1.5 text-right text-[15px] text-ink" style={{ fontFamily: 'DMMono_500Medium' }} keyboardType="number-pad"
              value={m.pct} onChangeText={t => setMix(prev => prev.map((x, k) => (k === i ? { ...x, pct: t.replace(/[^0-9]/g, '') } : x)))} />
            <Text className="font-mono text-[15px] text-ink-3">%</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove" hitSlop={6} onPress={() => setMix(prev => prev.filter((_, k) => k !== i))}><Text className="text-[16px] text-neg-ink">×</Text></Pressable>
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setMix(prev => [...prev, { symbol: '', pct: '' }]) }} className="py-2.5">
          <Text className="text-[14px] font-bold text-pos-ink">+ Add a fund</Text>
        </Pressable>
      </View>
      {mix.length > 0 && <Text className={`mt-2 text-[13px] ${mixTotal === 100 ? 'text-pos-ink' : 'text-warn'}`}>Total {mixTotal}%</Text>}
    </SheetFrame>
  )
}
