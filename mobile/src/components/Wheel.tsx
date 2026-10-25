import { memo, useRef } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, type ScrollViewInstance, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { Text } from './Text'

const ROW = 56
const VISIBLE = 5

/**
 * A wheel you spin up and down, like the iOS picker: the middle row is the
 * answer, every row it passes ticks. Used for age and for monthly amounts in
 * steps of 100 (founder's call: wheels in onboarding).
 *
 * A plain ScrollView, not a FlatList: the wheel sits inside the question
 * screen's ScrollView, and a list nested there breaks (React Native warns).
 * The rows never re-render while spinning (the band behind the middle row
 * marks the answer), so a few hundred of them stay smooth.
 */
export function Wheel<T>({ values, value, onChange, format, accessibilityLabel }: {
  values: T[]
  value: T
  onChange: (v: T) => void
  format: (v: T) => string
  accessibilityLabel: string
}) {
  const scroller = useRef<ScrollViewInstance>(null)
  const index = Math.max(0, values.indexOf(value))
  const last = useRef(index)
  // Where the wheel opens: set once, so it starts on the answer before the first frame.
  const start = useRef(index * ROW)

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROW)))
    start.current = i * ROW
    if (i !== last.current) { last.current = i; haptic.select(); onChange(values[i]) }
  }

  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => {
        const i = Math.max(0, Math.min(values.length - 1, index + (e.nativeEvent.actionName === 'increment' ? 1 : -1)))
        onChange(values[i]); scroller.current?.scrollTo({ y: i * ROW, animated: true })
      }}
      style={{ height: ROW * VISIBLE }}>
      {/* The selection band behind the middle row. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ROW * 2, height: ROW, borderRadius: 16, backgroundColor: colors.surface2 }} />
      <ScrollView
        ref={scroller}
        contentOffset={{ x: 0, y: start.current }}
        onLayout={() => scroller.current?.scrollTo({ y: start.current, animated: false })}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingVertical: ROW * 2 }}
      >
        <Rows values={values} format={format as (v: unknown) => string} />
      </ScrollView>
      {/* Fade the rows above and below so the middle one reads as the answer. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: ROW * 1.6, backgroundColor: colors.ground, opacity: 0.55 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: ROW * 1.6, backgroundColor: colors.ground, opacity: 0.55 }} />
    </View>
  )
}

const Rows = memo(function Rows({ values, format }: { values: unknown[]; format: (v: unknown) => string }) {
  return (
    <>
      {values.map((item, i) => (
        <View key={i} style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}>
          <Text className="font-mono" style={{ fontSize: 30, color: colors.ink }}>{format(item)}</Text>
        </View>
      ))}
    </>
  )
}, (a, b) => a.values === b.values)
