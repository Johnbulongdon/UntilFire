import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { MoneyWheel } from '@/components/MoneyWheel'
import { QuestionScreen } from '@/components/QuestionScreen'
import { Text } from '@/components/Text'
import { fromUSD, toUSDFromDisplay } from '@/lib/display-currency'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { answers } from '@/lib/onboarding-answers'
import { usePlan } from '@/state/plan'

/**
 * The month's spending, or its saving, on the same wheel as pay (V2). The wheel
 * starts from the person's own take-home (founder's call: not a city default
 * that jumps somewhere else), and a line underneath says what that leaves.
 * A Spend / Save switch on top replaces the old "Which do you know better?" screen.
 */
export default function Spending() {
  const { draft, setDraft } = usePlan()
  const income = draft.monthlyIncome ?? 0
  const [save, setSave] = useState(answers.know === 'save')
  // An earlier answer that still fits this pay, else the take-home itself (or nothing saved yet).
  const prior = draft.monthlySpending != null && draft.monthlySpending <= income ? draft.monthlySpending : null
  const startFor = (saving: boolean) => Math.round(fromUSD(saving ? (prior != null ? income - prior : 0) : prior ?? income) / 100) * 100
  const [value, setValue] = useState(() => startFor(save))
  const usd = toUSDFromDisplay(value)
  const spending = save ? income - usd : usd
  const tooMuch = save && usd > income
  const max = Math.ceil(fromUSD(Math.max(income * 2, 5000)) / 1000) * 1000
  const left = income - spending
  const share = income > 0 ? Math.round((left / income) * 100) : 0
  // Switching keeps the same month: the wheel shows its other side.
  const flip = (saving: boolean) => {
    if (saving === save) return
    haptic.select(); answers.know = saving ? 'save' : 'spend'
    setSave(saving)
    if (!tooMuch && spending > 0) setValue(Math.round(fromUSD(saving ? income - spending : spending) / 100) * 100)
    else setValue(startFor(saving))
  }

  return (
    <QuestionScreen
      step={5}
      steps={10}
      title={save ? 'How much do you save each month?' : 'How much do you spend each month?'}
      hint="A rough number is fine."
      cta="Continue"
      canContinue={spending > 0 && !tooMuch && (save || value > 0)}
      onNext={() => { setDraft({ monthlySpending: Math.round(spending) }); router.push('/onboarding/invested') }}
    >
      <View accessibilityRole="tablist" className="mb-6 flex-row self-center rounded-2xl bg-surface-2 p-1">
        {([[false, 'I know my spending'], [true, 'I know my saving']] as const).map(([k, label]) => (
          <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: save === k }} onPress={() => flip(k)}
            className={`rounded-xl px-4 py-2.5 ${save === k ? 'bg-card' : ''}`}>
            <Text className={`text-[15px] font-semibold ${save === k ? 'text-ink' : 'text-ink-2'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <MoneyWheel value={value} onChange={setValue} max={max} unit="a month" label={save ? 'Monthly saving' : 'Monthly spending'} />
      {/* What the answer means, as it changes. */}
      <Text accessibilityLiveRegion="polite" className="mt-4 text-center text-[16px] text-ink-2">
        {tooMuch ? "That's more than you take home each month."
          : save ? <>So you spend <Text className="font-mono font-bold text-ink">{money(spending)}</Text> a month.</>
          : left >= 0 ? <>Leaves <Text className="font-mono font-bold text-ink">{money(left)}</Text> a month to save{share > 0 ? ` · ${share}%` : ''}.</>
          : <>That&apos;s <Text className="font-mono font-bold text-ink">{money(-left)}</Text> more than you take home.</>}
      </Text>
    </QuestionScreen>
  )
}
