import { router } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { Icon } from '@/components/Icon'
import { RevealFrame } from '@/components/RevealFrame'
import { Sunny } from '@/components/Sunny'
import { Text } from '@/components/Text'
import { SETUP_WHY } from '@/engine'
import { haptic } from '@/lib/haptics'
import { useAuth } from '@/state/auth'
import { freedomFor, planFromDraft, usePlan, type Plan } from '@/state/plan'

type Move = { icon: 'building.columns.fill' | 'banknote.fill' | 'creditcard.fill' | 'chart.line.uptrend.xyaxis' | 'house.fill'; fallback: string; title: string; why: string }

/**
 * The last onboarding screen (peak-end): the year again, and the first moves
 * that make it real, so onboarding ends on a plan rather than a request.
 * The bank comes first because Home's Get set up asks for it first; then the
 * move the worry answer picked (lib/next-move); then the lease, for renters.
 */
function movesFor(plan: Plan): Move[] {
  const moves: Move[] = [{ icon: 'building.columns.fill', fallback: '🏦', title: 'Link your bank', why: SETUP_WHY.bank }]
  if (plan.worry === 'payday') moves.push({ icon: 'banknote.fill', fallback: '💵', title: 'Set a day-to-day budget', why: 'So payday lasts' })
  if (plan.worry === 'debt') moves.push({ icon: 'creditcard.fill', fallback: '💳', title: 'Clear your costliest debt', why: 'It comes first on your plan' })
  if (plan.worry === 'invest') moves.push({ icon: 'chart.line.uptrend.xyaxis', fallback: '📈', title: 'See where each dollar goes', why: 'Your plan puts it in order' })
  if (plan.housing === 'rent') moves.push({ icon: 'house.fill', fallback: '🏠', title: 'Add your lease end date', why: "We'll remind you before it's due" })
  return moves.slice(0, 3)
}

export default function YourPlan() {
  const { session } = useAuth()
  const { plan: saved, draft } = usePlan()
  const plan = useMemo(() => saved ?? planFromDraft(draft), [saved, draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const moves = useMemo(() => movesFor(plan), [plan])
  useEffect(() => { haptic.success() }, [])

  return (
    <RevealFrame eyebrow="Your plan" next="Start my plan" onNext={() => { haptic.press(); router.replace(session ? '/(tabs)' : '/save-plan') }}>
      <Animated.View entering={FadeIn.duration(400)} className="flex-row items-center gap-4">
        <Sunny mood="win" size={72} />
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-mint">{result.year != null ? 'Free in' : 'At this pace'}</Text>
          <Text className="font-display text-[56px] font-bold leading-[62px] text-aqua">{result.year ?? '65+ yrs'}</Text>
        </View>
      </Animated.View>
      <Text className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-[2px] text-mint">Your first moves</Text>
      <View className="gap-3">
        {moves.map((m, i) => (
          <Animated.View key={m.title} entering={FadeInDown.delay(250 + i * 150).duration(400)}
            className="flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <View className="h-11 w-11 items-center justify-center rounded-[13px]" style={{ backgroundColor: 'rgba(98,250,227,0.16)' }}>
              <Icon name={m.icon} fallback={m.fallback} size={22} color="#62FAE3" />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-bold text-white">{m.title}</Text>
              <Text className="text-[14px] text-mint">{m.why}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </RevealFrame>
  )
}
