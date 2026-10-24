import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { CURRENCY_NAMES, SUPPORTED_CURRENCIES } from '@/engine'
import { currencyFlag, currencySymbol, setDisplayCurrency } from '@/lib/display-currency'
import { haptic } from '@/lib/haptics'

import { Button } from './Button'
import { Text } from './Text'
import { ThemeScope } from './ThemeScope'

/**
 * The money's currency during onboarding: guessed from the city, changed here
 * with one small button and a sheet. Kept quiet so it doesn't add a question.
 */
export function CurrencyButton({ currency, onPick }: { currency: string; onPick: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  const pick = (c: string) => { haptic.select(); setDisplayCurrency(c); onPick(c); setOpen(false) }
  return (
    <>
      <Button small kind="quiet" style={{ alignSelf: 'center' }} label={`${currencyFlag(currency)}  ${CURRENCY_NAMES[currency] ?? currency} · Change`} onPress={() => setOpen(true)} />
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <ThemeScope>
          <View className="flex-1 bg-ground">
            <View className="flex-row items-center justify-between px-5 pt-4">
              <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setOpen(false)}><Text className="text-[16px] font-semibold text-ink-2">Cancel</Text></Pressable>
              <Text className="text-[16px] font-bold text-ink">Currency</Text>
              <View style={{ width: 52 }} />
            </View>
            <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
              {SUPPORTED_CURRENCIES.map((c, i) => (
                <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: c === currency }} onPress={() => pick(c)}
                  className={`flex-row items-center gap-3 py-3.5 ${i ? 'border-t border-border' : ''}`}>
                  <Text className="w-10 text-center text-[26px]">{currencyFlag(c)}</Text>
                  <Text className="flex-1 text-[16px] text-ink">{CURRENCY_NAMES[c] ?? c}</Text>
                  <Text className="font-mono text-[14px] text-ink-3">{currencySymbol(c).trim()}</Text>
                  {c === currency && <Text className="text-[16px] text-pos-ink">✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ThemeScope>
      </Modal>
    </>
  )
}
