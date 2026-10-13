import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { OptionCard } from '@/components/OptionCard'
import { QuestionScreen } from '@/components/QuestionScreen'
import { haptic } from '@/lib/haptics'
import { answers } from '@/lib/onboarding-answers'

/** Which number do you know? Spending or saving, so the next question asks for the one people have. */
export default function Know() {
  const [picked, setPicked] = useState(answers.know)
  return (
    <QuestionScreen step={5} steps={8} title="Which do you know better?">
      <View className="gap-3">
        {([['spend', 'What I spend each month'], ['save', 'What I save each month']] as const).map(([k, label]) => (
          <OptionCard key={k} title={label} selected={picked === k}
            onPress={() => {
              haptic.select(); setPicked(k); answers.know = k
              setTimeout(() => router.push('/onboarding/spending'), 90)
            }} />
        ))}
      </View>
    </QuestionScreen>
  )
}
