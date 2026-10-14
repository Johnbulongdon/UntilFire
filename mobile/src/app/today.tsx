import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAudioPlayer } from 'expo-audio'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, type ButtonKind } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { LoadingState } from '@/components/LoadingState'
import { Sunny } from '@/components/Sunny'
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
/** The last answer, undoable for a few seconds: what it did and how to put it back. */
type Undo = { key: string; label: string; acked: boolean; revert: () => Promise<string | null> }
const UNDO_MS = 5000
/** How long the tick shows on the tapped answer before the next item slides in. */
const TICK_MS = 150

/**
 * Today (D-73, V2): one decision per screen, like a lesson. A progress bar on
 * top, the question in the middle, its answers pinned to the footer. A tapped
 * answer turns into a tick and the next item slides in at once; the save runs
 * behind it and puts the item back if it fails. The last one
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
  const [undo, setUndo] = useState<Undo | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  // Saves still running, so Undo waits for the answer it is undoing.
  const pending = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), UNDO_MS)
    return () => clearTimeout(t)
  }, [undo])

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

  // Opened from a link or a reminder before the account is in: never a blank sheet with no way out.
  if (!data || !session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
        <View className="flex-row justify-end px-5 pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
            <Icon name="xmark" fallback="✕" size={20} color={colors.ink3} />
          </Pressable>
        </View>
        <View className="flex-1 justify-center px-5">
          {session ? <LoadingState /> : <EmptyState title="Today needs your account" body="Sign in and Today shows a few one-tap items from yesterday's money." action={{ label: 'Sign in', onPress: () => router.replace('/sign-in') }} />}
        </View>
      </SafeAreaView>
    )
  }

  const clear = (key: string) => setCleared(c => new Set(c).add(key))
  const ack = async (item: TodayItem) => {
    haptic.select(); clear(item.key)
    setUndo({ key: item.key, label: 'Answered', acked: true, revert: async () => null })
    const next = { ...progress, acks: [...progress.acks, item.key] }
    setLocal(l => ({ ...l, acks: [...l.acks, item.key] }))
    const problem = await saveTodayProgress(session.user.id, next)
    if (problem) { haptic.warn(); Alert.alert(problem) }
  }
  // Moves on straight away; if the save fails, the item comes back with the reason.
  const run = (item: TodayItem, work: () => Promise<string | null>, undoable?: Omit<Undo, 'key' | 'acked'>) => {
    haptic.select(); clear(item.key)
    if (undoable) setUndo({ key: item.key, acked: false, ...undoable })
    const job = work().then(problem => {
      if (!problem) { refresh(); return }
      haptic.warn(); Alert.alert(problem)
      setCleared(c => { const n = new Set(c); n.delete(item.key); return n })
      setUndo(u => (u?.key === item.key ? null : u))
      setFinished(null)
    })
    pending.current = pending.current.then(() => job)
  }
  // The tapped answer shows a tick, then the answer goes ahead.
  const answer = (c: Choice) => {
    if (picked || busy) return
    setPicked(c.label)
    setTimeout(() => { setPicked(null); c.onPress() }, TICK_MS)
  }
  // Puts the last answer back: the transaction as it was, the item back in the
  // list, and the day open again if that answer had finished it.
  const doUndo = async () => {
    if (!undo) return
    const u = undo
    setUndo(null); haptic.tick(); setBusy(true)
    await pending.current
    const problem = await u.revert()
    if (problem) { setBusy(false); haptic.warn(); Alert.alert(problem); return }
    const reopen = progress.done.includes(day)
    const next = { done: progress.done.filter(d => d !== day), acks: progress.acks.filter(a => a !== u.key) }
    setLocal(l => ({ done: l.done.filter(d => d !== day), acks: l.acks.filter(a => a !== u.key) }))
    setCleared(c => { const n = new Set(c); n.delete(u.key); return n })
    if (reopen) { setFinished(null); setStage('done') }
    if (reopen || u.acked) await saveTodayProgress(session.user.id, next)
    setBusy(false); refresh()
  }
  const file = (item: TodayItem, t: Transaction, category: string, need?: 'need' | 'want') => run(item, () => {
    const s = item.suggestion!
    const sameAsSuggested = category === s.category
    const tag = need ?? (sameAsSuggested ? s.need : defaultNeed(category))
    return fileTransactions([{ id: t.id, category, sub_category: sameAsSuggested ? s.sub_category : null, tags: [...t.tags.filter(g => g !== 'need' && g !== 'want'), tag] }])
  }, {
    label: need ? `${need === 'need' ? 'Need' : 'Want'}` : `Filed as ${categoryOf(category).label}`,
    revert: () => fileTransactions([{ id: t.id, category: t.category, sub_category: t.sub_category, tags: t.tags }]),
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
      <Frame footer={[next]} undo={undo} onUndo={doUndo}>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Sunny mood="done" size={170} />
          <Animated.View entering={FadeIn.delay(250)} style={{ alignItems: 'center', gap: 6 }}>
            <Text className="font-display text-[34px] font-bold text-ink">All caught up</Text>
            <Text className="text-center text-[16px] text-ink-2">{wasYesterday ? `${dayName(finished!)} counts. ` : ''}Your budget and freedom date are up to date.</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(450)} style={{ alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Text className="font-mono text-[17px] text-ink">{count.done} of {count.of} days this month</Text>
            <MonthDots done={progress.done} />
          </Animated.View>
          {!data.pro && <View className="mt-2 items-center gap-2"><Text className="text-center text-[13px] text-ink-3">Pro adds payday and big-spend checks.</Text><Button small kind="quiet" label="See Pro" onPress={() => router.push('/pro')} /></View>}
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
      footer={card ? card.choices.map(c => ({ ...c, onPress: () => answer(c), done: picked === c.label, disabled: busy || (!!picked && picked !== c.label) })) : []}
      undo={undo}
      onUndo={doUndo}
    >
      {card && (
        <Animated.View key={item.key} entering={SlideInRight.duration(260)} exiting={SlideOutLeft.duration(180)} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 10 }}>
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
function Frame({ header, footer, children, undo, onUndo }: {
  header?: React.ReactNode; footer: (Choice & { disabled?: boolean; done?: boolean })[]; children: React.ReactNode; undo?: Undo | null; onUndo?: () => void
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      {header}
      <View style={{ flex: 1 }}>{children}</View>
      <View className="gap-3 px-5 pb-3 pt-2">
        {undo && onUndo && (
          <Animated.View key={undo.key} entering={FadeIn.duration(150)} className="flex-row items-center justify-between rounded-2xl bg-surface px-4 py-2">
            <Text className="text-[14px] font-semibold text-ink-2">{undo.label}</Text>
            <Button small kind="quiet" label="Undo" onPress={onUndo} />
          </Animated.View>
        )}
        {footer.map(c => <Button key={c.label} label={c.label} kind={c.kind} done={c.done} disabled={c.disabled} onPress={c.onPress} />)}
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
    case 'manual':
      return { eyebrow: 'Your money', title: 'Anything to add?', sub: 'Without a bank connected, what you add keeps your budget and date honest.',
        choices: [{ label: 'Add a spend', onPress: () => { h.ack(item); router.push('/transaction') } }, { label: 'Nothing to add', kind: 'quiet', onPress: () => h.ack(item) }] }
    case 'setup':
      return item.setup === 'bank'
        ? { eyebrow: 'One-time setup', title: 'Connect your bank', sub: 'Then spending arrives by itself and Today does the sorting with you.',
          choices: [{ label: 'Connect a bank', onPress: () => { h.ack(item); router.back(); router.push('/money') } }, { label: 'Not now', kind: 'quiet', onPress: () => h.ack(item) }] }
        : { eyebrow: 'One-time setup', title: 'Name a goal', sub: 'A trip, a cushion, a deposit: something to save for on the way to freedom.',
          choices: [{ label: 'Add a goal', onPress: () => { h.ack(item); router.push('/goal') } }, { label: 'Not now', kind: 'quiet', onPress: () => h.ack(item) }] }
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
