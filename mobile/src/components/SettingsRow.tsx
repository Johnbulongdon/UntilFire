import { ActivityIndicator, Pressable, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { colors, TAB_COLOR } from '@/theme/colors'

import { Icon } from './Icon'
import { Text } from './Text'

type SymbolName = Parameters<typeof Icon>[0]['name']

/** A settings row's icon: white on Profile's colour, in a small rounded square, as iOS Settings does. */
export function RowIcon({ name, fallback }: { name: SymbolName; fallback: string }) {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: TAB_COLOR.profile, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} fallback={fallback} size={17} color="#FFFFFF" />
    </View>
  )
}

export function Row({ label, value, onPress, first, busy, icon, fallback }: { label: string; value: string; onPress?: () => void; first?: boolean; busy?: boolean; icon?: SymbolName; fallback?: string }) {
  const body = (
    <View className={`flex-row items-center justify-between gap-3 py-3 ${first ? '' : 'border-t border-border'}`}>
      {icon ? <RowIcon name={icon} fallback={fallback ?? ''} /> : null}
      <Text className="text-[15px] text-ink">{label}</Text>
      <View className="flex-1 flex-row items-center justify-end gap-1.5">
        {busy ? <ActivityIndicator color={colors.green} /> : <Text numberOfLines={1} className="text-[14px] text-ink-2">{value}</Text>}
        {onPress ? <Text className="text-[16px] text-ink-3">›</Text> : null}
      </View>
    </View>
  )
  return onPress ? <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); onPress() }}>{body}</Pressable> : body
}
