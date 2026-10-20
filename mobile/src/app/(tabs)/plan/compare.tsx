import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import {
  changeSummary, newChange, pensionFor, resolveAndRun, TEMPLATES, templateFor, toEngine,
  type ChangeContext, type ChangeKind, type EngineChange, type LifeChangeItem, type LifeVersion,
} from '@/engine'
import { currencySymbol, fromInput, toInput } from '@/lib/display-currency'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { saveComparisons } from '@/lib/mutations'
import { calcProjection, exactFreedomDateFrom } from '@/lib/projection'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { useFreedom } from '@/state/freedom'
import { useLivePlan } from '@/state/live-plan'
import { colors } from '@/theme/colors'

const YEAR_MS = 365.25 * 864e5
type Inputs = Parameters<typeof calcProjection>[0]
type Run = { cash?: number[]; cashGrowthRate?: number; fireYear: number | null; invested: number[]; target: number; date: Date | null; broke: unknown }

/**
 * Plan → Compare (D-69), as on the website's What if…: try life changes on top
 * of your plan, in your own numbers, on the same engine as your freedom date.
 * Your plan stays as it is; versions you save show on the website too.
 */
export default function Compare() {
  const { plan } = useLivePlan()
  const f = useFreedom()
  const { data, refresh } = useAccount()
  const { session } = useAuth()
  const [items, setItems] = useState<LifeChangeItem[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [loaded, setLoaded] = useState<string | null>(null)
  const saved = data?.profile.comparisons ?? []

  // Signed in, the account's full inputs; otherwise the onboarding answers.
  const inputs: Inputs | null = useMemo(() => {
    if (f?.source === 'account' && f.inputs) return f.inputs
    if (!plan) return null
    return { annualIncome: plan.monthlyIncome * 12, monthlyExpenses: plan.monthlySpending, k401: 0, rothIRA: 0, taxable: plan.invested,
      totalDebt: 0, mortgageBalance: 0, mortgageMonthly: 0, currentAge: plan.age ?? undefined }
  }, [f, plan])

  const ctx: ChangeContext | null = useMemo(() => inputs && {
    thisYear: new Date().getFullYear(),
    currentAge: inputs.currentAge ?? 0,
    takeHomeMonthly: inputs.annualIncome / 12,
    spendMonthly: inputs.monthlyExpenses,
  }, [inputs])
  const growth = inputs?.growthRate ?? 0.05
  const retireAge = (inputs as { accessAge?: number } | null)?.accessAge || pensionFor(data?.currency ?? 'USD', true).age || 60

  const cache = useMemo(() => new Map<string, Run>(), [inputs])
  const run = useCallback((changes: EngineChange[]): Run => {
    const k = JSON.stringify(changes)
    let r = cache.get(k)
    if (!r && inputs) {
      const p = calcProjection({ ...inputs, changes: [...(inputs.changes ?? []), ...changes] }) // keeps an earlier move (D-82)
      r = { fireYear: p.fireYear, invested: p.data.map(d => d['Investable'] ?? 0), target: p.fireTarget, cash: p.data.map(d => d["Cash"] ?? 0), cashGrowthRate: p.cashGrowthRate, date: exactFreedomDateFrom(p.data, p.fireYear, p.fireTarget), broke: p.broke }
      cache.set(k, r)
    }
    return r!
  }, [cache, inputs])

  const solve = useCallback((list: LifeChangeItem[]) => {
    const rctx = { ...ctx!, growth, retireAge }
    const s = resolveAndRun(list, rctx, run)
    return { items: s.items, out: run(s.items.flatMap(c => toEngine(c, ctx!))) }
  }, [ctx, growth, retireAge, run])

  if (!inputs || !ctx) return null

  const yearsTo = (d: Date | null) => (d ? (d.getTime() - Date.now()) / YEAR_MS : null)
  const base = run([])
  const next = solve(items)
  const by = yearsTo(base.date), ny = yearsTo(next.out.date)
  const delta = by != null && ny != null ? ny - by : null
  const changed = items.some(c => c.on)
  // Signed out, Home shows the quick estimate; results move from that date so the two agree.
  const shift = f?.source !== 'account' && f?.years != null && by != null ? f.years - by : 0
  const yearOf = (years: number) => new Date(Date.now() + (years + shift) * YEAR_MS).getFullYear()
  // The same rounding Home uses for each source (state/freedom.ts).
  const ageOf = f?.source === 'account' ? Math.round : Math.floor
  const label = (years: number | null) => years == null ? 'Not free yet'
    : ctx.currentAge > 0 ? `Free at ${ageOf(ctx.currentAge + years + shift)}` : `Free in ${yearOf(years)}`
  const costOf = (id: string) => {
    const without = solve(items.map(x => (x.id === id ? { ...x, on: false } : x))).out
    const a = yearsTo(next.out.date), b = yearsTo(without.date)
    return a != null && b != null ? a - b : null
  }

  const update = (id: string, patch: Partial<LifeChangeItem>) => setItems(list => list.map(c => (c.id === id ? { ...c, ...patch } : c)))
  const add = (kind: ChangeKind) => {
    haptic.select()
    const c = newChange(kind, ctx)
    setItems(list => [...list, c]); setOpen(c.id); setPicking(false)
  }
  const remove = (id: string) => { haptic.tick(); setItems(list => list.filter(c => c.id !== id)); if (open === id) setOpen(null) }

  const saveVersion = () => {
    if (!session) return
    Alert.prompt?.('Save these changes', 'Give this version a name.', async name => {
      const v: LifeVersion = { id: loaded ?? `v${Date.now().toString(36)}`, name: name?.trim() || items.filter(c => c.on).map(c => c.name).join(' + '), changes: items, savedAt: Date.now() }
      const problem = await saveComparisons(session.user.id, [...saved.filter(x => x.id !== v.id), v])
      if (problem) { haptic.warn(); Alert.alert(problem); return }
      haptic.success(); setLoaded(v.id); refresh()
    }, 'plain-text', saved.find(x => x.id === loaded)?.name ?? '')
  }
  const deleteVersion = (v: LifeVersion) => {
    if (!session) return
    haptic.warn()
    Alert.alert(`Delete "${v.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await saveComparisons(session.user.id, saved.filter(x => x.id !== v.id))
        if (loaded === v.id) setLoaded(null)
        refresh()
      } },
    ])
  }

  return (
    <DetailScreen back="Plan" title="Compare" subtitle="Try life changes on your plan">
      {saved.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {saved.map(v => (
            <Pressable key={v.id} accessibilityRole="button" accessibilityHint="Long press to delete"
              onPress={() => { haptic.select(); setItems(v.changes); setLoaded(v.id); setOpen(null) }} onLongPress={() => deleteVersion(v)}
              className={`rounded-full border px-3.5 py-1.5 ${loaded === v.id ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
              <Text className="text-[13px] font-semibold text-ink">{v.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Card>
        <Label>{changed ? 'With these changes' : 'Your plan'}</Label>
        <View className="flex-row flex-wrap items-baseline gap-2.5">
          <Text className="font-display text-[38px] font-bold leading-[44px] text-teal-deep">{label(ny)}</Text>
          {changed && delta != null && Math.abs(delta) >= 0.05 && (
            <View className={`rounded-full px-2.5 py-0.5 ${delta > 0 ? 'bg-warn-bg' : 'bg-teal-soft'}`}>
              <Text className={`text-[13px] font-extrabold ${delta > 0 ? 'text-warn' : 'text-teal-deep'}`}>{delta > 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)} yrs</Text>
            </View>
          )}
        </View>
        <Text className="mt-1 text-[13px] leading-5 text-ink-2">
          {changed && by != null ? `Your plan: ${label(by)} · ${yearOf(by)}. ` : ''}
          {next.out.broke ? 'At some point these changes spend more than you can reach.' : changed ? 'Your plan stays as it is; this is only a try.' : 'Add a change below to see what it does.'}
        </Text>
      </Card>

      {items.map(c => {
        const cost = c.on ? costOf(c.id) : null
        const isOpen = open === c.id
        return (
          <Animated.View key={c.id} layout={LinearTransition.duration(200)} entering={FadeIn} exiting={FadeOut}>
            <Card>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => { haptic.tick(); setOpen(isOpen ? null : c.id) }} className="flex-row items-center gap-3">
                <Text className="text-[24px]">{templateFor(c.kind).icon}</Text>
                <View className="flex-1">
                  <Text className={`text-[16px] font-semibold ${c.on ? 'text-ink' : 'text-ink-3'}`}>{c.name}</Text>
                  <Text className="text-[12px] text-ink-3" numberOfLines={2}>{changeSummary(c, ctx, money)}</Text>
                </View>
                {cost != null && Math.abs(cost) >= 0.05 && (
                  <Text className={`font-mono text-[13px] ${cost > 0 ? 'text-warn' : 'text-teal-deep'}`}>{cost > 0 ? '+' : '−'}{Math.abs(cost).toFixed(1)}y</Text>
                )}
                <Switch accessibilityLabel={`Count ${c.name}`} value={c.on} onValueChange={on => { haptic.select(); update(c.id, { on }) }}
                  trackColor={{ true: colors.green, false: colors.border2 }} />
              </Pressable>
              {isOpen && <Editor c={c} ctx={ctx} onChange={patch => update(c.id, patch)} onRemove={() => remove(c.id)} />}
            </Card>
          </Animated.View>
        )
      })}

      {picking ? (
        <Card>
          <Label>Add a change</Label>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <Pressable key={t.kind} accessibilityRole="button" accessibilityHint={t.hint} onPress={() => add(t.kind)}
                className="w-[48%] rounded-2xl border border-border bg-surface p-3 active:opacity-70">
                <Text className="text-[22px]">{t.icon}</Text>
                <Text className="mt-1 text-[14px] font-semibold text-ink">{t.title}</Text>
                <Text className="text-[12px] text-ink-3">{t.hint}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setPicking(true) }}
          className="items-center rounded-card border-2 border-dashed border-border-2 py-4 active:opacity-70">
          <Text className="text-[15px] font-bold text-pos-ink">+ Add a change</Text>
        </Pressable>
      )}

      {changed && session && (
        <Button kind="quiet" label={loaded ? 'Save changes to this version' : 'Save this version'} onPress={saveVersion} />
      )}
      {changed && (
        <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setItems([]); setLoaded(null); setOpen(null) }} className="items-center pb-2">
          <Text className="text-[14px] text-ink-2">Clear changes</Text>
        </Pressable>
      )}
    </DetailScreen>
  )
}

