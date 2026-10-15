import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'
import { Platform } from 'react-native'

const KEY = 'app-lock'

/** Whether this phone can lock the app with Face ID, Touch ID or the passcode, and what to call it. */
export async function lockAvailable(): Promise<{ ok: boolean; label: string }> {
  if (Platform.OS === 'web') return { ok: false, label: 'Face ID' }
  const [hardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ])
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  return { ok: hardware && enrolled, label: face ? 'Face ID' : 'Touch ID' }
}

export async function isLockOn() {
  return (await AsyncStorage.getItem(KEY).catch(() => null)) === '1'
}

export async function setLockOn(on: boolean) {
  await AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {})
}

/** Asks for Face ID (falling back to the phone's passcode). */
export async function unlock(): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock UntilFire', fallbackLabel: 'Use passcode' })
  return r.success
}

let away = 0

/**
 * Runs something that shows a system sheet (Apple's purchase sheet, Plaid,
 * Google or Apple sign-in). Those make the app inactive, which isn't the
 * person leaving, so the lock stays down until shortly after it finishes.
 */
export async function whileAway<T>(fn: () => Promise<T>): Promise<T> {
  away++
  try { return await fn() } finally { setTimeout(() => { away-- }, 1000) }
}

export const isAway = () => away > 0
