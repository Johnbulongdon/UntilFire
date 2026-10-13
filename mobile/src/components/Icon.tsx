import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { Platform, View } from 'react-native'

import { Text } from './Text'

type Name = SymbolViewProps['name']

/**
 * An SF Symbol (V2: graphics first). On iOS it's the system symbol, which
 * matches the tab bar and Apple's own apps; elsewhere (the web preview) a
 * plain fallback glyph keeps the layout.
 */
export function Icon({ name, size = 20, color, fallback = '•', weight = 'semibold' }: {
  name: Name; size?: number; color: string; fallback?: string; weight?: SymbolViewProps['weight']
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" style={{ width: size, height: size }} />
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.8, lineHeight: size, color }}>{fallback}</Text>
    </View>
  )
}

/** Category keys (lib/categories.ts) to their SF Symbol, with the emoji the web preview falls back to. */
export const CATEGORY_SYMBOL: Record<string, { name: Name; fallback: string }> = {
  housing: { name: 'house.fill', fallback: '🏠' },
  food: { name: 'fork.knife', fallback: '🍔' },
  transport: { name: 'car.fill', fallback: '🚗' },
  healthcare: { name: 'cross.case.fill', fallback: '🩺' },
  shopping: { name: 'bag.fill', fallback: '🛍️' },
  entertainment: { name: 'ticket.fill', fallback: '🎟️' },
  subscriptions: { name: 'play.rectangle.fill', fallback: '📱' },
  travel: { name: 'airplane', fallback: '✈️' },
  utilities: { name: 'bolt.fill', fallback: '💡' },
  education: { name: 'graduationcap.fill', fallback: '🎓' },
  personal_care: { name: 'sparkles', fallback: '✨' },
  pets: { name: 'pawprint.fill', fallback: '🐾' },
  work: { name: 'briefcase.fill', fallback: '💼' },
  salary: { name: 'banknote.fill', fallback: '💵' },
  freelance: { name: 'laptopcomputer', fallback: '💻' },
  investment: { name: 'chart.line.uptrend.xyaxis', fallback: '📈' },
  gift: { name: 'gift.fill', fallback: '🎁' },
  transfer: { name: 'arrow.left.arrow.right', fallback: '↔️' },
  other: { name: 'square.grid.2x2.fill', fallback: '📦' },
  other_income: { name: 'plus.circle.fill', fallback: '➕' },
}

/** A known category's symbol, or null for one of your own categories (those keep their emoji). */
export const symbolFor = (key: string) => CATEGORY_SYMBOL[key] ?? null
