import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, Pressable, TextInput, useWindowDimensions, View } from 'react-native'

import { Button } from '@/components/Button'
import { CITY_COORDS, Globe } from '@/components/Globe'
import { QuestionScreen } from '@/components/QuestionScreen'
import { Text } from '@/components/Text'
import { CITIES, type City as CityRow } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { currencyForState } from '@/lib/onboarding-currency'
import { usePlan } from '@/state/plan'
import { colors, TAB_COLOR } from '@/theme/colors'

/**
 * Where do you live? (V2): a globe that turns while you type and flies to the
 * city you pick, with its flag. No suggested list; search covers 390+ cities.
 */
export default function City() {
  const { draft, setDraft } = usePlan()
  const { width } = useWindowDimensions()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<CityRow | undefined>(() => CITIES.find(c => c.name === draft.city?.name))
  const q = query.trim().toLowerCase()
  const rows = useMemo(() => (q ? CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5) : []), [q])
  const focus = picked ? CITY_COORDS[picked.key] ?? null : null
  // Every city as a dot on the globe; spinning one to the middle offers it, tapping a dot picks it.
  const dots = useMemo(() => CITIES.filter(c => CITY_COORDS[c.key]).map(c => ({ key: c.key, ...CITY_COORDS[c.key] })), [])
  const [centered, setCentered] = useState<string | null>(null)
  const offer = centered && centered !== picked?.key ? CITIES.find(c => c.key === centered) : undefined

  const pick = (c: CityRow) => {
    haptic.select()
    Keyboard.dismiss()
    setPicked(c)
    setQuery('')
    // Guess the currency from the city, as the website does.
    setDraft({ city: { name: c.name, col: c.col }, currency: currencyForState((c as { state?: string }).state) })
  }

  return (
    <QuestionScreen
      step={2}
      steps={8}
      title="Where do you live?"
      hint="Search, or spin the globe and tap your city."
      noScroll
      cta="Continue"
      canContinue={!!picked}
      onNext={() => router.push('/onboarding/pay')}
      skipLabel="Skip"
      onSkip={() => { setDraft({ city: undefined }); router.push('/onboarding/pay') }}
    >
      <TextInput
        accessibilityLabel="Search cities"
        className="rounded-2xl border-2 border-border bg-card px-4 py-3.5 text-[17px] text-ink"
        placeholder="Search 390+ cities"
        placeholderTextColor={colors.ink3}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      {rows.length > 0 ? (
        <View className="mt-2 overflow-hidden rounded-2xl bg-card">
          {rows.map((c, i) => (
            <Pressable key={c.key} accessibilityRole="button" onPress={() => pick(c)}
              className={`flex-row items-center gap-3 px-4 py-3 active:bg-surface ${i ? 'border-t border-border' : ''}`}>
              <Text className="text-[24px]">{c.flag}</Text>
              <Text className="flex-1 text-[16px] font-semibold text-ink">{c.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="mt-4 items-center">
          <Globe size={Math.min(width - 48, 340)} focus={focus} cities={dots}
            onCenter={setCentered} onTap={key => { const c = CITIES.find(x => x.key === key); if (c) pick(c) }}
            colors={{ sea: colors.surface, land: TAB_COLOR.home, line: colors.border, edge: colors.border2, pin: brandPin, dot: '#FFFFFF' }} />
          {offer ? (
            <View className="mt-4 items-center gap-2">
              <Text className="text-[20px] font-bold text-ink">{offer.flag} {offer.name}</Text>
              <Button small label="Choose this city" onPress={() => pick(offer)} />
            </View>
          ) : picked ? (
            <View className="mt-4 items-center">
              <Text className="text-[22px] font-bold text-ink">{picked.flag} {picked.name}</Text>
              <Text className="mt-1 text-[15px] text-ink-2">Living costs about {money(picked.col / 12)} a month</Text>
            </View>
          ) : q ? <Text className="mt-4 text-[15px] text-ink-2">No match. Try a nearby city.</Text> : null}
        </View>
      )}
    </QuestionScreen>
  )
}

const brandPin = '#F2A65A'
