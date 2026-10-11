import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'

import { SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

const TYPES = [{ key: 'general', label: 'Idea or thought' }, { key: 'bug', label: 'Something broke' }, { key: 'feature', label: 'Feature request' }] as const

/** Send feedback through the website's endpoint (/api/feedback), like the website's feedback widget. */
export default function Feedback() {
  const { session } = useAuth()
  const [type, setType] = useState<(typeof TYPES)[number]['key']>('general')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (!session || !message.trim()) return
    setBusy(true); setError('')
    const res = await fetch('https://untilfire.com/api/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message: `[iOS app] ${message.trim()}` }),
    }).catch(() => null)
    if (!res?.ok) { setBusy(false); haptic.warn(); setError('Couldn\'t send it. Check your connection and try again.'); return }
    haptic.success(); router.back()
  }

  return (
    <SheetFrame title="Send feedback" saveLabel="Send" onSave={send} canSave={!!session && !!message.trim() && message.length <= 1900} busy={busy}
      error={!session ? 'Sign in to send feedback, or email hello@untilfire.com.' : error}>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {TYPES.map(t => (
          <Pressable accessibilityRole="button" key={t.key} onPress={() => { haptic.select(); setType(t.key) }} className={`rounded-full border px-3 py-1.5 ${type === t.key ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
            <Text className={`text-[13px] font-semibold ${type === t.key ? 'text-green-700' : 'text-ink-2'}`}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Your feedback"
        className="mt-4 rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[16px] text-ink"
        style={{ fontFamily: 'Manrope_500Medium', minHeight: 160, textAlignVertical: 'top' }}
        placeholder="What's working, what isn't, what you wish it did…"
        placeholderTextColor={colors.ink3}
        multiline
        autoFocus
        value={message}
        onChangeText={setMessage}
      />
    </SheetFrame>
  )
}
