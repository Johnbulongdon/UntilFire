import { router } from 'expo-router'
import { Pressable } from 'react-native'

import { freeUntilPayday } from '@/lib/bills'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { AccountData } from '@/state/account'

import { Card, Label } from './Screen'
import { Text } from './Text'

/**
 * The cash free to spend until the next payday (D-29, lib/bills
 * freeUntilPayday): spending accounts less the bills before payday and any
 * card balance not yet listed as a bill. What's left of the budget is
 * Budget's Everyday pace bar (lib/budget-split), so this card doesn't repeat it.
 */
export function SetAside({ data }: { data: AccountData }) {
  const f = freeUntilPayday(data)
  if (!f) return null
  return (
    <Card>
      <Label>Free to spend until payday</Label>
      <Text className={`mt-1 font-mono text-[24px] ${f.free < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(f.free)}</Text>
      <Text className="text-[13px] text-ink-3">
        {money(f.spending)} in spending accounts, less {money(f.billsBefore)} of bills{f.cardsOwed > 0 ? ` and ${money(f.cardsOwed)} on cards` : ''} before {f.payday.description} in {f.days} {f.days === 1 ? 'day' : 'days'}
        {` · about ${money(Math.max(0, f.free) / f.days)} a day`}
      </Text>
      <Pressable accessibilityRole="button" hitSlop={6} onPress={() => { haptic.tick(); router.push('/spending-accounts') }} className="mt-2 self-start rounded-control bg-surface px-2 py-1 active:opacity-70">
        <Text className="text-[12px] font-semibold text-ink-2">Which accounts count ›</Text>
      </Pressable>
    </Card>
  )
}
