import { View } from 'react-native'
import { Text } from './Text'
import { Icon } from './Icon'

import { Bouncy } from './Bouncy'

/** A big tappable answer: a drawn icon (or an emoji), a title and a line of detail. */
export function OptionCard({ emoji, icon, title, detail, selected, onPress }: {
  emoji?: string
  icon?: { name: Parameters<typeof Icon>[0]['name']; tint: string }
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
        {icon ? (
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: icon.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon.name} size={30} color="#FFFFFF" />
          </View>
        ) : emoji ? <Text className="text-[30px]">{emoji}</Text> : null}
        <View className="flex-1">
          <Text className="text-[17px] font-semibold text-ink">{title}</Text>
          {detail && <Text className="mt-0.5 text-[14px] leading-5 text-ink-2">{detail}</Text>}
        </View>
      </View>
    </Bouncy>
  )
}
