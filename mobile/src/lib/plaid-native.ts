import type { LinkSuccess } from 'react-native-plaid-link-sdk'
import { Platform } from 'react-native'

import { ownBuild } from '@/lib/native-build'

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
  // Both platforms: Android sends its package name instead of iOS's redirect URI.
  if (!ownBuild) return false
  try { require('react-native-plaid-link-sdk'); return true } catch { return false }
}

/** What the bank showed, as /api/plaid/exchange-token returns it (the "working" screen, BankWorking). */
export interface BankFound { name: string; added: number; accounts: number; found: { payday: boolean; bills: number } }

/**
 * Opens native Link. Resolves to an error message, 'cancelled', or null when a bank was connected.
 * `onWorking` hears the bank's name as the import starts, then what it found.
 */
export async function connectBankNative(accessToken: string, onWorking?: (name: string, result: BankFound | null) => void): Promise<string | 'cancelled' | null> {
  const { createPlaidLinkSession } = require('react-native-plaid-link-sdk') as typeof import('react-native-plaid-link-sdk')
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  // The platform lets the website add the redirect banks like Chase need to send people back to the app.
  const res = await fetch(`${SITE}/api/plaid/create-link-token`, { method: 'POST', headers, body: JSON.stringify({ platform: Platform.OS }) }).catch(() => null)
  const body = res ? await res.json().catch(() => ({})) : {}
  if (!res || !res.ok || !body.link_token) return body.error ?? "Couldn't start connecting a bank. Please try again."

  return new Promise(resolve => {
    createPlaidLinkSession({
      token: body.link_token,
      onEvent: () => {},
      onExit: () => resolve('cancelled'),
      onSuccess: async (success: LinkSuccess) => {
        const name = success.metadata.institution?.name || 'your bank'
        onWorking?.(name, null)
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
        const data = await done.json().catch(() => ({}))
        onWorking?.(data.institution_name || name, {
          name: data.institution_name || name, added: data.added_count ?? 0, accounts: data.accounts_count ?? 0,
          found: data.found ?? { payday: false, bills: 0 },
        })
        resolve(null)
      },
    })
      .then(session => session.open())
      .catch(() => resolve("Couldn't open the bank connection. Please try again."))
  })
}

/** Repair an existing Item with Link update mode. Never exchange or save a new token. */
export async function reconnectBankNative(accessToken: string, itemId: string, canContinue: () => boolean = () => true): Promise<string | 'cancelled' | null> {
  if (!plaidNativeAvailable()) return 'Reconnect is available in the installed UntilFire app.'
  const { createPlaidLinkSession } = require('react-native-plaid-link-sdk') as typeof import('react-native-plaid-link-sdk')
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), 15000)
  let body: { link_token?: string; error?: string } = {}
  try {
    const response = await fetch(SITE + '/api/plaid/reconnect', {
      method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, platform: Platform.OS }), signal: abort.signal,
    })
    body = await response.json().catch(() => ({}))
    if (!response.ok || !body.link_token) return body.error ?? "Couldn't start reconnecting. Try again."
  } catch { return "Couldn't reach your bank. Try again." }
  finally { clearTimeout(timeout) }
  if (!canContinue()) return 'cancelled'
  return new Promise(resolve => {
    createPlaidLinkSession({
      token: body.link_token!, onEvent: () => {},
      onExit: exit => resolve(exit.error ? "Reconnect didn't finish. Please try again." : 'cancelled'),
      onSuccess: () => resolve(null),
    }).then(session => session.open()).catch(() => resolve("Couldn't open your bank. Please try again."))
  })
}
