import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, TextInput, View } from 'react-native'

import { MoneyRow, SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { DEFAULT_MORTGAGE_RATE_PCT, newMortgageId, payoffYear, type Mortgage } from '@/engine'
import { haptic } from '@/lib/haptics'
import { saveFireProfile } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { fromInput, toInput } from '@/lib/display-currency'
import { colors } from '@/theme/colors'

/** Add or edit a mortgage (D-61): name, balance, monthly payment and rate, with its payoff year. */
export default function MortgageSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const all = data?.typed.mortgages ?? []
  const existing = id ? all.find(m => m.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? 'Mortgage')
  const [balance, setBalance] = useState(toInput(existing?.balance))
  const [monthly, setMonthly] = useState(toInput(existing?.monthly))
  const [rate, setRate] = useState(existing?.ratePct != null ? String(existing.ratePct) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const payoff = Number(balance) > 0 && Number(monthly) > 0 ? payoffYear(fromInput(balance), fromInput(monthly), rate ? Number(rate) : DEFAULT_MORTGAGE_RATE_PCT) : null

  const write = async (next: Mortgage[]) => {
    if (!session) return
    setBusy(true); setError('')
    // mortgageBalance/mortgageMonthly mirror the total, as the dashboard keeps them for older readers.
    const problem = await saveFireProfile(session.user.id, {
      mortgages: next,
      mortgageBalance: next.reduce((s, m) => s + m.balance, 0),
      mortgageMonthly: next.reduce((s, m) => s + m.monthly, 0),
    })
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  const save = () => {
    const m: Mortgage = { id: existing?.id ?? newMortgageId(), name: name.trim() || 'Mortgage', balance: fromInput(balance), monthly: fromInput(monthly), ...(rate ? { ratePct: Number(rate) } : {}) }
    write(existing ? all.map(x => (x.id === m.id ? m : x)) : [...all, m])
  }

  const remove = () => {
    if (!existing) return
    haptic.warn()
    Alert.alert(`Remove ${existing.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => write(all.filter(x => x.id !== existing.id)) },
    ])
  }

  return (
    <SheetFrame title={existing ? 'Edit mortgage' : 'Add a mortgage'} saveLabel="Save" onSave={save} canSave={!!session && Number(balance) > 0} busy={busy} error={error}>
      <TextInput
        accessibilityLabel="Name"
        className="rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[16px] text-ink"
        style={{ fontFamily: 'Manrope_500Medium' }}
        placeholder="e.g. Home"
        placeholderTextColor={colors.ink3}
        value={name}
        onChangeText={setName}
      />
      <View className="mt-4 rounded-card border border-border bg-card px-4">
        <MoneyRow first label="Balance owed" value={balance} onChange={setBalance} />
        <MoneyRow label="Monthly payment" value={monthly} onChange={setMonthly} />
        <MoneyRow label="Interest rate" note={`Leave blank for ${DEFAULT_MORTGAGE_RATE_PCT}%`} value={rate} onChange={setRate} suffix="%" />
      </View>
      {payoff ? <Text className="mt-3 text-[14px] text-ink-2">Paid off in <Text className="font-bold text-teal-deep">{payoff}</Text> at this payment.</Text> : null}
      {existing && (
        <Pressable accessibilityRole="button" onPress={remove} className="mt-8 items-center py-2">
          <Text className="text-[15px] font-semibold text-neg-ink">Remove mortgage</Text>
        </Pressable>
      )}
    </SheetFrame>
  )
}
