import { View } from 'react-native'

import { Button } from './Button'
import { Sunny, type Mood } from './Sunny'
import { Text } from './Text'

/**
 * A screen or list with nothing in it yet (D-76): Sunny, a short title, one
 * line of why, and at most one button. Never a bare sentence.
 */
export function EmptyState({ title, body, action, mood = 'quiet', size = 104 }: {
  title: string
  body?: string
  action?: { label: string; onPress: () => void }
  mood?: Mood
  size?: number
}) {
  return (
    <View className="items-center px-6 py-6">
      <Sunny mood={mood} size={size} />
      <Text className="mt-3 text-center font-display text-[20px] font-bold text-ink">{title}</Text>
      {body ? <Text className="mt-1 text-center text-[14px] leading-5 text-ink-2">{body}</Text> : null}
      {action ? <Button small style={{ marginTop: 14, alignSelf: 'center' }} label={action.label} onPress={action.onPress} /> : null}
    </View>
  )
}
