import { nativeBuild } from '@/lib/native-build'

const SITE = 'https://www.untilfire.com'

/**
 * Pro through Apple's in-app purchase (D-75), with expo-iap (StoreKit 2).
 * expo-iap is a native module, so it only exists in the app's own build; in
 * Expo Go `iapAvailable()` is false and the Pro screen says purchases come
 * with the App Store version. After Apple confirms a purchase, the signed
 * transaction goes to the website (/api/apple/verify), which checks it with
 * Apple and marks the account Pro in the same table as Stripe.
 */
export const PRO_PRODUCTS = { monthly: 'com.untilfire.pro.monthly', yearly: 'com.untilfire.pro.yearly' } as const
export type ProPlan = keyof typeof PRO_PRODUCTS

type Iap = typeof import('expo-iap')
function iap(): Iap | null {
  if (!nativeBuild) return null
  try { return require('expo-iap') as Iap } catch { return null }
}

export const iapAvailable = () => iap() != null

export interface ProPrice { plan: ProPlan; price: string; title: string }

/** Apple's prices in the person's own currency, as App Store Connect sets them. */
export async function loadProPrices(): Promise<ProPrice[]> {
  const m = iap()
  if (!m) return []
  await m.initConnection()
  const products = (await m.fetchProducts({ skus: Object.values(PRO_PRODUCTS), type: 'subs' })) ?? []
  return (Object.keys(PRO_PRODUCTS) as ProPlan[]).flatMap(plan => {
    const p = (products as { id: string; displayPrice?: string; title?: string }[]).find(x => x.id === PRO_PRODUCTS[plan])
    return p ? [{ plan, price: p.displayPrice ?? '', title: p.title ?? '' }] : []
  })
}

/** Sends a signed transaction to the website to unlock Pro on the account. */
async function confirm(accessToken: string, signedTransaction: string): Promise<string | null> {
  const res = await fetch(`${SITE}/api/apple/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTransaction }),
  }).catch(() => null)
  if (res?.ok) return null
  const body = res ? await res.json().catch(() => ({})) : {}
  return body.error ?? "Apple took the payment but Pro didn't switch on yet. Tap Restore purchases."
}

/**
 * Buys a plan. Resolves to null when Pro is on, 'cancelled' when the person
 * backed out of Apple's sheet, or a message to show.
 */
export function buyPro(plan: ProPlan, accessToken: string): Promise<string | 'cancelled' | null> {
  const m = iap()
  if (!m) return Promise.resolve('Purchases work in the App Store version of UntilFire.')
  return new Promise(resolve => {
    const done = (r: string | 'cancelled' | null) => { ok.remove(); fail.remove(); resolve(r) }
    const ok = m.purchaseUpdatedListener(async purchase => {
      if (purchase.productId !== PRO_PRODUCTS[plan] || !purchase.purchaseToken) return
      const problem = await confirm(accessToken, purchase.purchaseToken)
      // Finish only once the website has it, so an unconfirmed purchase replays on next launch.
      if (!problem) await m.finishTransaction({ purchase, isConsumable: false }).catch(() => {})
      done(problem)
    })
    const fail = m.purchaseErrorListener(error => {
      done(String((error as { code?: string }).code ?? '').includes('cancel') ? 'cancelled' : "The purchase didn't go through. Please try again.")
    })
    m.initConnection()
      .then(() => m.requestPurchase({ request: { apple: { sku: PRO_PRODUCTS[plan] } }, type: 'subs' }))
      .catch(() => done("Couldn't open Apple's purchase sheet. Please try again."))
  })
}

/** Restore purchases (Apple requires the button): re-sends any active Pro to the website. */
export async function restorePro(accessToken: string): Promise<string | null> {
  const m = iap()
  if (!m) return 'Purchases work in the App Store version of UntilFire.'
  await m.initConnection()
  await m.restorePurchases().catch(() => {})
  const purchases = (await m.getAvailablePurchases().catch(() => [])) ?? []
  const pro = purchases.find(p => (Object.values(PRO_PRODUCTS) as string[]).includes(p.productId) && p.purchaseToken)
  if (!pro) return 'No UntilFire Pro purchase found on this Apple ID.'
  const problem = await confirm(accessToken, pro.purchaseToken!)
  if (!problem) await m.finishTransaction({ purchase: pro, isConsumable: false }).catch(() => {})
  return problem
}
