import { View } from 'react-native'

import { colors } from '@/theme/colors'

import { Icon } from './Icon'
import { Text } from './Text'

type SymbolName = Parameters<typeof Icon>[0]['name']

/** One idea per line (audit round 3): an icon in a rounded square, a short label and its amount. */
export function MoneyRow({ icon, fallback, label, value, tint = colors.ink2, first, negative }: {
  icon: SymbolName; fallback: string; label: string; value: string; tint?: string; first?: boolean; negative?: boolean
}) {
  return (
    <View className={`flex-row items-center gap-3 py-2.5 ${first ? '' : 'border-t border-border'}`}>
      <View className="h-8 w-8 items-center justify-center rounded-control" style={{ backgroundColor: `${tint}1F` }}>
        <Icon name={icon} fallback={fallback} size={17} color={tint} />
      </View>
      <Text numberOfLines={1} className="flex-1 text-[15px] text-ink">{label}</Text>
      <Text className={`font-mono text-[15px] ${negative ? 'text-neg-ink' : 'text-ink'}`}>{value}</Text>
    </View>
  )
}
