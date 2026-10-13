import type { LinkSuccess } from 'react-native-plaid-link-sdk'

import { nativeBuild } from '@/lib/native-build'

const SITE = 'https://www.untilfire.com'

/**
 * Plaid's native Link inside the app (replaces the website bridge in
 * BankBridge). It's an Expo native module, so it only exists in the app's own
 * build; in Expo Go this returns false and the bridge is used instead.
 * The website's API does the server side, with the app's sign-in as the
 * Bearer token: /api/plaid/create-link-token, then /api/plaid/exchange-token
 * (the same free-plan limit of one bank applies).
 */
export function plaidNativeAvailable(): boolean {
  if (!nativeBuild) return false
  try { require('react-native-plaid-link-sdk'); return true } catch { return false }
}

/** Opens native Link. Resolves to an error message, 'cancelled', or null when a bank was connected. */
export async function connectBankNative(accessToken: string): Promise<string | 'cancelled' | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPlaidLinkSession } = require('react-native-plaid-link-sdk') as typeof import('react-native-plaid-link-sdk')
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  const res = await fetch(`${SITE}/api/plaid/create-link-token`, { method: 'POST', headers }).catch(() => null)
  const body = res ? await res.json().catch(() => ({})) : {}
  if (!res || !res.ok || !body.link_token) return body.error ?? "Couldn't start connecting a bank. Please try again."

  return new Promise(resolve => {
    createPlaidLinkSession({
      token: body.link_token,
      onEvent: () => {},
      onExit: () => resolve('cancelled'),
      onSuccess: async (success: LinkSuccess) => {
        const done = await fetch(`${SITE}/api/plaid/exchange-token`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            public_token: success.publicToken,
            institution_name: success.metadata.institution?.name ?? '',
            institution_id: success.metadata.institution?.id ?? '',
          }),
        }).catch(() => null)
        if (!done || !done.ok) {
          const err = done ? await done.json().catch(() => ({})) : {}
          resolve(err.error ?? "The bank connected but didn't finish saving. Please try again.")
          return
        }
        resolve(null)
      },
    })
      .then(session => session.open())
      .catch(() => resolve("Couldn't open the bank connection. Please try again."))
  })
}
