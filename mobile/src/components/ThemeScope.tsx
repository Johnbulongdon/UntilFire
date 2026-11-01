import { useAppearance } from '@/state/appearance'
import type { ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

import { themeVars } from '@/theme/colors'

/**
 * The theme's colour variables again, for content a Modal renders outside the
 * root view (on the web a portal leaves the page's CSS variables behind).
 */
export function ThemeScope({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  const { scheme } = useAppearance()
  return <View {...rest} style={[{ flex: 1 }, themeVars[scheme], style]}>{children}</View>
}
