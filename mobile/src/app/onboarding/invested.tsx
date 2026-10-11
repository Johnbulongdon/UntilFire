import { router } from 'expo-router'
import { useState } from 'react'

import { AmountInput } from '@/components/AmountInput'
import { QuestionScreen } from '@/components/QuestionScreen'
import { usePlan } from '@/state/plan'

const SUGGESTIONS = [
  { value: 0, sub: 'Starting out' },
  { value: 15_000, sub: 'Getting going' },
  { value: 75_000, sub: 'Building' },
  { value: 250_000, sub: 'Well along' },
]

export default function Invested() {
  const { draft, setDraft } = usePlan()
  const [value, setValue] = useState<number | null>(draft.invested ?? null)
  return (
    <QuestionScreen
      step={5}
      steps={6}
      title="What do you have saved and invested?"
      hint="Stocks, funds, retirement accounts and cash savings. Zero is fine too."
      cta="Continue"
      canContinue={value != null}
      onNext={() => { setDraft({ invested: value! }); router.push('/onboarding/age') }}
    >
      <AmountInput label="Saved and invested" value={value} onChange={setValue} suggestions={SUGGESTIONS} />
    </QuestionScreen>
  )
}
