import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { MoneyRow, SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { isBrokerageAccount, isRetirementAccount } from '@/lib/balances'
import { haptic } from '@/lib/haptics'
import { saveFireProfile } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { fromInput, toInput } from '@/lib/display-currency'
import { useAuth } from '@/state/auth'


/** The balances you type in (the website's Net Worth inputs). A connected account replaces its kind. */
export default function Balances() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const typed = data?.typed
  const plaid = data?.plaidAccounts ?? []
  const connected = {
    cash: plaid.some(a => a.type === 'depository'),
    retirement: plaid.some(isRetirementAccount),
    brokerage: plaid.some(isBrokerageAccount),
    loans: plaid.some(a => a.type === 'loan' && !(a.subtype ?? '').includes('mortgage')),
  }
  const [v, setV] = useState({
    cashSavings: toInput(typed?.cashSavings ?? 0),
    k401: toInput(typed?.k401 ?? 0),
    rothIRA: toInput(typed?.rothIRA ?? 0),
    taxable: toInput(typed?.taxable ?? 0),
    totalDebt: toInput(typed?.totalDebt ?? 0),
    homeValue: toInput(typed?.homeValue ?? 0),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof v) => (t: string) => setV(prev => ({ ...prev, [k]: t }))

  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const problem = await saveFireProfile(session.user.id, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromInput(x)])))
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  const note = (on: boolean) => (on ? 'A connected account is used instead' : undefined)
  return (
    <SheetFrame title="Your balances" saveLabel="Save balances" onSave={save} canSave={!!session} busy={busy} error={error}>
      <Text className="mb-3 text-[14px] leading-5 text-ink-2">
        What you have today. Rough numbers are fine; your freedom date updates as soon as you save.
      </Text>
      <View className="rounded-card border border-border bg-card px-4">
        <MoneyRow first label="Cash & savings" note={note(connected.cash) ?? 'Savings and emergency fund'} value={v.cashSavings} onChange={set('cashSavings')} />
        <MoneyRow label="401(k)" note={note(connected.retirement) ?? 'Retirement savings through work'} value={v.k401} onChange={set('k401')} />
        <MoneyRow label="Roth IRA" note={note(connected.retirement) ?? 'Your own retirement account'} value={v.rothIRA} onChange={set('rothIRA')} />
        <MoneyRow label="Brokerage" note={note(connected.brokerage) ?? 'Investments outside retirement accounts'} value={v.taxable} onChange={set('taxable')} />
        <MoneyRow label="Other debt" note={note(connected.loans) ?? 'Loans, not counting mortgages or cards'} value={v.totalDebt} onChange={set('totalDebt')} />
        <MoneyRow label="Home value" note="Optional. In net worth only, never toward freedom" value={v.homeValue} onChange={set('homeValue')} />
      </View>
    </SheetFrame>
  )
}
