import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { OptionCard } from '@/components/OptionCard'
import { QuestionScreen } from '@/components/QuestionScreen'
import { haptic } from '@/lib/haptics'
import { answers, PAY_EVERY, type PayEvery } from '@/lib/onboarding-answers'

/** How often do you get paid? One tap, then the paycheck amount. Monthly is the default. */
export default function Pay() {
  const [picked, setPicked] = useState<PayEvery>(answers.pay)
  return (
    <QuestionScreen step={3} steps={10} title="How often do you get paid?">
      <View className="gap-3">
        {PAY_EVERY.map(p => (
          <OptionCard key={p.key} title={p.label} selected={picked === p.key}
            onPress={() => {
              haptic.select(); setPicked(p.key); answers.pay = p.key
              setTimeout(() => router.push('/onboarding/income'), 90)
            }} />
        ))}
      </View>
    </QuestionScreen>
  )
}
