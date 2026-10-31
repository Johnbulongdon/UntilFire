import AsyncStorage from '@react-native-async-storage/async-storage'
import { TAX_ESTIMATES_AVAILABLE } from "@engine/release-gates.ts";

import { Button } from '@/components/Button'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import {
  CITIZENSHIP_ACCOUNT_LABEL, CITIZENSHIP_CGT_LABEL, CITIZENSHIP_SCORES, CITIZENSHIP_TAX_RATE_LABEL,
  citizenshipBand, citizenshipScore, type CitizenshipScore,
} from '@/engine'
import { haptic } from '@/lib/haptics'
import { brand } from '@/theme/colors'

const MINE_KEY = 'untilfire.citizenship'
type SortKey = 'score' | 'tax' | 'retirement' | 'investment' | 'az'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Top' }, { key: 'tax', label: 'Tax' }, { key: 'retirement', label: 'Accounts' }, { key: 'investment', label: 'Invest' }, { key: 'az', label: 'A–Z' },
]
// The website's three parts of the score, out of 100 together.
const PARTS = [
  { key: 'tax', name: 'Tax', max: 40, color: brand.blue },
  { key: 'retirement', name: 'Retirement accounts', max: 30, color: brand.mint },
  { key: 'investment', name: 'Investing', max: 30, color: brand.lilac },
] as const
const BAND_TONE = { strong: 'text-pos-ink', workable: 'text-warn', friction: 'text-neg-ink' } as const

/** The website's Citizenship: how each passport treats FIRE, scored on tax, accounts and investing. */
export default function Citizenship() {
  return TAX_ESTIMATES_AVAILABLE ? <CitizenshipDetails /> : <DetailScreen back="Plan" title="Citizenship"><Card><Text>Passport tax comparisons are unavailable while we test them.</Text></Card></DetailScreen>
}
function CitizenshipDetails() {
  const [mine, setMine] = useState<string>('')
  const [picking, setPicking] = useState(false)
  const [sort, setSort] = useState<SortKey>('score')
  const [open, setOpen] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { AsyncStorage.getItem(MINE_KEY).then(v => { if (v) setMine(v) }).catch(() => {}) }, [])
  const pick = (code: string) => {
    haptic.select(); setMine(code); setPicking(false)
    AsyncStorage.setItem(MINE_KEY, code).catch(() => {})
  }

  const sorted = useMemo(() => {
    const list = [...CITIZENSHIP_SCORES]
    if (sort === 'az') return list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'score') return list.sort((a, b) => citizenshipScore(b) - citizenshipScore(a))
    return list.sort((a, b) => b[sort] - a[sort])
  }, [sort])
  const mineC = CITIZENSHIP_SCORES.find(c => c.code === mine)
  const shown = showAll ? sorted : sorted.slice(0, 8)

  return (
    <DetailScreen back="Plan" title="Citizenship" subtitle="How your passport shapes tax, accounts and investing">
      <Card>
        {mineC && !picking ? (
          <>
            <View className="flex-row items-center justify-between">
              <Label>Your passport</Label>
              <Button small kind="quiet" label="Change" onPress={() => { haptic.tick(); setPicking(true) }} />
            </View>
            <CountryDetail c={mineC} mine={mineC} />
          </>
        ) : (
          <>
            <Label>Which passport do you hold?</Label>
            <Text className="mt-1 text-[14px] leading-5 text-ink-2">It decides how you are taxed abroad, which retirement accounts you can use and where you can invest.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
              {[...CITIZENSHIP_SCORES].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <Pressable accessibilityRole="button" key={c.code} onPress={() => pick(c.code)} className={`rounded-full border px-3 py-1.5 ${mine === c.code ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
                  <Text className="text-[13px] font-semibold text-ink-2">{c.flag} {c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SORTS.map(s => (
          <Pressable accessibilityRole="button" key={s.key} onPress={() => { haptic.select(); setSort(s.key) }} className={`rounded-full border px-3.5 py-1.5 ${sort === s.key ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
            <Text className={`text-[13px] font-semibold ${sort === s.key ? 'text-green-700' : 'text-ink-2'}`}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Card>
        {shown.map((c, i) => {
          const score = citizenshipScore(c)
          const isOpen = open === c.code
          const part = PARTS.find(p => p.key === sort)
          return (
            <View key={c.code} className={i > 0 ? 'border-t border-border' : ''}>
              <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setOpen(isOpen ? null : c.code) }} className="py-3">
                <View className="flex-row items-center gap-3">
                  <Text className="text-[22px]">{c.flag}</Text>
                  <Text className="flex-1 text-[15px] font-semibold text-ink">{c.name}{c.code === mine ? ' · yours' : ''}</Text>
                  <Text className="font-mono text-[15px] text-ink">{part ? `${c[part.key]}/${part.max}` : score}</Text>
                </View>
                <View className="mt-2 h-1.5 flex-row overflow-hidden rounded-full bg-surface-2">
                  {PARTS.map(p => <View key={p.key} style={{ width: `${c[p.key]}%`, backgroundColor: p.color }} />)}
                </View>
              </Pressable>
              {isOpen && <View className="pb-3"><CountryDetail c={c} mine={mineC} /></View>}
            </View>
          )
        })}
        <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setShowAll(v => !v) }} className="items-center border-t border-border pt-3">
          <Text className="text-[14px] font-bold text-pos-ink">{showAll ? 'Show fewer' : `See all ${sorted.length}`}</Text>
        </Pressable>
      </Card>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {PARTS.map(p => (
          <View key={p.key} className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <Text className="text-[12px] text-ink-3">{p.name} (of {p.max})</Text>
          </View>
        ))}
      </View>
      <Text className="text-[12px] leading-5 text-ink-3">Directional, not tax advice: rules change, and your situation matters.</Text>
    </DetailScreen>
  )
}

