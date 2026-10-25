import { useEffect, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, Modal, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'

import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { ThemeScope } from '@/components/ThemeScope'
import { haptic } from '@/lib/haptics'
import type { BankFound } from '@/lib/plaid-native'
import { colors } from '@/theme/colors'

const STEP_MS = 550

/**
 * Linking a bank, shown working (labor illusion, Oct 2026), the website's
 * BankWorking: real steps tick by as the import finishes, each with what it
 * found. Nothing is invented: until the import answers only the first step
 * spins; after, the steps tick at a steady pace (all at once with reduced
 * motion). The payday and bills it names are Get set up's own finds.
 */
export function BankWorking({ name, result, onClose }: { name: string; result: BankFound | null; onClose: () => void }) {
  const [shown, setShown] = useState(0)

  const steps = result ? [
    { label: `Connected to ${result.name}`, ok: true },
    { label: result.added > 0 ? `Read ${result.added.toLocaleString('en-US')} transactions` : 'No transactions yet, they can take a few minutes', ok: result.added > 0 },
    { label: result.found.payday ? 'Found your payday' : 'No payday found yet', ok: result.found.payday },
    { label: result.found.bills > 0 ? `Found ${result.found.bills} ${result.found.bills === 1 ? 'bill' : 'bills'}` : 'No repeating bills found yet', ok: result.found.bills > 0 },
    { label: 'Updated your freedom date', ok: true },
  ] : []

  useEffect(() => {
    if (!result) return
    let timers: ReturnType<typeof setTimeout>[] = []
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(reduce => {
      if (reduce) { setShown(steps.length); haptic.success(); return }
      timers = steps.map((s, i) => setTimeout(() => {
        setShown(i + 1)
        if (i === steps.length - 1) haptic.success(); else if (s.ok) haptic.tick()
      }, (i + 1) * STEP_MS))
    })
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  const finished = !!result && shown >= steps.length

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { if (finished) onClose() }}>
      <ThemeScope>
        <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View className="w-full gap-4 rounded-[28px] bg-card p-5" style={{ maxWidth: 400 }} accessibilityViewIsModal>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-[13px]" style={{ backgroundColor: colors.green50 }}>
                <Icon name="building.columns.fill" fallback="🏦" size={24} color={colors.green} />
              </View>
              <Text accessibilityRole="header" className="flex-1 text-[20px] font-extrabold text-ink">{finished ? 'Your bank is in' : `Linking ${name}`}</Text>
            </View>
            <View className="gap-2.5" accessibilityLiveRegion="polite">
              {!result && <Row state="busy" label={`Connecting to ${name}`} />}
              {steps.slice(0, shown).map(s => <Row key={s.label} state={s.ok ? 'ok' : 'none'} label={s.label} />)}
              {result && !finished && <Row state="busy" label="Working…" />}
            </View>
            {finished && <Button label="Done" onPress={() => { haptic.tick(); onClose() }} />}
          </View>
        </View>
      </ThemeScope>
    </Modal>
  )
}

/** One step: a spinner while busy, a teal tick when it found something, a quiet dash when it found nothing. */
function Row({ state, label }: { state: 'busy' | 'ok' | 'none'; label: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <View className="min-h-[32px] flex-row items-center gap-3">
        <View className="h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ backgroundColor: state === 'ok' ? colors.teal : colors.surface2 }}>
          {state === 'busy' && <ActivityIndicator size="small" color={colors.green} />}
          {state === 'ok' && <Svg width={14} height={14} viewBox="0 0 12 12"><Path d="M2.5 6.2l2.3 2.3 4.7-4.9" stroke={colors.card} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
          {state === 'none' && <View className="h-[2px] w-2.5 rounded-sm" style={{ backgroundColor: colors.ink3 }} />}
        </View>
        <Text className={`flex-1 text-[16px] ${state === 'none' ? 'text-ink-2' : 'text-ink'}`}>{label}</Text>
      </View>
    </Animated.View>
  )
}
