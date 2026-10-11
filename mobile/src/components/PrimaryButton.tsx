import { View } from 'react-native'

import { haptic } from '@/lib/haptics'

import { Bouncy } from './Bouncy'
import { Text } from './Text'

/**
 * The main call to action: a green pill, like components/ui/Button on the website.
 * `onDark` is the cream pill for the deep-green welcome and reveal screens.
 */
export function PrimaryButton({ label, onPress, disabled, variant = 'green' }: {
  label: string
  onPress: () => void
  disabled?: boolean
  variant?: 'green' | 'onDark'
}) {
  const onDark = variant === 'onDark'
  return (
    <Bouncy
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { haptic.press(); onPress() }}
    >
      <View
        className={`h-14 items-center justify-center rounded-full ${onDark ? 'bg-[#FFFDFA]' : 'bg-green'} ${disabled ? 'opacity-35' : ''}`}
        style={onDark || disabled ? undefined : { shadowColor: '#78501E', shadowOpacity: 0.13, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}
      >
        <Text className={`text-[17px] font-bold ${onDark ? 'text-brand' : 'text-card'}`}>{label}</Text>
      </View>
    </Bouncy>
  )
}
