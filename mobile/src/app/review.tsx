import { router, useLocalSearchParams } from 'expo-router'
import { Button } from '@/components/Button'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { buildMerchantMemory, INCOME_CATEGORIES, suggestFromHistory } from '@/engine'
import { moneyIn } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, expenseCategories } from '@/lib/money-data'
import { fileTransactions } from '@/lib/mutations'
import { defaultNeed, isFiled } from '@/lib/review'
import { useAccount, type Transaction } from '@/state/account'
import { colors } from '@/theme/colors'

type Filing = { category: string; sub_category: string | null; need: 'need' | 'want'; fromHistory: number }

/**
 * Review (the website's "Review" step): each unfiled expense in the months
 * shown, with a suggestion from how you filed the same merchant before, or the
 * category's usual need or want. Approve one, change it, or approve them all.
 * What you approve becomes next month's history.
 */
export default function Review() {
  const { months } = useLocalSearchParams<{ months?: string }>()
  const { data, refresh } = useAccount()
  const [overrides, setOverrides] = useState<Record<string, Partial<Filing>>>({})
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [picking, setPicking] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inMonths = (t: Transaction) => !months || months.split(',').some(m => t.date.startsWith(m))

  const { pending, suggest } = useMemo(() => {
    const all = data?.transactions ?? []
    // Memory from everything already filed, so a suggestion is the person's own past answer.
    const memory = buildMerchantMemory(all.filter(isFiled))
    const suggest = (t: Transaction): Filing => {
      const s = suggestFromHistory(t, memory)
      const category = s?.category ?? (t.category && t.category !== 'other' ? t.category : 'other')
      return { category, sub_category: s?.sub_category ?? t.sub_category, need: s?.classification ?? defaultNeed(category), fromHistory: s?.seen ?? 0 }
    }
    return { pending: all.filter(t => t.transaction_type === 'expense' && inMonths(t) && !isFiled(t)), suggest }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, months])

  const shown = pending.filter(t => !skipped.has(t.id))
  const filingOf = (t: Transaction): Filing => ({ ...suggest(t), ...overrides[t.id] }) as Filing
  const set = (id: string, patch: Partial<Filing>) => setOverrides(o => ({ ...o, [id]: { ...o[id], ...patch } }))

  const approve = async (rows: Transaction[]) => {
    const ready = rows.filter(t => filingOf(t).category !== 'other')
    if (ready.length < rows.length && rows.length === 1) { Alert.alert('Pick a category first'); return }
    setBusy(true)
    const problem = await fileTransactions(ready.map(t => {
      const f = filingOf(t)
      return { id: t.id, category: f.category, sub_category: f.sub_category, tags: [...t.tags.filter(g => g !== 'need' && g !== 'want'), f.need] }
    }))
    setBusy(false)
    if (problem) { haptic.warn(); Alert.alert(problem); return }
    haptic.success()
    await refresh()
    if (ready.length === shown.length) router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Done</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Review</Text>
        <Pressable accessibilityRole="button" hitSlop={12} disabled={busy || shown.length === 0} onPress={() => { haptic.tick(); approve(shown) }}>
          <Text className={`text-[16px] font-bold ${shown.length ? 'text-pos-ink' : 'text-border-2'}`}>Approve all</Text>
        </Pressable>
      </View>
      {busy && <View className="items-center py-2"><ActivityIndicator color={colors.green} /></View>}
      <ScrollView contentContainerClassName="gap-3 px-5 pb-10 pt-4">
        {shown.length === 0 && (
          <View className="items-center rounded-card bg-surface p-8">
            <Text className="text-[32px]">✓</Text>
            <Text className="mt-2 text-[16px] font-semibold text-ink">Everything is filed</Text>
          </View>
        )}
        {shown.map(t => {
          const f = filingOf(t)
          const cat = categoryOf(f.category)
          const open = picking === t.id
          return (
            <View key={t.id} className="rounded-card border border-border bg-card p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{t.description}</Text>
                  <Text className="text-[12px] text-ink-3">{t.date} · {moneyIn(t.amount, t.currency)}</Text>
                </View>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { haptic.tick(); setSkipped(s => new Set(s).add(t.id)) }}>
                  <Text className="text-[13px] font-semibold text-ink-3">Skip</Text>
                </Pressable>
              </View>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { haptic.tick(); setPicking(open ? null : t.id) }}
                  className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${f.category === 'other' ? 'border-warn bg-warn-bg' : 'border-border bg-surface'}`}>
                  <CategoryGlyph cat={cat} size={15} />
                  <Text className="text-[13px] font-semibold text-ink">{f.category === 'other' ? 'Pick a category' : cat.label}{f.sub_category ? ` › ${f.sub_category}` : ''}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${f.need}, tap to switch`} onPress={() => { haptic.select(); set(t.id, { need: f.need === 'need' ? 'want' : 'need' }) }}
                  className={`rounded-full px-3 py-1.5 ${f.need === 'need' ? 'bg-teal-soft' : 'bg-warn-bg'}`}>
                  <Text className={`text-[13px] font-bold ${f.need === 'need' ? 'text-teal-deep' : 'text-warn'}`}>{f.need} ⇄</Text>
                </Pressable>
                {f.fromHistory > 0 && !overrides[t.id]?.category && <Text className="text-[11px] text-ink-3">from your history ({f.fromHistory}×)</Text>}
              </View>
              {open && (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {[...expenseCategories(), ...(t.transaction_type === 'income' ? INCOME_CATEGORIES : [])].map(c => (
                    <Pressable key={c.key} accessibilityRole="button" onPress={() => { haptic.select(); set(t.id, { category: c.key, sub_category: null, need: defaultNeed(c.key) }); setPicking(null) }}
                      className={`rounded-full border px-2.5 py-1 ${f.category === c.key ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
                      <Text className="text-[12px] text-ink">{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Button style={{ marginTop: 12 }} small label="Approve" disabled={busy} onPress={() => approve([t])} />
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
