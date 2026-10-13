import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'

import { CITY_COORDS, Globe } from '@/components/Globe'
import { RevealFrame } from '@/components/RevealFrame'
import { Text } from '@/components/Text'
import { CITIES, EXPLORE_CITIES, freedomIn } from '@/engine'
import { freedomFor, planFromDraft, usePlan } from '@/state/plan'

// The website's expat-FIRE cities (app/HomeClient.tsx EXPAT_KEYS): places people actually move to.
const EXPAT_KEYS = ['lisbon', 'mexicocity', 'chiangmai', 'medellin', 'bali', 'porto', 'valencia', 'budapest', 'bangkok', 'kualalumpur']

/**
 * Reveal 5 of 5 (the website's expat-FIRE globe): cities where the same money
 * would make you free sooner. The globe visits each in turn. "Sooner" keeps
 * your savings and monthly saving and swaps the target for that city's cost of
 * living (lib/explore); it isn't a claim your pay would stay the same.
 */
export default function Abroad() {
  const { draft } = usePlan()
  const { width } = useWindowDimensions()
  const plan = useMemo(() => planFromDraft(draft), [draft])
  const result = useMemo(() => freedomFor(plan), [plan])
  const best = useMemo(() => {
    const monthlySaving = Math.max(0, plan.monthlyIncome - plan.monthlySpending)
    const home = CITIES.find(c => c.name === plan.city?.name)
    // Scale each city's target by how you spend against your own city, as Explore does (D-58).
    const multiple = home ? 25 * Math.min(3, Math.max(0.3, (plan.monthlySpending * 12) / home.col)) : 25
    return EXPLORE_CITIES
      .filter(c => EXPAT_KEYS.includes(c.key) && c.key !== home?.key)
      .map(c => ({ c, f: freedomIn(c, { saved: plan.invested, monthlySaving, age: plan.age, targetMultiple: multiple }) }))
      .filter((x): x is { c: typeof x.c; f: NonNullable<typeof x.f> } => !!x.f)
      .filter(x => result.years == null || x.f.years < result.years)
      .sort((a, b) => a.f.years - b.f.years)
      .slice(0, 3)
  }, [plan])
  const [at, setAt] = useState(0)
  useEffect(() => {
    if (best.length < 2) return
    const id = setInterval(() => setAt(i => (i + 1) % best.length), 2600)
    return () => clearInterval(id)
  }, [best.length])
  const now = best[at]
  const homeYears = result.years
  const sooner = now && homeYears != null ? Math.max(0, Math.round(homeYears - now.f.years)) : null

  return (
    <RevealFrame eyebrow="Free sooner abroad" next="Continue" onNext={() => router.push('/onboarding/reminder')}>
      <View className="items-center">
        <Globe size={Math.min(width - 48, 320)} focus={now ? CITY_COORDS[now.c.key] ?? null : null}
          colors={{ sea: 'rgba(255,255,255,0.08)', land: 'rgba(98,250,227,0.55)', line: 'rgba(255,255,255,0.08)', edge: 'rgba(255,255,255,0.2)', pin: '#F2A65A' }} />
      </View>
      {now ? (
        <View className="mt-6 items-center">
          <Text className="font-display text-[30px] font-bold text-white">{now.c.flag} {now.c.name}</Text>
          <Text className="mt-1 text-center text-[18px] text-mint">
            Free in {Math.floor(now.f.at)}{sooner ? <>, <Text className="font-bold text-aqua">{sooner} {sooner === 1 ? 'year' : 'years'} sooner</Text></> : ''}
          </Text>
          <Text className="mt-4 text-center text-[13px] leading-5 text-mint/70">Same savings, the local cost of living. Explore every city in Plan.</Text>
        </View>
      ) : (
        <Text className="mt-6 text-center text-[18px] text-mint">Explore cities around the world in Plan.</Text>
      )}
    </RevealFrame>
  )
}
