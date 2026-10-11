import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'

import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useAuth } from '@/state/auth'

import { Card, Label } from './Screen'
import { Text } from './Text'

interface Household {
  members: { name: string; isYou: boolean }[]
  combined: { monthlySavings: number; portfolio: number }
  retireYear: number | null
  agesAtFreedom: { name: string; isYou: boolean; age: number }[]
}

/**
 * The household's combined position on Home (the website's HouseholdCard):
 * one freedom date for two, worked out on the server because it reads both
 * accounts. Renders nothing without a household; Home only reads.
 */
export function HouseholdCard() {
  const { session } = useAuth()
  const [h, setH] = useState<Household | null>(null)

  useFocusEffect(useCallback(() => {
    if (!session) return
    let live = true
    fetch('https://untilfire.com/api/household/summary', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) setH((j?.household as Household | null) ?? null) })
      .catch(() => {})
    return () => { live = false }
  }, [session]))

  if (!h || h.members.length < 2) return null
  const partner = h.members.find(m => !m.isYou)
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/household') }}>
      <Card>
        <Label>Together with {partner?.name ?? 'your partner'}</Label>
        <Text className="mt-1 font-display text-[30px] font-bold text-teal-deep">{h.retireYear ?? 'Not yet in reach'}</Text>
        {h.agesAtFreedom.length > 0 && (
          <Text className="text-[13px] text-ink-2">{h.agesAtFreedom.map(a => `${a.isYou ? 'you' : a.name} at ${a.age}`).join(', ')}</Text>
        )}
        <View className="mt-3 flex-row gap-6">
          <View><Label>Invested together</Label><Text className="font-mono text-[16px] text-ink">{compactMoney(h.combined.portfolio)}</Text></View>
          <View><Label>Saved a month</Label><Text className="font-mono text-[16px] text-ink">{compactMoney(h.combined.monthlySavings)}</Text></View>
        </View>
      </Card>
    </Pressable>
  )
}
