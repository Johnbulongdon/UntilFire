import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { parseBankHealth, type BankHealth } from '@/lib/bank-health'
import { reconnectBankNative } from '@/lib/plaid-native'
import { useAuth } from './auth'
import { useAccount } from './account'

const SITE = 'https://www.untilfire.com'
type Health = {
  banks: BankHealth[]; loading: boolean; error: string | null; checkedAt: number | null
  busyId: string | null; message: { id: string; text: string } | null
  refresh: () => Promise<void>; refreshIfStale: () => void
  run: (id: string, reconnect: boolean) => Promise<void>
}
const Context = createContext<Health | null>(null)

/** Owner-scoped memory only. Account changes clear banks without remounting navigation. */
export function BankHealthProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { refresh } = useAccount()
  return <BankHealthSession ownerId={session?.user.id ?? null} token={session?.access_token ?? null} onImported={refresh}>{children}</BankHealthSession>
}

export function BankHealthSession({ children, token, ownerId, onImported }: { children: ReactNode; token: string | null; ownerId: string | null; onImported: () => void }) {
  const ownerRef = useRef(ownerId)
  const ownerVersion = useRef(0)
  if (ownerRef.current !== ownerId) { ownerRef.current = ownerId; ownerVersion.current++ }
  const version = ownerVersion.current
  const [stateOwner, setStateOwner] = useState(ownerId)
  const [banks, setBanks] = useState<BankHealth[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<Health['message']>(null)
  const active = useRef(true)
  const busy = useRef(false)
  const lastCheck = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const tokenRef = useRef(token)
  tokenRef.current = token
  useEffect(() => {
    active.current = true
    return () => { active.current = false; controller.current?.abort() }
  }, [])

  const load = useCallback(async () => {
    const current = () => active.current && ownerRef.current === ownerId && ownerVersion.current === version
    if (!tokenRef.current || !current()) return
    controller.current?.abort()
    const request = ++generation.current
    const abort = new AbortController()
    controller.current = abort
    const timeout = setTimeout(() => abort.abort(), 55000)
    setLoading(true)
    try {
      const response = await fetch(SITE + '/api/plaid/health', { headers: { Authorization: 'Bearer ' + tokenRef.current }, signal: abort.signal })
      if (!response.ok) throw new Error('Unavailable')
      const next = parseBankHealth(await response.json())
      if (!current() || request !== generation.current) return
      setBanks(next); setError(null); setCheckedAt(Date.now()); lastCheck.current = Date.now()
    } catch {
      if (current() && request === generation.current) setError("Couldn't check your banks. Your last sync times are shown below.")
    } finally {
      clearTimeout(timeout)
      if (current() && request === generation.current) setLoading(false)
    }
  }, [ownerId, version])
  const refresh = useCallback(async () => { if (!busy.current) await load() }, [load])
  const refreshIfStale = useCallback(() => {
    if (!busy.current && Date.now() - lastCheck.current > 60000) void refresh()
  }, [refresh])
  useEffect(() => {
    generation.current++; controller.current?.abort(); busy.current = false; lastCheck.current = 0
    setBanks([]); setLoading(false); setError(null); setCheckedAt(null); setBusyId(null); setMessage(null); setStateOwner(ownerId)
  }, [ownerId])
  useEffect(() => { void refresh() }, [token, refresh])
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && Date.now() - lastCheck.current > 300000) refreshIfStale()
    })
    return () => sub.remove()
  }, [refreshIfStale])

  const run = useCallback(async (id: string, reconnect: boolean) => {
    const current = () => active.current && ownerRef.current === ownerId && ownerVersion.current === version
    if (busy.current || !tokenRef.current || !current()) return
    busy.current = true; setBusyId(id); setMessage(null)
    const accessToken = tokenRef.current
    try {
      if (reconnect) {
        const result = await reconnectBankNative(accessToken, id, current)
        if (!current()) return
        if (result === 'cancelled') return
        if (result) throw new Error(result)
      }
      if (!current()) return
      // Explicit user action only. Viewing this screen never imports transactions.
      const abort = new AbortController()
      controller.current?.abort()
      controller.current = abort
      const timeout = setTimeout(() => abort.abort(), 90000)
      try {
        const response = await fetch(SITE + '/api/plaid/sync', {
          method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: id }), signal: abort.signal,
        })
        if (!response.ok) throw new Error(reconnect ? 'Reconnected. Sync has not finished; try again shortly.' : "Couldn't sync this bank. Try again shortly.")
      } finally { clearTimeout(timeout) }
      if (!current()) return
      setMessage({ id, text: 'Sync complete. Banks may take time to send recent activity.' })
      onImported()
    } catch (err) {
      if (current()) setMessage({ id, text: err instanceof Error && err.name !== 'AbortError' ? err.message : "Couldn't finish this sync. Check again shortly." })
    } finally {
      if (current()) {
        await load()
        if (current()) setBusyId(null)
      }
      if (current()) busy.current = false
    }
  }, [ownerId, version, load, onImported])
  const matchesOwner = stateOwner === ownerId
  return <Context.Provider value={{ banks: matchesOwner ? banks : [], loading: matchesOwner && loading, error: matchesOwner ? error : null, checkedAt: matchesOwner ? checkedAt : null, busyId: matchesOwner ? busyId : null, message: matchesOwner ? message : null, refresh, refreshIfStale, run }}>{children}</Context.Provider>
}
export function useBankHealth() {
  const value = useContext(Context)
  if (!value) throw new Error('BankHealthProvider missing')
  return value
}
