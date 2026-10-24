import MapView, { Marker } from 'react-native-maps'
import { View } from 'react-native'

import type { ExploreCity } from '@/engine'

import { Text } from './Text'

/** Every city on the phone's own map, each pin saying your freedom year there. */
export function ExploreMap({ cities, label, onPick, selected }: {
  cities: ExploreCity[]
  label: (c: ExploreCity) => string
  onPick: (c: ExploreCity) => void
  selected: string | null
}) {
  return (
    <MapView
      style={{ height: 420, borderRadius: 20 }}
      initialRegion={{ latitude: 30, longitude: -40, latitudeDelta: 90, longitudeDelta: 160 }}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      {cities.map(c => (
        <Marker key={c.key} coordinate={{ latitude: c.lat, longitude: c.lng }} onPress={() => onPick(c)} tracksViewChanges={false}>
          <View className={`rounded-full border px-2 py-0.5 ${selected === c.key ? 'border-green bg-green' : 'border-border-2 bg-card'}`}>
            <Text className={`font-mono text-[11px] ${selected === c.key ? 'text-white' : 'text-ink'}`}>{label(c)}</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  )
}
