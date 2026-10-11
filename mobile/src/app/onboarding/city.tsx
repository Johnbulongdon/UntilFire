import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { TextInput, View } from 'react-native'
import { Text } from '@/components/Text'

import { OptionCard } from '@/components/OptionCard'
import { QuestionScreen } from '@/components/QuestionScreen'
import { CITIES, type City as CityRow } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { usePlan } from '@/state/plan'
import { colors } from '@/theme/colors'

// Same guesses and picks as the website's CityScreen. The guess uses only the
// phone's time zone; nothing leaves the device.
const ZONE: Record<string, string> = {
  'America/Chicago': 'Chicago, IL',
  'America/New_York': 'New York City, NY',
  'America/Los_Angeles': 'Los Angeles, CA',
  'Europe/London': 'London, UK',
  'Asia/Singapore': 'Singapore',
  'Australia/Sydney': 'Sydney, Australia',
  'America/Toronto': 'Toronto, Canada',
}
const POPULAR = ['Austin, TX', 'New York City, NY', 'London, UK', 'Singapore']

function nearYou(): string | undefined {
  try { return ZONE[Intl.DateTimeFormat().resolvedOptions().timeZone] } catch { return undefined }
}

export default function City() {
  const { draft, setDraft } = usePlan()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(draft.city?.name)

  const q = query.trim().toLowerCase()
  const rows = useMemo(() => {
    if (q) return CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6)
    const near = nearYou()
    const names = [...(near ? [near] : []), ...POPULAR.filter(n => n !== near)]
    return names.map(n => CITIES.find(c => c.name === n)).filter((c): c is CityRow => !!c)
  }, [q])

  const pick = (c: CityRow) => {
    haptic.select()
    setPicked(c.name)
    setDraft({ city: { name: c.name, col: c.col } })
    setTimeout(() => router.push('/onboarding/income'), 320)
  }

  return (
    <QuestionScreen
      step={2}
      steps={6}
      title="Where do you live?"
      hint="Living costs shape your target. We'll suggest numbers that fit."
      skipLabel="Skip, I'll use my own numbers"
      onSkip={() => { setDraft({ city: undefined }); router.push('/onboarding/income') }}
    >
      <TextInput
        accessibilityLabel="Search cities"
        className="mb-4 rounded-2xl border-2 border-border bg-card px-4 py-3.5 text-[17px] text-ink"
        placeholder="Search 390+ cities"
        placeholderTextColor={colors.ink3}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      {!q && <Text className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-ink-2">Suggested</Text>}
      <View className="gap-3">
        {rows.map(c => (
          <OptionCard
            key={c.key}
            emoji={c.flag}
            title={c.name}
            detail={`Living costs about ${money(c.col / 12)} a month`}
            selected={picked === c.name}
            onPress={() => pick(c)}
          />
        ))}
        {!!q && rows.length === 0 && (
          <Text className="py-4 text-center text-[15px] text-ink-2">No match. Try a nearby city, or skip.</Text>
        )}
      </View>
    </QuestionScreen>
  )
}
