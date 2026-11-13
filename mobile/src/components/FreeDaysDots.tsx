import { useState } from 'react'
import { View } from 'react-native'

import { Text } from '@/components/Text'
import { FREE_DAY_MONTHS } from '@/engine'

const DOT_GAP = 1.5
const MONTH_GAP_X = 9
const MONTH_GAP_Y = 10

/**
 * One dot per day of a year (D-149): filled for each day the money already
 * pays for, a ring on the next one. The year is twelve small months with
 * seven dots a row, so a row is a week and the filled part reads like a
 * calendar, as on the website. `perRow` is how many months sit side by side:
 * six on Home's card, four where there is room (the month story). `ink` is the
 * filled colour, for a page whose ink is light (the story in dark).
 */
export function FreeDaysDots({ days, perRow = 6, ink = '#151719', ink2 = '#5C5130', ring = '#FFFFFF', empty = 'rgba(21,23,25,0.14)' }: {
  days: number; perRow?: number; ink?: string; ink2?: string; ring?: string; empty?: string
}) {
  const [width, setWidth] = useState(0)
  const month = width > 0 ? Math.floor((width - MONTH_GAP_X * (perRow - 1)) / perRow) : 0
  // Rounded down to half a point: seven dots and their gaps always fit the month's width, and the spacing stays even.
  const size = month > 0 ? Math.floor(((month - DOT_GAP * 6) / 7) * 2) / 2 : 0
  return (
    <View className="mt-3 flex-row flex-wrap" style={{ columnGap: MONTH_GAP_X, rowGap: MONTH_GAP_Y, minHeight: 8 }} onLayout={e => setWidth(Math.floor(e.nativeEvent.layout.width))}
      accessible accessibilityRole="image" accessibilityLabel={`${days} of 365 days filled`}>
      {size > 0 && FREE_DAY_MONTHS.map(m => (
        <View key={m.name} style={{ width: month, gap: 4 }}>
          <Text style={{ color: ink2, letterSpacing: 1 }} className="text-[11px] font-bold uppercase leading-[12px]">{m.name}</Text>
          <View className="flex-row flex-wrap" style={{ gap: DOT_GAP }}>
            {Array.from({ length: m.days }, (_, i) => {
              const day = m.start + i
              return (
                <View key={day} style={{
                  width: size, height: size, borderRadius: size / 2,
                  backgroundColor: day < days ? ink : day === days ? ring : empty,
                  borderWidth: day === days ? 1.5 : 0, borderColor: ink,
                }} />
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}
