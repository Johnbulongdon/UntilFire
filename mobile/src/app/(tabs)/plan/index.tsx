import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { Icon } from '@/components/Icon'
import { ProgressTrack, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useLivePlan } from '@/state/live-plan'
import { useFreedom } from '@/state/freedom'
import { freedomFor } from '@/state/plan'
import { TAB_COLOR } from '@/theme/colors'

type SymbolName = Parameters<typeof Icon>[0]['name']

// Plan goes in many directions, so it's a set of chunky tiles, not a path (founder's call, October audit).
const TILES: { label: string; note: string; icon: SymbolName; fallback: string; to: string }[] = [
  { label: 'What if', note: 'Try a change', icon: 'wand.and.stars', fallback: '?', to: '/plan/what-if' },
  { label: 'Goals', note: 'Saving along the way', icon: 'target', fallback: '◎', to: '/plan/goals' },
  { label: 'Compare', note: 'Work less, a home, kids', icon: 'square.split.2x1.fill', fallback: '⇆', to: '/plan/compare' },
  { label: 'Contributions', note: 'Where saving goes', icon: 'arrow.up.right.circle.fill', fallback: '↗', to: '/plan/contributions' },
  { label: 'Scenarios', note: 'Investment mixes', icon: 'chart.bar.fill', fallback: '▤', to: '/plan/scenarios' },
  { label: 'Explore', note: 'Cities worldwide', icon: 'globe.americas.fill', fallback: '◍', to: '/plan/explore' },
  { label: 'Citizenship', note: 'Tax by passport', icon: 'person.text.rectangle.fill', fallback: '▭', to: '/plan/citizenship' },
  { label: 'Learn', note: 'Short reads', icon: 'book.fill', fallback: '▯', to: '/plan/learn' },
]

/** Plan (V2): the freedom date and how far along you are, then every planning page as a chunky tile. */
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

      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 14 }}>
        {TILES.map(t => (
          <Pressable key={t.label} accessibilityRole="button" accessibilityLabel={`${t.label}: ${t.note}`} onPress={() => { haptic.press(); router.push(t.to as never) }} style={{ width: '48%' }}>
            {({ pressed }) => (
              <View style={{ backgroundColor: TAB_COLOR.plan, borderRadius: 22, padding: 16, minHeight: 118, justifyContent: 'space-between',
                borderBottomWidth: pressed ? 0 : 5, borderBottomColor: 'rgba(0,0,0,0.28)', marginTop: pressed ? 5 : 0 }}>
                <Icon name={t.icon} fallback={t.fallback} size={28} color="#FFFFFF" />
                <View>
                  <Text style={{ color: '#FFFFFF' }} className="text-[17px] font-extrabold">{t.label}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)' }} className="text-[13px]">{t.note}</Text>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </Screen>
  )
}
