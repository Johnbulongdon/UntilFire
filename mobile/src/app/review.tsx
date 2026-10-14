import { router, useLocalSearchParams } from 'expo-router'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Animated, { FadeOut, LinearTransition, runOnJS, SlideOutLeft } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { DragCategoryPicker, type DragPickerHandle } from '@/components/DragCategoryPicker'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { CategoryGlyph, Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { buildMerchantMemory, isoDay, merchantKey, SUB_CATEGORIES, suggestFromHistory } from '@/engine'
import { moneyIn } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, expenseCategories } from '@/lib/money-data'
import { fileTransactions, markTransfer, saveMerchantRule } from '@/lib/mutations'
import { defaultNeed, isFiled } from '@/lib/review'
import { addDays } from '@/lib/today'
import { useAccount, type Transaction } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

// chosen: the category was picked, by the person or their history, so "Other" can be filed too.
type Filing = { category: string; sub_category: string | null; need: 'need' | 'want'; fromHistory: number; chosen: boolean; byRule?: boolean }
const TICK_MS = 150

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
  const { session } = useAuth()
  const [byRule, setByRule] = useState(0)
  const [overrides, setOverrides] = useState<Record<string, Partial<Filing>>>({})
  const [gone, setGone] = useState<Set<string>>(new Set())
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [picking, setPicking] = useState<Transaction | null>(null)
  const [dragging, setDragging] = useState(false)
  const picker = useRef<DragPickerHandle>(null)
  const inMonths = (t: Transaction) => !months || months.split(',').some(m => t.date.startsWith(m))

  const { pending, suggest } = useMemo(() => {
    const all = data?.transactions ?? []
    // Memory from everything already filed, so a suggestion is the person's own past answer.
    const memory = buildMerchantMemory(all.filter(isFiled))
    const rules = data?.profile.merchantRules ?? {}
    const suggest = (t: Transaction): Filing => {
      const rule = rules[merchantKey(t.description)]
      if (rule) return { ...rule, fromHistory: 0, chosen: true, byRule: true }
      const s = suggestFromHistory(t, memory)
      const category = s?.category ?? (t.category && t.category !== 'other' ? t.category : 'other')
      return { category, sub_category: s?.sub_category ?? t.sub_category, need: s?.classification ?? defaultNeed(category), fromHistory: s?.seen ?? 0, chosen: category !== 'other' || !!s?.category }
    }
    const pending = all.filter(t => t.transaction_type === 'expense' && inMonths(t) && !isFiled(t))
    return { pending: [...pending].sort((a, b) => b.date.localeCompare(a.date)), suggest }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, months])

  // One suggestion per row, worked out once; overrides only touch the rows edited.
  const base = useMemo(() => new Map(pending.map(t => [t.id, suggest(t)])), [pending, suggest])
  const filings = useMemo(() => {
    const m = new Map(base)
    for (const [id, o] of Object.entries(overrides)) { const b = m.get(id); if (b) m.set(id, { ...b, ...o } as Filing) }
    return m
  }, [base, overrides])
  const shown = useMemo(() => pending.filter(t => !gone.has(t.id)), [pending, gone])
  const filingOf = (t: Transaction): Filing => filings.get(t.id) ?? suggest(t)
  const set = (id: string, patch: Partial<Filing>) => setOverrides(o => ({ ...o, [id]: { ...o[id], ...patch } }))
  const ready = shown.filter(t => filingOf(t).chosen)
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
  // Rows a merchant rule covers file themselves when Review opens.
  useEffect(() => {
    const rows = shown.filter(t => base.get(t.id)?.byRule && !overrides[t.id])
    if (rows.length === 0) return
    setByRule(n => n + rows.length)
    approve(rows)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base])
  const approveOne = (t: Transaction) => {
    if (!filingOf(t).chosen) { haptic.warn(); setPicking(t); return }
    haptic.select()
    setTicked(s => new Set(s).add(t.id))
    setTimeout(() => approve([t]), TICK_MS)
  }

  // Rows only render on screen, and stable handlers let unchanged rows skip re-rendering.
  const latest = useRef({ approveOne, setPicking, set, hide })
  latest.current = { approveOne, setPicking, set, hide }
  const onCategory = useCallback((t: Transaction) => { haptic.tick(); latest.current.setPicking(t) }, [])
  const onNeed = useCallback((t: Transaction, need: 'need' | 'want') => { haptic.select(); latest.current.set(t.id, { need }) }, [])
  const onApprove = useCallback((t: Transaction) => latest.current.approveOne(t), [])
  const onSkip = useCallback((t: Transaction) => { haptic.tick(); latest.current.hide([t.id], true) }, [])
  // Hold the category pill and drag to pick; letting go off the grid changes nothing.
  const onDrag = useCallback((t: Transaction, phase: DragPhase, x: number, y: number) => {
    if (phase === 'start') { haptic.select(); setDragging(true) }
    if (phase !== 'end') { picker.current?.move(x, y); return }
    const r = picker.current?.end()
    setDragging(false)
    if (r) { haptic.success(); latest.current.set(t.id, { category: r.category, sub_category: r.sub, need: defaultNeed(r.category), chosen: true }) }
  }, [])

  // Newest day first, each day's header followed by its rows.
  const items = useMemo(() => {
    const out: Item[] = []
    shown.forEach((t, i) => { if (t.date !== shown[i - 1]?.date) out.push({ key: `d${t.date}`, day: t.date }); out.push({ key: t.id, t }) })
    return out
  }, [shown])

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
      {byRule > 0 && <Text className="text-center text-[12px] font-bold text-pos-ink">Filed {byRule} by your merchant rules</Text>}

      {!data ? <LoadingState /> : shown.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState mood="done" size={150} title="All caught up" body="Everything is filed. Your budget and freedom date are up to date." />
        </View>
      ) : (
        <Animated.FlatList data={items} keyExtractor={i => i.key} itemLayoutAnimation={LinearTransition.duration(200)}
          scrollEnabled={!dragging} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={7} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 }}
          renderItem={({ item }) => item.t
            ? <SwipeRow t={item.t} f={filingOf(item.t)} edited={!!overrides[item.t.id]?.category} ticked={ticked.has(item.t.id)}
              onCategory={onCategory} onNeed={onNeed} onApprove={onApprove} onSkip={onSkip} onDrag={onDrag} />
            : <Text className="mx-1 mb-1 mt-3 text-[11px] font-extrabold uppercase tracking-[1.5px] text-ink-3">{dayLabel(item.day!)}</Text>} />
      )}

      <View className="gap-1.5 px-4 pb-3 pt-2">
        {shown.length === 0
          ? <Button label="Done" onPress={() => router.back()} />
          : <>
            {ready.length < shown.length && <Animated.View exiting={FadeOut}><Text className="text-center text-[12px] text-ink-3">{shown.length - ready.length} need a category first</Text></Animated.View>}
            <Button label={ready.length === shown.length ? `Approve all ${ready.length}` : `Approve ${ready.length}`} disabled={ready.length === 0} onPress={() => approve(ready)} />
          </>}
      </View>

      <DragCategoryPicker ref={picker} open={dragging} />
      <CategorySheet t={picking} current={picking && filingOf(picking).chosen ? filingOf(picking).category : null} onClose={() => setPicking(null)}
        onSave={(key, sub, always) => {
          const t = picking
          setPicking(null)
          if (!t) return
          set(t.id, { category: key, sub_category: sub, need: defaultNeed(key), chosen: true })
          if (always && session && data) {
            const rule = { category: key, sub_category: sub, need: defaultNeed(key) }
            saveMerchantRule(session.user.id, data.profile.merchantRules, merchantKey(t.description), rule).then(problem => {
              if (problem) { haptic.warn(); Alert.alert(problem) } else refresh()
            })
          }
        }}
        onTransfer={() => {
          const t = picking
          setPicking(null)
          if (!t) return
          hide([t.id], true)
          markTransfer(t.id).then(problem => {
            if (problem) { hide([t.id], false); haptic.warn(); Alert.alert(problem); return }
            haptic.success(); refresh()
          })
        }} />
    </SafeAreaView>
  )
}

