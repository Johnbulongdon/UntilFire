import { router } from 'expo-router'
import { useState } from 'react'
import { TextInput } from 'react-native'

import { SheetFrame } from '@/components/SheetFrame'
import { haptic } from '@/lib/haptics'
import { saveDisplayName } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/** What UntilFire calls you, here and on the website. */
export default function NameSheet() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const [name, setName] = useState(data?.displayName ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!session || !name.trim()) return
    setBusy(true); setError('')
    const problem = await saveDisplayName(session.user.id, name)
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="Your name" saveLabel="Save" onSave={save} canSave={!!session && !!name.trim()} busy={busy} error={error}>
      <TextInput
        accessibilityLabel="Your name"
        className="rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[17px] text-ink"
        style={{ fontFamily: 'Manrope_500Medium' }}
        placeholder="First name"
        placeholderTextColor={colors.ink3}
        autoFocus
        autoComplete="given-name"
        textContentType="givenName"
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
      />
    </SheetFrame>
  )
}
