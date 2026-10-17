import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// The Supabase session (access and refresh tokens) lives in the iOS Keychain /
// Android Keystore, not plain AsyncStorage. A session is larger than one
// Keychain item comfortably holds, so it is split into chunks under
// `<key>.0`, `<key>.1`, … with the chunk count stored at `<key>`.
const CHUNK = 1800
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }

// SecureStore keys allow only letters, digits, ".", "-" and "_".
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_')

async function readSecure(key: string): Promise<string | null> {
  const count = Number(await SecureStore.getItemAsync(safe(key), OPTIONS))
  if (!count) return null
  const parts: string[] = []
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${safe(key)}.${i}`, OPTIONS)
    if (part == null) return null
    parts.push(part)
  }
  return parts.join('')
}

async function removeSecure(key: string) {
  const count = Number(await SecureStore.getItemAsync(safe(key), OPTIONS)) || 0
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${safe(key)}.${i}`, OPTIONS)
  await SecureStore.deleteItemAsync(safe(key), OPTIONS)
}

async function writeSecure(key: string, value: string) {
  await removeSecure(key)
  const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? ['']
  for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(`${safe(key)}.${i}`, parts[i], OPTIONS)
  await SecureStore.setItemAsync(safe(key), String(parts.length), OPTIONS)
}

export const secureSessionStorage = Platform.OS === 'web' ? AsyncStorage : {
  async getItem(key: string) {
    const stored = await readSecure(key)
    if (stored != null) return stored
    // One-time move for people signed in before the Keychain switch, so nobody is signed out by the update.
    const legacy = await AsyncStorage.getItem(key)
    if (legacy != null) {
      await writeSecure(key, legacy)
      await AsyncStorage.removeItem(key)
    }
    return legacy
  },
  setItem: writeSecure,
  async removeItem(key: string) {
    await removeSecure(key)
    await AsyncStorage.removeItem(key)
  },
}
