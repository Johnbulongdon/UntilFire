import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Animated, { FadeOut, LinearTransition, SlideOutLeft } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { CategoryGlyph, Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { buildMerchantMemory, isoDay, suggestFromHistory } from '@/engine'
import { moneyIn } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, expenseCategories } from '@/lib/money-data'
import { fileTransactions } from '@/lib/mutations'
import { defaultNeed, isFiled } from '@/lib/review'
import { addDays } from '@/lib/today'
import { useAccount, type Transaction } from '@/state/account'
import { colors } from '@/theme/colors'

type Filing = { category: string; sub_category: string | null; need: 'need' | 'want'; fromHistory: number }
const TICK_MS = 220

const dayLabel = (iso: string) => {
  const today = isoDay(new Date())
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Review (the website's "Review" step; polished Oct 2026 QA): each unfiled
 * expense, grouped by day, with a suggestion from how you filed the same
 * merchant before. A row's check files it at once and slides it out while the
 * save runs behind; a failed save puts it back. Swipe a row to skip it.
 * Category is picked in a half-height sheet. What you approve becomes next
 * month's history.
 */
export default function Review() {
  const { months } = useLocalSearchParams<{ months?: string }>()
  const { data, refresh } = useAccount()
  const [overrides, setOverrides] = useState<Record<string, Partial<Filing>>>({})
  const [gone, setGone] = useState<Set<string>>(new Set())
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [picking, setPicking] = useState<Transaction | null>(null)
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
    const pending = all.filter(t => t.transaction_type === 'expense' && inMonths(t) && !isFiled(t))
    return { pending: [...pending].sort((a, b) => b.date.localeCompare(a.date)), suggest }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, months])

  const shown = pending.filter(t => !gone.has(t.id))
  const filingOf = (t: Transaction): Filing => ({ ...suggest(t), ...overrides[t.id] }) as Filing
  const set = (id: string, patch: Partial<Filing>) => setOverrides(o => ({ ...o, [id]: { ...o[id], ...patch } }))
  const ready = shown.filter(t => filingOf(t).category !== 'other')
  const hide = (ids: string[], on: boolean) => setGone(g => { const n = new Set(g); ids.forEach(id => (on ? n.add(id) : n.delete(id))); return n })

  // Hides the rows straight away and saves behind them; a failure brings them back.
  const approve = (rows: Transaction[]) => {
    if (rows.length === 0) return
    const ids = rows.map(t => t.id)
    hide(ids, true)
    fileTransactions(rows.map(t => {
      const f = filingOf(t)
      return { id: t.id, category: f.category, sub_category: f.sub_category, tags: [...t.tags.filter(g => g !== 'need' && g !== 'want'), f.need] }
    })).then(problem => {
      setTicked(s => { const n = new Set(s); ids.forEach(id => n.delete(id)); return n })
      if (problem) { hide(ids, false); haptic.warn(); Alert.alert(problem); return }
      haptic.success(); refresh()
    })
  }
  const approveOne = (t: Transaction) => {
    if (filingOf(t).category === 'other') { haptic.warn(); setPicking(t); return }
    haptic.select()
    setTicked(s => new Set(s).add(t.id))
    setTimeout(() => approve([t]), TICK_MS)
  }

  // Newest day first, each day's rows under its own header.
  const days: { day: string; rows: Transaction[] }[] = []
  for (const t of shown) {
    const last = days[days.length - 1]
    if (last?.day === t.date) last.rows.push(t); else days.push({ day: t.date, rows: [t] })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center px-4 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => { haptic.tick(); router.back() }} className="h-9 w-9 justify-center">
          <Icon name="chevron.left" fallback="‹" size={20} color={colors.ink2} />
        </Pressable>
        <Text className="flex-1 text-center text-[17px] font-bold text-ink">Review</Text>
        <View className="w-9" />
      </View>
      {shown.length > 0 && <Text className="text-center text-[12px] text-ink-3">{shown.length} to file · suggestions come from your history</Text>}

      {shown.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState mood="done" size={150} title="All caught up" body="Everything is filed. Your budget and freedom date are up to date." />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-1.5 px-4 pb-6 pt-1">
          {days.map(d => (
            <View key={d.day} className="gap-1.5">
              <Text className="mx-1 mb-0.5 mt-3 text-[11px] font-extrabold uppercase tracking-[1.5px] text-ink-3">{dayLabel(d.day)}</Text>
              {d.rows.map(t => (
                <Animated.View key={t.id} exiting={SlideOutLeft.duration(220)} layout={LinearTransition.duration(200)}>
                  <ReanimatedSwipeable friction={2} rightThreshold={60} onSwipeableOpen={() => { haptic.tick(); hide([t.id], true) }}
                    renderRightActions={() => <View className="flex-1 items-end justify-center pr-5"><Text className="text-[14px] font-bold text-ink-3">Skip</Text></View>}>
                    <Row t={t} f={filingOf(t)} edited={!!overrides[t.id]?.category} ticked={ticked.has(t.id)}
                      onCategory={() => { haptic.tick(); setPicking(t) }}
                      onNeed={need => { haptic.select(); set(t.id, { need }) }}
                      onApprove={() => approveOne(t)} />
                  </ReanimatedSwipeable>
                </Animated.View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View className="gap-1.5 px-4 pb-3 pt-2">
        {shown.length === 0
          ? <Button label="Done" onPress={() => router.back()} />
          : <>
            {ready.length < shown.length && <Animated.View exiting={FadeOut}><Text className="text-center text-[12px] text-ink-3">{shown.length - ready.length} need a category first</Text></Animated.View>}
            <Button label={ready.length === shown.length ? `Approve all ${ready.length}` : `Approve ${ready.length}`} disabled={ready.length === 0} onPress={() => approve(ready)} />
          </>}
      </View>

      <CategorySheet t={picking} current={picking ? filingOf(picking).category : null} onClose={() => setPicking(null)}
        onSave={key => { if (picking) set(picking.id, { category: key, sub_category: null, need: defaultNeed(key) }); setPicking(null) }} />
    </SafeAreaView>
  )
}

function Row({ t, f, edited, ticked, onCategory, onNeed, onApprove }: {
  t: Transaction; f: Filing; edited: boolean; ticked: boolean
  onCategory: () => void; onNeed: (n: 'need' | 'want') => void; onApprove: () => void
}) {
  const cat = categoryOf(f.category)
  const unpicked = f.category === 'other'
  return (
    <View className="gap-2.5 rounded-[18px] border border-border bg-card px-3 py-3">
      <View className="flex-row items-center gap-2.5">
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${cat.color ?? colors.ink3}1F` }}><CategoryGlyph cat={cat} size={22} /></View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold text-ink">{t.description}</Text>
          {f.fromHistory > 0 && !edited ? <Text className="text-[12px] text-ink-3">Filed like this {f.fromHistory}× before</Text> : null}
        </View>
        <Text className="font-mono text-[17px] text-ink">{moneyIn(t.amount, t.currency)}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable accessibilityRole="button" accessibilityLabel={unpicked ? 'Pick a category' : `${cat.label}, change category`} onPress={onCategory}
          className={`flex-row items-center gap-1.5 rounded-xl border-[1.5px] border-b-[3px] px-2.5 py-1 ${unpicked ? 'border-warn bg-warn-bg' : 'border-border-2 bg-surface'}`}>
          {!unpicked && <CategoryGlyph cat={cat} size={15} />}
          <Text className={`text-[13px] font-bold ${unpicked ? 'text-warn' : 'text-ink'}`}>{unpicked ? 'Pick a category' : cat.label}</Text>
        </Pressable>
        <View accessibilityRole="radiogroup" className="flex-row rounded-xl bg-surface-2 p-[3px]">
          {(['need', 'want'] as const).map(n => (
            <Pressable key={n} accessibilityRole="radio" accessibilityState={{ selected: f.need === n }} onPress={() => onNeed(n)}
              className={`rounded-[9px] px-2.5 py-1 ${f.need === n ? 'bg-card' : ''}`}>
              <Text className={`text-[12px] font-extrabold ${f.need === n ? 'text-ink' : 'text-ink-3'}`}>{n === 'need' ? 'Need' : 'Want'}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Approve ${t.description}`} onPress={onApprove} disabled={ticked} style={{ marginLeft: 'auto' }}>
          {({ pressed }) => (
            <View className="h-10 w-10 items-center justify-center rounded-full border-[1.5px]"
              style={{ backgroundColor: ticked ? colors.green : colors.card, borderColor: ticked ? 'rgba(0,0,0,0.28)' : colors.border2, borderBottomWidth: pressed ? 1.5 : 4, marginTop: pressed ? 2.5 : 0 }}>
              <Icon name="checkmark" fallback="✓" size={18} color={ticked ? '#FFFFFF' : colors.ink3} weight="heavy" />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  )
}

/** Half-height category picker, like every other edit: an icon grid and one Save. */
function CategorySheet({ t, current, onClose, onSave }: { t: Transaction | null; current: string | null; onClose: () => void; onSave: (key: string) => void }) {
  const [choice, setChoice] = useState<string | null>(null)
  const picked = choice ?? (current !== 'other' ? current : null)
  const close = () => { setChoice(null); onClose() }
  return (
    <Modal visible={!!t} transparent animationType="slide" onRequestClose={close}>
      <Pressable accessibilityLabel="Close" onPress={close} style={{ flex: 1, backgroundColor: 'rgba(20,14,8,0.45)' }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '62%' }}>
        <View className="mx-auto mt-2.5 h-[5px] w-10 rounded-full bg-border-2" />
        <View className="gap-1 px-5 pt-3">
          <Text className="font-display text-[22px] font-bold text-ink">Pick a category</Text>
          {t && <Text className="text-[13px] text-ink-3">{t.description} · {moneyIn(t.amount, t.currency)}</Text>}
        </View>
        <ScrollView contentContainerClassName="flex-row flex-wrap px-3 pt-3">
          {expenseCategories().map(c => (
            <Pressable key={c.key} accessibilityRole="radio" accessibilityState={{ selected: picked === c.key }} onPress={() => { haptic.select(); setChoice(c.key) }}
              style={{ width: '25%' }} className="p-1">
              <View className={`items-center gap-1 rounded-2xl px-0.5 py-2 ${picked === c.key ? 'border-2 border-green bg-green-50' : 'border-2 border-transparent'}`}>
                <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color ?? colors.ink3}1F` }}><CategoryGlyph cat={c} size={22} /></View>
                <Text numberOfLines={1} className="text-[11px] font-bold text-ink-2">{c.label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <View className="px-5 pb-3 pt-2">
          <Button label="Save" disabled={!picked} onPress={() => { if (picked) { haptic.select(); onSave(picked); setChoice(null) } }} />
        </View>
      </SafeAreaView>
    </Modal>
  )
}
