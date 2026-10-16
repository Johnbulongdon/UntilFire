import { router } from 'expo-router'
import { useState } from 'react'
import { Switch, View } from 'react-native'

import { SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { SHARED_PCT } from '@/engine'
import { haptic } from '@/lib/haptics'
import { saveFireProfile } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/**
 * Joint accounts (money logic audit round 2): a shared account counts half
 * on your own freedom date, its balance and its spending. The household date
 * still counts it once. Same setting as Net Worth on the website.
 */
export default function SharedAccounts() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const accounts = (data?.plaidAccounts ?? []).filter((a): a is typeof a & { plaid_account_id: string } => !!a.plaid_account_id)
  const [shared, setShared] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(accounts.map(a => [a.plaid_account_id, (data?.accountShares ?? {})[a.plaid_account_id] != null])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const accountShares = Object.fromEntries(Object.entries(shared).filter(([, on]) => on).map(([id]) => [id, SHARED_PCT]))
    const problem = await saveFireProfile(session.user.id, { accountShares })
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="Shared accounts" saveLabel="Save" onSave={save} canSave={!!session && accounts.length > 0} busy={busy} error={error}>
      <Text className="mb-3 text-[14px] leading-5 text-ink-2">Share an account with a partner? Half of it counts on your freedom date.</Text>
      <View className="rounded-card border border-border bg-card px-4">
        {accounts.map((a, i) => (
          <View key={a.id} className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{a.name}{a.mask ? ` ••${a.mask}` : ''}</Text>
              <Text className="text-[12px] text-ink-3">{shared[a.plaid_account_id] ? 'Shared, half is yours' : 'All yours'}</Text>
            </View>
            <Switch accessibilityLabel={`${a.name} is shared with a partner`} value={!!shared[a.plaid_account_id]}
              onValueChange={v => { haptic.select(); setShared(s => ({ ...s, [a.plaid_account_id]: v })) }}
              trackColor={{ true: colors.green, false: colors.border2 }} />
          </View>
        ))}
      </View>
    </SheetFrame>
  )
}
