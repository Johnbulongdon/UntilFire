import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { FeatureTile, PLAN_FEATURES } from '@/components/FeatureTile'
import { ProgressTrack, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useLivePlan } from '@/state/live-plan'
import { useFreedom } from '@/state/freedom'
import { freedomFor } from '@/state/plan'
import { colors } from '@/theme/colors'

/** Plan (V2): the freedom date and how far along you are, then the four planning places as chunky tiles. */
export default function PlanHub() {
  const { plan } = useLivePlan()
  const f = useFreedom()
  if (!plan) return null

  const quick = freedomFor(plan)
  const full = f?.source === 'account' && f.inputs ? f : null
  const year = full ? full.year : quick.year
  const target = full ? full.target : quick.target
  const invested = full ? full.invested : plan.invested

  return (
    <Screen tab="plan" flat hideTitle title="Plan">
      <Pressable accessibilityRole="button" accessibilityLabel={`Freedom in ${year ?? 'more than 65 years'}. See how it's worked out`} onPress={() => { haptic.tick(); router.push('/plan/freedom') }}>
        <Text className="text-[12px] font-bold uppercase tracking-[2px] text-ink-3">Your freedom date</Text>
        <Text className="text-teal-deep font-display text-[52px] font-bold leading-[58px] tracking-tight">{year ?? '65+ yrs'}</Text>
        <View className="mt-2"><ProgressTrack share={target > 0 ? invested / target : 0} /></View>
        <Text className="mt-1.5 text-[14px] text-ink-2">
          <Text className="font-mono text-[14px] text-ink">{compactMoney(invested)}</Text> of <Text className="font-mono text-[14px]">{compactMoney(target)}</Text>
        </Text>
      </Pressable>

      <View className="gap-3 rounded-card border border-border bg-card p-5"><Text className="text-[20px] font-bold text-ink">Put your plan in motion</Text><Text className="text-[14px] text-ink-2">Use an existing account or find a provider.</Text><Button label="Choose an account" onPress={() => router.push("/plan/account-setup" as never)} /></View>
      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 14 }}>
        {PLAN_FEATURES.map(t => <FeatureTile key={t.to} feature={t}
          onPress={() => { haptic.press(); router.push(t.to as never) }} />)}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Learn: short reads" onPress={() => { haptic.tick(); router.push('/plan/learn') }}
        className="min-h-[56px] flex-row items-center gap-3 rounded-card border border-border bg-card px-4">
        <Icon name="book.fill" fallback="▯" size={22} color={colors.ink} />
        <Text className="flex-1 text-[16px] font-bold text-ink">Learn</Text>
        <Text className="text-[14px] text-ink-2">Short reads ›</Text>
      </Pressable>
    </Screen>
  )
}
