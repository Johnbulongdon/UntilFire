import { View } from 'react-native'
import { Text } from './Text'

import { Bouncy } from './Bouncy'

/** A big tappable answer: an emoji, a title and a line of detail. */
export function OptionCard({ emoji, title, detail, selected, onPress }: {
  emoji: string
  title: string
  detail?: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Bouncy accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      <View
        className={`flex-row items-center gap-4 rounded-2xl border-2 px-4 py-4 ${selected ? 'border-green bg-green-50' : 'border-border bg-card'}`}
        style={{ borderBottomWidth: 4 }}
      >
        <Text className="text-[30px]">{emoji}</Text>
        <View className="flex-1">
          <Text className="text-[17px] font-semibold text-ink">{title}</Text>
          {detail && <Text className="mt-0.5 text-[14px] leading-5 text-ink-2">{detail}</Text>}
        </View>
      </View>
    </Bouncy>
  )
}
