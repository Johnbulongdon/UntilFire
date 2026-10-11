import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { OptionCard } from '@/components/OptionCard'
import { QuestionScreen } from '@/components/QuestionScreen'
import { haptic } from '@/lib/haptics'
import { usePlan, type Goal as GoalId } from '@/state/plan'

const GOALS: { id: GoalId; emoji: string; title: string; detail: string }[] = [
  { id: 'retire-early', emoji: '🏝️', title: 'Retire early', detail: 'Stop working years before everyone else.' },
  { id: 'financial-freedom', emoji: '🕊️', title: 'Financial freedom', detail: 'Work because you want to, not because you have to.' },
  { id: 'exploring', emoji: '🧭', title: 'Just exploring', detail: 'See where my money is heading.' },
]

export default function Goal() {
  const { draft, setDraft } = usePlan()
  const [picked, setPicked] = useState<GoalId | undefined>(draft.goal)

  return (
    <QuestionScreen step={1} steps={6} title="What does freedom mean to you?" hint="Pick the one that fits best. You can change it later.">
      <View className="gap-3">
        {GOALS.map(g => (
          <OptionCard
            key={g.id}
            emoji={g.emoji}
            title={g.title}
            detail={g.detail}
            selected={picked === g.id}
            onPress={() => {
              haptic.select()
              setPicked(g.id)
              setDraft({ goal: g.id })
              // A beat to see the choice land, then move on, like Duolingo.
              setTimeout(() => router.push('/onboarding/city'), 320)
            }}
          />
        ))}
      </View>
    </QuestionScreen>
  )
}
