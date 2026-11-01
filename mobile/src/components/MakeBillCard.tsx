import { billForPayment, guessBillCategory, nextMonthlyDue, ordinal } from '@engine/spend-forecast.ts'
import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { isoDay } from '@/engine'
import { haptic } from '@/lib/haptics'
import { makeBillFromTransaction } from '@/lib/mutations'
import { type Bill, toUSD, type Transaction } from '@/state/account'

/**
 * "Make it a bill" on a saved spend (D-133), as on the website: monthly on
 * the day it was paid, linked to its bank name. Rare, so it waits as one
 * quiet button above Delete; a payment that already is a bill shows which.
 * One that looks like an unlinked bill (rent through Bilt) asks first.
 */
export function MakeBillCard({ tx, bills, userId, onDone }: { tx: Transaction; bills: Bill[]; userId: string; onDone: () => void }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listed = bills.filter(b => b.transaction_type === 'expense').map(b => ({
    id: b.id, description: b.description, category: b.category || guessBillCategory(b.description), merchant: b.match_merchant ?? null,
    usd: Math.abs(toUSD(b.amount, b.currency)), due: b.due_date, recurrence: 'monthly' as const,
  }))
  const { already, likely } = billForPayment({ usd: toUSD(tx.amount, tx.currency), description: tx.description, category: tx.category }, listed)
  const due = nextMonthlyDue(tx.date, isoDay(new Date()))
  const day = ordinal(Number(due.slice(8, 10)))

  if (already) return <Text className="mt-6 text-center text-[14px] text-ink-2">📅 Already a bill: {already.description}</Text>

  const make = async (linkId: string | null) => {
    setBusy(true); setError('')
    const err = await makeBillFromTransaction(userId, tx, due, linkId)
    setBusy(false)
    if (err) { haptic.warn(); setError(err); return }
    haptic.success(); setAsking(false); onDone()
  }

  if (!asking) return <View className="mt-6"><Button kind="quiet" label="📅 Make it a bill" accessibilityLabel="Make it a bill" onPress={() => { haptic.tick(); setAsking(true) }} /></View>

  return (
    <View className="mt-6 rounded-card bg-surface p-4" style={{ gap: 8 }}>
      <Text className="text-[16px] font-bold text-ink">{likely ? `Is this your ${likely.description} bill?` : `Monthly on the ${day}`}</Text>
      <Text className="text-[14px] text-ink-2">{likely ? `It will be due monthly on the ${day}, and payments like this tick it paid.` : 'Shows on Calendar. Payments like this tick it paid.'}</Text>
      <View className="mt-1 flex-row flex-wrap" style={{ gap: 8 }}>
        {likely && <Button small label="Yes, link it" busy={busy} onPress={() => make(likely.id!)} />}
        <Button small kind={likely ? 'quiet' : 'primary'} label={likely ? 'No, new bill' : 'Add bill'} disabled={busy} onPress={() => make(null)} />
        <Button small kind="quiet" label="Cancel" disabled={busy} onPress={() => setAsking(false)} />
      </View>
      {error ? <Text className="text-[14px] text-neg-ink">{error}</Text> : null}
    </View>
  )
}
