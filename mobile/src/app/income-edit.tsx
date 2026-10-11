import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { MoneyRow, SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { paycheck } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { saveFireProfile, saveIncome } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { fromInput, toInput } from '@/lib/display-currency'
import { useAuth } from '@/state/auth'


/** Edit pay: with a salary, take-home is worked out from it (as the website does); without one, type take-home. */
export default function IncomeEdit() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const plan = data?.profile.plan ?? {}
  const [gross, setGross] = useState(toInput(plan.grossAnnual))
  const [pension, setPension] = useState(toInput(plan.pensionAnnual))
  const [employer, setEmployer] = useState(toInput(plan.employerAnnual))
  const [takeHome, setTakeHome] = useState(toInput(data?.income))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pay = Number(gross) > 0 ? paycheck(fromInput(gross), fromInput(pension), data?.profile.taxKey ?? '') : null
  const monthly = pay ? Math.round(pay.takeHome / 12) : fromInput(takeHome)

  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const nextPlan = {
      ...plan,
      grossAnnual: fromInput(gross) || undefined,
      pensionAnnual: fromInput(pension) || undefined,
      employerAnnual: fromInput(employer) || undefined,
    }
    const problem = (await saveFireProfile(session.user.id, { plan: nextPlan })) ?? (await saveIncome(session.user.id, monthly))
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="Your pay" saveLabel="Save" onSave={save} canSave={!!session && monthly > 0} busy={busy} error={error}>
      <View className="rounded-card border border-border bg-card px-4">
        <MoneyRow first label="Salary a year" note="Before tax" value={gross} onChange={setGross} />
        <MoneyRow label="Pension before tax, a year" note="Taken from pay before tax" value={pension} onChange={setPension} />
        <MoneyRow label="Employer adds, a year" note="Into your pension, on top of pay" value={employer} onChange={setEmployer} />
        {!pay && <MoneyRow label="Take-home a month" note="After tax; or add a salary to work it out" value={takeHome} onChange={setTakeHome} />}
      </View>
      {pay && (
        <Text className="mt-3 text-[14px] text-ink-2">
          {pay.unknown ? 'Tax isn\'t worked out until you set where you live. ' : ''}Take-home: <Text className="font-mono text-[14px] text-ink">{money(monthly)}</Text> a month.
        </Text>
      )}
    </SheetFrame>
  )
}
