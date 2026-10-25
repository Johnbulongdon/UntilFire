import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { OptionCard } from '@/components/OptionCard'
import { QuestionScreen } from '@/components/QuestionScreen'
import { Events, track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { usePlan, type Worry as WorryId } from '@/state/plan'
import { TAB_COLOR } from '@/theme/colors'

type IconName = 'sun.max.fill'
const WORRIES: { id: WorryId; icon: { name: IconName; tint: string }; title: string }[] = [
  { id: 'payday', icon: { name: 'banknote.fill' as IconName, tint: TAB_COLOR.money }, title: 'Money runs out before payday' },
  { id: 'debt', icon: { name: 'creditcard.fill' as IconName, tint: TAB_COLOR.home }, title: 'Debt I want gone' },
  { id: 'invest', icon: { name: 'chart.line.uptrend.xyaxis' as IconName, tint: TAB_COLOR.plan }, title: 'Not sure where to invest' },
  { id: 'none', icon: { name: 'sun.max.fill', tint: TAB_COLOR.home }, title: 'Nothing, I just want my plan' },
]

/** The biggest money worry. Home's first next move answers it (lib/next-move). Skippable. */
export default function Worry() {
  const { draft, setDraft } = usePlan()
  const [picked, setPicked] = useState<WorryId | undefined>(draft.worry)
  const next = () => router.push('/onboarding/housing')

  return (
    <QuestionScreen step={8} steps={9} title="What gets in the way most?" hint="Your first move will tackle it."
      skipLabel="Skip" onSkip={() => { setDraft({ worry: undefined }); next() }}>
      <View className="gap-3">
        {WORRIES.map(w => (
          <OptionCard key={w.id} icon={w.icon} title={w.title} selected={picked === w.id}
            onPress={() => {
              haptic.select(); setPicked(w.id); setDraft({ worry: w.id })
              track(Events.ONBOARDING_ANSWERED, { question: 'worry', answer: w.id })
              setTimeout(next, 90)
            }} />
        ))}
      </View>
    </QuestionScreen>
  )
}