/** The fields a change has, by kind: years, and the one or two amounts it's about. */
function Editor({ c, ctx, onChange, onRemove }: { c: LifeChangeItem; ctx: ChangeContext; onChange: (p: Partial<LifeChangeItem>) => void; onRemove: () => void }) {
  const lasting = !['cost', 'windfall', 'home', 'break'].includes(c.kind)
  const monthlyLabel: Partial<Record<ChangeKind, string>> = { 'work-less': 'New take-home a month', home: 'Extra cost a month', side: 'Side income a month', move: 'New spending a month', custom: 'A month (minus for a cost)' }
  const amountLabel: Partial<Record<ChangeKind, string>> = { college: 'Cost a year, per child', home: 'Down payment', cost: 'One-off cost', windfall: 'Windfall' }
  return (
    <View className="mt-3 gap-3 border-t border-border pt-3">
      <Field label="Name"><TextInput accessibilityLabel="Name" value={c.name} onChangeText={name => onChange({ name })}
        className="flex-1 text-right text-[15px] text-ink" style={{ fontFamily: 'Manrope_600SemiBold' }} /></Field>
      <YearStepper label={lasting ? 'From' : 'When'} value={c.from} min={ctx.thisYear} onChange={y => { if (y == null) return; onChange({ from: y, fromAt: undefined, to: c.to != null && c.to <= y ? y + 1 : c.to }) }} />
      {lasting && (
        <YearStepper label="Until" value={c.to ?? null} min={c.from + 1} onChange={to => onChange({ to: to ?? undefined, toAt: undefined })} allowForever />
      )}
      {monthlyLabel[c.kind] && <Money label={monthlyLabel[c.kind]!} value={c.monthly ?? 0} signed={c.kind === 'custom'} onChange={monthly => onChange({ monthly })} />}
      {amountLabel[c.kind] && <Money label={amountLabel[c.kind]!} value={c.amount ?? 0} onChange={amount => onChange({ amount })} />}
      {(c.kind === 'college' || c.kind === 'break') && (
        <Count label={c.kind === 'college' ? 'Children' : 'Months off'} value={c.count ?? (c.kind === 'break' ? 12 : 1)} step={c.kind === 'break' ? 3 : 1} onChange={count => onChange({ count })} />
      )}
      {c.kind === 'work-less' && (
        <Field label="Pension contributions">
          <View className="flex-row rounded-lg bg-surface p-0.5">
            {(['same', 'stop'] as const).map(p => (
              <Pressable key={p} accessibilityRole="button" accessibilityState={{ selected: (c.pension ?? 'same') === p }} onPress={() => { haptic.select(); onChange({ pension: p }) }}
                className={`rounded-md px-3 py-1 ${(c.pension ?? 'same') === p ? 'bg-card' : ''}`}>
                <Text className="text-[13px] font-semibold text-ink">{p === 'same' ? 'Follow pay' : 'Stop'}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
      )}
      <Pressable accessibilityRole="button" onPress={onRemove} className="self-start py-1"><Text className="text-[14px] font-semibold text-neg-ink">Remove</Text></Pressable>
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 text-[14px] text-ink-2">{label}</Text>
      {children}
    </View>
  )
}

function YearStepper({ label, value, min, onChange, allowForever }: { label: string; value: number | null; min: number; onChange: (y: number | null) => void; allowForever?: boolean }) {
  const shown = value == null ? 'For good' : String(value)
  const step = (d: number) => {
    haptic.tick()
    if (value == null) { if (d < 0) return; onChange(min); return }
    const n = value + d
    if (n < min) { if (allowForever) onChange(null); return }
    onChange(n)
  }
  return (
    <Field label={label}>
      <View className="flex-row items-center gap-1">
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} earlier`} hitSlop={6} onPress={() => step(-1)} className="h-8 w-8 items-center justify-center rounded-full bg-surface"><Text className="text-[18px] text-ink">−</Text></Pressable>
        <Text className="w-20 text-center font-mono text-[15px] text-ink">{shown}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} later`} hitSlop={6} onPress={() => step(1)} className="h-8 w-8 items-center justify-center rounded-full bg-surface"><Text className="text-[18px] text-ink">+</Text></Pressable>
      </View>
    </Field>
  )
}

function Money({ label, value, onChange, signed }: { label: string; value: number; onChange: (usd: number) => void; signed?: boolean }) {
  const [text, setText] = useState(value < 0 ? `-${toInput(-value)}` : toInput(value))
  return (
    <Field label={label}>
      <View className="w-36 flex-row items-center rounded-control border border-border-2 bg-card px-3 py-1.5">
        <Text className="font-mono text-[15px] text-ink-3">{currencySymbol().trim()}</Text>
        <TextInput accessibilityLabel={label} value={text} keyboardType={signed ? 'numbers-and-punctuation' : 'decimal-pad'}
          onChangeText={t => { setText(t); const neg = signed && t.trim().startsWith('-'); const usd = fromInput(t.replace('-', '')); onChange(neg ? -usd : usd) }}
          className="text-right font-mono text-[15px] text-ink" style={{ flex: 1, minWidth: 0, fontFamily: "DMMono_400Regular" }} />
      </View>
    </Field>
  )
}

function Count({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <View className="flex-row items-center gap-1">
        <Pressable accessibilityRole="button" accessibilityLabel={`Fewer ${label.toLowerCase()}`} hitSlop={6} onPress={() => { haptic.tick(); onChange(Math.max(1, value - step)) }} className="h-8 w-8 items-center justify-center rounded-full bg-surface"><Text className="text-[18px] text-ink">−</Text></Pressable>
        <Text className="w-12 text-center font-mono text-[15px] text-ink">{value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`More ${label.toLowerCase()}`} hitSlop={6} onPress={() => { haptic.tick(); onChange(value + step) }} className="h-8 w-8 items-center justify-center rounded-full bg-surface"><Text className="text-[18px] text-ink">+</Text></Pressable>
      </View>
    </Field>
  )
}
