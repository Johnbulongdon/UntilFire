import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Appearance, Platform, useColorScheme } from 'react-native'
import { createAppearanceStore, resolveAppearance, type AppearancePreference } from '@/lib/appearance-preference'

type AppearanceState = { preference: AppearancePreference; scheme: 'light' | 'dark'; error: string; select: (value: AppearancePreference) => Promise<void> }
const Context = createContext<AppearanceState | null>(null)
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createAppearanceStore(AsyncStorage))
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const system = useColorScheme()
  const scheme = resolveAppearance(state.preference, system)
  useEffect(() => { void store.load() }, [store])
  useEffect(() => {
    if (state.ready && Platform.OS !== 'web') Appearance.setColorScheme(state.preference === 'system' ? 'unspecified' : state.preference)
  }, [state.preference, state.ready])
  if (!state.ready) return null
  return <Context.Provider value={{ preference: state.preference, scheme, error: state.error, select: store.select }}>{children}</Context.Provider>
}
export function useAppearance() {
  const state = useContext(Context)
  if (!state) throw new Error('AppearanceProvider is missing')
  return state
}
