import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// The Keychain holds about 2KB per item and a Supabase session is larger, so
// each value is split into numbered chunks with a count under the key itself.
const CHUNK = 1800
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }

const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_')

async function read(key: string): Promise<string | null> {
  const count = Number(await SecureStore.getItemAsync(safe(key), opts))
  if (!count) return null
  const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${safe(key)}.${i}`, opts)))
  return parts.some(p => p === null) ? null : parts.join('')
}

async function remove(key: string) {
  const count = Number(await SecureStore.getItemAsync(safe(key), opts).catch(() => null)) || 0
  await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${safe(key)}.${i}`, opts).catch(() => {})))
  await SecureStore.deleteItemAsync(safe(key), opts).catch(() => {})
}

async function write(key: string, value: string) {
  await remove(key)
  const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? ['']
  await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${safe(key)}.${i}`, p, opts)))
  await SecureStore.setItemAsync(safe(key), String(parts.length), opts)
}

/**
 * Supabase's session storage, kept in the iPhone Keychain. Sessions saved by
 * earlier versions in plain storage move across on first read.
 */
export const secureStorage = Platform.OS === 'web' ? AsyncStorage : {
  async getItem(key: string) {
    const stored = await read(key).catch(() => null)
    if (stored !== null) return stored
    const old = await AsyncStorage.getItem(key).catch(() => null)
    if (old !== null) {
      await write(key, old).catch(() => {})
      await AsyncStorage.removeItem(key).catch(() => {})
    }
    return old
  },
  async setItem(key: string, value: string) {
    await write(key, value)
  },
  async removeItem(key: string) {
    await remove(key)
    await AsyncStorage.removeItem(key).catch(() => {})
  },
}
