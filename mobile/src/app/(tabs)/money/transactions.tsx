import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { useMemo, useState } from 'react'
import { Alert, Modal, Pressable, RefreshControl, ScrollView, SectionList, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AddButton } from '@/components/AddButton'
import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { TransactionRow } from '@/components/TransactionRow'
import { addMonths, INCOME_CATEGORIES, isoDay, merchantKey, rangeFor, stepRange, type RangePreset } from '@/engine'
import { compactMoney, money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { byDay, categoryOf, dayLabel, expenseCategories, thisMonth } from '@/lib/money-data'
import { setCategoryFor } from '@/lib/mutations'
import { summarise } from '@/lib/spend-summary'
import { useAccount } from '@/state/account'
import { colors } from '@/theme/colors'
import { WorthALook } from '@/components/WorthALook'
import { ReviewBar } from '@/components/ReviewBar'
import { ThemeScope } from '@/components/ThemeScope'

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
  // Select mode: tick rows, then put them all in one category.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const startSelect = (id?: string) => { setSelecting(true); setSelected(new Set(id ? [id] : [])) }
  const stopSelect = () => { setSelecting(false); setSelected(new Set()); setPicking(false) }
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
      <ReviewBar rows={summary.inRange} months={range.months} />
      <View className="mt-3"><WorthALook rows={summary.inRange} /></View>
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
                <View className="flex-row items-center gap-2"><CategoryGlyph cat={categoryOf(m.key)} size={16} /><Text className="text-[13px] text-ink">{categoryOf(m.key).label}</Text></View>
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
          return <Chip key={key} label={cat.label} active={category === key} onPress={() => setCategory(category === key ? null : key)} />
        })}
      </ScrollView>
    </View>
  )

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ground">
      <View className="px-5 pt-2" style={{ zIndex: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
          <Text className="text-[16px] font-semibold text-pos-ink">‹ Money</Text>
        </Pressable>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-display text-[30px] font-bold tracking-tight text-ink">Transactions</Text>
          {data && (selecting
            ? <Button small kind="quiet" label="Cancel" onPress={() => { haptic.tick(); stopSelect() }} />
            : <View className="flex-row gap-4">
                <Button small kind="quiet" label="Select" onPress={() => { haptic.tick(); startSelect() }} />
                <Button small kind="quiet" label="Import" onPress={() => { haptic.tick(); router.push('/import') }} />
              </View>)}
        </View>
        {selecting && (
          <SelectBar
            count={selected.size}
            sameMerchant={(() => {
              // One ticked: offer every other transaction from the same merchant.
              if (selected.size !== 1 || !data) return null
              const one = data.transactions.find(t => selected.has(t.id))
              const key = one ? merchantKey(one.description) || one.description.toLowerCase() : ''
              const ids = key ? data.transactions.filter(t => (merchantKey(t.description) || t.description.toLowerCase()) === key).map(t => t.id) : []
              return ids.length > 1 ? { n: ids.length, select: () => { haptic.select(); setSelected(new Set(ids)) } } : null
            })()}
            allShown={() => { haptic.select(); setSelected(new Set(shown.map(t => t.id))) }}
            onPick={() => { haptic.tick(); setPicking(true) }}
            onCancel={() => { haptic.tick(); stopSelect() }}
          />
        )}
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
            <TransactionRow t={item} first={index === 0} selecting={selecting} selected={selected.has(item.id)}
              onToggle={() => toggle(item.id)} onLongPress={() => (selecting ? toggle(item.id) : startSelect(item.id))} />
          </View>
        )}
        ListEmptyComponent={
          !data ? <View className="mt-4"><LoadingState /></View>
            : <View className="mt-6"><EmptyState mood={q ? 'think' : 'quiet'} title={q ? 'No matches' : 'Nothing here yet'} body={q ? `Nothing matches "${query.trim()}".` : 'No spending or income in this range.'} /></View>
        }
      />
      {!selecting && <AddButton />}
      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <ThemeScope>
        <View className="flex-1 bg-ground">
          <View className="flex-row items-center justify-between px-5 pt-4">
            <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setPicking(false)}><Text className="text-[16px] font-semibold text-ink-2">Cancel</Text></Pressable>
            <Text className="text-[16px] font-bold text-ink">Move {selected.size} to…</Text>
            <View style={{ width: 52 }} />
          </View>
          <ScrollView contentContainerClassName="px-5 pb-10 pt-5">
            {[{ title: 'Spending', cats: expenseCategories() }, { title: 'Income', cats: INCOME_CATEGORIES }].map(group => (
              <View key={group.title} className="mb-5">
                <Text className="mb-2 text-[13px] text-ink-3">{group.title}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {group.cats.map(c => (
                    <Pressable key={c.key} accessibilityRole="button" disabled={saving}
                      onPress={async () => {
                        haptic.select(); setSaving(true)
                        const problem = await setCategoryFor([...selected], c.key)
                        setSaving(false)
                        if (problem) { haptic.warn(); Alert.alert(problem); return }
                        haptic.success(); stopSelect(); refresh()
                      }}
                      className="w-[31%] items-center rounded-2xl border border-border bg-card px-2 py-3 active:opacity-70">
                      <CategoryGlyph cat={c} size={26} />
                      <Text numberOfLines={1} className="mt-1 text-[12px] font-semibold text-ink">{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
        </ThemeScope>
      </Modal>
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

/** The bar along the bottom in select mode: how many are ticked, quick picks, and the one action. */
function SelectBar({ count, sameMerchant, allShown, onPick, onCancel }: {
  count: number; sameMerchant: { n: number; select: () => void } | null; allShown: () => void; onPick: () => void; onCancel: () => void
}) {
  return (
    <View className="absolute left-0 right-0 top-0 border-b border-border bg-ground px-5 pb-3 pt-2"
      style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
      <View className="flex-row items-center justify-between">
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel}><Text className="text-[16px] font-semibold text-pos-ink">Cancel</Text></Pressable>
        <Text accessibilityLiveRegion="polite" className="text-[16px] font-bold text-ink">{count === 0 ? 'Select transactions' : `${count} selected`}</Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={allShown}><Text className="text-[16px] font-semibold text-pos-ink">All</Text></Pressable>
      </View>
      <View className="mt-3 flex-row items-center gap-3">
        {sameMerchant && (
          <Pressable accessibilityRole="button" hitSlop={6} onPress={sameMerchant.select} className="rounded-full border border-border-2 px-3 py-2 active:opacity-70">
            <Text className="text-[13px] font-semibold text-ink">All {sameMerchant.n} from merchant</Text>
          </Pressable>
        )}
        <Button style={{ flex: 1 }} small label="Change category" disabled={count === 0} onPress={onPick} />
      </View>
    </View>
  )
}
