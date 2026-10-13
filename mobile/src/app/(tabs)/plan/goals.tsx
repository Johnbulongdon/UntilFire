import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Pressable, View } from 'react-native'

import { DetailScreen } from '@/components/DetailScreen'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, ProgressTrack } from '@/components/Screen'
import { Text } from '@/components/Text'
import { EmptyState } from '@/components/EmptyState'
import { money } from '@/lib/format'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'

/** Goals from the website: what you're saving for along the way to freedom. */
export default function Goals() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  const goals = data?.goals ?? []

  return (
    <DetailScreen back="Plan" title="Goals" refreshing={loading} onRefresh={session ? refresh : undefined}>
      {!session ? (
        <Card soft>
          <Text className="text-[15px] leading-6 text-ink-2">Sign in to see the goals you've set on untilfire.com.</Text>
          <View className="mt-4"><PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} /></View>
        </Card>
      ) : goals.length === 0 ? (
        <EmptyState mood="hello" title="No goals yet" body="A house deposit, a sabbatical, an emergency cushion: name what you're saving for along the way." action={{ label: 'Add a goal', onPress: () => router.push('/goal') }} />
      ) : goals.map(g => {
        const share = g.current_saved / Math.max(g.target_amount, 1)
        return (
          <Pressable accessibilityRole="button" key={g.id} onPress={() => router.push({ pathname: '/goal', params: { id: g.id } })}>
          <Card>
            <View className="flex-row items-center gap-3">
              <Text className="text-[28px]">{g.emoji ?? '🎯'}</Text>
              <View className="flex-1">
                <Text className="text-[17px] font-semibold text-ink">{g.name}</Text>
                <Text className="text-[13px] text-ink-3">
                  {g.target_date ? `By ${new Date(`${g.target_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'No date set'}
                </Text>
              </View>
              <Text className="font-mono text-[15px] text-ink">{Math.round(share * 100)}%</Text>
            </View>
            <View className="mt-3"><ProgressTrack share={share} /></View>
            <Text className="mt-1.5 text-[13px] text-ink-2">
              <Text className="font-mono text-[13px] text-ink">{money(g.current_saved)}</Text> of <Text className="font-mono text-[13px]">{money(g.target_amount)}</Text>
            </Text>
          </Card>
          </Pressable>
        )
      })}
      {session && goals.length > 0 && (
        <Button kind="quiet" label="Add a goal" onPress={() => router.push('/goal')} />
      )}
    </DetailScreen>
  )
}
