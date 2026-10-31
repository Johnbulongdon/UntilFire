import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { Keypad, KeypadAmount } from '@/components/Keypad'
import { QuestionScreen } from '@/components/QuestionScreen'
import { Text } from '@/components/Text'
import { fromUSD, toUSDFromDisplay } from '@/lib/display-currency'
import { usePlan } from '@/state/plan'

/**
 * Saved and invested (V2): a big keypad, because this number can be anything
 * from zero to millions. Wheels and sliders are slow and imprecise at that range.
 */
export default function Invested() {
  const { draft, setDraft } = usePlan()
  const [digits, setDigits] = useState(() => (draft.invested ? String(Math.round(fromUSD(draft.invested))) : ''))
  const spend = draft.monthlySpending ?? 0
  const months = digits && spend > 0 ? Math.round(toUSDFromDisplay(Number(digits)) / spend) : null

  return (
    <QuestionScreen
      step={6}
      steps={10}
      title="What have you saved and invested?"
      hint="Retirement accounts, funds and cash savings. Zero is fine."
      cta="Continue"
      canContinue
      onNext={() => { setDraft({ invested: Math.round(toUSDFromDisplay(Number(digits || '0'))) }); router.push('/onboarding/age') }}
    >
      <View className="gap-6">
        <View className="gap-1">
          <KeypadAmount digits={digits} />
          {/* What it means: months of your own spending it would cover. */}
          <Text accessibilityLiveRegion="polite" className="text-center text-[15px] text-ink-2">
            {months == null ? ' ' : months < 1 ? 'Less than a month of your spending' : `About ${months < 24 ? `${months} ${months === 1 ? 'month' : 'months'}` : `${Math.round(months / 12)} years`} of your spending`}
          </Text>
        </View>
        <Keypad digits={digits} onChange={setDigits} />
      </View>
    </QuestionScreen>
  )
}