type Item = { key: string; day?: string; t?: Transaction }
type DragPhase = 'start' | 'move' | 'end'
type RowProps = {
  t: Transaction; f: Filing; edited: boolean; ticked: boolean
  onCategory: (t: Transaction) => void; onNeed: (t: Transaction, n: 'need' | 'want') => void
  onApprove: (t: Transaction) => void; onSkip: (t: Transaction) => void
  onDrag: (t: Transaction, phase: DragPhase, x: number, y: number) => void
}

const skipAction = () => <View className="flex-1 items-end justify-center pr-5"><Text className="text-[14px] font-bold text-ink-3">Skip</Text></View>

const SwipeRow = memo(function SwipeRow(p: RowProps) {
  return (
    <Animated.View exiting={SlideOutLeft.duration(220)} className="pb-1.5">
      <ReanimatedSwipeable friction={2} rightThreshold={60} onSwipeableOpen={() => p.onSkip(p.t)} renderRightActions={skipAction}>
        <Row {...p} />
      </ReanimatedSwipeable>
    </Animated.View>
  )
})

function Row({ t, f, edited, ticked, onCategory, onNeed, onApprove, onDrag }: RowProps) {
  const cat = categoryOf(f.category)
  const unpicked = !f.chosen
  // A tap opens the sheet; holding then dragging opens the drag picker.
  const pill = useMemo(() => Gesture.Exclusive(
    Gesture.Pan().activateAfterLongPress(300)
      .onStart(e => runOnJS(onDrag)(t, 'start', e.absoluteX, e.absoluteY))
      .onUpdate(e => runOnJS(onDrag)(t, 'move', e.absoluteX, e.absoluteY))
      .onFinalize((e, ok) => { if (ok) runOnJS(onDrag)(t, 'end', e.absoluteX, e.absoluteY) }),
    Gesture.Tap().onEnd((_e, ok) => { if (ok) runOnJS(onCategory)(t) }),
  ), [t, onDrag, onCategory])
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
        <GestureDetector gesture={pill}>
        <View accessible accessibilityRole="button" accessibilityLabel={unpicked ? 'Pick a category' : `${cat.label}, change category`} accessibilityHint="Hold and drag for a quick pick" onAccessibilityTap={() => onCategory(t)}
          className={`flex-row items-center gap-1.5 rounded-xl border-[1.5px] border-b-[3px] px-2.5 py-1 ${unpicked ? 'border-warn bg-warn-bg' : 'border-border-2 bg-surface'}`}>
          {!unpicked && <CategoryGlyph cat={cat} size={15} />}
          <Text numberOfLines={1} className={`max-w-[150px] text-[13px] font-bold ${unpicked ? 'text-warn' : 'text-ink'}`}>{unpicked ? 'Pick a category' : f.sub_category ? `${cat.label} · ${f.sub_category}` : cat.label}</Text>
        </View>
        </GestureDetector>
        <View accessibilityRole="radiogroup" className="flex-row rounded-xl bg-surface-2 p-[3px]">
          {(['need', 'want'] as const).map(n => (
            <Pressable key={n} accessibilityRole="radio" accessibilityState={{ selected: f.need === n }} onPress={() => onNeed(t, n)}
              className={`rounded-[9px] px-2.5 py-1 ${f.need === n ? 'bg-card' : ''}`}>
              <Text className={`text-[12px] font-extrabold ${f.need === n ? 'text-ink' : 'text-ink-3'}`}>{n === 'need' ? 'Need' : 'Want'}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Approve ${t.description}`} onPress={() => onApprove(t)} disabled={ticked} style={{ marginLeft: 'auto' }}>
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

/** Half-height category picker, like every other edit: an icon grid, its kinds once one is picked, and one Save. */
function CategorySheet({ t, current, onClose, onSave, onTransfer }: { t: Transaction | null; current: string | null; onClose: () => void; onSave: (key: string, sub: string | null, always: boolean) => void; onTransfer: () => void }) {
  const [always, setAlways] = useState(false)
  const [choice, setChoice] = useState<string | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const picked = choice ?? current
  const subs = picked ? SUB_CATEGORIES[picked] : undefined
  const close = () => { setChoice(null); setSub(null); setAlways(false); onClose() }
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
            <Pressable key={c.key} accessibilityRole="radio" accessibilityState={{ selected: picked === c.key }} onPress={() => { haptic.select(); setChoice(c.key); setSub(null) }}
              style={{ width: '25%' }} className="p-1">
              <View className={`items-center gap-1 rounded-2xl px-0.5 py-2 ${picked === c.key ? 'border-2 border-green bg-green-50' : 'border-2 border-transparent'}`}>
                <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color ?? colors.ink3}1F` }}><CategoryGlyph cat={c} size={22} /></View>
                <Text numberOfLines={1} className="text-[11px] font-bold text-ink-2">{c.label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        {subs && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 pt-2">
            {subs.map(sc => (
              <Pressable key={sc} accessibilityRole="radio" accessibilityState={{ selected: sub === sc }} onPress={() => { haptic.select(); setSub(sub === sc ? null : sc) }}
                className={`rounded-full border px-3 py-1.5 ${sub === sc ? 'border-green bg-green-50' : 'border-border bg-surface'}`}>
                <Text className="text-[13px] font-bold text-ink">{sc}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View className="gap-2 px-5 pb-3 pt-2">
          <View className="flex-row gap-2">
            {picked !== 'other' && <Button small kind="quiet" label="Don't remember? Other" style={{ flex: 1 }} onPress={() => { haptic.select(); onSave('other', null, false); setChoice(null); setSub(null) }} />}
            <Button small kind="quiet" label="It's a transfer" style={{ flex: 1 }} onPress={() => { haptic.select(); setChoice(null); setSub(null); onTransfer() }} />
          </View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: always }} onPress={() => { haptic.select(); setAlways(a => !a) }} className="flex-row items-center gap-2.5 py-1">
            <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${always ? 'border-green bg-green' : 'border-border-2'}`}>
              {always && <Icon name="checkmark" fallback="✓" size={13} color={colors.card} weight="heavy" />}
            </View>
            <Text numberOfLines={1} className="flex-1 text-[14px] font-bold text-ink">Always file {t?.description ?? 'this merchant'} like this</Text>
          </Pressable>
          <Button label="Save" disabled={!picked} onPress={() => { if (picked) { haptic.select(); onSave(picked, sub, always); setChoice(null); setSub(null); setAlways(false) } }} />
        </View>
      </SafeAreaView>
    </Modal>
  )
}
