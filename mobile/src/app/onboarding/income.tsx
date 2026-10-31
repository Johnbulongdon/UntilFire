import { router } from 'expo-router'
import { useState } from 'react'

import { View } from 'react-native'

import { CurrencyButton } from '@/components/CurrencyButton'
import { MoneyWheel } from '@/components/MoneyWheel'
import { QuestionScreen } from '@/components/QuestionScreen'
import { fromUSD, toUSDFromDisplay } from '@/lib/display-currency'
import { usePlan } from '@/state/plan'

const DEFAULT_MONTHLY_COST = 4000

/**
 * The take-home on each paycheck (V2): one number on a wheel, in steps of 100.
 * Take-home only, since that's the number people know; the monthly figure the
 * plan uses comes from how often they're paid.
 */
export default function Income() {
  const { draft, setDraft } = usePlan()
  const monthlyCost = draft.city ? draft.city.col / 12 : DEFAULT_MONTHLY_COST
  // Start the wheel on a typical take-home for the city, per paycheck.
  const startMonthly = draft.monthlyIncome ?? monthlyCost * 1.4
  const [check, setCheck] = useState(() => Math.round(fromUSD(startMonthly) / 100) * 100)
  const max = Math.ceil(fromUSD(60000) / 1000) * 1000

  return (
    <QuestionScreen
      step={4}
      steps={10}
      title={'How much do you take home each month?'}
      hint="After tax, what lands in your bank."
      cta="Continue"
      canContinue={check > 0}
      onNext={() => { setDraft({ monthlyIncome: Math.round(toUSDFromDisplay(check)) }); router.push('/onboarding/spending') }}
    >
      <MoneyWheel value={check} onChange={setCheck} max={max} unit=' / month' label="Take-home pay" />
      <View className="mt-2"><CurrencyButton currency={draft.currency ?? 'USD'} onPick={c => setDraft({ currency: c })} /></View>
    </QuestionScreen>
  )
}
