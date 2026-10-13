import { router } from 'expo-router'
import { useState } from 'react'

import { View } from 'react-native'

import { CurrencyButton } from '@/components/CurrencyButton'
import { MoneyWheel } from '@/components/MoneyWheel'
import { QuestionScreen } from '@/components/QuestionScreen'
import { fromUSD, toUSDFromDisplay } from '@/lib/display-currency'
import { answers, PAY_EVERY } from '@/lib/onboarding-answers'
import { usePlan } from '@/state/plan'

const DEFAULT_MONTHLY_COST = 4000

/**
 * The take-home on each paycheck (V2): one number on a wheel, in steps of 100.
 * Take-home only, since that's the number people know; the monthly figure the
 * plan uses comes from how often they're paid.
 */
export default function Income() {
  const { draft, setDraft } = usePlan()
  const every = PAY_EVERY.find(p => p.key === answers.pay)!
  const monthlyCost = draft.city ? draft.city.col / 12 : DEFAULT_MONTHLY_COST
  // Start the wheel on a typical take-home for the city, per paycheck.
  const startMonthly = draft.monthlyIncome ?? monthlyCost * 1.4
  const [check, setCheck] = useState(() => Math.round(fromUSD(startMonthly * 12 / every.perYear) / 100) * 100)
  const max = Math.ceil(fromUSD(60000 * 12 / every.perYear) / 1000) * 1000

  return (
    <QuestionScreen
      step={4}
      steps={8}
      title={every.key === 'month' ? 'How much do you take home each month?' : 'How much is each paycheck?'}
      hint="After tax, what lands in your bank."
      cta="Continue"
      canContinue={check > 0}
      onNext={() => { setDraft({ monthlyIncome: Math.round(toUSDFromDisplay(check) * every.perYear / 12) }); router.push('/onboarding/know') }}
    >
      <MoneyWheel value={check} onChange={setCheck} max={max} unit={every.unit} label="Take-home pay" />
      <View className="mt-2"><CurrencyButton currency={draft.currency ?? 'USD'} onPick={c => setDraft({ currency: c })} /></View>
    </QuestionScreen>
  )
}
