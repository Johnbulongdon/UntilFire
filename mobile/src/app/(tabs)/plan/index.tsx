import { router } from 'expo-router'
import { View } from 'react-native'

import { HubCard, MoreList } from '@/components/HubCard'
import { ProgressTrack, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { compactMoney } from '@/lib/format'
import { useAccount } from '@/state/account'
import { useLivePlan } from '@/state/live-plan'
import { project, useFreedom } from '@/state/freedom'
import { freedomFor } from '@/state/plan'

/** Plan's hub: how you reach freedom, one card per page. */
export default function PlanHub() {
  const { plan } = useLivePlan()
  const { data } = useAccount()
  const f = useFreedom()
  if (!plan) return null

  const quick = freedomFor(plan)
  const full = f?.source === 'account' && f.inputs ? f : null
  const result = full ? { year: full.year, target: full.target } : quick
  const invested = full ? full.invested : plan.invested
  // Spending 10% less, on the same engine as the date shown.
  const leanerYears = full && full.inputs ? project({ ...full.inputs, monthlyExpenses: full.inputs.monthlyExpenses * 0.9 }, null).years : freedomFor({ ...plan, monthlySpending: plan.monthlySpending * 0.9 }).years
  const baseYears = full ? full.years : quick.years
  const soonerYears = baseYears != null && leanerYears != null ? baseYears - leanerYears : null
  const sooner = soonerYears != null ? Math.round(soonerYears * 10) / 10 : null
  const goals = data?.goals ?? []

  return (
    <Screen title="Plan" subtitle="How you reach freedom">
      <HubCard label="Freedom date" onPress={() => router.push('/plan/freedom')}>
        <Text className="font-display text-[44px] font-bold leading-[50px] text-teal">{result.year ?? '65+ yrs'}</Text>
        <View className="mt-2"><ProgressTrack share={result.target > 0 ? invested / result.target : 0} /></View>
        <Text className="mt-1.5 text-[13px] text-ink-2">
          <Text className="font-mono text-[13px] text-ink">{compactMoney(invested)}</Text> of{' '}
          <Text className="font-mono text-[13px]">{compactMoney(result.target)}</Text> · see how it's worked out
        </Text>
      </HubCard>

      <HubCard label="What if" onPress={() => router.push('/plan/what-if')}>
        <Text className="mt-1 text-[16px] leading-6 text-ink">
          {sooner != null && sooner > 0
            ? <>Spending 10% less brings freedom <Text className="font-bold text-teal-deep">{sooner} {sooner === 1 ? 'year' : 'years'} sooner</Text>.</>
            : 'Try spending, saving and earning changes and watch your date move.'}
        </Text>
      </HubCard>

      <HubCard label="Goals" onPress={() => router.push('/plan/goals')}>
        {goals.length === 0 ? (
          <Text className="mt-1 text-[15px] text-ink-2">Name what you're saving for along the way.</Text>
        ) : goals.slice(0, 3).map(g => (
          <View key={g.id} className="mt-2">
            <View className="flex-row justify-between">
              <Text className="text-[15px] text-ink">{g.emoji ?? '🎯'}  {g.name}</Text>
              <Text className="font-mono text-[13px] text-ink-2">{Math.round((g.current_saved / Math.max(g.target_amount, 1)) * 100)}%</Text>
            </View>
            <View className="mt-1"><ProgressTrack share={g.current_saved / Math.max(g.target_amount, 1)} height={6} /></View>
          </View>
        ))}
      </HubCard>

      <MoreList rows={[
        { label: 'Compare', note: 'Life changes: work less, a home, kids, a break', onPress: () => router.push('/plan/compare') },
        { label: 'Contributions', note: 'Where each month\x27s saving goes, in order', onPress: () => router.push('/plan/contributions') },
        { label: 'Scenarios', note: 'Compare investment mixes side by side', onPress: () => router.push('/plan/scenarios') },
        { label: 'Explore', note: 'Cities where your money goes further', onPress: () => router.push('/plan/explore') },
        { label: 'Citizenship', note: 'How your passport shapes tax and investing', onPress: () => router.push('/plan/citizenship') },
        { label: 'Learn', note: 'Short reads for where you are on the path', onPress: () => router.push('/plan/learn') },
      ]} />
    </Screen>
  )
}
