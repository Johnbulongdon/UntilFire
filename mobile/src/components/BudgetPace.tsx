import { View } from 'react-native'

import { money } from '@/lib/format'

import { Text } from './Text'
import { colors } from '@/theme/colors'

/**
 * The website's pace bar (D-41): spending against the month's budget, with a
 * line where an even pace would be today. No verdict in the first five days,
 * when one grocery shop would read as a trend. Red only when over budget.
 */
export function BudgetPace({ spent, budget, now = new Date() }: { spent: number; budget: number; now?: Date }) {
  const day = now.getDate()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const even = day / days
  const share = budget > 0 ? spent / budget : 0
  const over = share > 1
  const ahead = share > even
  const verdict = over ? null : day <= 5 ? null : ahead ? 'Ahead of pace' : 'Under pace'
  const left = budget - spent

  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Text className={`font-mono text-[28px] ${over ? 'text-neg-ink' : 'text-ink'}`}>{over ? `−${money(-left)}` : money(left)}</Text>
        {verdict ? (
          <Text className={`text-[13px] font-bold ${ahead ? 'text-warn' : 'text-pos-ink'}`}>{verdict}</Text>
        ) : null}
      </View>
      <Text className="text-[13px] text-ink-3">{over ? 'over this month\'s budget' : `left of ${money(budget)} this month`}</Text>
      <View className="mt-3" style={{ position: 'relative' }}>
        <View className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <View className={`h-full rounded-full ${over ? 'bg-neg' : ahead && day > 5 ? 'bg-warn' : 'bg-green'}`} style={{ width: `${Math.min(1, share) * 100}%` }} />
        </View>
        <View style={{ position: 'absolute', left: `${even * 100}%`, top: -3, width: 2, height: 16, backgroundColor: colors.ink, opacity: 0.35 }} />
      </View>
      <Text className="mt-2 text-[12px] text-ink-3">The line marks an even pace for day {day} of {days}.</Text>
    </View>
  )
}
