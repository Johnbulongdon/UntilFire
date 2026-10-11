import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native'

import { MoneyRow, SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { isoDay } from '@/engine'
import { haptic } from '@/lib/haptics'
import { deleteGoal, saveGoal } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { fromInput, toInput } from '@/lib/display-currency'
import { colors } from '@/theme/colors'

const EMOJI = ['🎯', '🏠', '✈️', '🚗', '🎓', '💍', '👶', '🛟', '🌴', '💼', '🎨', '🔥']

/** Add or edit a goal: what it's for, how much, how much is saved, and by when. */
export default function GoalSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const existing = id ? data?.goals.find(g => g.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🎯')
  const [target, setTarget] = useState(toInput(existing?.target_amount))
  const [saved, setSaved] = useState(toInput(existing?.current_saved))
  const [date, setDate] = useState<string | null>(existing?.target_date ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const shiftMonths = (n: number) => {
    const d = date ? new Date(`${date}T00:00:00`) : new Date()
    d.setMonth(d.getMonth() + n)
    if (d < new Date()) return
    haptic.tick(); setDate(isoDay(d))
  }

  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const problem = await saveGoal(session.user.id, {
      id: existing?.id, name, emoji, target_amount: fromInput(target), current_saved: fromInput(saved), target_date: date,
    }, data?.goals.length ?? 0)
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }
  const remove = () => {
    if (!existing) return
    haptic.warn()
    Alert.alert(`Delete ${existing.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true)
        const problem = await deleteGoal(existing.id)
        if (problem) { setBusy(false); setError(problem); return }
        await refresh(); router.back()
      } },
    ])
  }

  return (
    <SheetFrame title={existing ? 'Edit goal' : 'New goal'} saveLabel="Save goal" onSave={save} canSave={!!session && !!name.trim() && Number(target) > 0} busy={busy} error={error}>
      <View className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-card bg-surface"><Text className="text-[28px]">{emoji}</Text></View>
        <TextInput
          accessibilityLabel="Goal name"
          className="flex-1 rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[16px] text-ink"
          style={{ fontFamily: 'Manrope_500Medium' }}
          placeholder="e.g. House deposit"
          placeholderTextColor={colors.ink3}
          autoFocus={!existing}
          value={name}
          onChangeText={setName}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 12 }}>
        {EMOJI.map(e => (
          <Pressable accessibilityRole="button" key={e} onPress={() => { haptic.select(); setEmoji(e) }} className={`h-10 w-10 items-center justify-center rounded-control ${emoji === e ? 'bg-green-50' : ''}`}>
            <Text className="text-[22px]">{e}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View className="mt-4 rounded-card border border-border bg-card px-4">
        <MoneyRow first label="Target" value={target} onChange={setTarget} />
        <MoneyRow label="Saved so far" value={saved} onChange={setSaved} />
      </View>
      <Text className="mb-2 mt-5 text-[13px] text-ink-3">By when (optional)</Text>
      <View className="flex-row items-center justify-between rounded-control bg-surface px-3 py-2.5">
        <Pressable accessibilityRole="button" accessibilityLabel="One month earlier" hitSlop={8} onPress={() => shiftMonths(-1)} className="px-3"><Text className="text-[20px] text-ink">‹</Text></Pressable>
        <Text className="text-[15px] font-semibold text-ink">
          {date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No date'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="One month later" hitSlop={8} onPress={() => shiftMonths(1)} className="px-3"><Text className="text-[20px] text-ink">›</Text></Pressable>
      </View>
      {date && <Pressable accessibilityRole="button" onPress={() => setDate(null)} className="mt-2"><Text className="text-[13px] font-semibold text-ink-3">Clear date</Text></Pressable>}
      {existing && (
        <Pressable accessibilityRole="button" onPress={remove} className="mt-8 items-center py-2"><Text className="text-[15px] font-semibold text-neg-ink">Delete goal</Text></Pressable>
      )}
    </SheetFrame>
  )
}
