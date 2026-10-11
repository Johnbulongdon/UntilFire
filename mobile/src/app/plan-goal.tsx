import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { MoneyRow, SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { PAY_GROWTH_PRESETS, pensionFor } from '@/engine'
import { haptic } from '@/lib/haptics'
import { saveFireProfile } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { fromInput, toInput } from '@/lib/display-currency'
import { useAuth } from '@/state/auth'

/**
 * Your goal (the website's PlanGoalCard, D-59): what you plan to spend once
 * free, how your pay grows, when pension money opens, and saving into a
 * tax-free account. Each moves the freedom date in the full projection.
 */
export default function PlanGoal() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const plan = data?.profile.plan ?? {}
  const suggestedAge = pensionFor('USD', true).age ?? 59.5
  const [spend, setSpend] = useState(toInput(plan.retirementAnnualSpend))
  const [growth, setGrowth] = useState(plan.payGrowth ?? 0)
  const [access, setAccess] = useState(String(plan.accessAge ?? ''))
  const [taxFree, setTaxFree] = useState(toInput(plan.taxFreeAnnual))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const problem = await saveFireProfile(session.user.id, {
      plan: {
        ...plan,
        retirementAnnualSpend: fromInput(spend) || undefined,
        payGrowth: growth || undefined,
        accessAge: Number(access) || undefined,
        taxFreeAnnual: taxFree === '' ? undefined : fromInput(taxFree),
      },
    })
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="Your goal" saveLabel="Save" onSave={save} canSave={!!session} busy={busy} error={error}>
      <View className="rounded-card border border-border bg-card px-4">
        <MoneyRow first label="Spending a year once free" note="Blank: your retirement city, or today's spending" value={spend} onChange={setSpend} />
        <MoneyRow label="Pension opens at age" note={`Blank: no bridge check. US accounts open at ${suggestedAge}.`} value={access} onChange={setAccess} suffix=" " />
        <MoneyRow label="Into a Roth IRA a year" note="After tax; the rest of your saving is taxable" value={taxFree} onChange={setTaxFree} />
      </View>
      <Text className="mb-2 mt-5 text-[15px] font-bold text-ink">Pay growth above inflation</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {PAY_GROWTH_PRESETS.map(p => (
          <Pressable accessibilityRole="button" key={p.key} onPress={() => { haptic.select(); setGrowth(p.rate) }} className={`rounded-full border px-3 py-1.5 ${growth === p.rate ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
            <Text className={`text-[13px] font-semibold ${growth === p.rate ? 'text-green-700' : 'text-ink-2'}`}>{p.label}{p.rate ? ` ${p.rate * 100}%` : ''}</Text>
          </Pressable>
        ))}
      </View>
      <Text className="mt-2 text-[12px] leading-5 text-ink-3">Spending stays as it is, so a raise is saved; employer money grows with pay.</Text>
    </SheetFrame>
  )
}
