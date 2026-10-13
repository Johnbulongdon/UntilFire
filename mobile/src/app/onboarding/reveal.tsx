import { router } from 'expo-router'
import { useEffect, useMemo } from 'react'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { CountUp } from '@/components/CountUp'
import { RevealFrame } from '@/components/RevealFrame'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { freedomFor, planFromDraft, usePlan } from '@/state/plan'
import { Events, track, yearsBucket } from '@/lib/analytics'

const COUNT_MS = 1400

/** Reveal 1 of 5: the year work becomes optional, and the age you'll be. Nothing else. */
export default function Reveal() {
  const { draft, savePlan } = usePlan()
  const plan = useMemo(() => planFromDraft(draft), [draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const thisYear = new Date().getFullYear()
  const reached = result.year != null

  useEffect(() => {
    track(Events.ONBOARDING_REVEALED, { years_bucket: yearsBucket(result.year == null ? null : result.year - thisYear) })
    // Saved as soon as it shows, so leaving from any later reveal keeps the plan.
    savePlan(plan)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Ticks while the year rolls, a success buzz as it lands.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    if (reached) for (let i = 1; i <= 5; i++) timers.push(setTimeout(haptic.tick, (COUNT_MS / 6) * i))
    timers.push(setTimeout(haptic.success, reached ? COUNT_MS : 300))
    return () => timers.forEach(clearTimeout)
  }, [reached])

  return (
    <RevealFrame next="Continue" onNext={() => router.push('/onboarding/life')} second={{ label: 'Change my answers', onPress: () => router.back() }}>
      <Animated.View entering={FadeIn.duration(400)}>
        <Text className="text-[18px] font-semibold text-aqua">
          {reached ? (result.years === 0 ? 'Work is already optional' : 'Work becomes optional in') : 'At this pace'}
        </Text>
      </Animated.View>
      {reached ? (
        <CountUp from={thisYear} to={result.year!} duration={COUNT_MS} className="mt-1 font-display text-[110px] font-bold leading-[118px] text-aqua" />
      ) : (
        <Text className="mt-2 font-display text-[36px] font-bold leading-[42px] text-white">Freedom is more than 65 years away</Text>
      )}
      {result.ageAtFreedom != null && (
        <Animated.View entering={FadeInDown.delay(COUNT_MS).duration(500)}>
          <Text className="mt-1 text-[22px] text-mint">You'll be {result.ageAtFreedom}.</Text>
        </Animated.View>
      )}
      {!reached && <Text className="mt-3 text-[17px] leading-6 text-mint">Spending less or saving more moves this a lot.</Text>}
    </RevealFrame>
  )
}
