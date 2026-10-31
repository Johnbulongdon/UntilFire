import { Pressable, View } from 'react-native'
import { brand } from '@/theme/colors'
import { Icon } from './Icon'
import { Text } from './Text'

export type FeatureTone = 'blue' | 'mint' | 'lilac' | 'yellow' | 'pink'
export type Feature = {
  label: string
  icon: Parameters<typeof Icon>[0]['name']
  fallback: string
  to: string
  tone: FeatureTone
  note?: string
}

/** Decorative pastel surfaces always pair with fixed dark ink in either theme. */
export function FeatureTile({ feature, compact, count = 0, onPress }: {
  feature: Feature; compact?: boolean; count?: number; onPress: () => void
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={feature.label + (feature.note ? ': ' + feature.note : '') + (count > 0 ? ', ' + count + ' to review' : '')}
      onPress={onPress} style={{ width: compact ? '25%' : '48%' }}>
      {({ pressed }) => (
        <View style={{ alignItems: compact ? 'center' : undefined, gap: 6, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }}>
          <View style={{ width: compact ? 62 : '100%', minHeight: compact ? 62 : 126, borderRadius: compact ? 20 : 24,
            padding: compact ? 0 : 16, backgroundColor: brand[feature.tone], alignItems: compact ? 'center' : undefined,
            justifyContent: compact ? 'center' : 'space-between', gap: compact ? 0 : 16 }}>
            <Icon name={feature.icon} fallback={feature.fallback} size={compact ? 26 : 28} color={brand.deep} />
            {!compact && <View style={{ gap: 3 }}>
              <Text style={{ color: brand.deep }} className="text-[17px] font-extrabold">{feature.label}</Text>
              {feature.note && <Text style={{ color: brand.deep }} className="text-[13px]">{feature.note}</Text>}
            </View>}
            {count > 0 && <View style={{ position: 'absolute', top: -6, right: -6, minWidth: 22, minHeight: 22,
              borderRadius: 11, paddingHorizontal: 6, backgroundColor: brand.deep, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF' }} className="text-[12px] font-bold">{count > 99 ? '99+' : count}</Text>
            </View>}
          </View>
          {compact && <Text className="text-[13px] font-bold text-ink">{feature.label}</Text>}
        </View>
      )}
    </Pressable>
  )
}

export const MONEY_FEATURES: Feature[] = [
  { label: 'Review', icon: 'checklist', fallback: '✓', to: '/review', tone: 'lilac' },
  { label: 'Activity', icon: 'list.bullet', fallback: '≡', to: '/money/transactions', tone: 'blue' },
  { label: 'Budget', icon: 'chart.pie.fill', fallback: '◔', to: '/money/budget', tone: 'mint' },
  { label: 'Calendar', icon: 'calendar', fallback: '▦', to: '/money/calendar', tone: 'yellow' },
  { label: 'Net worth', icon: 'building.columns.fill', fallback: '▥', to: '/money/net-worth', tone: 'pink' },
  { label: 'Income', icon: 'arrow.down.circle.fill', fallback: '↓', to: '/money/income', tone: 'mint' },
  { label: 'Banks', icon: 'building.columns.fill', fallback: '▥', to: '/money/banks', tone: 'blue' },
  { label: 'Insights', icon: 'lightbulb.fill', fallback: '!', to: '/money/insights', tone: 'lilac' },
]
export const PLAN_FEATURES: Feature[] = [
  { label: 'What if', note: 'Changes, life, investing', icon: 'wand.and.stars', fallback: '?', to: '/plan/what-if', tone: 'lilac' },
  { label: 'Goals', note: 'Saving along the way', icon: 'target', fallback: '◎', to: '/plan/goals', tone: 'yellow' },
  { label: 'Contributions', note: 'Where saving goes', icon: 'arrow.up.right.circle.fill', fallback: '↗', to: '/plan/contributions', tone: 'blue' },
  { label: 'Explore', note: 'Cities worldwide', icon: 'globe.americas.fill', fallback: '◍', to: '/plan/explore', tone: 'mint' },
]
