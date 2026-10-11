import { Image, View } from 'react-native'

import type { FirePersonalityProfile } from '@/engine'

/**
 * One character from the website's 2×2 artwork sheets, cropped the way
 * app/fire-type/FireTypeAvatar.tsx does it: a 3:4 cell of a sheet drawn at double size.
 */
export function PersonalityAvatar({ profile, size = 96 }: { profile: FirePersonalityProfile; size?: number }) {
  const height = Math.round((size * 4) / 3)
  const { sheet, column, row } = profile.artwork
  return (
    <View style={{ width: size, height, borderRadius: Math.max(12, size * 0.08), overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <Image
        source={{ uri: sheet }}
        style={{ position: 'absolute', width: size * 2, height: height * 2, left: -column * size, top: -row * height }}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}
