import { router } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'

import { RevealFrame } from '@/components/RevealFrame'
import { Ring } from '@/components/Ring'
import { Text } from '@/components/Text'
import { compactMoney } from '@/lib/format'
import { freedomFor, planFromDraft, usePlan } from '@/state/plan'

/** Reveal 3 of 4: the freedom number, and how much of it is already there. */
export default function FreedomNumber() {
  const { draft } = usePlan()
  const plan = useMemo(() => planFromDraft(draft), [draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const share = result.target > 0 ? Math.max(0, plan.invested / result.target) : 0

  return (
    <RevealFrame eyebrow="Your freedom number" next="Continue" onNext={() => router.push('/onboarding/standing')}>
      <View className="items-center">
        <Ring share={Math.min(1,share)} size={260} delay={450} duration={1400} color="#151719" track="rgba(255,255,255,0.15)">
          <Text className="font-display text-[48px] font-bold text-ink">{compactMoney(result.target)}</Text>
          <Text className="text-[14px] text-ink-2">in today&apos;s money</Text>
        </Ring>
      </View>
      <Text className="mt-8 text-center font-display text-[26px] font-bold leading-8 text-ink">
        {share > 0 ? <>You&apos;re already <Text className="text-ink">{Math.max(1, Math.round(share * 100))}%</Text> of the way.</> : "This is what you're building towards."}
      </Text>
      <Text className="mt-2 text-center text-[15px] text-ink-2">{share >= 1 ? 'Your inputs cover the target. Check your bills and balances before making plans.' : 'Your saved money is already part of the picture.'}</Text>
    </RevealFrame>
  )
}
