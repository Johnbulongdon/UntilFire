import { View } from 'react-native'

import type { ExploreCity } from '@/engine'

import { Text } from './Text'

/** Browser preview only: the map is native, so the list stands in. */
export function ExploreMap(_props: { cities: ExploreCity[]; label: (c: ExploreCity) => string; onPick: (c: ExploreCity) => void; selected: string | null }) {
  return (
    <View className="items-center justify-center rounded-card bg-surface p-8">
      <Text className="text-center text-[14px] text-ink-2">The map shows on your phone. Use the list here.</Text>
    </View>
  )
}
