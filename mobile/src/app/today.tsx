import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAudioPlayer } from 'expo-audio'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import Animated, { FadeIn, SlideInRight, SlideOutLeft, ZoomIn } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, type ButtonKind } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { FLAG_COPY } from '@/components/WorthALook'
import { isoDay } from '@/engine'
import { money, moneyIn } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf } from '@/lib/money-data'
import { fileTransactions, resolveFlag, saveBudget } from '@/lib/mutations'
import { defaultNeed } from '@/lib/review'
import { addDays, monthCount, saveTodayProgress, todayItems, type TodayItem } from '@/lib/today'
import { setTodayReminder } from '@/lib/today-reminder'
import { useAccount, type TodayProgress, type Transaction } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors, TAB_COLOR } from '@/theme/colors'

const ASKED = 'today-reminder-asked'
const dayName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })

type Choice = { label: string; kind?: ButtonKind; onPress: () => void }
type Card = { eyebrow: string; title: string; amount?: string; sub?: string; choices: Choice[] }

/**
 * Today (D-73, V2): one decision per screen, like a lesson. A progress bar on
 * top, the question in the middle, its answers pinned to the footer. Each
 * answer saves straight away and the next item slides in; the last one
 * finishes the day with a chime and its mark. Days are counted, never streaked.
 */
export default function Today() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const player = useAudioPlayer(require('../../assets/sounds/day-complete.wav'))
  // Answers given here, on top of what the account has saved, so the list never counts from an empty start.
  const [local, setLocal] = useState<TodayProgress>({ done: [], acks: [] })
  const progress = useMemo<TodayProgress>(() => ({
    done: [...new Set([...(data?.profile.today.done ?? []), ...local.done])],
    acks: [...new Set([...(data?.profile.today.acks ?? []), ...local.acks])],
  }), [data, local])
  const [cleared, setCleared] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState<string | null>(null)
  const [stage, setStage] = useState<'done' | 'reminder'>('done')
  const [askReminder, setAskReminder] = useState(false)
  const total = useRef(0)

  const { day, items } = useMemo(() => (data ? todayItems(data, progress, new Date(), finished ?? undefined) : { day: '', items: [] as TodayItem[] }), [data, progress, finished])
  const open = items.filter(i => !cleared.has(i.key))
  total.current = Math.max(total.current, cleared.size + open.length)

  // The last item answered finishes the day.
  useEffect(() => {
    if (!session || !day || open.length > 0 || progress.done.includes(day) || finished) return
    const next = { ...progress, done: [...progress.done, day] }
    setLocal(l => ({ ...l, done: [...l.done, day] })); setFinished(day)
    haptic.success()
    try { player.seekTo(0); player.play() } catch { /* sound is a nicety */ }
    saveTodayProgress(session.user.id, next).then(() => refresh())
    AsyncStorage.getItem(ASKED).then(v => setAskReminder(v !== '1')).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open.length, day])

  if (!data || !session) return null

  const clear = (key: string) => setCleared(c => new Set(c).add(key))
  const ack = async (item: TodayItem) => {
    haptic.select(); clear(item.key)
    const next = { ...progress, acks: [...progress.acks, item.key] }
    setLocal(l => ({ ...l, acks: [...l.acks, item.key] }))
    const problem = await saveTodayProgress(session.user.id, next)
    if (problem) { haptic.warn(); Alert.alert(problem) }
  }
  const run = async (item: TodayItem, work: () => Promise<string | null>) => {
    haptic.select(); setBusy(true)
    const problem = await work()
    setBusy(false)
    if (problem) { haptic.warn(); Alert.alert(problem); return }
    clear(item.key); refresh()
  }
  const file = (item: TodayItem, t: Transaction, category: string, need?: 'need' | 'want') => run(item, () => {
    const s = item.suggestion!
    const sameAsSuggested = category === s.category
    const tag = need ?? (sameAsSuggested ? s.need : defaultNeed(category))
    return fileTransactions([{ id: t.id, category, sub_category: sameAsSuggested ? s.sub_category : null, tags: [...t.tags.filter(g => g !== 'need' && g !== 'want'), tag] }])
  })

  const count = monthCount(progress.done)
  const wasYesterday = !!finished && finished === addDays(isoDay(new Date()), -1)

  // Finished: the celebration, then (once) the 9pm reminder as its own question.
  if (open.length === 0 && (finished || progress.done.includes(day))) {
    if (stage === 'reminder') {
      return (
        <Frame footer={[
          { label: 'Remind me at 9pm', onPress: async () => {
            await AsyncStorage.setItem(ASKED, '1').catch(() => {})
            const ok = await setTodayReminder(true, progress.done)
            if (!ok) Alert.alert('Notifications are off', 'Turn on notifications for this app in Settings to get the reminder.')
            router.back()
          } },
          { label: 'Not now', kind: 'quiet', onPress: () => { AsyncStorage.setItem(ASKED, '1').catch(() => {}); router.back() } },
        ]}>
          <View className="flex-1 items-center justify-center gap-3 px-8">
            <Icon name="bell.fill" fallback="🔔" size={56} color={TAB_COLOR.home} />
            <Text className="text-center font-display text-[30px] font-bold leading-9 text-ink">A nudge at 9pm?</Text>
            <Text className="text-center text-[16px] leading-6 text-ink-2">Only on days you haven't finished. One minute keeps your plan accurate.</Text>
          </View>
        </Frame>
      )
    }
    const next: Choice = wasYesterday
      ? { label: 'Start today', onPress: () => { setFinished(null); setCleared(new Set()); total.current = 0 } }
      : askReminder ? { label: 'Continue', onPress: () => setStage('reminder') } : { label: 'Done', onPress: () => router.back() }
    return (
      <Frame footer={[next]}>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: TAB_COLOR.home, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="checkmark" fallback="✓" size={60} color="#FFFFFF" />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(250)} style={{ alignItems: 'center', gap: 6 }}>
            <Text className="font-display text-[34px] font-bold text-ink">All caught up</Text>
            <Text className="text-center text-[16px] text-ink-2">{wasYesterday ? `${dayName(finished!)} counts. ` : ''}Your budget and freedom date are up to date.</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(450)} style={{ alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Text className="font-mono text-[17px] text-ink">{count.done} of {count.of} days this month</Text>
            <MonthDots done={progress.done} />
          </Animated.View>
          {!data.pro && <Text className="mt-2 text-center text-[13px] text-ink-3">Pro adds payday and big-spend checks.</Text>}
        </View>
      </Frame>
    )
  }

  const item = open[0]
  const card = item ? cardFor(item, { ack, run, file, budget: data.budget, userId: session.user.id, day }) : null
  const doneCount = total.current - open.length
  return (
    <Frame
      header={
        <View className="flex-row items-center gap-3 px-5 pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
            <Icon name="xmark" fallback="✕" size={20} color={colors.ink3} />
          </Pressable>
          <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.surface2 }}>
            <View style={{ height: 14, borderRadius: 7, backgroundColor: TAB_COLOR.home, width: `${total.current ? Math.max(4, (doneCount / total.current) * 100) : 4}%` }} />
          </View>
          <Text className="font-mono text-[13px] text-ink-3">{doneCount}/{total.current}</Text>
        </View>
      }
      footer={card ? card.choices.map(c => ({ ...c, disabled: busy })) : []}
    >
      {card && (
        <Animated.View key={item.key} entering={SlideInRight.springify().damping(18)} exiting={SlideOutLeft.duration(180)} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 10 }}>
          <Text className="text-[13px] font-bold uppercase tracking-[2px] text-ink-3">{card.eyebrow}</Text>
          <Text className="font-display text-[32px] font-bold leading-[38px] text-ink">{card.title}</Text>
          {card.amount && <Text className="font-mono text-[34px] text-ink">{card.amount}</Text>}
          {card.sub && <Text className="text-[17px] leading-6 text-ink-2">{card.sub}</Text>}
        </Animated.View>
      )}
    </Frame>
  )
}

