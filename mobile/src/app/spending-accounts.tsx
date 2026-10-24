import { router } from 'expo-router'
import { useState } from 'react'
import { Switch, View } from 'react-native'

import { SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { isCounted } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { saveSpendAccounts } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/**
 * What each cash account is for (money logic study, Oct 16 2026): spending
 * money counts toward free to spend; the rest is your safety pot. Checking is
 * spending by default, as on the website (D-29).
 */
export default function SpendingAccounts() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const cash = (data?.plaidAccounts ?? []).filter(a => a.type === 'depository')
  const counted = (id: string, subtype: string | null) => isCounted({ id, name: '', type: 'depository', subtype, balanceUSD: 0 }, data?.spendToggles ?? {})
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(cash.map(a => [a.id, counted(a.id, a.subtype)])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const problem = await saveSpendAccounts(session.user.id, { ...(data?.spendToggles ?? {}), ...on })
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="Your cash accounts" saveLabel="Save" onSave={save} canSave={!!session && cash.length > 0} busy={busy} error={error}>
      <Text className="mb-3 text-[14px] leading-5 text-ink-2">Spending money counts toward free to spend. The rest is your safety pot, counted as your emergency fund.</Text>
      {cash.length === 0 ? (
        <Text className="text-[14px] text-ink-2">Connect a bank to choose which accounts are for spending.</Text>
      ) : (
        <View className="rounded-card border border-border bg-card px-4">
          {cash.map((a, i) => (
            <View key={a.id} className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{a.name}{a.mask ? ` ••${a.mask}` : ''}</Text>
                <Text className="text-[12px] text-ink-3">{money(a.balance_current ?? 0)} · {on[a.id] ? 'Spending' : 'Safety'}</Text>
              </View>
              <Switch accessibilityLabel={`${a.name} is spending money`} value={!!on[a.id]} onValueChange={v => { haptic.select(); setOn(s => ({ ...s, [a.id]: v })) }}
                trackColor={{ true: colors.green, false: colors.border2 }} />
            </View>
          ))}
        </View>
      )}
    </SheetFrame>
  )
}
