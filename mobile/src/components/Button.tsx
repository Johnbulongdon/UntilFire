import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { Icon } from './Icon'
import { Text } from './Text'

export type ButtonKind = 'primary' | 'quiet' | 'onDark' | 'onDarkQuiet' | 'danger'

/**
 * The one button (V2, Duolingo-style): a solid face on a darker lip that
 * presses down under the finger. Every tappable action looks like this, never
 * a bare word. Green acts; quiet is the neutral second choice; onDark sits on
 * the deep-green and coloured screens. `done` swaps the label for a tick, so
 * an answer shows it landed before the next screen arrives.
 */
export function Button({ label, onPress, kind = 'primary', small, disabled, done, style, accessibilityLabel }: {
  label: string
  onPress: () => void
  kind?: ButtonKind
  small?: boolean
  disabled?: boolean
  done?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const face = {
    primary: colors.green,
    quiet: colors.card,
    onDark: '#FFFDFA',
    onDarkQuiet: 'rgba(255,255,255,0.14)',
    danger: colors.card,
  }[kind]
  const ink = { primary: '#FFFFFF', quiet: colors.ink, onDark: colors.deep, onDarkQuiet: '#FFFFFF', danger: colors.negInk }[kind]
  const lip = { primary: 'rgba(0,0,0,0.28)', quiet: colors.border2, onDark: 'rgba(0,0,0,0.22)', onDarkQuiet: 'rgba(0,0,0,0.25)', danger: colors.border2 }[kind]
  const outlined = kind === 'quiet' || kind === 'danger'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { haptic.press(); onPress() }}
      style={[{ alignSelf: small ? 'flex-start' : 'stretch' }, style]}
    >
      {({ pressed }) => (
        <View style={{
          backgroundColor: face,
          borderRadius: small ? 14 : 18,
          borderWidth: outlined ? 1.5 : 0,
          borderColor: lip,
          borderBottomWidth: pressed ? (outlined ? 1.5 : 0) : 5,
          borderBottomColor: lip,
          marginTop: pressed ? 4 : 0,
          minHeight: small ? 40 : 56,
          paddingHorizontal: small ? 16 : 22,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        }}>
          {done
            ? <Icon name="checkmark" fallback="✓" size={small ? 18 : 24} color={ink} weight="heavy" />
            : <Text style={{ color: ink }} className={`${small ? 'text-[15px]' : 'text-[17px]'} font-extrabold`}>{label}</Text>}
        </View>
      )}
    </Pressable>
  )
}
