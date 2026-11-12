import { useMemo, useState } from 'react'
import { View } from 'react-native'

const DOT_COLUMNS = 37
const DOT_GAP = 2

/**
 * One dot per day of a year (D-149): filled for each day the money already
 * pays for, a ring on the next one. 37 across, sized to the card, as on the
 * website at phone width. `ink` is the filled colour, for a page whose ink is
 * light (the month story in dark).
 */
export function FreeDaysDots({ days, ink = '#151719', ring = '#FFFFFF', empty = 'rgba(21,23,25,0.14)' }: { days: number; ink?: string; ring?: string; empty?: string }) {
  const [width, setWidth] = useState(0)
  const size = width > 0 ? (width - DOT_GAP * (DOT_COLUMNS - 1)) / DOT_COLUMNS : 0
  const dots = useMemo(() => Array.from({ length: 365 }, (_, i) => i), [])
  return (
    <View className="mt-3 flex-row flex-wrap" style={{ gap: DOT_GAP, minHeight: 8 }} onLayout={e => setWidth(Math.floor(e.nativeEvent.layout.width))}
      accessible accessibilityRole="image" accessibilityLabel={`${days} of 365 days filled`}>
      {size > 0 && dots.map(i => (
        <View key={i} style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: i < days ? ink : i === days ? ring : empty,
          borderWidth: i === days ? 1.5 : 0, borderColor: ink,
        }} />
      ))}
    </View>
  )
}
