import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { Platform, View } from 'react-native'
import Svg from 'react-native-svg'

import { colors } from '@/theme/colors'

import { ICONS } from './icon-set'
import { Text } from './Text'

type Name = SymbolViewProps['name']

/**
 * UntilFire's own drawn icon (icon-set.tsx, D-76) when the set has one, on
 * every platform. Otherwise an SF Symbol on iOS and a plain glyph elsewhere.
 */
export function Icon({ name, size = 20, color, fallback = '•', weight = 'semibold' }: {
  name: Name; size?: number; color: string; fallback?: string; weight?: SymbolViewProps['weight']
}) {
  const draw = ICONS[name as string]
  if (draw) return <Svg width={size} height={size} viewBox="0 0 24 24">{draw(color)}</Svg>
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

/**
 * A category's drawn icon in its own colour, or the emoji for one of your own
 * categories (you picked that emoji, so it stays).
 */
export function CategoryGlyph({ cat, size = 18, color = colors.ink }: { cat: { key?: string; emoji?: string; color?: string }; size?: number; color?: string }) {
  const sym = cat.key ? symbolFor(cat.key) : null
  if (sym) return <Icon name={sym.name} fallback={sym.fallback} size={size} color={color} />
  return <Text style={{ fontSize: size * 0.9, lineHeight: size * 1.15 }}>{cat.emoji ?? '🏷️'}</Text>
}