/** A full-height screen: optional header, the middle, and the answers pinned to the footer. */
function Frame({ header, footer, children }: { header?: React.ReactNode; footer: (Choice & { disabled?: boolean })[]; children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      {header}
      <View style={{ flex: 1 }}>{children}</View>
      <View className="gap-3 px-5 pb-3 pt-2">
        {footer.map(c => <Button key={c.label} label={c.label} kind={c.kind} disabled={'disabled' in c ? c.disabled : false} onPress={c.onPress} />)}
      </View>
    </SafeAreaView>
  )
}

function cardFor(item: TodayItem, h: {
  ack: (i: TodayItem) => void
  run: (i: TodayItem, work: () => Promise<string | null>) => void
  file: (i: TodayItem, t: Transaction, category: string, need?: 'need' | 'want') => void
  budget: Record<string, number>
  userId: string
  day: string
}): Card {
  const t = item.tx
  const when = t ? (t.date === isoDay(new Date()) ? 'Today' : t.date === addDays(isoDay(new Date()), -1) ? 'Yesterday' : dayName(t.date)) : ''
  switch (item.kind) {
    case 'category':
      return { eyebrow: `${when} · pick a category`, title: t!.description, amount: moneyIn(t!.amount, t!.currency),
        choices: [...item.choices!.map((c, i) => ({ label: categoryOf(c).label, kind: (i ? 'quiet' : 'primary') as ButtonKind, onPress: () => h.file(item, t!, c) })),
          // Any other category: the transaction's own sheet, with every category and need or want.
          { label: 'Something else', kind: 'quiet', onPress: () => router.push({ pathname: '/transaction', params: { id: t!.id } }) }] }
    case 'need': {
      const order: ('need' | 'want')[] = item.suggestion!.need === 'need' ? ['need', 'want'] : ['want', 'need']
      return { eyebrow: `${when} · ${categoryOf(t!.category).label}`, title: t!.description, amount: moneyIn(t!.amount, t!.currency), sub: 'Need or want?',
        choices: order.map((n, i) => ({ label: n === 'need' ? 'Need' : 'Want', kind: (i ? 'quiet' : 'primary') as ButtonKind, onPress: () => h.file(item, t!, t!.category, n) })) }
    }
    case 'flag': {
      const copy = FLAG_COPY[item.flag!]!
      return { eyebrow: `${when} · ${copy.label.toLowerCase()}`, title: t!.description, amount: moneyIn(t!.amount, t!.currency), sub: copy.tip,
        choices: [...(copy.yes ? [{ label: copy.yes, onPress: () => h.run(item, () => resolveFlag(t!, item.flag!, true)) }] : []),
          { label: copy.no, kind: (copy.yes ? 'quiet' : 'primary') as ButtonKind, onPress: () => h.run(item, () => resolveFlag(t!, item.flag!, false)) }] }
    }
    case 'big': {
      const o = item.over!
      return { eyebrow: `${when} · a big one`, title: t!.description, amount: moneyIn(t!.amount, t!.currency),
        sub: `That's ${money(o.by)} over ${categoryOf(o.category).label} this month. One spend doesn't change the big picture.`,
        choices: [...(o.from ? [{ label: `Move ${money(o.by)} from ${categoryOf(o.from).label}`, onPress: () => h.run(item, async () => {
          const problem = await saveBudget(h.userId, { [o.category]: (h.budget[o.category] ?? 0) + o.by, [o.from!]: Math.max(0, (h.budget[o.from!] ?? 0) - o.by) })
          if (!problem) h.ack(item)
          return problem
        }) }] : []), { label: 'Got it', kind: (o.from ? 'quiet' : 'primary') as ButtonKind, onPress: () => h.ack(item) }] }
    }
    case 'backlog':
      return { eyebrow: 'Older ones', title: `${item.count} more to sort`, sub: 'They\'re waiting in Review whenever you have a minute.',
        choices: [{ label: 'Open Review', onPress: () => { h.ack(item); router.push('/review') } }, { label: 'Later', kind: 'quiet', onPress: () => h.ack(item) }] }
    case 'bill':
      return { eyebrow: 'Tomorrow', title: `${item.bill!.description} is due`, amount: money(item.bill!.amount), sub: 'Just so it isn\'t a surprise.',
        choices: [{ label: 'Got it', onPress: () => h.ack(item) }] }
    case 'payday':
      return { eyebrow: 'Payday', title: 'Pay is in', amount: money(item.amount!), sub: 'is safe to put towards freedom.',
        choices: [{ label: `Invest ${money(item.amount!)}`, onPress: () => { h.ack(item); router.push('/plan/contributions') } }, { label: 'Not this time', kind: 'quiet', onPress: () => h.ack(item) }] }
    case 'goal':
      return { eyebrow: 'Goal reached', title: `${item.goal!.name}!`, amount: money(item.goal!.target_amount), sub: 'saved. Nicely done.',
        choices: [{ label: 'Nice!', onPress: () => h.ack(item) }] }
    case 'number':
      return item.amount != null
        ? { eyebrow: 'Your number today', title: 'Safe to spend', amount: money(item.amount), sub: 'today, and still stay on budget.', choices: [{ label: 'Got it', onPress: () => h.ack(item) }] }
        : { eyebrow: 'Your number today', title: 'Set a budget', sub: 'Then this becomes what\'s safe to spend each day.',
          choices: [{ label: 'Got it', onPress: () => h.ack(item) }, { label: 'Set a budget', kind: 'quiet', onPress: () => router.push('/budget-edit') }] }
  }
}

/** This month's days: finished ones filled, the rest outlined. */
function MonthDots({ done }: { done: string[] }) {
  const now = new Date()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const month = isoDay(now).slice(0, 7)
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: 7 * 22 + 6 * 6 }}>
      {Array.from({ length: days }, (_, i) => {
        const iso = `${month}-${String(i + 1).padStart(2, '0')}`
        const on = done.includes(iso)
        const past = i + 1 <= now.getDate()
        return <View key={iso} accessibilityLabel={`${iso}${on ? ', finished' : ''}`} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: on ? TAB_COLOR.home : past ? colors.surface2 : 'transparent', borderWidth: on || past ? 0 : 1, borderColor: colors.border }} />
      })}
    </View>
  )
}
