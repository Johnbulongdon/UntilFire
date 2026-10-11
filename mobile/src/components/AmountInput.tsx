import { TextInput, View } from 'react-native'
import { Text } from './Text'

import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'

import { Bouncy } from './Bouncy'
import { colors } from '@/theme/colors'

/** A big dollar field with tap-to-fill suggestions, like the tiles on untilfire.com. */
export function AmountInput(props: {
  value: number | null
  onChange: (n: number | null) => void
  suggestions: { value: number; sub: string }[]
  unit?: string
  label: string
}) {
  const text = props.value == null ? '' : props.value.toLocaleString('en-US')
  return (
    <View>
      <View className="flex-row items-baseline border-b-2 border-border-2 pb-2">
        <Text className="font-mono text-[40px] text-ink">$</Text>
        <TextInput
          accessibilityLabel={props.label}
          className="ml-1 flex-1 text-[40px] text-ink"
          style={{ fontFamily: 'DMMono_500Medium' }}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.border2}
          value={text}
          onChangeText={t => {
            const digits = t.replace(/[^0-9]/g, '')
            props.onChange(digits === '' ? null : Math.min(Number(digits), 999_999_999))
          }}
        />
        {props.unit && <Text className="text-base text-ink-2">{props.unit}</Text>}
      </View>

      <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
        {props.suggestions.map(s => {
          const selected = props.value === s.value
          return (
            <Bouncy
              key={`${s.value}-${s.sub}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => { haptic.select(); props.onChange(s.value) }}
              style={{ width: '48%' }}
            >
              <View
                className={`rounded-2xl border-2 px-4 py-3 ${selected ? 'border-green bg-green-50' : 'border-border bg-card'}`}
                style={{ borderBottomWidth: 4 }}
              >
                <Text className="font-mono text-lg text-ink">{compactMoney(s.value)}</Text>
                <Text className="mt-0.5 text-[13px] text-ink-2">{s.sub}</Text>
              </View>
            </Bouncy>
          )
        })}
      </View>
    </View>
  )
}
