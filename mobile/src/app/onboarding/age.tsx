import { haptic } from '@/lib/haptics'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/Text'

import { QuestionScreen } from '@/components/QuestionScreen'
import { usePlan } from '@/state/plan'

export default function Age() {
  const { draft, setDraft } = usePlan()
  const [age, setAge] = useState(draft.age ?? 32)
  const nudge = (d: number) => { haptic.tick(); setAge(a => Math.min(80, Math.max(16, a + d))) }

  return (
    <QuestionScreen
      step={6}
      steps={6}
      title="How old are you?"
      hint="So we can tell you how old you'll be when work becomes optional."
      cta="Show my freedom date"
      canContinue
      onNext={() => { setDraft({ age }); router.push('/onboarding/reveal') }}
      skipLabel="Skip, leave my age out"
      onSkip={() => { setDraft({ age: undefined }); router.push('/onboarding/reveal') }}
    >
      <View className="flex-row items-center justify-center gap-8 py-6">
        <Stepper label="−" onPress={() => nudge(-1)} accessibilityLabel="Younger" />
        <Text className="w-28 text-center font-display text-[64px] font-bold text-ink">{age}</Text>
        <Stepper label="+" onPress={() => nudge(1)} accessibilityLabel="Older" />
      </View>
    </QuestionScreen>
  )
}

function Stepper({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="h-14 w-14 items-center justify-center rounded-full border border-border-2 bg-card active:bg-green-50"
    >
      <Text className="text-[28px] text-ink">{label}</Text>
    </Pressable>
  )
}
