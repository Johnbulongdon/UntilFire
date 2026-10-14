import AsyncStorage from '@react-native-async-storage/async-storage'
import { Button } from '@/components/Button'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, View } from 'react-native'

import { Bouncy } from '@/components/Bouncy'
import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { CategoryGlyph } from '@/components/Icon'
import { addMonths, detectRecurring, FALLBACK_RATES, isoDay, RECURRENCE_LABEL, sameMerchant, toRecurrence, type DetectedItem } from '@/engine'
import { upcoming, type BillEvent } from '@/lib/bills'
import { compactMoney, money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, dayLabel, thisMonth } from '@/lib/money-data'
import { markBillPaid, saveBill } from '@/lib/mutations'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

const DISMISSED_KEY = 'untilfire.bill-suggestions.dismissed'
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** The website's Calendar (Money → Calendar): what's due and what's coming in, as a list or the month, with suggestions. */
export default function Bills() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  const [view, setView] = useState<'list' | 'month'>('month')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then(raw => { if (raw) setDismissed(JSON.parse(raw)) }).catch(() => {})
  }, [])

  const events = useMemo(() => (data ? upcoming(data.bills, 30) : []), [data])
  const catOf = (billId: string) => data?.bills.find(b => b.id === billId)?.category ?? null
  // Only the next occurrence of each bill can be ticked off, as on the website.
  const firstOf = new Set<string>()
  const tickable = new Set(events.filter(e => (firstOf.has(e.billId) ? false : (firstOf.add(e.billId), true))).map(e => `${e.billId}@${e.iso}`))
  const out = events.filter(e => e.type === 'expense').reduce((s, e) => s - e.amount, 0)
  const inn = events.filter(e => e.type === 'income' && e.counted).reduce((s, e) => s + e.amount, 0)

  // Repeating payments found in transactions that aren't bills yet (lib/recurring-detect.ts).
  const suggestions = useMemo(() => {
    if (!data) return []
    const raw = data.transactions
      .filter(t => t.transaction_type !== 'transfer')
      .map(t => ({ id: t.id, date: t.date, amount: t.amount, currency: t.currency, description: t.description, category: t.category, transaction_type: t.transaction_type as 'expense' | 'income' }))
    const found = detectRecurring(raw, FALLBACK_RATES)
    return [...found.expenses, ...found.income]
      .filter(s => !dismissed.includes(s.key) && !data.bills.some(b => sameMerchant(b.description, s.description)))
      .filter((s, i, all) => all.findIndex(o => sameMerchant(o.description, s.description)) === i)
      .slice(0, 5)
  }, [data, dismissed])

  const tick = async (billId: string) => {
    const bill = data?.bills.find(b => b.id === billId)
    if (!bill) return
    setBusyId(billId)
    const problem = await markBillPaid(bill)
    setBusyId(null)
    if (problem) { haptic.warn(); Alert.alert(problem); return }
    haptic.success(); refresh()
  }

  const accept = async (s: DetectedItem) => {
    if (!session) return
    haptic.select()
    const problem = await saveBill(session.user.id, {
      description: s.description, amount: Math.round(s.avgAmountUSD * 100) / 100, currency: 'USD',
      transaction_type: s.transaction_type, due_date: s.nextDueDate, recurrence: toRecurrence(s.frequency), category: s.category || null,
    })
    if (problem) { Alert.alert(problem); return }
    haptic.success(); refresh()
  }
  const dismiss = (key: string) => {
    haptic.tick()
    const next = [...dismissed, key]
    setDismissed(next)
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => {})
  }

  return (
    <View className="flex-1">
      <DetailScreen back="Money" title="Calendar" subtitle="Bills and paydays" refreshing={loading} onRefresh={refresh}>
        <Card>
          <View className="flex-row">
            <View className="flex-1"><Label>Going out, 30 days</Label><Text className="mt-1 font-mono text-[22px] text-ink">{money(out)}</Text></View>
            <View className="flex-1"><Label>Coming in</Label><Text className="mt-1 font-mono text-[22px] text-pos-ink">{money(inn)}</Text></View>
          </View>
        </Card>

        <View className="flex-row rounded-control bg-surface p-1">
          {(['month', 'list'] as const).map(v => (
            <Pressable accessibilityRole="button" key={v} onPress={() => { haptic.select(); setView(v) }} className={`flex-1 items-center rounded-lg py-2 ${view === v ? 'bg-card' : ''}`}>
              <Text className={`text-[14px] font-semibold ${view === v ? 'text-ink' : 'text-ink-2'}`}>{v === 'list' ? 'Upcoming list' : 'Month'}</Text>
            </Pressable>
          ))}
        </View>

        {!data ? <LoadingState cards={2} /> : view === 'list'
          ? <ListView events={events} catOf={catOf} tickable={tickable} busyId={busyId} onTick={tick} />
          : <MonthView data={data} />}

        {suggestions.length > 0 && (
          <Card soft>
            <Label>Looks like it repeats</Label>
            {suggestions.map((s, i) => (
              <View key={s.key} className={`py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
                <View className="flex-row items-center gap-3">
                  <Glyph category={s.category} income={s.transaction_type === 'income'} />
                  <View className="flex-1">
                    <View className="flex-row justify-between">
                      <Text numberOfLines={1} className="flex-1 pr-3 text-[15px] font-semibold text-ink">{s.description}</Text>
                      <Text className="font-mono text-[15px] text-ink">{money(s.avgAmountUSD)}</Text>
                    </View>
                    <Text className="text-[12px] text-ink-3">{RECURRENCE_LABEL[toRecurrence(s.frequency) as keyof typeof RECURRENCE_LABEL]} · next around {dayLabel(s.nextDueDate)}</Text>
                  </View>
                </View>
                <View className="mt-2 flex-row gap-5 pl-12">
                  <Button small kind="quiet" label={`Add as ${s.transaction_type === 'income' ? 'payday' : 'bill'}`} onPress={() => accept(s)} />
                  <Button small kind="quiet" label={s.transaction_type === 'income' ? 'Not a payday' : 'Not a bill'} onPress={() => dismiss(s.key)} />
                </View>
              </View>
            ))}
          </Card>
        )}
      </DetailScreen>

      <View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom: 20 }}>
        <Bouncy accessibilityRole="button" accessibilityLabel="Add a bill or payday" onPress={() => { haptic.press(); router.push('/bill') }} scaleTo={0.9}>
          <View className="h-14 w-14 items-center justify-center rounded-full bg-green" style={{ shadowColor: '#78501E', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <Text className="text-[30px] leading-[32px] text-white">+</Text>
          </View>
        </Bouncy>
      </View>
    </View>
  )
}

/**
 * The month as the website's Calendar draws it (D-61): every payment on its
 * day, and cash left at the end of each day from today. Cash means all cash
 * and savings, never investments.
 */
function MonthView({ data }: { data: AccountData }) {
  const today = isoDay(new Date())
  const [month, setMonth] = useState(thisMonth())
  const [picked, setPicked] = useState(today)

  const first = new Date(`${month}-01T00:00:00`)
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const horizon = Math.ceil((new Date(first.getFullYear(), first.getMonth() + 1, 0).getTime() - Date.now()) / 864e5) + 1
  const all = upcoming(data.bills, Math.max(horizon, 1))
  const monthEvents = all.filter(e => e.iso.startsWith(month))

  const cashByDay = new Map<string, number>()
  let cash = data.balances.cashSavings
  for (const e of all.filter(x => x.iso < `${month}-01` && x.counted)) cash += e.amount
  for (let d = 1; d <= days; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`
    if (iso < today) continue
    for (const e of monthEvents.filter(x => x.iso === iso && x.counted)) cash += e.amount
    cashByDay.set(iso, cash)
  }
  const dayEvents = monthEvents.filter(e => e.iso === picked)
  const go = (dir: -1 | 1) => {
    const next = addMonths(month, dir)
    if (next < thisMonth()) return
    haptic.tick(); setMonth(next); setPicked(next === thisMonth() ? today : `${next}-01`)
  }

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} disabled={month <= thisMonth()} onPress={() => go(-1)} className="px-2">
          <Text className={`text-[20px] ${month <= thisMonth() ? 'text-border-2' : 'text-ink'}`}>‹</Text>
        </Pressable>
        <Text className="text-[15px] font-bold text-ink">{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} onPress={() => go(1)} className="px-2"><Text className="text-[20px] text-ink">›</Text></Pressable>
      </View>
      <View className="mt-3 flex-row">
        {WEEKDAYS.map((w, i) => <Text key={i} className="flex-1 text-center text-[11px] text-ink-3">{w}</Text>)}
      </View>
      <View className="mt-1 flex-row flex-wrap">
        {Array.from({ length: lead }).map((_, i) => <View key={`l${i}`} style={{ width: `${100 / 7}%`, height: 46 }} />)}
        {Array.from({ length: days }).map((_, i) => {
          const iso = `${month}-${String(i + 1).padStart(2, '0')}`
          const evs = monthEvents.filter(e => e.iso === iso)
          const on = picked === iso
          return (
            <Pressable accessibilityRole="button" key={iso} onPress={() => { haptic.select(); setPicked(iso) }} style={{ width: `${100 / 7}%`, height: 46 }} className="items-center justify-center">
              <View className={`h-10 w-10 items-center justify-center rounded-full ${on ? 'bg-green' : iso === today ? 'bg-green-50' : ''}`}>
                <Text className={`text-[14px] ${on ? 'font-bold text-white' : iso < today ? 'text-ink-3' : 'text-ink'}`}>{i + 1}</Text>
                {evs.length > 0 && (
                  <View className="mt-0.5 flex-row gap-0.5">
                    {evs.slice(0, 3).map((e, k) => <View key={k} className={`h-1 w-1 rounded-full ${on ? 'bg-card' : e.type === 'income' ? 'bg-green' : 'bg-sun'}`} />)}
                  </View>
                )}
              </View>
            </Pressable>
          )
        })}
      </View>
      <View className="mt-3 border-t border-border pt-3">
        <View className="flex-row justify-between">
          <Text className="text-[14px] font-bold text-ink">{dayLabel(picked)}</Text>
          {cashByDay.has(picked) && (
            <Text className="text-[13px] text-ink-2">Cash after: <Text className={`font-mono text-[13px] ${cashByDay.get(picked)! < 0 ? 'text-neg-ink' : 'text-ink'}`}>{compactMoney(cashByDay.get(picked)!)}</Text></Text>
          )}
        </View>
        {dayEvents.length === 0 ? (
          <View className="mt-2"><Button small kind="quiet" label="Add a bill on this day" onPress={() => router.push({ pathname: '/bill', params: { on: picked } })} /></View>
        ) : dayEvents.map((e, i) => (
          <Pressable accessibilityRole="button" key={i} onPress={() => router.push({ pathname: '/bill', params: { id: e.billId } })} className="mt-2 flex-row items-center gap-3">
            <Glyph category={data.bills.find(b => b.id === e.billId)?.category} income={e.type === 'income'} />
            <Text numberOfLines={1} className="flex-1 text-[15px] text-ink">{e.description}</Text>
            <Text className={`font-mono text-[15px] ${e.type === 'income' ? 'text-pos-ink' : 'text-ink'}`}>{e.type === 'income' ? '+' : ''}{money(Math.abs(e.amount))}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  )
}

/** A payment's category as its icon on a tinted tile, as in Transactions and Review. */
function Glyph({ category, income }: { category?: string | null; income: boolean }) {
  const cat = categoryOf(category || (income ? 'income' : 'other'))
  return (
    <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${cat.color ?? colors.ink3}1F` }}>
      <CategoryGlyph cat={cat} size={20} />
    </View>
  )
}

function ListView({ events, catOf, tickable, busyId, onTick }: { events: BillEvent[]; catOf: (billId: string) => string | null; tickable: Set<string>; busyId: string | null; onTick: (id: string) => void }) {
  const groups: { iso: string; items: BillEvent[] }[] = []
  for (const e of events) {
    const last = groups[groups.length - 1]
    if (last && last.iso === e.iso) last.items.push(e)
    else groups.push({ iso: e.iso, items: [e] })
  }
  if (groups.length === 0) {
    return <EmptyState title="A clear month ahead" body="Nothing due in the next 30 days." action={{ label: 'Add a bill or payday', onPress: () => router.push('/bill') }} />
  }
  return (
    <>
      {groups.map(g => (
        <View key={g.iso}>
          <Text className="mb-1.5 text-[13px] font-semibold text-ink-3">{dayLabel(g.iso)}</Text>
          <Card>
            {g.items.map((e, i) => (
              <Pressable accessibilityRole="button" key={`${e.billId}-${i}`} onPress={() => { haptic.tick(); router.push({ pathname: '/bill', params: { id: e.billId } }) }}
                className={`flex-row items-center gap-3 py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
                <Glyph category={catOf(e.billId)} income={e.type === 'income'} />
                <View className="flex-1 pr-3">
                  <Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{e.description}</Text>
                  <Text className="text-[12px] text-ink-3">{e.overdue ? 'Overdue' : e.recurring ? 'Repeats' : 'One-off'}</Text>
                </View>
                <View className="items-end">
                  <Text className={`font-mono text-[15px] ${e.type === 'income' ? 'text-pos-ink' : e.overdue ? 'text-neg-ink' : 'text-ink'}`}>
                    {e.type === 'income' ? '+' : ''}{money(Math.abs(e.amount))}
                  </Text>
                  {tickable.has(`${e.billId}@${e.iso}`) && (
                    <Pressable accessibilityRole="button" hitSlop={8} disabled={busyId === e.billId} onPress={() => { haptic.select(); onTick(e.billId) }}>
                      <Text className="mt-0.5 text-[13px] font-bold text-pos-ink">{busyId === e.billId ? 'Saving…' : e.type === 'income' ? 'Mark received' : 'Mark paid'}</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </>
  )
}
