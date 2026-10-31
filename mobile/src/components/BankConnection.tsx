import { View } from 'react-native'
import { syncLabel, syncTime, type BankHealth } from '@/lib/bank-health'
import { plaidNativeAvailable } from '@/lib/plaid-native'
import { useBankHealth } from '@/state/bank-health'
import { brand } from '@/theme/colors'
import { Icon } from './Icon'
import { Text } from './Text'
import { Button } from './Button'

export function BankConnection({ bank }: { bank: BankHealth }) {
  const { busyId, message, error, loading, run } = useBankHealth()
  const busy = busyId === bank.id
  const unknown = !!error || bank.status === 'unknown'
  const label = busy ? 'Updating…' : loading ? 'Checking…' : unknown ? 'Status unavailable' : bank.status === 'attention' ? 'Needs attention' : 'Connected'
  const tone = bank.status === 'attention' && !unknown ? brand.yellow : unknown ? brand.lilac : brand.mint
  const native = plaidNativeAvailable()
  const needsReconnect = !unknown && bank.reconnect
  return <View className="rounded-[24px] bg-card p-5 gap-4">
    <View className="flex-row items-center gap-3">
      <View style={{ backgroundColor: tone, width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Icon name="building.columns.fill" fallback="▥" size={24} color={brand.deep} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-[18px] font-bold text-ink">{bank.name}</Text>
        <Text className="text-[13px] text-ink-2" accessibilityLiveRegion="polite">{label}</Text>
      </View>
    </View>
    <View className="gap-1">
      <Text className="text-[14px] font-semibold text-ink">{syncLabel(bank.lastSyncedAt)}</Text>
      {bank.lastSyncedAt && syncTime(bank.lastSyncedAt) !== null && <Text className="text-[12px] text-ink-3">{new Date(bank.lastSyncedAt).toLocaleString()}</Text>}
    </View>
    {needsReconnect && <Text className="text-[14px] text-ink-2">Your bank needs you to sign in again.</Text>}
    {message?.id === bank.id && <Text accessibilityLiveRegion="polite" className="text-[14px] text-ink-2">{message.text}</Text>}
    {needsReconnect && !native
      ? <Text className="text-[14px] text-ink-2">Reconnect is available in the installed UntilFire app.</Text>
      : <Button small style={{ minHeight: 44 }} kind={needsReconnect ? 'primary' : 'quiet'} label={busy ? 'Updating…' : needsReconnect ? 'Reconnect' : 'Retry sync'}
          accessibilityLabel={(needsReconnect ? 'Reconnect ' : 'Retry sync for ') + bank.name}
          busy={busy} disabled={!!busyId || loading} onPress={() => void run(bank.id, needsReconnect)} />}
  </View>
}
