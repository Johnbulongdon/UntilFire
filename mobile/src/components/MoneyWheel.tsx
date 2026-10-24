import { useMemo, useState } from 'react'
import { TextInput, View } from 'react-native'

import { currencySymbol, fromUSD } from '@/lib/display-currency'
import { colors } from '@/theme/colors'

import { Button } from './Button'
import { Text } from './Text'
import { Wheel } from './Wheel'

/**
 * A money wheel in steps of 100, with typing as the way out for an exact
 * number. `value` is in the display currency.
 */
export function MoneyWheel({ value, onChange, max, unit, label }: { value: number; onChange: (n: number) => void; max: number; unit: string; label: string }) {
  const [typing, setTyping] = useState(false)
  // Steps of 100 in dollars, and about that much in other currencies (HK$1,000, ¥10,000), so the wheel stays short.
  const step = niceStep(fromUSD(100))
  const values = useMemo(() => Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step), [max, step])
  const sym = currencySymbol().trim()
  return (
    <View className="gap-3">
      {typing ? (
        <View className="flex-row items-baseline border-b-2 border-border-2 pb-2">
          <Text className="font-mono text-[40px] text-ink">{sym}</Text>
          <TextInput autoFocus accessibilityLabel={label} keyboardType="number-pad" value={value ? String(value) : ''}
            onChangeText={t => onChange(Math.min(Number(t.replace(/[^0-9]/g, '')) || 0, 99_999_999))}
            placeholder="0" placeholderTextColor={colors.border2}
            className="ml-1 flex-1 text-[40px] text-ink" style={{ fontFamily: 'DMMono_500Medium' }} />
        </View>
      ) : (
        <Wheel key={step} values={values} value={Math.min(values[values.length - 1], Math.round(value / step) * step)} onChange={onChange} accessibilityLabel={label}
          format={n => `${sym}${n.toLocaleString('en-US')}`} />
      )}
      <Text className="text-center text-[15px] text-ink-2">{unit}</Text>
      <Button small kind="quiet" style={{ alignSelf: 'center' }} label={typing ? 'Use the wheel' : 'Type it instead'} onPress={() => setTyping(t => !t)} />
    </View>
  )
}

/** The nearest 1, 2 or 5 times a power of ten at or above n: 100, 200, 500, 1,000. */
function niceStep(n: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, n))))
  return [1, 2, 5, 10].map(k => k * p).find(v => v >= n * 0.75) ?? p * 10
}
