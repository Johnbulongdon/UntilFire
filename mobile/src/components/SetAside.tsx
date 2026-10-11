import { View } from 'react-native'

import { upcoming } from '@/lib/bills'
import { money } from '@/lib/format'
import { monthSpend, thisMonth } from '@/lib/money-data'
import type { AccountData } from '@/state/account'

import { Card, Label } from './Screen'
import { Text } from './Text'

/**
 * What the budget can still be spent on (D-41, D-29): the month's budget less
 * spending so far and the bills still due, and the cash free to spend until
 * the next payday once the bills before it are set aside.
 */
export function SetAside({ data }: { data: AccountData }) {
  const now = new Date()
  const month = thisMonth()
  const budget = Object.values(data.budget).reduce((s, v) => s + v, 0)
  const spent = monthSpend(data.transactions, month).total
  const events = upcoming(data.bills, 62, now)
  const billsLeft = events.filter(e => e.type === 'expense' && e.iso.startsWith(month)).reduce((s, e) => s - e.amount, 0)
  const everyday = budget - spent - billsLeft

  const payday = events.find(e => e.type === 'income' && e.counted)
  const beforePayday = events.filter(e => e.type === 'expense' && (!payday || e.iso < payday.iso)).reduce((s, e) => s - e.amount, 0)
  const free = data.balances.cashSavings - beforePayday
  const days = payday ? Math.max(1, Math.round((new Date(`${payday.iso}T00:00:00`).getTime() - now.getTime()) / 864e5)) : null

  return (
    <Card>
      {budget > 0 && (
        <>
          <Label>Left for everyday spending</Label>
          <Text className={`mt-1 font-mono text-[24px] ${everyday < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(everyday)}</Text>
          <Text className="text-[13px] text-ink-3">after {money(billsLeft)} of bills still due this month</Text>
        </>
      )}
      {payday && (
        <View className={budget > 0 ? 'mt-4 border-t border-border pt-3' : ''}>
          <Label>Free to spend until payday</Label>
          <Text className={`mt-1 font-mono text-[24px] ${free < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(free)}</Text>
          <Text className="text-[13px] text-ink-3">
            {money(data.balances.cashSavings)} in cash, less {money(beforePayday)} of bills before {payday.description} in {days} {days === 1 ? 'day' : 'days'}
            {days ? ` · about ${money(Math.max(0, free) / days)} a day` : ''}
          </Text>
        </View>
      )}
      {!payday && budget <= 0 && <Text className="text-[14px] text-ink-2">Add a payday in Calendar to see what's free to spend until then.</Text>}
    </Card>
  )
}
