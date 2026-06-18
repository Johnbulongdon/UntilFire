// Fetches historical daily price data from Stooq (no API key required).
// Responses are cached by Next.js data cache for 24 hours per ticker.
// All functions degrade gracefully — callers must handle empty return arrays.

export interface PricePoint {
  date: string  // YYYY-MM-DD
  close: number
}

// Map a portfolio ticker to a Stooq ticker symbol.
function stooqSymbol(ticker: string): string {
  const t = ticker.toUpperCase()
  if (t === '^SPX' || t === 'SPX') return '%5Espx'
  return `${ticker.toLowerCase()}.us`
}

export async function fetchDailyPrices(ticker: string): Promise<PricePoint[]> {
  const sym = stooqSymbol(ticker)
  const url = `https://stooq.com/q/d/l/?s=${sym}&i=d`

  try {
    const res = await fetch(url, {
      // Cache each ticker for 24 hours server-side.
      next: { revalidate: 86400 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const text = await res.text()
    return parseCsv(text)
  } catch {
    return []
  }
}

function parseCsv(csv: string): PricePoint[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const dateIdx = header.indexOf('date')
  const closeIdx = header.indexOf('close')
  if (dateIdx === -1 || closeIdx === -1) return []

  const points: PricePoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length <= Math.max(dateIdx, closeIdx)) continue
    const date = cols[dateIdx].trim()
    const close = parseFloat(cols[closeIdx].trim())
    if (!date || isNaN(close) || close <= 0) continue
    points.push({ date, close })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

// Resample daily prices to monthly (last trading day of each month).
export function toMonthly(daily: PricePoint[]): PricePoint[] {
  const byMonth = new Map<string, PricePoint>()
  for (const p of daily) {
    byMonth.set(p.date.slice(0, 7), p)
  }
  return Array.from(byMonth.values()).sort((a, b) => a.date.localeCompare(b.date))
}
