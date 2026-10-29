import { router } from 'expo-router'
import { useMemo } from 'react'
import { useWindowDimensions, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { RevealFrame } from '@/components/RevealFrame'
import { Text } from '@/components/Text'
import { freedomFor, planFromDraft, usePlan } from '@/state/plan'

const LIFE = 100
const ASSUMED_AGE = 35

/** Reveal 2 of 4 (the website's "life in years"): a hundred squares, lived, working and free. */
export default function Life() {
  const { draft } = usePlan()
  const plan = useMemo(() => planFromDraft(draft), [draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const { width } = useWindowDimensions()
  const cell = Math.floor((Math.min(width, 440) - 48 - 9 * 5) / 10)
  const age = plan.age ?? ASSUMED_AGE
  // The same age as the reveal before it.
  const freeAt = result.years != null ? Math.min(LIFE, Math.floor(age + result.years)) : LIFE
  const free = LIFE - freeAt
  const tone = (i: number) => (i < age ? 'rgba(255,255,255,0.18)' : i < freeAt ? 'rgba(255,255,255,0.45)' : '#151719')

  return (
    <RevealFrame eyebrow="Your life in years" next="Continue" onNext={() => router.push('/onboarding/number')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, width: cell * 10 + 45, alignSelf: 'center' }}>
        {Array.from({ length: LIFE }, (_, i) => (
          <Animated.View key={i} entering={FadeIn.delay(i * 14).duration(200)}>
            <View style={{ width: cell, height: cell, borderRadius: 7, backgroundColor: tone(i) }} />
          </Animated.View>
        ))}
      </View>
      <Text className="mt-8 font-display text-[30px] font-bold leading-9 text-ink">
        {free > 0 ? <>Free at {freeAt} buys back <Text className="text-ink">{free} years</Text>.</> : 'Every move from here buys back years.'}
      </Text>
      <Text className="mt-2 text-[15px] text-ink-2">{plan.age ? 'If you live to 100.' : `Assuming you're ${ASSUMED_AGE}, and live to 100.`}</Text>
    </RevealFrame>
  )
}
