export type AppearancePreference = 'system' | 'light' | 'dark'
export const APPEARANCE_KEY = 'uf_appearance_v1'
export const parseAppearance = (value: unknown): AppearancePreference => value === 'light' || value === 'dark' ? value : 'system'
export const resolveAppearance = (preference: AppearancePreference, system: string | null | undefined): 'light' | 'dark' => preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference

/** Device preference only. Serialize writes and ignore a late startup read after a user choice. */
export function createAppearanceStore(storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> }) {
  let state = { preference: 'system' as AppearancePreference, ready: false, error: '' }
  let revision = 0
  let writes = Promise.resolve()
  const listeners = new Set<() => void>()
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()) }
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    async load() {
      const started = revision
      try {
        const value = await storage.getItem(APPEARANCE_KEY)
        if (revision === started) publish({ preference: parseAppearance(value), ready: true })
      } catch {
        if (revision === started) publish({ ready: true, error: 'Could not load appearance. Choose a mode to save it again.' })
      }
    },
    select(preference: AppearancePreference) {
      const current = ++revision
      publish({ preference, ready: true, error: '' })
      writes = writes.then(async () => {
        try { await storage.setItem(APPEARANCE_KEY, preference) }
        catch { if (revision === current) publish({ error: 'Could not save appearance. Tap your choice to retry.' }) }
      })
      return writes
    },
  }
}
