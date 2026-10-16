import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { addMonths, median } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { monthIncome, thisMonth } from '@/lib/money-data'
import type { AccountData } from '@/state/account'

import { Card, Label } from './Screen'
import { Text } from './Text'
import { goalsMonthly } from '@/lib/goals'

/** Pay as the bank saw it: the median of the last six complete months with any pay. Null under three.
 *  Pay only (salary, freelance): a refund or a move between accounts isn't pay (audit round 2). */
export function typicalIncome(data: AccountData): number | null {
  const pay = data.transactions.filter(t => t.category === 'salary' || t.category === 'freelance')
  const months = [1, 2, 3, 4, 5, 6].map(n => monthIncome(pay, addMonths(thisMonth(), -n))).filter(v => v > 0)
  return months.length >= 3 ? median(months) : null
}

/**
 * Income meets the budget (money logic study, Oct 16 2026): take-home less the
 * month's budget is what the plan sends toward freedom. The date itself runs
 * on real spending once there are three months (D-86). Says so when the
 * bank's pay is more than 10% away from the take-home typed in.
 */
export function SavingsLine({ data, budget }: { data: AccountData; budget: number }) {
  if (data.income <= 0 || budget <= 0) return null
  const saving = data.income - budget
  const banked = typicalIncome(data)
  const drift = banked != null && Math.abs(banked - data.income) > data.income * 0.1
  // Goals take their monthly share of the saving first (lib/goals).
  const toGoals = goalsMonthly(data.goals)
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityLabel={`Take-home ${money(data.income)} less budget ${money(budget)}: ${money(saving)} a month toward freedom. Open your freedom date`}
        onPress={() => { haptic.tick(); router.push('/plan/freedom') }} className="active:opacity-70">
        <Label>Toward freedom each month</Label>
        <Text className={`mt-1 font-mono text-[24px] ${saving < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(saving)}</Text>
        <Text className="text-[13px] text-ink-3">
          Take-home {money(data.income)} − budget {money(budget)}{data.income > 0 && saving > 0 ? ` · ${Math.round((saving / data.income) * 100)}% of pay` : ''} ›
        </Text>
        {toGoals > 0 && saving > 0 && (
          <Text className="mt-1 text-[13px] text-ink-2">
            {money(Math.min(toGoals, saving))} to your goals, {saving > toGoals ? `${money(saving - toGoals)} left to invest` : 'nothing left to invest'}
          </Text>
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
