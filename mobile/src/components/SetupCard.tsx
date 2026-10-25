import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { ThemeScope } from '@/components/ThemeScope'
import {
  FALLBACK_RATES, RECURRENCE_LABEL, SETUP_BUTTON, SETUP_CTA, SETUP_FINISHED_KEY, SETUP_LABEL, SETUP_SNAPSHOT_KEY,
  setupFinds, setupMoment, setupSteps, type SetupFind, type SetupMoment, type SetupSnapshot, type SetupStepId,
} from '@/engine'
import { freeUntilPayday } from '@/lib/bills'
import { money } from '@/lib/format'
import { Events, track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { saveBill } from '@/lib/mutations'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

const DISMISSED_KEY = 'uf_expected_dismissed'
// Home's data comes in pieces; comparing before it settles would call a half-loaded screen a finished step.
const SETTLE_MS = 2500

const ROUTE: Record<SetupStepId, Parameters<typeof router.push>[0]> = {
  income: '/income-edit',
  bank: '/money/net-worth',
  payday: { pathname: '/bill', params: { type: 'income' } },
  bills: '/bill',
  budget: '/budget-edit',
}

const GLYPH: Record<SetupStepId, (c: string) => ReactNode> = {
  income: c => <><Rect x={3} y={6} width={18} height={12} rx={3} stroke={c} strokeWidth={2.2} fill="none" /><Circle cx={12} cy={12} r={2.5} stroke={c} strokeWidth={2.2} fill="none" /></>,
  bank: c => <Path d="M3 10l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  payday: c => <><Rect x={3} y={5} width={18} height={16} rx={3} stroke={c} strokeWidth={2.2} fill="none" /><Path d="M3 10h18M8 3v4M16 3v4" stroke={c} strokeWidth={2.2} strokeLinecap="round" /><Circle cx={12} cy={15.5} r={1.6} fill={c} /></>,
  bills: c => <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  budget: c => <><Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={2.2} fill="none" /><Path d="M12 3v9l6.4 6.4" stroke={c} strokeWidth={2.2} strokeLinecap="round" fill="none" /></>,
}

function StepIcon({ id, done }: { id: SetupStepId; done: boolean }) {
  const c = done ? colors.teal : colors.ink2
  return (
    <View className="h-11 w-11 items-center justify-center rounded-[13px]" style={{ backgroundColor: done ? colors.tealSoft : colors.surface2 }}>
      <Svg width={22} height={22} viewBox="0 0 24 24">{GLYPH[id](c)}</Svg>
    </View>
  )
}

const Tick = () => (
  <View className="h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: colors.teal }}>
    <Svg width={12} height={12} viewBox="0 0 12 12"><Path d="M2.5 6.2l2.3 2.3 4.7-4.9" stroke={colors.card} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
  </View>
)

/** Progress as a ring: teal is freedom and progress, never a button. */
function ProgressRing({ done, total, size }: { done: number; total: number; size: number }) {
  const c = 2 * Math.PI * 16
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={20} cy={20} r={16} stroke={colors.surface2} strokeWidth={5} fill="none" />
      {done > 0 && <Circle cx={20} cy={20} r={16} stroke={colors.teal} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${(c * done) / total} ${c}`} />}
    </Svg>
  )
}

const factsFrom = (data: AccountData) => ({
  income: data.income,
  bankLinked: data.plaidAccounts.length > 0,
  typedInvestments: data.typed.k401 + data.typed.rothIRA + data.typed.taxable,
  expected: data.bills.map(b => ({ type: b.transaction_type, recurrence: b.recurrence })),
  budget: data.budget,
})

/**
 * Whether Get set up is still on Home (null while it reads storage). While it
 * is, it is Home's one ask, so the next move waits (one thing to do, not three).
 */
export function useSetupOpen(data: AccountData | null): boolean | null {
  const [finished, setFinished] = useState<boolean | null>(null)
  useEffect(() => { AsyncStorage.getItem(SETUP_FINISHED_KEY).then(v => setFinished(v === '1')).catch(() => setFinished(false)) }, [])
  const allDone = useMemo(() => (data ? setupSteps(factsFrom(data)).every(s => s.done) : false), [data])
  if (!data || finished == null) return null
  return !finished && !allDone
}

/**
 * Get set up on Home (Oct 2026): a slim card with the next step's button,
 * opening a sheet with all five (lib/setup-steps, shared with the website).
 * Ticks itself from your data, shows what a finished step changed, turns
 * bank findings into one-tap confirms, celebrates once, then is gone.
 */
export function SetupCard({ data, freedomYear }: { data: AccountData; freedomYear: number | null }) {
  const { session } = useAuth()
  const { refresh } = useAccount()
  const steps = useMemo(() => setupSteps(factsFrom(data)), [data])
  const doneIds = useMemo(() => steps.filter(s => s.done).map(s => s.id), [steps])
  const total = steps.length
  const next = steps.find(s => !s.done)?.id ?? null
  const untilPayday = useMemo(() => freeUntilPayday(data)?.free ?? null, [data])

  const [loaded, setLoaded] = useState(false)
  const [settled, setSettled] = useState(false)
  const [finished, setFinished] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [moment, setMoment] = useState<SetupMoment | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [open, setOpen] = useState<SetupStepId | null>(null)
  const [unticked, setUnticked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const snapshot = useRef<SetupSnapshot | null>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    AsyncStorage.multiGet([SETUP_FINISHED_KEY, SETUP_SNAPSHOT_KEY, DISMISSED_KEY]).then(rows => {
      const v = Object.fromEntries(rows)
      setFinished(v[SETUP_FINISHED_KEY] === '1')
      try { snapshot.current = JSON.parse(v[SETUP_SNAPSHOT_KEY] || 'null') } catch { snapshot.current = null }
      try { setDismissed(JSON.parse(v[DISMISSED_KEY] || '[]')) } catch { /* none */ }
    }).catch(() => {}).finally(() => setLoaded(true))
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [])

  // Once settled: compare with the last visit, show the payoff, remember now.
  useEffect(() => {
    if (!loaded || !settled || finished) return
    const prev = snapshot.current
    const m = setupMoment(prev, doneIds, freedomYear)
    for (const id of doneIds) if (prev && !prev.done.includes(id)) track(Events.SETUP_CHECKLIST, { action: 'step_done', step: id, done_count: doneIds.length })
    if (m && (m.kind === 'date' || untilPayday != null)) setMoment(m)
    if (doneIds.length === total) {
      // Already complete on a first look (an existing account): nothing to celebrate, just never show.
      if (!prev) { AsyncStorage.setItem(SETUP_FINISHED_KEY, '1').catch(() => {}); setFinished(true) }
      else if (prev.done.length < total) { setCelebrate(true); setSheet(true) }
    }
    const now: SetupSnapshot = { done: doneIds, year: freedomYear ?? prev?.year ?? null }
    snapshot.current = now
    AsyncStorage.setItem(SETUP_SNAPSHOT_KEY, JSON.stringify(now)).catch(() => {})
  }, [loaded, settled, finished, doneIds, freedomYear, untilPayday, total])

  useEffect(() => {
    if (!moment) return
    const t = setTimeout(() => setMoment(null), 12000)
    return () => clearTimeout(t)
  }, [moment])

  const finds = useMemo(() => {
    const raw = data.transactions.filter(t => t.transaction_type === 'expense' || t.transaction_type === 'income')
      .map(t => ({ id: t.id, date: t.date, amount: Math.abs(t.amount), currency: t.currency, description: t.description, category: t.category ?? '', transaction_type: t.transaction_type as 'expense' | 'income' }))
    const all = setupFinds(raw, data.bills, FALLBACK_RATES)
    return { payday: all.payday && !dismissed.includes(all.payday.key) ? all.payday : null, bills: all.bills.filter(b => !dismissed.includes(b.key)) }
  }, [data.transactions, data.bills, dismissed])
  const findsFor = (id: SetupStepId): SetupFind[] => id === 'payday' ? (finds.payday ? [finds.payday] : []) : id === 'bills' ? finds.bills : []
  const shown = open ?? (next && findsFor(next).length > 0 ? next : null)

  const go = (id: SetupStepId) => { haptic.tick(); setSheet(false); router.push(ROUTE[id]) }

  async function confirm(step: SetupStepId, items: SetupFind[]) {
    if (!session || busy) return
    const keep = items.filter(f => !unticked.includes(f.key))
    setBusy(true); setError('')
    for (const f of keep) {
      const problem = await saveBill(session.user.id, {
        description: f.description, amount: f.amountUSD, currency: 'USD',
        transaction_type: step === 'payday' ? 'income' : 'expense',
        due_date: f.nextDueDate, recurrence: f.recurrence, category: f.category || null,
      })
      if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    }
    // Unticked ones were "not a bill": don't offer them again, here or in Calendar.
    const all = [...new Set([...dismissed, ...items.filter(f => unticked.includes(f.key)).map(f => f.key)])]
    setDismissed(all); AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(all)).catch(() => {})
    if (keep.length > 0) { haptic.success(); track(Events.SETUP_CHECKLIST, { action: 'found_confirmed', step, added: keep.length }) }
    setBusy(false); setOpen(null); setUnticked([])
    refresh()
  }

  const finish = () => {
    haptic.success()
    track(Events.SETUP_CHECKLIST, { action: 'finished', done_count: total })
    AsyncStorage.setItem(SETUP_FINISHED_KEY, '1').catch(() => {})
    setCelebrate(false); setSheet(false); setFinished(true)
  }

  if (!loaded || finished || (doneIds.length === total && !celebrate)) return null

  return (
    <>
      {/* Home's one ask while setup is open, so it wears the next move's green frame. */}
      <Pressable accessibilityRole="button" accessibilityLabel={`Get set up, ${doneIds.length} of ${total} done. Show steps`}
        onPress={() => { haptic.tick(); setSheet(true); track(Events.SETUP_CHECKLIST, { action: 'opened', done_count: doneIds.length }) }}
        className="flex-row items-center gap-3 rounded-card bg-card py-3 pl-4 pr-3" style={{ borderWidth: 2, borderColor: colors.green }}>
        <ProgressRing done={doneIds.length} total={total} size={38} />
        <View className="flex-1">
          <Text className="text-[15px] font-extrabold text-ink">Get set up</Text>
          <Text className="text-[13px] text-ink-2">{doneIds.length} of {total} done</Text>
        </View>
        {next && <Button small label={SETUP_BUTTON[next]}
          onPress={() => (findsFor(next).length > 0 ? (haptic.tick(), setSheet(true)) : go(next))} />}
      </Pressable>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <ThemeScope>
        <Pressable accessibilityLabel="Close" className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setSheet(false)} />
        <View className="rounded-t-[28px] bg-card px-5 pt-3" style={{ paddingBottom: insets.bottom + 20, maxHeight: '85%' }}>
          <View className="mb-4 h-[5px] w-10 self-center rounded-full" style={{ backgroundColor: colors.surface2 }} />
          <ScrollView>
            {celebrate ? (
              <View className="items-center px-2 pb-2 pt-2">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-[20px]" style={{ backgroundColor: colors.tealSoft }}>
                  <Svg width={34} height={34} viewBox="0 0 12 12"><Path d="M2.5 6.2l2.3 2.3 4.7-4.9" stroke={colors.teal} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </View>
                <Text className="font-display text-[26px] font-bold text-ink">You&rsquo;re set up</Text>
                {freedomYear != null && <>
                  <Text className="mt-1 text-[14px] text-ink-2">Your freedom date</Text>
                  <Text className="mb-5 mt-1 font-display text-[44px] font-bold text-ink">{freedomYear}</Text>
                </>}
                <Button label="Nice" onPress={finish} style={{ alignSelf: 'stretch' }} />
              </View>
            ) : <>
              <View className="mb-3 flex-row items-center gap-3 px-1">
                <ProgressRing done={doneIds.length} total={total} size={44} />
                <View>
                  <Text className="text-[18px] font-extrabold text-ink">Get set up</Text>
                  <Text className="text-[13px] text-ink-2">{doneIds.length} of {total} done</Text>
                </View>
              </View>

              {moment && (
                <View accessibilityLiveRegion="polite" className="mb-3 flex-row items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: colors.tealSoft }}>
                  <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-card">
                    <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 7V4M5.6 10.6 3.5 8.5M18.4 10.6l2.1-2.1" stroke={colors.teal} strokeWidth={2.2} strokeLinecap="round" fill="none" /></Svg>
                  </View>
                  {moment.kind === 'date' ? (
                    <View accessibilityLabel={`Your date moved from ${moment.from} to ${moment.to}`}>
                      <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: colors.tealDeep }}>Your date moved</Text>
                      <View className="mt-1 flex-row items-baseline gap-2">
                        <Text className="font-mono text-[16px] text-ink-3" style={{ textDecorationLine: 'line-through' }}>{moment.from}</Text>
                        <Text className="font-display text-[30px] font-bold text-ink">{moment.to}</Text>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: colors.tealDeep }}>Until payday</Text>
                      <Text className="mt-1 font-mono text-[24px] text-ink">{money(untilPayday ?? 0)}</Text>
                    </View>
                  )}
                </View>
              )}

              {steps.map(({ id, done }) => {
                const found = !done && shown === id ? findsFor(id) : []
                if (found.length > 0) {
                  const keep = found.filter(f => !unticked.includes(f.key)).length
                  const isPay = id === 'payday'
                  return (
                    <View key={id} className="my-1 rounded-2xl p-3" style={{ backgroundColor: colors.surface }}>
                      <View className="mb-2 flex-row items-center gap-3">
                        <StepIcon id={id} done={false} />
                        <Text className="text-[16px] font-extrabold text-ink">{isPay ? 'We found your paycheck' : `We found ${found.length} ${found.length === 1 ? 'bill' : 'bills'}`}</Text>
                      </View>
                      {found.map(f => {
                        const on = !unticked.includes(f.key)
                        return (
                          <Pressable key={f.key} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${f.description}, ${money(f.amountUSD)}, ${RECURRENCE_LABEL[f.recurrence]}`}
                            onPress={() => { haptic.tick(); setUnticked(u => (on ? [...u, f.key] : u.filter(k => k !== f.key))) }}
                            className="min-h-[44px] flex-row items-center gap-3 px-1">
                            <View className="h-[22px] w-[22px] items-center justify-center rounded-md"
                              style={on ? { backgroundColor: colors.green } : { borderWidth: 2, borderColor: colors.border2 }}>
                              {on && <Svg width={12} height={12} viewBox="0 0 12 12"><Path d="M2.5 6.2l2.3 2.3 4.7-4.9" stroke={colors.card} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                            </View>
                            <Text numberOfLines={1} className={`flex-1 text-[15px] font-semibold ${on ? 'text-ink' : 'text-ink-3'}`}>{f.description}</Text>
                            <Text className="font-mono text-[15px] text-ink">{money(f.amountUSD)}</Text>
                          </Pressable>
                        )
                      })}
                      {error ? <Text className="mt-2 text-[14px] text-neg-ink">{error}</Text> : null}
                      <View className="mt-3 flex-row items-center gap-3">
                        <Button small disabled={busy} style={{ flex: 1 }} onPress={() => confirm(id, found)}
                          label={keep === 0 ? 'None of these' : isPay ? 'Add payday' : `Add ${keep} ${keep === 1 ? 'bill' : 'bills'}`} />
                        <Button small kind="quiet" label="Add by hand" onPress={() => { setOpen(null); go(id) }} />
                      </View>
                    </View>
                  )
                }
                const isNext = id === next
                return (
                  <View key={id} className="my-0.5 flex-row items-center gap-3 rounded-2xl px-2 py-2" style={isNext ? { backgroundColor: colors.surface } : undefined}>
                    <StepIcon id={id} done={done} />
                    <Text className={`flex-1 text-[16px] ${done ? 'font-semibold text-ink-3' : 'font-bold text-ink'}`}
                      style={done ? { textDecorationLine: 'line-through' } : undefined}
                      accessibilityLabel={done ? `${SETUP_LABEL[id]}, done` : undefined}>{SETUP_LABEL[id]}</Text>
                    {done ? <Tick /> : (
                      <Button small kind={isNext ? 'primary' : 'quiet'} label={SETUP_CTA[id]} accessibilityLabel={`${SETUP_CTA[id]}: ${SETUP_LABEL[id]}`}
                        onPress={() => (findsFor(id).length > 0 ? (haptic.tick(), setOpen(id)) : go(id))} />
                    )}
                  </View>
                )
              })}
            </>}
          </ScrollView>
        </View>
        </ThemeScope>
      </Modal>
    </>
  )
}