function CountryDetail({ c, mine }: { c: CitizenshipScore; mine?: CitizenshipScore }) {
  const score = citizenshipScore(c)
  const band = citizenshipBand(score)
  const diff = mine && mine.code !== c.code ? score - citizenshipScore(mine) : null
  return (
    <View className="mt-1">
      <View className="flex-row items-baseline gap-2">
        <Text className="font-display text-[28px] font-bold text-ink">{score}</Text>
        <Text className="text-[13px] text-ink-3">of 100 ·</Text>
        <Text className={`text-[13px] font-bold ${BAND_TONE[band.cls]}`}>{band.label}</Text>
      </View>
      {diff != null && <Text className="text-[13px] text-ink-2">{diff === 0 ? 'The same as yours' : `${Math.abs(diff)} points ${diff > 0 ? 'above' : 'below'} yours`}</Text>}
      <View className="mt-2 gap-1">
        {CITIZENSHIP_TAX_RATE_LABEL[c.code] && <Fact label="Income tax" value={CITIZENSHIP_TAX_RATE_LABEL[c.code]} />}
        {CITIZENSHIP_CGT_LABEL[c.code] && <Fact label="Capital gains" value={CITIZENSHIP_CGT_LABEL[c.code]} />}
        {CITIZENSHIP_ACCOUNT_LABEL[c.code] && <Fact label="Accounts" value={CITIZENSHIP_ACCOUNT_LABEL[c.code]} />}
      </View>
      <Text className="mt-3 text-[13px] font-bold text-pos-ink">Works for you</Text>
      {c.strengths.map((s, i) => <Text key={i} className="mt-1 text-[14px] leading-5 text-ink">+ {s}</Text>)}
      <Text className="mt-3 text-[13px] font-bold text-neg-ink">Watch out for</Text>
      {c.weaknesses.map((s, i) => <Text key={i} className="mt-1 text-[14px] leading-5 text-ink">− {s}</Text>)}
    </View>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-3">
      <Text className="w-24 text-[13px] text-ink-3">{label}</Text>
      <Text className="flex-1 text-[13px] text-ink">{value}</Text>
    </View>
  )
}
