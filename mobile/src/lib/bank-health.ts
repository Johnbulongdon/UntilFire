export type BankStatus = 'connected' | 'attention' | 'unknown'
export type BankHealth = { id: string; name: string; lastSyncedAt: string | null; status: BankStatus; reconnect: boolean }

export function syncTime(value: string | null, now = Date.now()): number | null {
  const time = value ? Date.parse(value) : NaN
  return Number.isFinite(time) && time <= now ? time : null
}
export function syncLabel(value: string | null, now = Date.now()): string {
  const time = syncTime(value, now)
  if (time === null) return value ? 'Sync time unavailable' : 'No sync recorded yet'
  const minutes = Math.floor((now - time) / 60000)
  if (minutes < 1) return 'Last synced just now'
  if (minutes < 60) return `Last synced ${minutes}m ago`
  if (minutes < 1440) return `Last synced ${Math.floor(minutes / 60)}h ago`
  return `Last synced ${Math.floor(minutes / 1440)}d ago`
}
/** The oldest bank governs freshness; never hide one stale connection behind a newer one. */
export function bankSummary(banks: BankHealth[], now = Date.now()): string | null {
  if (!banks.length) return null
  const attention = banks.filter(b => b.status === 'attention').length
  if (attention) return `${attention} ${attention === 1 ? 'bank needs' : 'banks need'} attention`
  if (banks.some(b => b.status === 'unknown')) return 'Bank status unavailable'
  if (banks.some(b => syncTime(b.lastSyncedAt, now) === null)) return 'Bank sync time unavailable'
  const oldest = Math.min(...banks.map(b => syncTime(b.lastSyncedAt, now)!))
  return banks.length === 1 ? syncLabel(new Date(oldest).toISOString(), now) : `Oldest bank sync · ${syncLabel(new Date(oldest).toISOString(), now).replace('Last synced ', '')}`
}

export function parseBankHealth(value: unknown): BankHealth[] {
  if (!value || typeof value !== 'object' || !('banks' in value) || !Array.isArray(value.banks)) throw new Error('Invalid bank response')
  return value.banks.map((b: unknown) => {
    if (!b || typeof b !== 'object' || !('id' in b) || typeof b.id !== 'string' || !('name' in b) || typeof b.name !== 'string'
      || !('status' in b) || !['connected', 'attention', 'unknown'].includes(String(b.status))) throw new Error('Invalid bank response')
    return { id: b.id, name: b.name, status: b.status as BankStatus, lastSyncedAt: 'lastSyncedAt' in b && typeof b.lastSyncedAt === 'string' ? b.lastSyncedAt : null, reconnect: 'reconnect' in b && b.reconnect === true }
  })
}
