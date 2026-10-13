import { router } from 'expo-router'
import { useState } from 'react'

import { QuestionScreen } from '@/components/QuestionScreen'
import { Wheel } from '@/components/Wheel'
import { usePlan } from '@/state/plan'

const AGES = Array.from({ length: 65 }, (_, i) => i + 16)

/** Age on a wheel (V2), with Skip as a real button under it. Age is optional. */
export default function Age() {
  const { draft, setDraft } = usePlan()
  const [age, setAge] = useState(draft.age ?? 32)

  return (
    <QuestionScreen
      step={8}
      steps={8}
      title="How old are you?"
      hint="So we can tell you how old you'll be when you're free."
      cta="Show my freedom date"
      canContinue
      onNext={() => { setDraft({ age }); router.push('/onboarding/reveal') }}
      skipLabel="Skip"
      onSkip={() => { setDraft({ age: undefined }); router.push('/onboarding/reveal') }}
    >
      <Wheel values={AGES} value={age} onChange={setAge} format={String} accessibilityLabel="Your age" />
    </QuestionScreen>
  )
}
