import { Redirect, router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { HomeAccountCards } from '@/components/HomeAccountCards'
import { PersonalityAvatar } from '@/components/PersonalityAvatar'
import { Card, Label, ProgressTrack, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { compactMoney, money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useAccount } from '@/state/account'
import { useFreedom } from '@/state/freedom'
import { useLivePlan } from '@/state/live-plan'
import { personalityFor } from '@/state/plan'

/** Home interprets; it owns no inputs (docs/design/app-structure.md). */
export default function Home() {
  const { plan } = useLivePlan()
  const result = useFreedom()
  const { data, loading, refresh } = useAccount()
  if (!plan || !result) return <Redirect href="/onboarding" />

  // The full projection when signed in (debts, mortgages, tax), as the website's Home.
  const share = result.target > 0 ? result.invested / result.target : 0
  const saving = Math.max(0, plan.monthlyIncome - plan.monthlySpending)
  const type = personalityFor(plan)
  const yearsAway = result.years != null ? Math.ceil(result.years) : null

  return (
    <Screen title={data?.displayName ? `Hi, ${data.displayName.split(' ')[0]}` : 'Home'} refreshing={loading && !!data} onRefresh={data ? refresh : undefined}>
      {/* FreedomCard, as on app/dashboard/HomeCards.tsx */}
      <Card>
        <View className="flex-row justify-between">
          <Label>Work becomes optional</Label>
          <Text className="text-[12px] text-ink-3">{result.source === 'account' ? 'From your account' : 'From your answers'}</Text>
        </View>
        {result.year != null ? (
          <>
            <Text className="font-display text-[44px] font-bold leading-[50px] text-teal">{result.date ? result.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : result.year}</Text>
            {yearsAway != null && (
              <Text className="mt-0.5 text-[14px] text-ink-2">
                {yearsAway === 0 ? 'You are there' : `In ${yearsAway} ${yearsAway === 1 ? 'year' : 'years'}`}
                {result.ageAtFreedom != null ? `, at ${result.ageAtFreedom}` : ''}
              </Text>
            )}
          </>
        ) : (
          <Text className="mt-1 text-[16px] text-ink-2">More than 65 years at this pace. Plan shows what moves it.</Text>
        )}
        <View className="mt-5 gap-1.5">
          <ProgressTrack share={share} height={10} />
          <View className="flex-row justify-between">
            <Text className="text-[13px] text-ink-2">
              <Text className="font-mono text-[13px] text-ink">{compactMoney(result.invested)}</Text> of{' '}
              <Text className="font-mono text-[13px]">{compactMoney(result.target)}</Text> FIRE number
            </Text>
            <Text className="font-mono text-[13px] text-ink">{Math.min(100, Math.round(share * 100))}%</Text>
          </View>
        </View>
      </Card>

      {/* MonthCard: the month's money at a glance */}
      <Card>
        <View className="flex-row justify-between">
          <Label>Each month</Label>
          <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/money') }} hitSlop={8}>
            <Text className="text-[13px] font-bold text-pos-ink">Money →</Text>
          </Pressable>
        </View>
        <View className="mt-2 flex-row items-baseline gap-2">
          <Text className="font-mono text-[28px] text-ink">{money(plan.monthlySpending)}</Text>
          <Text className="text-[13px] text-ink-3">spent of <Text className="font-mono text-[13px]">{money(plan.monthlyIncome)}</Text> take-home</Text>
        </View>
        <View className="mt-3 h-2 flex-row overflow-hidden rounded bg-surface-2" style={{ gap: 2 }}>
          <View className="bg-sun" style={{ width: `${Math.min(100, (plan.monthlySpending / Math.max(plan.monthlyIncome, 1)) * 100)}%` }} />
          <View className="bg-green" style={{ width: `${Math.min(100, (saving / Math.max(plan.monthlyIncome, 1)) * 100)}%` }} />
        </View>
        <View className="mt-2.5 flex-row gap-4">
          <Legend color="bg-sun" label="Spending" />
          <Legend color="bg-green" label={`Saving ${money(saving)}`} />
        </View>
      </Card>

      {data ? <HomeAccountCards data={data} /> : null}

      <Card>
        <View className="flex-row items-center gap-4">
          <PersonalityAvatar profile={type} size={56} />
          <View className="flex-1">
            <Label>Your FIRE type</Label>
            <Text className="mt-0.5 font-display text-[19px] font-bold text-ink">{type.name}</Text>
            <Text className="mt-0.5 text-[13px] italic text-ink-2">{type.quote}</Text>
          </View>
        </View>
      </Card>
    </Screen>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2 w-2 rounded-full ${color}`} />
      <Text className="text-[13px] text-ink-2">{label}</Text>
    </View>
  )
}
