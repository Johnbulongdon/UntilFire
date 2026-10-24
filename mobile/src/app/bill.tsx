import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LeaseCard } from '@/components/LeaseCard'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Text } from '@/components/Text'
import { guessBillCategory, INCOME_CATEGORIES, isoDay, isRent, RECURRENCE_LABEL, SUB_CATEGORIES, type Recurrence } from '@/engine'
import { currencySymbol, displayCurrency } from '@/lib/display-currency'
import { haptic } from '@/lib/haptics'
import { dayLabel, expenseCategories } from '@/lib/money-data'
import { deleteBill, saveBill } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'
import { amountInput } from '@/lib/format'

const REPEATS: Recurrence[] = ['none', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual']

/** Add or edit a bill or payday (the website's Calendar form). Opened with ?id= to edit, ?on=YYYY-MM-DD to start on a day, ?type=income to start as a payday. */
export default function BillSheet() {
  const { id, on, type: startType } = useLocalSearchParams<{ id?: string; on?: string; type?: string }>()
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const existing = id ? data?.bills.find(b => b.id === id) : undefined

  const [type, setType] = useState<'expense' | 'income'>(existing?.transaction_type ?? (startType === 'income' ? 'income' : 'expense'))
  const [description, setDescription] = useState(existing?.description ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [due, setDue] = useState(existing?.due_date ?? on ?? isoDay(new Date()))
  const [repeat, setRepeat] = useState<Recurrence>((existing?.recurrence as Recurrence) ?? 'monthly')
  const [category, setCategory] = useState<string>(existing?.category ?? '')
  const [subCategory, setSubCategory] = useState<string | null>(existing?.sub_category ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // A bill is kept in its own currency, as on the website; a new one starts in yours.
  const currency = existing?.currency ?? displayCurrency()
  const value = Number(amount)
  // The website asks a bill for its category, so the budget can set it aside.
  const needsCategory = type === 'expense' && !category
  const canSave = !!session && !!description.trim() && value > 0 && !needsCategory && !busy

  const shift = (days: number, months = 0) => {
    const d = new Date(`${due}T00:00:00`)
    d.setMonth(d.getMonth() + months); d.setDate(d.getDate() + days)
    haptic.tick(); setDue(isoDay(d))
  }

  const save = async () => {
    if (!session || !canSave) return
    setBusy(true); setError('')
    const problem = await saveBill(session.user.id, {
      id: existing?.id, description, amount: value, currency,
      transaction_type: type, due_date: due, recurrence: repeat, category: category || null,
      sub_category: type === 'expense' && SUB_CATEGORIES[category] ? subCategory : null,
    })
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success()
    await refresh()
    router.back()
  }

  const remove = () => {
    if (!existing) return
    haptic.warn()
    Alert.alert(`Delete ${existing.description}?`, 'It will be removed from untilfire.com too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true)
        const problem = await deleteBill(existing.id)
        if (problem) { setBusy(false); setError(problem); return }
        await refresh(); router.back()
      } },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
            <Text className="text-[16px] font-semibold text-ink-2">Cancel</Text>
          </Pressable>
          <Text className="text-[16px] font-bold text-ink">{existing ? 'Edit' : 'New'} {type === 'income' ? 'payday' : 'bill'}</Text>
          <View style={{ width: 52 }} />
        </View>

        <ScrollView contentContainerClassName="px-5 pb-6 pt-5" keyboardShouldPersistTaps="handled">
          <View className="flex-row rounded-control bg-surface p-1">
            {(['expense', 'income'] as const).map(t => (
              <Pressable accessibilityRole="button" key={t} onPress={() => { haptic.select(); setType(t); setCategory('') }}
                className={`flex-1 items-center rounded-lg py-2 ${type === t ? 'bg-card' : ''}`}>
                <Text className={`text-[14px] font-semibold ${type === t ? 'text-ink' : 'text-ink-2'}`}>{t === 'expense' ? 'Bill' : 'Payday or income'}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            accessibilityLabel="Name"
            className="mt-4 rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[16px] text-ink"
            style={{ fontFamily: 'Manrope_500Medium' }}
            placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Rent, Netflix, Car insurance'}
            placeholderTextColor={colors.ink3}
            autoFocus={!existing}
            value={description}
            onChangeText={t => {
              setDescription(t)
              // Name a bill and the website's guess fills its category, until one is picked.
              if (type === 'expense' && !existing) { const g = guessBillCategory(t); if (g) setCategory(g) }
            }}
          />

          <View className="mt-4 flex-row items-baseline justify-center">
            <Text className={`font-mono text-[40px] ${type === 'income' ? 'text-pos-ink' : 'text-ink'}`}>{currencySymbol(currency).trim()}</Text>
            <TextInput
              accessibilityLabel="Amount"
              className={`min-w-[110px] text-[40px] ${type === 'income' ? 'text-pos-ink' : 'text-ink'}`}
              style={{ fontFamily: 'DMMono_500Medium' }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.border2}
              value={amount}
              onChangeText={t => setAmount(amountInput(t))}
            />
          </View>

          <Text className="mb-2 mt-5 text-[13px] text-ink-3">{repeat === 'none' ? 'Due' : 'Next due'}</Text>
          <View className="flex-row items-center justify-between rounded-control bg-surface px-2 py-2">
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => shift(0, -1)} className="px-2"><Text className="text-[15px] text-ink-2">«</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Earlier date" hitSlop={8} onPress={() => shift(-1)} className="px-2"><Text className="text-[20px] text-ink">‹</Text></Pressable>
            <Text className="text-[15px] font-semibold text-ink">{new Date(`${due}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Later date" hitSlop={8} onPress={() => shift(1)} className="px-2"><Text className="text-[20px] text-ink">›</Text></Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => shift(0, 1)} className="px-2"><Text className="text-[15px] text-ink-2">»</Text></Pressable>
          </View>

          <Text className="mb-2 mt-5 text-[13px] text-ink-3">Repeats</Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {REPEATS.map(r => (
              <Chip key={r} label={RECURRENCE_LABEL[r]} active={repeat === r} onPress={() => setRepeat(r)} />
            ))}
          </View>

          <Text className="mb-2 mt-5 text-[13px] text-ink-3">Category{type === 'expense' ? '' : ' (optional)'}</Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {(type === 'income' ? INCOME_CATEGORIES : expenseCategories()).map(c => (
              <Chip key={c.key} label={c.label} active={category === c.key} onPress={() => { setCategory(c.key); setSubCategory(null) }} />
            ))}
          </View>

          {type === 'expense' && !!SUB_CATEGORIES[category] && (
            <>
              <Text className="mb-2 mt-5 text-[13px] text-ink-3">Kind (optional)</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {SUB_CATEGORIES[category].map(sc => (
                  <Chip key={sc} label={sc} active={subCategory === sc} onPress={() => setSubCategory(subCategory === sc ? null : sc)} />
                ))}
              </View>
            </>
          )}

          {/* Only a saved Rent bill offers a lease; Mortgage never does. */}
          {existing && isRent(existing) && <LeaseCard bill={existing} />}

          {error ? <Text className="mt-4 text-[14px] text-neg-ink">{error}</Text> : null}
          {existing && (
            <Pressable accessibilityRole="button" onPress={remove} className="mt-8 items-center py-2">
              <Text className="text-[15px] font-semibold text-neg-ink">Delete {type === 'income' ? 'payday' : 'bill'}</Text>
            </Pressable>
          )}
        </ScrollView>

        <View className="px-5 pb-4">
          {busy ? <View className="h-14 items-center justify-center"><ActivityIndicator color={colors.green} /></View>
            : <PrimaryButton label={needsCategory && description && value > 0 ? 'Pick a category' : existing ? 'Save changes' : 'Add'} onPress={save} disabled={!canSave} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.select(); onPress() }}
      className={`rounded-full border px-3 py-1.5 ${active ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
      <Text className={`text-[13px] font-semibold ${active ? 'text-green-700' : 'text-ink-2'}`}>{label}</Text>
    </Pressable>
  )
}
