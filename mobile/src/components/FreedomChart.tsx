import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { freedomPath } from '@/engine'
import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { Freedom } from '@/state/freedom'

import { Text } from './Text'

const RANGES = [{ key: 5, label: '5Y' }, { key: 15, label: '15Y' }, { key: 0, label: 'All' }] as const

/**
 * The freedom chart with the website's 5Y / 15Y / All range: invested money
 * year by year against the target, teal once it's reached. Signed in it's the
 * full projection; otherwise the quick path from the onboarding answers.
 */
export function FreedomChart({ f }: { f: Freedom }) {
  const [range, setRange] = useState<number>(0)
  const series = f.series.length > 1
    ? f.series.map(s => ({ year: s.year, invested: s.invested }))
    : freedomPath({ monthlyIncome: f.monthlyIncome, monthlySpending: f.monthlySpending, invested: f.invested }).map((v, i) => ({ year: i, invested: v }))
  // "All" runs to a few years past freedom, or 40 years if it's further than that.
  const end = range > 0 ? range : Math.min(40, Math.max(5, Math.ceil((f.years ?? 30) + 3)))
  const pts = series.filter(s => s.year <= end)
  if (pts.length < 2) return null
  // A short range scales to its own money so the growth shows; the target line appears once it fits.
  const top = Math.max(...pts.map(s => s.invested), 1)
  const peak = range > 0 && f.target > top * 1.15 ? top * 1.15 : Math.max(top, f.target)
  const targetPct = f.target <= peak ? (f.target / peak) * 100 : null
  const thisYear = new Date().getFullYear()

  return (
    <View className="mt-5">
      <View className="mb-2 flex-row justify-end gap-1">
        {RANGES.map(r => (
          <Pressable key={r.key} accessibilityRole="button" accessibilityState={{ selected: range === r.key }} hitSlop={4}
            onPress={() => { haptic.select(); setRange(r.key) }}
            className={`rounded-full px-2.5 py-0.5 ${range === r.key ? 'bg-surface-2' : ''}`}>
            <Text className={`text-[12px] font-bold ${range === r.key ? 'text-ink' : 'text-ink-3'}`}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <View accessibilityLabel={`Invested money over ${end} years against the ${compactMoney(f.target)} target`} className="h-28">
        {targetPct != null && <View className="absolute left-0 right-0 border-t border-dashed border-ink-3" style={{ bottom: `${targetPct}%` }} />}
        <View className="h-full flex-row items-end" style={{ gap: 2 }}>
          {pts.map(s => (
            <View key={s.year} className="flex-1 justify-end" style={{ height: '100%' }}>
              <View className={`rounded-t ${s.invested >= f.target ? 'bg-teal' : 'bg-teal-soft'}`} style={{ height: `${Math.max(2, (s.invested / peak) * 100)}%` }} />
            </View>
          ))}
        </View>
      </View>
      <View className="mt-1 flex-row justify-between">
        <Text className="text-[11px] text-ink-3">Now</Text>
        <Text className="text-[11px] text-ink-3">{targetPct != null ? `Target ${compactMoney(f.target)}` : `Up to ${compactMoney(top)}`}</Text>
        <Text className="text-[11px] text-ink-3">{thisYear + pts[pts.length - 1].year}</Text>
      </View>
    </View>
  )
}
