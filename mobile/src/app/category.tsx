import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'

import { SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { COLOR_PALETTE, EMOJI_PALETTE } from '@/engine'
import { haptic } from '@/lib/haptics'
import { expenseCategories } from '@/lib/money-data'
import { saveCustomCategories } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/** Add your own category, made the way the website's Categories page makes one. */
export default function NewCategory() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('🏷️')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const key = label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const taken = expenseCategories().some(c => c.key === key)

  const save = async () => {
    if (!session || !data || !key || taken) return
    setBusy(true); setError('')
    const code = label.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'CU'
    const problem = await saveCustomCategories(session.user.id, [...data.customCategories, { key, label: label.trim(), code, color, emoji }])
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="New category" saveLabel="Add category" onSave={save} canSave={!!session && !!key && !taken} busy={busy} error={taken ? 'That category already exists.' : error}>
      <View className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-card" style={{ backgroundColor: `${color}22` }}><Text className="text-[28px]">{emoji}</Text></View>
        <TextInput
          accessibilityLabel="Category name"
          className="flex-1 rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[16px] text-ink"
          style={{ fontFamily: 'Manrope_500Medium' }}
          placeholder="e.g. Kids"
          placeholderTextColor={colors.ink3}
          autoFocus
          value={label}
          onChangeText={setLabel}
        />
      </View>
      <Text className="mb-2 mt-5 text-[13px] text-ink-3">Colour</Text>
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        {COLOR_PALETTE.map(c => (
          <Pressable accessibilityRole="button" key={c} accessibilityLabel={`Colour ${c}`} onPress={() => { haptic.select(); setColor(c) }}
            className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.ink }} />
        ))}
      </View>
      <Text className="mb-2 mt-5 text-[13px] text-ink-3">Emoji</Text>
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {EMOJI_PALETTE.map(e => (
          <Pressable accessibilityRole="button" key={e} onPress={() => { haptic.select(); setEmoji(e) }} className={`h-10 w-10 items-center justify-center rounded-control ${emoji === e ? 'bg-green-50' : ''}`}>
            <Text className="text-[22px]">{e}</Text>
          </Pressable>
        ))}
      </View>
    </SheetFrame>
  )
}
