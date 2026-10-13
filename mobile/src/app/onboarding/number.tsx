import { router } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'

import { RevealFrame } from '@/components/RevealFrame'
import { Ring } from '@/components/Ring'
import { Text } from '@/components/Text'
import { compactMoney } from '@/lib/format'
import { freedomFor, planFromDraft, usePlan } from '@/state/plan'

/** Reveal 3 of 5: the freedom number, and how much of it is already there. */
export default function FreedomNumber() {
  const { draft } = usePlan()
  const plan = useMemo(() => planFromDraft(draft), [draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const share = result.target > 0 ? Math.min(1, plan.invested / result.target) : 0

  return (
    <RevealFrame eyebrow="Your freedom number" next="Continue" onNext={() => router.push('/onboarding/standing')}>
      <View className="items-center">
        <Ring share={share} size={260} color="#62FAE3" track="rgba(255,255,255,0.15)">
          <Text className="font-display text-[48px] font-bold text-white">{compactMoney(result.target)}</Text>
          <Text className="text-[14px] text-mint">in today's money</Text>
        </Ring>
      </View>
      <Text className="mt-8 text-center font-display text-[26px] font-bold leading-8 text-white">
        {share > 0 ? <>You're already <Text className="text-aqua">{Math.max(1, Math.round(share * 100))}%</Text> of the way.</> : "This is what you're building towards."}
      </Text>
      <Text className="mt-2 text-center text-[15px] text-mint">Once it's invested, work becomes optional.</Text>
    </RevealFrame>
  )
}
