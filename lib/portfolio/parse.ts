// Parsing + URL encoding for portfolio holdings.
// Pure functions only — safe to import from edge image routes and server pages.

export interface Holding {
  ticker: string
  // Weight as a percent of the portfolio, e.g. 50 means 50%.
  weight: number
}

export interface ParseResult {
  holdings: Holding[]
  totalWeight: number
  errors: string[]
}

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/

// Accepts flexible free text:
//   "VTI 50%, VXUS 30%, BND 20%"
//   "VTI:50, VXUS:30, BND:20"
//   "VTI 50\nVXUS 30\nBND 20"
// Returns normalized holdings plus any parse errors.
export function parseHoldingsText(input: string): ParseResult {
  const errors: string[] = []
  const holdings: Holding[] = []
  const seen = new Set<string>()

  if (!input || !input.trim()) {
    return { holdings, totalWeight: 0, errors: ['Enter at least one holding.'] }
  }

  // Split on commas and newlines; each chunk is "TICKER weight".
  const chunks = input
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean)

  for (const chunk of chunks) {
    // Separate ticker from weight: allow "VTI 50", "VTI:50", "VTI 50%".
    const m = chunk.match(/^([A-Za-z0-9.\-]+)\s*[:=\s]\s*(\d+(?:\.\d+)?)\s*%?$/)
    if (!m) {
      errors.push(`Could not read "${chunk}". Use "TICKER weight", e.g. VTI 50.`)
      continue
    }
    const ticker = m[1].toUpperCase()
    const weight = parseFloat(m[2])

    if (!TICKER_RE.test(ticker)) {
      errors.push(`"${ticker}" does not look like a ticker.`)
      continue
    }
    if (!(weight > 0)) {
      errors.push(`Weight for ${ticker} must be greater than 0.`)
      continue
    }
    if (seen.has(ticker)) {
      // Merge duplicate tickers by summing weights.
      const existing = holdings.find((h) => h.ticker === ticker)
      if (existing) existing.weight += weight
      continue
    }
    seen.add(ticker)
    holdings.push({ ticker, weight })
  }

  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0)
  return { holdings, totalWeight, errors }
}

// Normalize weights so they sum to 100 (preserves relative proportions).
export function normalizeHoldings(holdings: Holding[]): Holding[] {
  const total = holdings.reduce((sum, h) => sum + h.weight, 0)
  if (total <= 0) return holdings
  return holdings.map((h) => ({ ticker: h.ticker, weight: (h.weight / total) * 100 }))
}

// Compact, shareable URL encoding: "VTI:50,VXUS:30,BND:20".
export function encodeHoldings(holdings: Holding[]): string {
  return holdings
    .map((h) => `${h.ticker}:${round(h.weight)}`)
    .join(',')
}

// Decode the "h" URL param back into holdings.
export function decodeHoldings(param: string | null | undefined): Holding[] {
  if (!param) return []
  const holdings: Holding[] = []
  const seen = new Set<string>()
  for (const pair of param.split(',')) {
    const [rawTicker, rawWeight] = pair.split(':')
    if (!rawTicker || !rawWeight) continue
    const ticker = rawTicker.trim().toUpperCase()
    const weight = parseFloat(rawWeight)
    if (!TICKER_RE.test(ticker) || !(weight > 0) || seen.has(ticker)) continue
    seen.add(ticker)
    holdings.push({ ticker, weight })
  }
  return holdings
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
