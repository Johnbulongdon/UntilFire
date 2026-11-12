import { View } from 'react-native'

import { Text } from '@/components/Text'
import { paydayReward, type PaydayPart, type PaydayPlan } from '@/engine'
import { money } from '@/lib/format'
import { brand, colors } from '@/theme/colors'

/** One colour per kind of part; the rows name each one, so nothing rests on colour alone. */
const partColor = (p: PaydayPart) => (p.kind === 'bills' ? colors.ink3 : p.kind === 'everyday' ? colors.moveInk : p.kind === 'step' ? colors.pos : colors.border2)

/** The few words under a row's name. */
function note(p: PaydayPart, plan: PaydayPlan): string | null {
  if (p.kind === 'bills') return 'Due before your next payday'
  if (p.kind === 'everyday') return plan.perDay != null ? `${money(plan.perDay)} a day for ${plan.days} ${plan.days === 1 ? 'day' : 'days'}` : null
  if (p.kind === 'cushion') return 'Stays in your account'
  return null
}

/**
 * The payday plan's split (D-150, lib/payday-plan): one bar for the cash in
 * the spending accounts, a row for each part, and what the saved part adds to
 * your free days. The same parts and words as the website's Today strip.
 */
export function PaydaySplit({ plan }: { plan: PaydayPlan }) {
  const reward = paydayReward(plan.hours)
  return (
    <View style={{ gap: 12, marginTop: 6 }}>
      <View accessible accessibilityRole="image" accessibilityLabel={plan.parts.map(p => `${p.label} ${money(p.amount)}`).join(', ')}
        style={{ flexDirection: 'row', gap: 3, height: 14 }}>
        {plan.parts.map(p => <View key={p.label} style={{ flexGrow: Math.max(p.amount, 1), flexBasis: 0, minWidth: 6, borderRadius: 7, backgroundColor: partColor(p) }} />)}
      </View>
      <View style={{ gap: 10 }}>
        {plan.parts.map(p => {
          const sub = note(p, plan)
          return (
            <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: partColor(p) }} />
              <View style={{ flex: 1 }}>
                <Text className="text-[16px] font-bold text-ink">{p.label}</Text>
                {!!sub && <Text className="text-[13px] text-ink-3">{sub}</Text>}
              </View>
              <Text className="font-mono text-[17px] font-bold text-ink">{money(p.amount)}</Text>
            </View>
          )
        })}
      </View>
      {plan.short > 0 && <Text className="text-[14px] leading-5 text-ink-2">Your bills are {money(plan.short)} more than the cash in your spending accounts right now.</Text>}
      {!!reward && (
        <View style={{ backgroundColor: brand.yellow, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: '#151719' }} className="text-[15px] font-bold leading-5">{reward}</Text>
        </View>
      )}
    </View>
  )
}
