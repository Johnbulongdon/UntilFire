import { router } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/Text'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CountUp } from '@/components/CountUp'
import { PersonalityAvatar } from '@/components/PersonalityAvatar'
import { PrimaryButton } from '@/components/PrimaryButton'
import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { freedomFor, personalityFor, planFromDraft, usePlan } from '@/state/plan'
import { Events, track, yearsBucket } from '@/lib/analytics'

const COUNT_MS = 1400

export default function Reveal() {
  const { draft, savePlan } = usePlan()
  const plan = useMemo(() => planFromDraft(draft), [draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const type = useMemo(() => personalityFor(plan), [plan])
  const thisYear = new Date().getFullYear()
  const reached = result.year != null

  useEffect(() => {
    track(Events.ONBOARDING_REVEALED, { years_bucket: yearsBucket(result.year == null ? null : result.year - thisYear), fire_type: type.name })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ticks while the year rolls, a success buzz as it lands, a tap as the type appears.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    if (reached) for (let i = 1; i <= 5; i++) timers.push(setTimeout(haptic.tick, (COUNT_MS / 6) * i))
    timers.push(setTimeout(haptic.success, reached ? COUNT_MS : 300))
    timers.push(setTimeout(haptic.select, COUNT_MS + 900))
    return () => timers.forEach(clearTimeout)
  }, [reached])

  return (
    <SafeAreaView className="flex-1 bg-brand">
      <View className="flex-1 justify-between px-6 pb-4 pt-4">
        <Pressable accessibilityRole="button" accessibilityLabel="Change my answers" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
          <Text className="text-[15px] text-mint">‹ Change answers</Text>
        </Pressable>

        <View>
          <Animated.View entering={FadeIn.duration(400)}>
            <Text className="text-[17px] font-semibold text-aqua">
              {reached ? (result.years === 0 ? 'Work is already optional' : 'Work becomes optional in') : 'At this pace'}
            </Text>
          </Animated.View>
          {reached ? (
            <CountUp from={thisYear} to={result.year!} duration={COUNT_MS} className="mt-1 font-display text-[96px] font-bold leading-[104px] text-aqua" />
          ) : (
            <Text className="mt-2 font-display text-[34px] font-bold leading-10 text-white">Freedom is more than 65 years away</Text>
          )}
          {result.ageAtFreedom != null && (
            <Animated.View entering={FadeInDown.delay(COUNT_MS).duration(500)}>
              <Text className="mt-1 text-[20px] text-mint">You'll be {result.ageAtFreedom}.</Text>
            </Animated.View>
          )}
          {!reached && (
            <Text className="mt-3 text-[16px] leading-6 text-mint">
              Spending less or saving more moves this a lot. Your plan shows how much.
            </Text>
          )}
        </View>

        <View style={{ gap: 14 }}>
          <Animated.View entering={ZoomIn.delay(COUNT_MS + 800).springify().damping(14)}>
            <View className="flex-row items-center gap-4 rounded-3xl bg-card p-4">
              <PersonalityAvatar profile={type} size={72} />
              <View className="flex-1">
                <Text className="text-[12px] font-semibold uppercase tracking-wider text-ink-2">Your FIRE type</Text>
                <Text className="mt-0.5 font-display text-[22px] font-bold text-ink">{type.name}</Text>
                <Text className="mt-1 text-[14px] leading-5 text-ink">{type.blurb}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(COUNT_MS + 1200).duration(500)} style={{ gap: 14 }}>
            <View className="flex-row gap-3">
              <Stat label="Your target" value={compactMoney(result.target)} note="25× a year of spending" />
              <Stat label="Saving" value={`${Math.round(result.savingsRate * 100)}%`} note="of take-home pay" />
            </View>
            <PrimaryButton
              variant="onDark"
              label="Continue"
              onPress={async () => { await savePlan(plan); router.push('/onboarding/reminder') }}
            />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-white/10 p-4">
      <Text className="text-[13px] text-mint">{label}</Text>
      <Text className="mt-1 font-mono text-[24px] text-white">{value}</Text>
      <Text className="mt-0.5 text-[12px] text-mint/70">{note}</Text>
    </View>
  )
}
