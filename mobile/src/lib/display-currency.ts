import { FALLBACK_RATES } from '@/engine'

/**
 * The currency amounts are shown in. Everything is stored in USD, as on the
 * website, and converted only for display and typing: USD × rate. The rate
 * comes from the same free source the website uses (frankfurter.app), falling
 * back to the website's fixed rates (lib/currency.ts).
 */
let code = 'USD'
let rates: Record<string, number> = FALLBACK_RATES

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', HKD: 'HK$', CHF: 'CHF ',
  NZD: 'NZ$', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ', KRW: '₩', INR: '₹', THB: '฿', MYR: 'RM', IDR: 'Rp', PHP: '₱',
  VND: '₫', TWD: 'NT$', MXN: 'MX$', BRL: 'R$', ZAR: 'R', AED: 'AED ', SAR: 'SAR ', TRY: '₺', PLN: 'zł ', CZK: 'Kč ',
  HUF: 'Ft ', ILS: '₪', NGN: '₦', PKR: 'Rs ',
}

export const currencySymbol = (c = code) => SYMBOLS[c] ?? `${c} `
export const displayCurrency = () => code
const rate = () => (code === 'USD' ? 1 : rates[code] ?? 1)

/** USD → the display currency. */
export const fromUSD = (usd: number) => usd * rate()
/** The display currency → USD, for amounts typed in. */
export const toUSDFromDisplay = (n: number) => n / rate()

export function setDisplayCurrency(next: string, nextRates?: Record<string, number>) {
  code = next || 'USD'
  if (nextRates) rates = { ...FALLBACK_RATES, ...nextRates }
}

/** Today's rates from the website's source; quietly keeps the fallback when offline. */
export async function loadRates(): Promise<Record<string, number> | null> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD')
    const d = await r.json()
    return d?.rates && typeof d.rates === 'object' ? d.rates : null
  } catch { return null }
}

/** A stored USD amount as the text of an input, in the display currency. Blank for none. */
export const toInput = (usd?: number | null) => (usd ? String(Math.round(fromUSD(usd) * 100) / 100) : '')
/** An input's text, typed in the display currency, back to USD. */
export const fromInput = (text: string) => toUSDFromDisplay(Number(text) || 0)

/** The flag of a currency's country (its code's first two letters), e.g. USD → 🇺🇸, EUR → 🇪🇺. */
export function currencyFlag(code: string): string {
  return [...code.slice(0, 2).toUpperCase()].map(ch => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('')
}
