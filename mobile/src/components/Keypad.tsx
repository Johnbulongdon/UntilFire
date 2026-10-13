import { Pressable, View } from 'react-native'

import { currencySymbol } from '@/lib/display-currency'
import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { Text } from './Text'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫']

/**
 * A big on-screen keypad for large amounts, like Cash App: the number fills the
 * screen and a 000 key gets to six figures in two taps. Research favours a
 * keypad over wheels and sliders for big, exact numbers. `digits` is what's
 * typed, in the display currency.
 */
export function Keypad({ digits, onChange, max = 999_999_999 }: { digits: string; onChange: (d: string) => void; max?: number }) {
  const press = (k: string) => {
    haptic.tick()
    if (k === '⌫') return onChange(digits.slice(0, -1))
    const next = (digits === '0' ? '' : digits) + k
    if (Number(next) > max) { haptic.warn(); return }
    onChange(next.replace(/^0+(?=\d)/, ''))
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
      {KEYS.map(k => (
        // A static style on a View: NativeWind drops function styles on Pressable on iOS.
        <View key={k} style={{ width: '33.33%', height: 60 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={k === '⌫' ? 'Delete' : k} onPress={() => press(k)} onLongPress={k === '⌫' ? () => { haptic.tick(); onChange('') } : undefined}
            style={{ flex: 1 }}>
            {({ pressed }) => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: pressed ? colors.surface2 : 'transparent' }}>
                <Text className="font-mono text-[28px] text-ink">{k}</Text>
              </View>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  )
}

/** The typed amount, large, with the currency and thousands separators. */
export function KeypadAmount({ digits }: { digits: string }) {
  const n = Number(digits || '0')
  const len = n.toLocaleString('en-US').length
  return (
    <Text accessibilityLiveRegion="polite" numberOfLines={1} adjustsFontSizeToFit className="text-center font-mono"
      style={{ fontSize: len > 9 ? 40 : 52, color: digits ? colors.ink : colors.border2 }}>
      {currencySymbol().trim()}{n.toLocaleString('en-US')}
    </Text>
  )
}
