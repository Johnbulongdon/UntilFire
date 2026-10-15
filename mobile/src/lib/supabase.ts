import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

import { secureStorage } from './secure-storage'

// The same Supabase project as untilfire.com, so one account works in both.
// Both values are public by design (like the website's NEXT_PUBLIC_ ones);
// what a signed-in user can read is enforced by row-level security.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://boqzhdfdetixnwnohtho.supabase.co'
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_uXt2OykfORDHF6XHwNwsSQ_pvPd5HTP'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // The session lives in the iPhone Keychain, not plain app storage.
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE: the Google redirect carries a one-time code, useless without the verifier kept on this phone.
    flowType: 'pkce',
  },
})

// Refresh the session only while the app is in front, as Supabase recommends for React Native.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
