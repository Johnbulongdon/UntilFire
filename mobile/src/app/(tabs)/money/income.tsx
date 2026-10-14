import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { paycheck, pensionFor, STATE_TAX } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useAccount } from '@/state/account'
import { colors } from '@/theme/colors'

type SymbolName = Parameters<typeof Icon>[0]['name']

/**
 * Money → Income (the website's IncomeTab, D-59): salary to take-home, the
 * pension taken before tax, and what the employer adds. Take-home is the
 * income everything else reads.
 */
export default function Income() {
  const { data, loading, refresh } = useAccount()
  if (!data) return <DetailScreen back="Money" title="Income"><LoadingState /></DetailScreen>

  const { plan, taxKey } = data.profile
  const gross = plan.grossAnnual ?? 0, pension = plan.pensionAnnual ?? 0, employer = plan.employerAnnual ?? 0
  const pay = gross > 0 ? paycheck(gross, pension, taxKey) : null
  const yearTakeHome = pay && Math.abs(pay.takeHome / 12 - data.income) < 1 ? pay.takeHome : data.income * 12
  const pensionName = pensionFor(data.currency, !!STATE_TAX[taxKey] || data.currency === 'USD').payroll
  const taxLabel = STATE_TAX[taxKey]?.label ?? pay?.label ?? ''
  const edit = () => { haptic.tick(); router.push('/income-edit') }

  return (
    <DetailScreen back="Money" title="Income" refreshing={loading} onRefresh={refresh}>
      <Card>
        <Label>Take-home a year</Label>
        <Text className="mt-1 font-mono text-[30px] text-ink">{money(yearTakeHome)}</Text>
        <Text className="text-[13px] text-ink-3">
          {money(data.income)} a month{employer > 0 ? ` · plus ${money(employer)} a year from your employer` : ''}
        </Text>
      </Card>

      <Card>
        <Line icon="briefcase.fill" name="Salary" meta="Before tax, a year" value={gross > 0 ? money(gross) : 'Add'} onPress={edit} first />
        <Line icon="lock.fill" name={`${pensionName}, before tax`} meta="Taken from pay before tax, so it is saving" value={pension > 0 ? `−${money(pension)}` : 'Add'} onPress={edit} />
        {pay && !pay.unknown && <Line icon="building.columns.fill" name="Income tax" meta={taxLabel} value={`−${money(pay.incomeTax)}`} />}
        {pay && pay.us && <Line icon="doc.text.fill" name="Social Security and Medicare" meta="On the full salary" value={`−${money(pay.socialSecurity)}`} />}
        <Line icon="banknote.fill" name="Take-home" strong
          meta={pay ? (pay.unknown ? 'Set where you live to work out tax' : 'Worked out from your salary') : 'After tax, a month. Add a salary to work it out'}
          value={pay ? money(yearTakeHome) : `${money(data.income)}/mo`} onPress={pay ? undefined : edit} />
        <Line icon="gift.fill" name="Employer adds" meta="Into your pension, on top of your pay" value={employer > 0 ? `+${money(employer)}` : 'Add'} onPress={edit} positive={employer > 0} />
      </Card>
    </DetailScreen>
  )
}

function Line({ icon, name, meta, value, onPress, first, strong, positive }: {
  icon: SymbolName; name: string; meta: string; value: string; onPress?: () => void; first?: boolean; strong?: boolean; positive?: boolean
}) {
  const content = (
    <View className={`flex-row items-center gap-3 py-3 ${first ? '' : 'border-t border-border'}`}>
      <Icon name={icon} size={22} color={colors.tealDeep} />
      <View className="flex-1">
        <Text className={`text-[15px] ${strong ? 'font-bold' : 'font-semibold'} text-ink`}>{name}</Text>
        <Text className="text-[12px] text-ink-3">{meta}</Text>
      </View>
      <Text className={`font-mono text-[15px] ${value === 'Add' ? 'text-pos-ink' : positive ? 'text-pos-ink' : 'text-ink'}`}>{value}{onPress ? ' ›' : ''}</Text>
    </View>
  )
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content
}
