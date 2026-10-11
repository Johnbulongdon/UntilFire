import { haptic } from '@/lib/haptics'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/Text'

import { AmountInput } from '@/components/AmountInput'
import { QuestionScreen } from '@/components/QuestionScreen'
import { roundNice } from '@/lib/format'
import { usePlan } from '@/state/plan'

type Mode = 'spend' | 'save'

export default function Spending() {
  const { draft, setDraft } = usePlan()
  const income = draft.monthlyIncome ?? 0
  const [mode, setMode] = useState<Mode>('spend')
  const [value, setValue] = useState<number | null>(draft.monthlySpending ?? null)

  // With a city, spending suggestions follow its living costs; otherwise shares of pay.
  const cityMonthly = draft.city ? draft.city.col / 12 : null
  const city = draft.city?.name.split(',')[0]
  const suggestions = mode === 'spend' && cityMonthly
    ? [
        { value: roundNice(cityMonthly * 0.75), sub: 'Lean' },
        { value: roundNice(cityMonthly), sub: `Typical in ${city}` },
        { value: roundNice(cityMonthly * 1.25), sub: 'Comfortable' },
        { value: roundNice(cityMonthly * 1.6), sub: 'Generous' },
      ]
    : (mode === 'spend' ? [0.5, 0.6, 0.7, 0.8] : [0.1, 0.2, 0.3, 0.5]).map(share => ({
        value: roundNice(income * share),
        sub: mode === 'spend' ? `${Math.round(share * 100)}% of pay` : `Save ${Math.round(share * 100)}%`,
      }))
  const spending = value == null ? null : mode === 'spend' ? value : income - value
  const valid = spending != null && spending > 0 && (mode === 'spend' || value! <= income)

  return (
    <QuestionScreen
      step={4}
      steps={6}
      title={mode === 'spend' ? 'How much do you spend?' : 'How much do you save?'}
      hint="Use whichever number you know. A rough monthly figure is fine."
      cta="Continue"
      canContinue={valid}
      onNext={() => { setDraft({ monthlySpending: spending! }); router.push('/onboarding/invested') }}
    >
      <View className="mb-6 flex-row rounded-xl bg-green-50 p-1">
        {(['spend', 'save'] as const).map(m => (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
            onPress={() => { haptic.select(); setMode(m); setValue(null) }}
            className={`flex-1 items-center rounded-lg py-2 ${mode === m ? 'bg-card' : ''}`}
          >
            <Text className={`text-[14px] font-semibold ${mode === m ? 'text-ink' : 'text-ink-2'}`}>
              {m === 'spend' ? 'I know my spending' : 'I know my savings'}
            </Text>
          </Pressable>
        ))}
      </View>
      <AmountInput
        label={mode === 'spend' ? 'Monthly spending' : 'Monthly savings'}
        value={value}
        onChange={setValue}
        suggestions={suggestions}
        unit="a month"
      />
      {mode === 'save' && value != null && value > income && (
        <Text className="mt-4 text-[14px] text-ink-2">That's more than you take home each month.</Text>
      )}
    </QuestionScreen>
  )
}
