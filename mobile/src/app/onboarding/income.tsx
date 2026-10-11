import { router } from 'expo-router'
import { useState } from 'react'

import { AmountInput } from '@/components/AmountInput'
import { QuestionScreen } from '@/components/QuestionScreen'
import { roundNice } from '@/lib/format'
import { usePlan } from '@/state/plan'

// Like the website (D-50): suggestions follow the city's living costs when there is one.
const LEVELS = [
  { factor: 1.1, sub: 'Tight' },
  { factor: 1.4, sub: 'Typical here' },
  { factor: 1.9, sub: 'Comfortable' },
  { factor: 2.6, sub: 'High' },
]
const DEFAULT_MONTHLY_COST = 4000

export default function Income() {
  const { draft, setDraft } = usePlan()
  const [value, setValue] = useState<number | null>(draft.monthlyIncome ?? null)
  const monthlyCost = draft.city ? draft.city.col / 12 : DEFAULT_MONTHLY_COST
  const city = draft.city?.name.split(',')[0]

  return (
    <QuestionScreen
      step={3}
      steps={6}
      title="What lands in your bank each month?"
      hint={city ? `Your take-home pay after tax. Suggestions follow living costs in ${city}.` : 'Your take-home pay after tax. An estimate is fine.'}
      cta="Continue"
      canContinue={value != null && value > 0}
      onNext={() => { setDraft({ monthlyIncome: value! }); router.push('/onboarding/spending') }}
    >
      <AmountInput
        label="Monthly take-home pay"
        value={value}
        onChange={setValue}
        suggestions={LEVELS.map(l => ({ value: roundNice(monthlyCost * l.factor), sub: city || l.sub !== 'Typical here' ? l.sub : 'Typical' }))}
        unit="a month"
      />
    </QuestionScreen>
  )
}
