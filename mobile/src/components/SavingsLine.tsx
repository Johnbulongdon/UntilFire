import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { addMonths, median } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { monthIncome, thisMonth } from '@/lib/money-data'
import type { AccountData } from '@/state/account'

import { Card, Label } from './Screen'
import { Text } from './Text'
import { monthlySaving } from '@/lib/saving'
import { colors, TAB_COLOR } from '@/theme/colors'

import { MoneyRow } from './MoneyRow'

/** Pay as the bank saw it: the median of the last six complete months with any pay. Null under three.
 *  Pay only (salary, freelance): a refund or a move between accounts isn't pay (audit round 2). */
export function typicalIncome(data: AccountData): number | null {
  const pay = data.transactions.filter(t => t.category === 'salary' || t.category === 'freelance')
  const months = [1, 2, 3, 4, 5, 6].map(n => monthIncome(pay, addMonths(thisMonth(), -n))).filter(v => v > 0)
  return months.length >= 3 ? median(months) : null
}

/**
 * What you save each month (audit round 3, Oct 17 2026): take-home less real
 * spending, the one figure Freedom and What if use too (lib/saving). Goals take
 * their share first. The budget is a one-line what-if. Says so when the bank's
 * pay is more than 10% away from the take-home typed in.
 */
export function SavingsLine({ data }: { data: AccountData }) {
  if (data.income <= 0) return null
  const s = monthlySaving(data)
  const banked = typicalIncome(data)
  const drift = banked != null && Math.abs(banked - data.income) > data.income * 0.1
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityLabel={`You save ${money(s.saving)} a month. Open your freedom date`}
        onPress={() => { haptic.tick(); router.push('/plan/freedom') }} className="active:opacity-70">
        <Label>You save each month</Label>
        <Text className={`mt-1 font-mono text-[28px] ${s.saving < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(s.saving)}</Text>
        <View className="mt-2">
          <MoneyRow first icon="arrow.down.circle.fill" fallback="↓" label="Take-home" value={money(data.income)} tint={colors.pos} />
          <MoneyRow icon="creditcard.fill" fallback="$" label={s.source === 'actual' ? 'You really spend' : 'Your budget'} value={`−${money(s.spending)}`} />
          {s.toGoals > 0 && <MoneyRow icon="target" fallback="◎" label="To your goals" value={money(s.toGoals)} tint={TAB_COLOR.plan} />}
          {s.saving > 0 && <MoneyRow icon="arrow.up.right" fallback="↗" label="To invest" value={money(s.toInvest)} tint={colors.teal} />}
        </View>
        {s.source === 'actual' && s.budgetSaving != null && Math.abs(s.budgetSaving - s.saving) >= 1 && (
          <Text className="mt-2 text-[12px] text-ink-3">On budget: {money(s.budgetSaving)} ›</Text>
        )}
      </Pressable>
      {drift && (
        <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/income-edit') }} className="mt-3 border-t border-border pt-3 active:opacity-70">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-[13px] text-ink-2">Pay into your bank is usually {money(banked!)} a month, not {money(data.income)}.</Text>
            <View className="rounded-control bg-green-50 px-2 py-1"><Text className="text-[12px] font-semibold text-green-700">Update pay</Text></View>
          </View>
        </Pressable>
      )}
    </Card>
  )
}
