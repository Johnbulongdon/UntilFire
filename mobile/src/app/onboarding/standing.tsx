import { router } from 'expo-router'
import { useMemo } from 'react'
import { Share, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'

import { RevealFrame } from '@/components/RevealFrame'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { freedomFor, planFromDraft, usePlan } from '@/state/plan'

// The website's benchmarks (app/HomeClient.tsx): the US personal saving rate and a common FIRE target.
const US_SAVING_RATE = 5
const FIRE_SAVING_RATE = 25

/** Reveal 4 of 5, how you stack up: your saving rate against the average and a typical FIRE saver. */
export default function Standing() {
  const { draft } = usePlan()
  const plan = useMemo(() => planFromDraft(draft), [draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const rate = Math.max(0, Math.round(result.savingsRate * 100))
  const max = Math.max(rate, FIRE_SAVING_RATE, US_SAVING_RATE, 1)
  const beats = rate > US_SAVING_RATE
  const share = async () => {
    haptic.tick()
    const when = result.year != null ? `work becomes optional in ${result.year}` : 'I have a plan for when work becomes optional'
    await Share.share({ message: `With UntilFire, ${when}. Find your year: https://www.untilfire.com` }).catch(() => {})
  }

  return (
    <RevealFrame eyebrow="How you stack up" next="Continue" onNext={() => router.push('/onboarding/abroad')} second={{ label: 'Share my result', onPress: share }}>
      <Text className="font-display text-[30px] font-bold leading-9 text-white">
        {beats ? <>You save <Text className="text-aqua">{rate}%</Text> of your take-home.</> : <>You're saving <Text className="text-aqua">{rate}%</Text> right now.</>}
      </Text>
      <View className="mt-8 h-56 flex-row items-end justify-center gap-8">
        <Bar label="US average" value={US_SAVING_RATE} max={max} tone="rgba(255,255,255,0.25)" delay={200} />
        <Bar label="Typical FIRE saver" value={FIRE_SAVING_RATE} max={max} tone="rgba(167,240,224,0.6)" delay={350} />
        <Bar label="You" value={rate} max={max} tone="#62FAE3" delay={500} />
      </View>
      <Text className="mt-6 text-center text-[17px] text-mint">
        {beats ? <><Text className="font-bold text-aqua">{(rate / US_SAVING_RATE).toFixed(1)}×</Text> the average saver.</> : 'A starting point, not a verdict.'}
      </Text>
      <Text className="mt-4 text-center text-[11px] leading-4 text-mint/70">US personal saving rate about {US_SAVING_RATE}% (BEA); {FIRE_SAVING_RATE}% is a common FIRE target.</Text>
    </RevealFrame>
  )
}

function Bar({ label, value, max, tone, delay }: { label: string; value: number; max: number; tone: string; delay: number }) {
  return (
    <View className="w-24 items-center">
      <Text className="mb-1 font-mono text-[16px] text-white">{value}%</Text>
      <Animated.View entering={FadeInUp.delay(delay).duration(500)}>
        <View style={{ width: 52, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: tone, height: Math.max(8, (value / max) * 160) }} />
      </Animated.View>
      {/* Two lines for every label, so a label that wraps doesn't lift its bar off the shared baseline. */}
      <View style={{ height: 36, marginTop: 8 }}><Text className="text-center text-[12px] leading-4 text-mint">{label}</Text></View>
    </View>
  )
}
