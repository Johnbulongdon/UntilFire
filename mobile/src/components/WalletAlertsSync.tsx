import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import { ingestWalletAlerts, walletAvailable } from '@/lib/wallet-alerts'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'

/** Saves waiting Google Pay alerts each time the app opens or comes back (Android only, D-142). */
export function WalletAlertsSync() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const userId = session?.user.id
  const currency = data?.currency ?? 'USD'
  const reload = useRef(refresh)
  reload.current = refresh
  useEffect(() => {
    if (!walletAvailable || !userId) return
    const run = () => { ingestWalletAlerts(userId, currency).then(n => { if (n > 0) reload.current() }).catch(() => {}) }
    run()
    const sub = AppState.addEventListener('change', s => { if (s === 'active') run() })
    return () => sub.remove()
  }, [userId, currency])
  return null
}
