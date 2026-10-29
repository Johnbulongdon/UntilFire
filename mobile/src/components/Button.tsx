import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { Icon } from './Icon'
import { Text } from './Text'

export type ButtonKind = 'primary' | 'onAccent' | 'quiet' | 'onDark' | 'onDarkQuiet' | 'danger'

/** Shared flat pill action; pressed, disabled, busy and done states keep their existing behaviour. */
export function Button({ label, onPress, kind = 'primary', small, disabled, done, busy, style, accessibilityLabel }: {
  label: string
  onPress: () => void
  kind?: ButtonKind
  small?: boolean
  disabled?: boolean
  done?: boolean
  busy?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const face = {
    primary: colors.green,
    onAccent: '#151719',
    quiet: colors.card,
    onDark: '#FFFDFA',
    onDarkQuiet: 'rgba(255,255,255,0.14)',
    danger: colors.card,
  }[kind]
  const ink = { onAccent:'#FFFFFF', primary: colors.card, quiet: colors.ink, onDark: colors.deep, onDarkQuiet: '#FFFFFF', danger: colors.negInk }[kind]
  const lip = { onAccent:'transparent', primary: 'rgba(0,0,0,0.28)', quiet: colors.border2, onDark: 'rgba(0,0,0,0.22)', onDarkQuiet: 'rgba(0,0,0,0.25)', danger: colors.border2 }[kind]
  const outlined = kind === 'quiet' || kind === 'danger'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={() => { haptic.press(); onPress() }}
      style={[{ alignSelf: small ? 'flex-start' : 'stretch' }, style]}
    >
      {({ pressed }) => (
        <View style={{
          backgroundColor: face,
          borderRadius: 999,
          borderWidth: outlined ? 1.5 : 0,
          borderColor: lip,
          borderBottomWidth: outlined ? 1 : 0,
          borderBottomColor: lip,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          minHeight: small ? 40 : 56,
          paddingHorizontal: small ? 16 : 22,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.9 : 1,
        }}>
          {busy
            ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={ink} />
                <Text style={{ color: ink }} className={`${small ? 'text-[15px]' : 'text-[17px]'} font-extrabold`}>{label}</Text>
              </View>
            : done
            ? <Icon name="checkmark" fallback="✓" size={small ? 18 : 24} color={ink} weight="heavy" />
            : <Text style={{ color: ink }} className={`${small ? 'text-[15px]' : 'text-[17px]'} font-extrabold`}>{label}</Text>}
        </View>
      )}
    </Pressable>
  )
}
