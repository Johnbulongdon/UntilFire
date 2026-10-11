import { useMemo, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'

import { DetailScreen } from '@/components/DetailScreen'
import { ExploreMap } from '@/components/ExploreMap'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { bestBadge, EXPLORE_CITIES, freedomBadges, freedomIn, MEDAL, type ExploreCity, type ExplorePlan } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useLivePlan } from '@/state/live-plan'
import { colors } from '@/theme/colors'

type Filter = 'all' | 'us' | 'abroad' | 'notax'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Everywhere' }, { key: 'us', label: 'US' }, { key: 'abroad', label: 'Abroad' }, { key: 'notax', label: 'No income tax' },
]

/**
 * The website's Explore (D-58): every city with what it would mean for you.
 * Your savings and monthly saving stay as they are; the target becomes 25×
 * that city's typical yearly cost, scaled by how you spend against your own
 * city's typical cost, so your home city gives your own freedom year.
 */
export default function Explore() {
  const { plan } = useLivePlan()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)

  const explorePlan: ExplorePlan | null = useMemo(() => {
    if (!plan) return null
    const homeCol = plan.city?.col
    const scale = homeCol && homeCol > 0 ? (plan.monthlySpending * 12) / homeCol : 1
    return {
      saved: plan.invested,
      monthlySaving: Math.max(0, plan.monthlyIncome - plan.monthlySpending),
      age: plan.age,
      targetMultiple: 25 * scale,
      monthlyIncome: plan.monthlyIncome,
      monthlySpend: plan.monthlySpending,
    }
  }, [plan])

  const rows = useMemo(() => {
    if (!explorePlan) return []
    const q = query.trim().toLowerCase()
    return EXPLORE_CITIES
      .filter(c => filter === 'all' || (filter === 'us' ? c.us : filter === 'abroad' ? !c.us : c.noIncomeTax))
      .filter(c => !q || `${c.name} ${c.place}`.toLowerCase().includes(q))
      .map(c => ({ c, f: freedomIn(c, explorePlan) }))
      .sort((a, b) => (a.f?.at ?? 9999) - (b.f?.at ?? 9999))
  }, [explorePlan, filter, query])

  if (!plan || !explorePlan) return null
  const pickedRow = rows.find(r => r.c.key === picked) ?? null
  const label = (c: ExploreCity) => { const f = freedomIn(c, explorePlan); return f ? String(Math.floor(f.at)) : '—' }

  return (
    <DetailScreen back="Plan" title="Explore" subtitle="Where your money goes further">
      <View className="flex-row rounded-control bg-surface p-1">
        {(['map', 'list'] as const).map(v => (
          <Pressable accessibilityRole="button" key={v} onPress={() => { haptic.select(); setView(v) }} className={`flex-1 items-center rounded-lg py-2 ${view === v ? 'bg-card' : ''}`}>
            <Text className={`text-[14px] font-semibold ${view === v ? 'text-ink' : 'text-ink-2'}`}>{v === 'map' ? 'Map' : 'List'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map(f => (
          <Pressable accessibilityRole="button" key={f.key} onPress={() => { haptic.select(); setFilter(f.key) }} className={`rounded-full border px-3.5 py-1.5 ${filter === f.key ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
            <Text className={`text-[13px] font-semibold ${filter === f.key ? 'text-green-700' : 'text-ink-2'}`}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {view === 'map' ? (
        <ExploreMap cities={rows.map(r => r.c)} label={label} selected={picked} onPick={c => { haptic.select(); setPicked(c.key) }} />
      ) : (
        <TextInput
          accessibilityLabel="Search cities"
          className="rounded-control border border-border bg-card px-4 py-3 text-[15px] text-ink"
          style={{ fontFamily: 'Manrope_500Medium' }}
          placeholder="Search cities"
          placeholderTextColor={colors.ink3}
          value={query}
          onChangeText={setQuery}
        />
      )}

      {pickedRow && <CityCard city={pickedRow.c} plan={explorePlan} onClose={() => setPicked(null)} />}

      {view === 'list' && (
        <Card>
          {rows.slice(0, 60).map(({ c, f }, i) => (
            <Pressable accessibilityRole="button" key={c.key} onPress={() => { haptic.tick(); setPicked(c.key) }} className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
              <Text className="text-[20px]">{c.flag}</Text>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{c.name}</Text>
                <Text className="text-[12px] text-ink-3">{c.place} · {money(c.monthlyUSD)}/mo</Text>
              </View>
              <Text className="font-display text-[18px] font-bold text-teal">{f ? Math.floor(f.at) : '—'}</Text>
            </Pressable>
          ))}
          {rows.length > 60 && <Text className="pt-2 text-center text-[12px] text-ink-3">Showing the 60 soonest. Search to find others.</Text>}
        </Card>
      )}

      <Text className="text-[12px] leading-5 text-ink-3">
        Your year in each city keeps your savings and monthly saving as they are and prices freedom at that city's typical cost. It isn't a claim your pay would stay the same if you moved.
      </Text>
    </DetailScreen>
  )
}

/** One city: its cost, tax and your freedom there, with the website's badges (D-67). */
function CityCard({ city, plan, onClose }: { city: ExploreCity; plan: ExplorePlan; onClose: () => void }) {
  const f = freedomIn(city, plan)
  const badges = freedomBadges(city, plan)
  const best = bestBadge(badges)
  return (
    <Card>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-[22px]">{city.flag}</Text>
          <Text className="mt-1 font-display text-[22px] font-bold text-ink">{city.name}</Text>
          <Text className="text-[13px] text-ink-3">{city.place}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => { haptic.tick(); onClose() }}><Text className="text-[20px] text-ink-3">×</Text></Pressable>
      </View>
      <View className="mt-3 flex-row">
        <View className="flex-1">
          <Label>Freedom here</Label>
          <Text className="font-display text-[30px] font-bold text-teal">{f ? Math.floor(f.at) : '65+ yrs'}</Text>
          {f?.age != null && <Text className="text-[13px] text-ink-2">at {f.age}</Text>}
        </View>
        <View className="flex-1">
          <Label>Typical cost</Label>
          <Text className="font-mono text-[20px] text-ink">{money(city.monthlyUSD)}</Text>
          <Text className="text-[13px] text-ink-2">a month</Text>
        </View>
      </View>
      {city.tax && (
        <Text className="mt-3 text-[13px] text-ink-2">
          Income tax while working: {city.noIncomeTax && !city.us ? 'none' : city.tax.low === city.tax.high ? `about ${Math.round(city.tax.low)}%` : `${Math.round(city.tax.low)}–${Math.round(city.tax.high)}% on $50k–$150k`}
        </Text>
      )}
      {badges && (
        <View className="mt-3 border-t border-border pt-3">
          <Text className="text-[13px] font-bold text-ink">{best ? `${MEDAL[best.metal]} ${'★'.repeat(best.stars)}` : '🔒 No badge yet'}</Text>
          <Text className="mt-1 text-[12px] leading-5 text-ink-3">
            By 59½: 🥉 keep working full time · 🥈 stop saving now and just cover costs · 🥇 work half time. Stars: living frugally, typically, or well.
          </Text>
          <Text className="mt-1 text-[13px] text-ink-2">🥉 {'★'.repeat(badges.bronze) || '—'}   🥈 {'★'.repeat(badges.silver) || '—'}   🥇 {badges.goldJudged ? '★'.repeat(badges.gold) || '—' : 'n/a'}</Text>
        </View>
      )}
    </Card>
  )
}
