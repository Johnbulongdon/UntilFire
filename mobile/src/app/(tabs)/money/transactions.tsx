import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, SectionList, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AddButton } from '@/components/AddButton'
import { Text } from '@/components/Text'
import { TransactionRow } from '@/components/TransactionRow'
import { addMonths, isoDay, rangeFor, stepRange, type RangePreset } from '@/engine'
import { compactMoney, money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { byDay, categoryOf, dayLabel, thisMonth } from '@/lib/money-data'
import { summarise } from '@/lib/spend-summary'
import { useAccount } from '@/state/account'
import { colors } from '@/theme/colors'

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 1, label: 'Month' },
  { key: 3, label: '3 months' },
  { key: 6, label: '6 months' },
  { key: 'ytd', label: 'This year' },
  { key: 12, label: '12 months' },
]

const monthName = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const rangeName = (months: string[]) => months.length === 1
  ? monthName(months[0])
  : `${new Date(`${months[0]}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' })} – ${monthName(months[months.length - 1])}`

/** The website's Transactions: a range, a summary against your usual, search, a category filter and the list. */
export default function Transactions() {
  const { data, loading, refresh } = useAccount()
  const [preset, setPreset] = useState<RangePreset>(1)
  const [endMonth, setEndMonth] = useState(thisMonth())
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const oldest = addMonths(thisMonth(), -12)

  const range = useMemo(() => rangeFor(preset, endMonth), [preset, endMonth])
  const today = isoDay(new Date())
  const summary = useMemo(() => summarise(data?.transactions ?? [], range, today), [data, range, today])

  const q = query.trim().toLowerCase()
  const shown = summary.inRange.filter(t =>
    (!category || t.category === category) &&
    (!q || t.description.toLowerCase().includes(q) || categoryOf(t.category).label.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)))
  const sections = byDay(shown).map(g => ({ title: g.date, data: g.items }))
  const categories = [...new Set(summary.inRange.filter(t => t.transaction_type === 'expense').map(t => t.category))]

  const canBack = range.months[0] > oldest
  const canForward = endMonth < thisMonth()
  const step = (dir: -1 | 1) => {
    if ((dir < 0 && !canBack) || (dir > 0 && !canForward)) return
    haptic.tick(); setEndMonth(e => stepRange(preset, e, dir) > thisMonth() ? thisMonth() : stepRange(preset, e, dir)); setCategory(null)
  }
  const peak = Math.max(...summary.buckets.map(b => b.usd), 1)
  const vsUsual = summary.usual ? (summary.out - summary.usual) / summary.usual : null

  const header = (
    <View>
      <View className="mt-3 flex-row items-center justify-between rounded-control bg-surface px-2 py-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous period" hitSlop={8} onPress={() => step(-1)} disabled={!canBack} className="px-3">
          <Text className={`text-[20px] ${canBack ? 'text-ink' : 'text-border-2'}`}>‹</Text>
        </Pressable>
        <Text className="text-[15px] font-bold text-ink">{rangeName(range.months)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next period" hitSlop={8} onPress={() => step(1)} disabled={!canForward} className="px-3">
          <Text className={`text-[20px] ${canForward ? 'text-ink' : 'text-border-2'}`}>›</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
        {PRESETS.map(p => (
          <Chip key={String(p.key)} label={p.label} active={preset === p.key} onPress={() => { setPreset(p.key); setEndMonth(thisMonth()); setCategory(null) }} />
        ))}
      </ScrollView>

      {/* Summary, as the website's SpendCard: the total, against usual, as bars. */}
      <View className="rounded-card border border-border bg-card p-4">
        <View className="flex-row items-baseline justify-between">
          <Text className="font-mono text-[26px] text-ink">{money(summary.out)}</Text>
          {summary.inn > 0 && <Text className="text-[13px] text-ink-2">In <Text className="font-mono text-[13px] text-pos-ink">{money(summary.inn)}</Text></Text>}
        </View>
        <Text className="text-[13px] text-ink-3">
          {vsUsual == null ? 'spent' : `spent · ${Math.abs(Math.round(vsUsual * 100))}% ${vsUsual > 0 ? 'more' : 'less'} than usual (${compactMoney(summary.usual!)})`}
        </Text>
        <View className="mt-3 h-20 flex-row items-end" style={{ gap: summary.buckets.length > 20 ? 1 : 3 }}>
          {summary.buckets.map((b, i) => (
            <View key={i} className="flex-1 rounded-t bg-green" style={{ height: `${Math.max(1, (b.usd / peak) * 100)}%`, opacity: b.usd > 0 ? 1 : 0.2 }} />
          ))}
        </View>
        <View className="mt-1 flex-row justify-between">
          <Text className="text-[11px] text-ink-3">{summary.buckets[0]?.label}</Text>
          <Text className="text-[11px] text-ink-3">{summary.buckets[summary.buckets.length - 1]?.label}</Text>
        </View>
        {summary.moved.length > 0 && (
          <View className="mt-3 border-t border-border pt-3">
            {summary.moved.map(m => (
              <View key={m.key} className="flex-row justify-between py-0.5">
                <Text className="text-[13px] text-ink">{categoryOf(m.key).emoji}  {categoryOf(m.key).label}</Text>
                <Text className={`font-mono text-[13px] ${m.diff > 0 ? 'text-warn' : 'text-pos-ink'}`}>{m.diff > 0 ? '+' : '−'}{money(Math.abs(m.diff))} vs usual</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <TextInput
        accessibilityLabel="Search transactions"
        className="mt-3 rounded-control border border-border bg-card px-4 py-3 text-[15px] text-ink"
        style={{ fontFamily: 'Manrope_500Medium' }}
        placeholder="Search"
        placeholderTextColor={colors.ink3}
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
        autoCorrect={false}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
        <Chip label="All" active={!category} onPress={() => setCategory(null)} />
        {categories.map(key => {
          const cat = categoryOf(key)
          return <Chip key={key} label={`${cat.emoji} ${cat.label}`} active={category === key} onPress={() => setCategory(category === key ? null : key)} />
        })}
      </ScrollView>
    </View>
  )

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ground">
      <View className="px-5 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
          <Text className="text-[16px] font-semibold text-pos-ink">‹ Money</Text>
        </Pressable>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-display text-[30px] font-bold tracking-tight text-ink">Transactions</Text>
          {data && <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { haptic.tick(); router.push('/import') }}><Text className="text-[15px] font-bold text-pos-ink">Import CSV</Text></Pressable>}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={t => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.green} />}
        renderSectionHeader={({ section }) => (
          <View className="pb-1 pt-4">
            <Text className="text-[13px] font-semibold text-ink-3">{dayLabel(section.title)}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            className="bg-card px-4"
            style={{
              borderTopLeftRadius: index === 0 ? 16 : 0, borderTopRightRadius: index === 0 ? 16 : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? 16 : 0, borderBottomRightRadius: index === section.data.length - 1 ? 16 : 0,
            }}
          >
            <TransactionRow t={item} first={index === 0} />
          </View>
        )}
        ListEmptyComponent={
          <Text className="mt-10 text-center text-[15px] text-ink-2">
            {!data ? 'Loading…' : q ? `Nothing matches "${query.trim()}".` : 'Nothing in this range.'}
          </Text>
        }
      />
      <AddButton />
    </SafeAreaView>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => { haptic.select(); onPress() }}
      className={`rounded-full border px-3.5 py-1.5 ${active ? 'border-green bg-green-50' : 'border-border bg-card'}`}
    >
      <Text className={`text-[13px] font-semibold ${active ? 'text-green-700' : 'text-ink-2'}`}>{label}</Text>
    </Pressable>
  )
}
