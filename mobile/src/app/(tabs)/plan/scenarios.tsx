import AsyncStorage from '@react-native-async-storage/async-storage'
import { Button } from '@/components/Button'
import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native'

import { DetailScreen } from '@/components/DetailScreen'
import { WhatIfTabs, whatIfSubtitle } from '@/components/WhatIfTabs'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import {
  SIM_INITIAL_SCENARIOS, SIM_TICKER_COLORS, SIM_TICKER_LIBRARY, simCompound, simWeightedRet,
  type SimHolding, type SimScenario,
} from '@/lib/scenarios'
import { colors } from '@/theme/colors'

const KEY = 'untilfire.scenarios.v1'
const RANGES = [{ key: '1Y', years: 1 }, { key: '5Y', years: 5 }, { key: '10Y', years: 10 }] as const
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const clone = (s: SimScenario[]) => s.map(x => ({ ...x, geo: { ...x.geo }, stats: { ...x.stats }, holdings: x.holdings.map(h => ({ ...h })) }))

/** The website's Scenarios (investment simulations): compare mixes of funds side by side, and edit them. */
export default function Scenarios() {
  const [scenarios, setScenarios] = useState<SimScenario[]>(() => clone(SIM_INITIAL_SCENARIOS))
  const [selected, setSelected] = useState(1)
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[0])
  const [editing, setEditing] = useState(false)

  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { if (raw) setScenarios(JSON.parse(raw)) }).catch(() => {}) }, [])
  const save = (next: SimScenario[]) => { setScenarios(next); AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {}) }

  const base = scenarios[0]
  const sel = scenarios[selected] ?? base
  const baseRet = simCompound(simWeightedRet(base.holdings), range.years)
  const selRet = simCompound(simWeightedRet(sel.holdings), range.years)
  const benchRet = simCompound(24.2, range.years)
  const peak = Math.max(Math.abs(baseRet), Math.abs(selRet), Math.abs(benchRet), 1)

  const newScenario = () => {
    haptic.press()
    const n = scenarios.length
    save([...scenarios, { name: `New scenario ${n}`, risk: 'Custom mix', geo: { ...base.geo }, stats: { vol: '—', sharpe: '—', dd: '—', beta: '—' }, holdings: base.holdings.map(h => ({ ...h })) }])
    setSelected(n); setEditing(true)
  }
  const remove = (i: number) => {
    if (scenarios.length <= 1) return
    haptic.warn()
    Alert.alert(`Remove ${scenarios[i].name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { save(scenarios.filter((_, k) => k !== i)); setSelected(s => Math.max(0, Math.min(s, scenarios.length - 2))) } },
    ])
  }

  return (
    <DetailScreen back="Plan" title="What if" subtitle={whatIfSubtitle('scenarios')}>
      <WhatIfTabs current="scenarios" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {scenarios.map((s, i) => (
          <Pressable accessibilityRole="button" key={i} onPress={() => { haptic.select(); setSelected(i); setEditing(false) }} onLongPress={() => remove(i)}
            className={`w-44 rounded-card border-2 bg-card p-3.5 ${i === selected ? 'border-green' : 'border-border'}`}>
            {i === 0 && <Text className="text-[10px] font-bold uppercase tracking-wider text-green-700">Your plan</Text>}
            <Text numberOfLines={1} className="text-[15px] font-bold text-ink">{s.name}</Text>
            <Text className="text-[12px] text-ink-3">{s.risk}</Text>
            <View className="mt-2 h-1.5 flex-row overflow-hidden rounded-full bg-surface-2">
              {s.holdings.map((h, k) => <View key={k} style={{ flex: h.pct || 0.0001, backgroundColor: h.color }} />)}
            </View>
            <Text className="mt-2 font-mono text-[14px] text-ink">{pct(simWeightedRet(s.holdings))} <Text className="text-[11px] text-ink-3">1Y</Text></Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="New scenario" onPress={newScenario} className="w-28 items-center justify-center rounded-card border-2 border-dashed border-border-2 p-3.5">
          <Text className="text-[24px] text-pos-ink">+</Text>
          <Text className="text-[13px] font-semibold text-pos-ink">New</Text>
        </Pressable>
      </ScrollView>
      <Text className="-mt-2 text-[12px] text-ink-3">Long-press a scenario to remove it.</Text>

      <Card>
        <View className="flex-row items-center justify-between">
          <Label>Growth over {range.key === '1Y' ? 'a year' : range.key === '5Y' ? '5 years' : '10 years'}</Label>
          <View className="flex-row rounded-full bg-surface-2 p-0.5">
            {RANGES.map(r => (
              <Pressable accessibilityRole="button" key={r.key} onPress={() => { haptic.select(); setRange(r) }} className={`rounded-full px-3 py-1 ${range.key === r.key ? 'bg-card' : ''}`}>
                <Text className={`text-[12px] font-bold ${range.key === r.key ? 'text-ink' : 'text-ink-3'}`}>{r.key}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {[
          { name: sel.name, ret: selRet, color: colors.green },
          ...(selected === 0 ? [] : [{ name: base.name, ret: baseRet, color: colors.ink3 }]),
          { name: 'S&P 500', ret: benchRet, color: colors.border2 },
        ].map(row => (
          <View key={row.name} className="mt-3">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-ink">{row.name}</Text>
              <Text className="font-mono text-[14px] text-ink">{pct(row.ret)}</Text>
            </View>
            <View className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <View className="h-full rounded-full" style={{ width: `${Math.max(2, (Math.abs(row.ret) / peak) * 100)}%`, backgroundColor: row.color }} />
            </View>
          </View>
        ))}
        <Text className="mt-3 text-[12px] leading-5 text-ink-3">Each fund's last-year return, compounded. An illustration, not a forecast: past returns don't repeat on schedule.</Text>
      </Card>

      <Card>
        <View className="flex-row items-center justify-between">
          <Label>{sel.name}</Label>
          <Button small kind="quiet" label={editing ? 'Done' : 'Edit holdings'} onPress={() => { haptic.tick(); setEditing(e => !e) }} />
        </View>
        {editing ? (
          <HoldingsEditor scenario={sel} onChange={next => save(scenarios.map((s, i) => (i === selected ? next : s)))} />
        ) : (
          <>
            {sel.holdings.map((h, i) => (
              <View key={i} className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: h.color }} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">{h.ticker}</Text>
                  <Text numberOfLines={1} className="text-[12px] text-ink-3">{h.name}</Text>
                </View>
                <Text className="font-mono text-[14px] text-ink">{h.pct}%</Text>
                <Text className="w-16 text-right font-mono text-[13px] text-ink-2">{pct(h.ret)}</Text>
              </View>
            ))}
            <View className="mt-3 flex-row border-t border-border pt-3">
              {[['Volatility', sel.stats.vol], ['Sharpe', sel.stats.sharpe], ['Max fall', sel.stats.dd], ['Beta', sel.stats.beta]].map(([l, v]) => (
                <View key={l} className="flex-1">
                  <Text className="text-[11px] text-ink-3">{l}</Text>
                  <Text className="font-mono text-[14px] text-ink">{v}</Text>
                </View>
              ))}
            </View>
            <Text className="mb-1 mt-4 text-[13px] text-ink-3">Where it's invested</Text>
            {([['North America', sel.geo.na], ['Europe', sel.geo.eu], ['Asia-Pacific', sel.geo.ap], ['Emerging markets', sel.geo.em]] as const).map(([l, v]) => (
              <View key={l} className="mt-1.5 flex-row items-center gap-3">
                <Text className="w-32 text-[13px] text-ink">{l}</Text>
                <View className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><View className="h-full rounded-full bg-teal" style={{ width: `${v}%` }} /></View>
                <Text className="w-10 text-right font-mono text-[12px] text-ink-2">{v}%</Text>
              </View>
            ))}
          </>
        )}
      </Card>
    </DetailScreen>
  )
}

/** Change each holding's share, remove one, or add a fund by ticker (the website's edit-holdings modal). */
function HoldingsEditor({ scenario, onChange }: { scenario: SimScenario; onChange: (s: SimScenario) => void }) {
  const [ticker, setTicker] = useState('')
  const total = scenario.holdings.reduce((s, h) => s + (h.pct || 0), 0)
  const set = (holdings: SimHolding[]) => onChange({ ...scenario, holdings })
  const nudge = (i: number, d: number) => { haptic.tick(); set(scenario.holdings.map((h, k) => (k === i ? { ...h, pct: Math.max(0, Math.min(100, h.pct + d)) } : h))) }
  const add = (t: string) => {
    const sym = t.trim().toUpperCase().slice(0, 5)
    if (!sym) return
    const known = SIM_TICKER_LIBRARY[sym]
    const used = new Set(scenario.holdings.map(h => h.color))
    const color = known?.color && !used.has(known.color) ? known.color : SIM_TICKER_COLORS.find(c => !used.has(c)) ?? SIM_TICKER_COLORS[0]
    haptic.select()
    set([...scenario.holdings, { ticker: sym, name: known?.name ?? 'New holding', pct: 0, ret: known?.ret ?? 10, color }])
    setTicker('')
  }
  return (
    <View>
      <TextInput
        className="mt-2 rounded-control border border-border bg-surface px-3 py-2 text-[15px] text-ink"
        style={{ fontFamily: 'Manrope_600SemiBold' }}
        value={scenario.name}
        onChangeText={name => onChange({ ...scenario, name })}
      />
      {scenario.holdings.map((h, i) => (
        <View key={i} className="flex-row items-center gap-2 border-b border-border py-2.5">
          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: h.color }} />
          <Text className="flex-1 text-[15px] font-semibold text-ink">{h.ticker}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease share" hitSlop={6} onPress={() => nudge(i, -5)} className="h-8 w-8 items-center justify-center rounded-full bg-surface"><Text className="text-[18px] text-ink">−</Text></Pressable>
          <Text className="w-12 text-center font-mono text-[15px] text-ink">{h.pct}%</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase share" hitSlop={6} onPress={() => nudge(i, 5)} className="h-8 w-8 items-center justify-center rounded-full bg-surface"><Text className="text-[18px] text-ink">+</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove holding" hitSlop={6} onPress={() => { haptic.tick(); set(scenario.holdings.filter((_, k) => k !== i)) }}><Text className="ml-1 text-[16px] text-neg-ink">×</Text></Pressable>
        </View>
      ))}
      <Text className={`mt-2 text-[13px] ${total === 100 ? 'text-pos-ink' : 'text-warn'}`}>Total {total}%{total === 100 ? '' : ' (aim for 100%)'}</Text>
      <View className="mt-3 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-control border border-border bg-card px-3 py-2 text-[15px] text-ink"
          style={{ fontFamily: 'DMMono_500Medium' }}
          placeholder="Ticker, e.g. VTI"
          placeholderTextColor={colors.ink3}
          autoCapitalize="characters"
          value={ticker}
          onChangeText={setTicker}
          onSubmitEditing={() => add(ticker)}
        />
        <Pressable accessibilityRole="button" onPress={() => add(ticker)} className="justify-center rounded-control bg-green px-4"><Text className="text-[14px] font-bold text-white">Add</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
        {Object.keys(SIM_TICKER_LIBRARY).filter(t => !scenario.holdings.some(h => h.ticker === t)).map(t => (
          <Pressable accessibilityRole="button" key={t} onPress={() => add(t)} className="rounded-full border border-border bg-card px-3 py-1">
            <Text className="font-mono text-[12px] text-ink-2">{t}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
