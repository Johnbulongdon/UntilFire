import { router, useLocalSearchParams } from 'expo-router'
import { Button } from '@/components/Button'
import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Bouncy } from '@/components/Bouncy'
import { PrimaryButton } from '@/components/PrimaryButton'
import { CategoryGlyph } from '@/components/Icon'
import { Text } from '@/components/Text'
import { INCOME_CATEGORIES, isoDay, SUB_CATEGORIES } from '@/engine'
import { currencySymbol, displayCurrency } from '@/lib/display-currency'
import { haptic } from '@/lib/haptics'
import { amountInput, moneyIn } from '@/lib/format'
import { dayLabel, expenseCategories } from '@/lib/money-data'
import { deleteTransaction, saveTransaction } from '@/lib/mutations'
import { defaultNeed } from '@/lib/review'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/** Add a transaction, or edit one when opened with ?id=. A sheet over whatever you were looking at. */
export default function TransactionSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const existing = id ? data?.transactions.find(t => t.id === id) : undefined
  const editing = !!existing

  const [type, setType] = useState<'expense' | 'income'>(existing?.transaction_type === 'income' ? 'income' : 'expense')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [date, setDate] = useState(existing?.date ?? isoDay(new Date()))
  const [subCategory, setSubCategory] = useState<string | null>(existing?.sub_category ?? null)
  // Need or want, set from the category's usual answer and easy to flip, so Today doesn't ask again.
  const [need, setNeed] = useState<'need' | 'want' | null>(existing?.tags.includes('need') ? 'need' : existing?.tags.includes('want') ? 'want' : null)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [refund, setRefund] = useState(existing?.refund_amount ? String(existing.refund_amount) : '')
  const [showMore, setShowMore] = useState(!!(existing?.notes || existing?.refund_amount))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // A transaction keeps its own currency; a new one starts in yours, as on the website.
  const currency = existing?.currency ?? displayCurrency()
  const categories = type === 'income' ? INCOME_CATEGORIES : expenseCategories()
  const value = Number(amount.replace(/[^0-9.]/g, ''))
  const canSave = value > 0 && !!session && !busy
  const transfer = existing?.transaction_type === 'transfer'

  const shiftDay = (n: number) => {
    const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + n)
    if (d > new Date()) return
    haptic.tick(); setDate(isoDay(d))
  }

  const save = async () => {
    if (!session || !canSave) return
    setBusy(true); setError('')
    const problem = await saveTransaction(session.user.id, {
      id: existing?.id, date, amount: value, currency, description, category,
      sub_category: subCategory, notes, refund_amount: Number(refund) || 0, transaction_type: type,
      need: type === 'expense' && category ? (need ?? defaultNeed(category)) : null, tags: existing?.tags,
    })
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success()
    await refresh()
    router.back()
  }

  const remove = () => {
    if (!existing) return
    haptic.warn()
    Alert.alert('Delete this transaction?', 'It will be removed from untilfire.com too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true)
        const problem = await deleteTransaction(existing.id)
        if (problem) { setBusy(false); setError(problem); return }
        await refresh()
        router.back()
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
          <Text className="text-[16px] font-bold text-ink">{editing ? 'Edit transaction' : 'New transaction'}</Text>
          <View style={{ width: 52 }} />
        </View>

        <ScrollView contentContainerClassName="px-5 pb-6 pt-5" keyboardShouldPersistTaps="handled">
          {!transfer && (
            <View className="flex-row rounded-control bg-surface p-1">
              {(['expense', 'income'] as const).map(t => (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === t }}
                  onPress={() => { haptic.select(); setType(t); setCategory('') }}
                  className={`flex-1 items-center rounded-lg py-2 ${type === t ? 'bg-card' : ''}`}
                >
                  <Text className={`text-[14px] font-semibold ${type === t ? 'text-ink' : 'text-ink-2'}`}>{t === 'expense' ? 'Spent' : 'Received'}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View className="mt-6 flex-row items-baseline justify-center">
            <Text className={`font-mono text-[44px] ${type === 'income' ? 'text-pos-ink' : 'text-ink'}`}>{currencySymbol(currency).trim()}</Text>
            <TextInput
              accessibilityLabel="Amount"
              className={`min-w-[120px] text-[44px] ${type === 'income' ? 'text-pos-ink' : 'text-ink'}`}
              style={{ fontFamily: 'DMMono_500Medium' }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.border2}
              autoFocus={!editing}
              value={amount}
              onChangeText={t => { setAmount(amountInput(t)); setError('') }}
            />
          </View>

          <TextInput
            accessibilityLabel="What was it?"
            className="mt-4 rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[16px] text-ink"
            style={{ fontFamily: 'Manrope_500Medium' }}
            placeholder={type === 'income' ? 'Where it came from' : 'Where or what (e.g. Trader Joe\'s)'}
            placeholderTextColor={colors.ink3}
            value={description}
            onChangeText={setDescription}
          />

          <View className="mt-4 flex-row items-center justify-between rounded-control bg-surface px-3 py-2.5">
            <Pressable accessibilityRole="button" accessibilityLabel="Previous day" hitSlop={8} onPress={() => shiftDay(-1)} className="px-3"><Text className="text-[20px] text-ink">‹</Text></Pressable>
            <Text className="text-[15px] font-semibold text-ink">{dayLabel(date)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next day" hitSlop={8} onPress={() => shiftDay(1)} className="px-3">
              <Text className={`text-[20px] ${date >= isoDay(new Date()) ? 'text-border-2' : 'text-ink'}`}>›</Text>
            </Pressable>
          </View>

          {!transfer && (
            <>
              <Text className="mb-2 mt-6 text-[13px] text-ink-3">Category</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {categories.map(c => {
                  const on = category === c.key
                  return (
                    <Bouncy key={c.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { haptic.select(); if (category !== c.key) { setSubCategory(null); if (!existing) setNeed(null) } setCategory(c.key) }}>
                      <View className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${on ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
                        <CategoryGlyph cat={c} size={17} />
                        <Text className={`text-[14px] font-semibold ${on ? 'text-green-700' : 'text-ink-2'}`}>{c.label}</Text>
                      </View>
                    </Bouncy>
                  )
                })}
              </View>
              {type === 'expense' && !!category && (
                <View className="mt-5 flex-row gap-2">
                  {(['need', 'want'] as const).map(n => {
                    const on = (need ?? defaultNeed(category)) === n
                    return <Button key={n} small kind={on ? 'primary' : 'quiet'} label={n === 'need' ? 'Need' : 'Want'} onPress={() => setNeed(n)} />
                  })}
                </View>
              )}
            </>
          )}

          {!transfer && !!category && !!SUB_CATEGORIES[category] && (
            <>
              <Text className="mb-2 mt-5 text-[13px] text-ink-3">Kind of {category.replace(/_/g, ' ')}</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {SUB_CATEGORIES[category].map(sc => {
                  const on = subCategory === sc
                  return (
                    <Pressable accessibilityRole="button" key={sc} onPress={() => { haptic.select(); setSubCategory(on ? null : sc) }}
                      className={`rounded-full border px-3 py-1.5 ${on ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
                      <Text className={`text-[13px] font-semibold ${on ? 'text-green-700' : 'text-ink-2'}`}>{sc}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}

          {!showMore ? (
            <View className="mt-5"><Button small kind="quiet" label={`Add a note${type === 'expense' ? ' or refund' : ''}`} onPress={() => setShowMore(true)} /></View>
          ) : (
            <View className="mt-5 gap-3">
              <TextInput
                accessibilityLabel="Note"
                className="rounded-control border border-border bg-card px-4 py-3 text-[15px] text-ink"
                style={{ fontFamily: 'Manrope_500Medium', minHeight: 64 }}
                placeholder="Note"
                placeholderTextColor={colors.ink3}
                multiline
                value={notes}
                onChangeText={setNotes}
              />
              {type === 'expense' && (
                <View className="flex-row items-center justify-between rounded-control border border-border bg-card px-4 py-2.5">
                  <Text className="text-[15px] text-ink">Refunded</Text>
                  <View className="flex-row items-center">
                    <Text className="font-mono text-[15px] text-ink-3">{currencySymbol(currency).trim()}</Text>
                    <TextInput
                      accessibilityLabel="Refunded amount"
                      className="w-24 text-right text-[15px] text-ink"
                      style={{ fontFamily: 'DMMono_500Medium' }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.border2}
                      value={refund}
                      onChangeText={t => setRefund(amountInput(t))}
                    />
                  </View>
                </View>
              )}
              {Number(refund) > value && value > 0 ? <Text className="text-[13px] text-ink-3">A refund can't be more than the amount, so it will be saved as {moneyIn(value, currency)}.</Text> : null}
            </View>
          )}

          {error ? <Text className="mt-4 text-[14px] text-neg-ink">{error}</Text> : null}
          {editing && (
            <Pressable accessibilityRole="button" onPress={remove} className="mt-8 items-center py-2">
              <Text className="text-[15px] font-semibold text-neg-ink">Delete transaction</Text>
            </Pressable>
          )}
        </ScrollView>

        <View className="px-5 pb-4">
          {busy ? (
            <View className="h-14 items-center justify-center"><ActivityIndicator color={colors.green} /></View>
          ) : (
            <PrimaryButton label={editing ? 'Save changes' : 'Add transaction'} onPress={save} disabled={!canSave} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
