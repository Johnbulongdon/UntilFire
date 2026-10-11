import { currencySymbol, fromUSD } from './display-currency'

// Every amount the app shows starts in USD (as stored, like the website) and
// is shown in your display currency. Signs sit before the symbol: −$120.
const sign = (n: number) => (n < 0 ? '−' : '')

export function money(usd: number): string {
  const n = fromUSD(usd)
  return `${sign(n)}${currencySymbol()}${Math.round(Math.abs(n)).toLocaleString('en-US')}`
}

/** "$1.2M", "$850K" for big amounts in tight spaces; smaller ones stay exact. */
export function compactMoney(usd: number): string {
  const n = Math.abs(fromUSD(usd))
  if (n >= 1_000_000) return `${sign(usd)}${currencySymbol()}${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 100_000) return `${sign(usd)}${currencySymbol()}${Math.round(n / 1_000)}K`
  return money(usd)
}

/** Rounds to two significant figures, so suggestions read as $2,700, not $2,734. */
export function roundNice(n: number): number {
  if (!(n > 0)) return 0
  const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(n)) - 1))
  return Math.round(n / step) * step
}

/** "$12.40" — for single transactions, where cents matter. */
export function moneyExact(usd: number): string {
  const n = fromUSD(usd)
  return `${sign(n)}${currencySymbol()}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** An amount in its own currency, unconverted: a transaction exactly as recorded. */
export function moneyIn(amount: number, currency: string): string {
  return `${sign(amount)}${currencySymbol(currency)}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
