import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { bankSummary } from '@/lib/bank-health'
import { useBankHealth } from '@/state/bank-health'
import { colors } from '@/theme/colors'
import { Icon } from './Icon'
import { Text } from './Text'

export function BankFreshness() {
  const { banks, busyId, error, loading } = useBankHealth()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  const summary = busyId ? 'Updating your bank…' : error ? 'Bank status unavailable' : loading ? (banks.length ? 'Checking your banks…' : null) : bankSummary(banks, now)
  if (!summary) return null
  return <Pressable accessibilityRole="button" accessibilityLabel={summary + '. Manage banks'} onPress={() => router.push('/money/banks')} style={{ minHeight: 44, justifyContent: 'center' }}>
    <View className="flex-row items-center gap-2 px-1">
      <Icon name="building.columns.fill" fallback="▥" size={16} color={colors.ink2} />
      <Text className="flex-1 text-[13px] text-ink-2">{summary}</Text>
      <Text className="text-[15px] text-ink-2">›</Text>
    </View>
  </Pressable>
}
