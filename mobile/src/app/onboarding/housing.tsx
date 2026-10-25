import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { Bouncy } from '@/components/Bouncy'
import { QuestionScreen } from '@/components/QuestionScreen'
import { Text } from '@/components/Text'
import { Events, track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { usePlan, type Housing, type InvestStyle } from '@/state/plan'

const HOMES: { id: Housing; label: string }[] = [{ id: 'rent', label: 'Rent' }, { id: 'own', label: 'Own' }]
const STYLES: { id: InvestStyle; label: string }[] = [
  { id: 'none', label: 'Not yet' }, { id: 'index', label: 'Index funds' },
  { id: 'dividends', label: 'Dividends' }, { id: 'property', label: 'Property' },
]

/** A two-across answer tile; ticked when picked, so selection isn't colour alone. */
function Tile({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Bouncy accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ flexBasis: '47%', flexGrow: 1 }}>
      <View className={`items-center rounded-2xl border-2 px-3 py-4 ${selected ? 'border-green bg-green-50' : 'border-border bg-card'}`} style={{ borderBottomWidth: 4 }}>
        <Text className="text-[17px] font-semibold text-ink">{selected ? `✓ ${label}` : label}</Text>
      </View>
    </Bouncy>
  )
}

/**
 * Rent or own (renters get the lease reminder) and how they invest, any number
 * of them, so interest in dividends can be counted before it's built. Skippable.
 */
export default function HomeAndInvesting() {
  const { draft, setDraft } = usePlan()
  const [housing, setHousing] = useState<Housing | undefined>(draft.housing)
  const [styles, setStyles] = useState<InvestStyle[]>(draft.investing ?? [])
  const toggle = (id: InvestStyle) => {
    haptic.select()
    // "Not yet" and the others don't go together.
    setStyles(cur => cur.includes(id) ? cur.filter(s => s !== id) : id === 'none' ? ['none'] : [...cur.filter(s => s !== 'none'), id])
  }
  const finish = (save: boolean) => {
    setDraft(save ? { housing, investing: styles } : { housing: undefined, investing: undefined })
    if (save) {
      if (housing) track(Events.ONBOARDING_ANSWERED, { question: 'housing', answer: housing })
      for (const s of styles) track(Events.ONBOARDING_ANSWERED, { question: 'investing', answer: s })
    }
    router.push('/onboarding/reveal')
  }

  return (
    <QuestionScreen step={9} steps={9} title="Your home" cta="Show my freedom date"
      canContinue={!!housing || styles.length > 0} onNext={() => finish(true)} skipLabel="Skip" onSkip={() => finish(false)}>
      <View className="flex-row flex-wrap gap-3">
        {HOMES.map(h => <Tile key={h.id} label={h.label} selected={housing === h.id} onPress={() => { haptic.select(); setHousing(h.id) }} />)}
      </View>
      {housing === 'rent' && <Text className="mt-3 text-[14px] leading-5 text-ink-2">We'll remind you before your lease notice date.</Text>}
      <Text className="mt-8 font-display text-[24px] font-bold leading-8 tracking-tight text-ink">How do you invest?</Text>
      <Text className="mt-1 text-[15px] text-ink-2">Pick all that fit.</Text>
      <View className="mt-4 flex-row flex-wrap gap-3">
        {STYLES.map(s => <Tile key={s.id} label={s.label} selected={styles.includes(s.id)} onPress={() => toggle(s.id)} />)}
      </View>
    </QuestionScreen>
  )
}
