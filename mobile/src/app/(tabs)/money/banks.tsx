import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { View } from 'react-native'
import { BankBridge } from '@/components/BankBridge'
import { Button } from '@/components/Button'
import { DetailScreen } from '@/components/DetailScreen'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { BankConnection } from '@/components/BankConnection'
import { useAuth } from '@/state/auth'
import { useBankHealth } from '@/state/bank-health'
import { brand } from '@/theme/colors'

export default function Banks() {
  const { session } = useAuth()
  const health = useBankHealth()
  const { refreshIfStale } = health
  useFocusEffect(useCallback(() => { refreshIfStale() }, [refreshIfStale]))
  return <DetailScreen back="Money" title="Your banks" subtitle="Connections and last successful syncs." refreshing={health.loading} onRefresh={health.busyId ? undefined : () => void health.refresh()}>
    {!session ? <Button label="Sign in" onPress={() => router.push('/sign-in')} /> : <>
      {health.error && <View className="rounded-[24px] bg-card p-5 gap-3">
        <Text accessibilityRole="alert" className="text-[14px] text-ink-2">{health.error}</Text>
        <Button small kind="quiet" label="Check again" busy={health.loading} disabled={!!health.busyId} onPress={() => void health.refresh()} />
      </View>}
      {health.loading && !health.banks.length && <Text accessibilityLiveRegion="polite" className="text-[14px] text-ink-2">Checking your banks…</Text>}
      {!health.loading && !health.error && !health.banks.length && <View style={{ backgroundColor: brand.blue, borderRadius: 24, padding: 20, gap: 6 }}>
        <Icon name="building.columns.fill" fallback="▥" size={30} color={brand.deep} />
        <Text style={{ color: brand.deep }} className="text-[20px] font-bold">All your banks, together</Text>
        <Text style={{ color: brand.deep }} className="text-[14px]">Connect a bank to bring in your activity.</Text>
      </View>}
      {health.banks.map(bank => <BankConnection key={bank.id} bank={bank} />)}
      <Text className="text-[13px] leading-5 text-ink-3">Last synced means transactions imported into UntilFire. It does not guarantee a live balance.</Text>
      {health.checkedAt && <Text className="text-[12px] text-ink-3">Connections checked {new Date(health.checkedAt).toLocaleString()}</Text>}
      {health.checkedAt !== null && !health.error && <BankBridge another={health.banks.length > 0} />}
    </>}
  </DetailScreen>
}

