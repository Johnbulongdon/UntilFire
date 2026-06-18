// Rules-based portfolio "health check". Produces a grade, a one-line verdict,
// and specific notes from the holdings + curated fund metadata. No market data.
// Pure functions only — safe to import from edge image routes and server pages.

import { getFund, type AssetClass } from '@/lib/funds/metadata'
import { normalizeHoldings, type Holding } from '@/lib/portfolio/parse'

export type NoteKind = 'good' | 'warn' | 'bad'

export interface VerdictNote {
  kind: NoteKind
  text: string
}

export interface Breakdown {
  equityPct: number
  bondPct: number
  cashPct: number
  realAssetPct: number // REIT + commodity + crypto
  usEquityPct: number
  intlEquityPct: number // developed + EM, as a share of the whole portfolio
  emEquityPct: number
  intlShareOfEquity: number // intl equity as a share of total equity
  weightedExpenseRatio: number
  unknownPct: number
  largestHolding: { ticker: string; weight: number } | null
}

export type Grade = 'A' | 'B' | 'C' | 'D'

export interface Verdict {
  grade: Grade
  score: number
  headline: string
  notes: VerdictNote[]
  breakdown: Breakdown
}

const EQUITY_CLASSES: AssetClass[] = [
  'us-equity',
  'intl-equity',
  'em-equity',
  'global-equity',
  'sector-equity',
  'single-stock',
]

export function analyzePortfolio(rawHoldings: Holding[]): Verdict {
  const holdings = normalizeHoldings(rawHoldings)

  const b: Breakdown = {
    equityPct: 0,
    bondPct: 0,
    cashPct: 0,
    realAssetPct: 0,
    usEquityPct: 0,
    intlEquityPct: 0,
    emEquityPct: 0,
    intlShareOfEquity: 0,
    weightedExpenseRatio: 0,
    unknownPct: 0,
    largestHolding: null,
  }

  const overlapGroups = new Map<string, number>()
  let knownWeight = 0

  for (const h of holdings) {
    if (!b.largestHolding || h.weight > b.largestHolding.weight) {
      b.largestHolding = { ticker: h.ticker, weight: h.weight }
    }

    const fund = getFund(h.ticker)
    if (!fund) {
      b.unknownPct += h.weight
      continue
    }
    knownWeight += h.weight
    b.weightedExpenseRatio += (fund.expenseRatio / 100) * h.weight

    if (fund.overlapGroup) {
      overlapGroups.set(fund.overlapGroup, (overlapGroups.get(fund.overlapGroup) ?? 0) + h.weight)
    }

    if (fund.isBond && fund.assetClass === 'cash') {
      b.cashPct += h.weight
    } else if (fund.assetClass === 'bond') {
      b.bondPct += h.weight
    } else if (fund.assetClass === 'reit' || fund.assetClass === 'commodity' || fund.assetClass === 'crypto') {
      b.realAssetPct += h.weight
    } else if (EQUITY_CLASSES.includes(fund.assetClass)) {
      b.equityPct += h.weight
      if (fund.assetClass === 'em-equity') {
        b.emEquityPct += h.weight
        b.intlEquityPct += h.weight
      } else if (fund.assetClass === 'intl-equity') {
        b.intlEquityPct += h.weight
      } else if (fund.assetClass === 'global-equity') {
        // Total-world funds are ~60% US / 40% ex-US.
        b.usEquityPct += h.weight * 0.6
        b.intlEquityPct += h.weight * 0.4
      } else {
        b.usEquityPct += h.weight
      }
    }
  }

  // Convert the accumulated weighted ER (already a percent of portfolio) to an
  // average over the *known* portion so unknowns don't understate it.
  if (knownWeight > 0) {
    b.weightedExpenseRatio = (b.weightedExpenseRatio / knownWeight) * 100
  }
  b.intlShareOfEquity = b.equityPct > 0 ? (b.intlEquityPct / b.equityPct) * 100 : 0

  const notes: VerdictNote[] = []
  let score = 100

  // --- Unknown tickers ---
  if (b.unknownPct > 0) {
    notes.push({
      kind: 'warn',
      text: `${fmtPct(b.unknownPct)} is in tickers we don't recognize — analysis below covers the rest.`,
    })
  }

  // --- Single-position concentration ---
  const largest = b.largestHolding
  if (largest) {
    const fund = getFund(largest.ticker)
    const isBroad = fund?.broad === true
    if (fund?.assetClass === 'single-stock' && largest.weight > 20) {
      score -= 25
      notes.push({ kind: 'bad', text: `${largest.ticker} is ${fmtPct(largest.weight)} of the portfolio — heavy single-stock concentration.` })
    } else if (!isBroad && largest.weight > 50) {
      score -= 15
      notes.push({ kind: 'warn', text: `${largest.ticker} is ${fmtPct(largest.weight)} of the portfolio — fairly concentrated in one fund.` })
    }
  }

  // --- Equity / bond mix ---
  if (b.equityPct >= 99 && b.bondPct === 0 && b.cashPct < 2) {
    notes.push({ kind: 'warn', text: '100% equities — strong for long horizons, but expect deep drawdowns and add bonds as you near the goal.' })
    score -= 4
  } else if (b.bondPct > 0 || b.cashPct > 0) {
    notes.push({ kind: 'good', text: `Balanced mix: ~${fmtPct(b.equityPct)} stocks / ${fmtPct(b.bondPct + b.cashPct)} bonds & cash.` })
  }

  // --- International diversification ---
  if (b.equityPct > 5) {
    if (b.intlShareOfEquity < 1) {
      score -= 12
      notes.push({ kind: 'warn', text: 'No international stocks — 100% US is a home-country bet. Many advisers suggest 20–40% ex-US.' })
    } else if (b.intlShareOfEquity < 15) {
      score -= 5
      notes.push({ kind: 'warn', text: `Only ${fmtPct(b.intlShareOfEquity)} of stocks are international — light on global diversification.` })
    } else if (b.intlShareOfEquity <= 45) {
      notes.push({ kind: 'good', text: `Globally diversified — ${fmtPct(b.intlShareOfEquity)} of stocks are international.` })
    }
  }

  // --- Overlap / redundancy ---
  const usLargeCap =
    (overlapGroups.get('us-total') ?? 0) +
    (overlapGroups.get('us-sp500') ?? 0) +
    (overlapGroups.get('us-nasdaq') ?? 0) +
    (overlapGroups.get('us-growth') ?? 0)
  const overlappingBuckets = ['us-total', 'us-sp500', 'us-nasdaq', 'us-growth'].filter(
    (g) => (overlapGroups.get(g) ?? 0) > 0,
  ).length
  if (overlappingBuckets >= 2 && usLargeCap > 10) {
    score -= 8
    notes.push({ kind: 'warn', text: 'Multiple US large-cap funds overlap heavily — you may be paying for redundant exposure.' })
  }

  // --- Cost ---
  if (knownWeight > 0) {
    if (b.weightedExpenseRatio <= 0.1) {
      notes.push({ kind: 'good', text: `Low cost — ${b.weightedExpenseRatio.toFixed(2)}% weighted expense ratio.` })
    } else if (b.weightedExpenseRatio > 0.5) {
      score -= 14
      notes.push({ kind: 'bad', text: `High cost — ${b.weightedExpenseRatio.toFixed(2)}% weighted expense ratio drags on returns.` })
    } else if (b.weightedExpenseRatio > 0.25) {
      score -= 6
      notes.push({ kind: 'warn', text: `Moderate cost — ${b.weightedExpenseRatio.toFixed(2)}% weighted expense ratio. Cheaper index options exist.` })
    }
  }

  // --- Cash drag ---
  if (b.cashPct > 15) {
    score -= 6
    notes.push({ kind: 'warn', text: `${fmtPct(b.cashPct)} in cash — fine as an emergency buffer, but it won't compound.` })
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const grade = toGrade(score)
  const headline = toHeadline(grade, b)

  // Make sure there's always at least one note.
  if (notes.length === 0) {
    notes.push({ kind: 'good', text: 'A clean, low-cost, diversified allocation. Stay the course.' })
  }

  return { grade, score, headline, notes, breakdown: b }
}

function toGrade(score: number): Grade {
  if (score >= 88) return 'A'
  if (score >= 74) return 'B'
  if (score >= 58) return 'C'
  return 'D'
}

function toHeadline(grade: Grade, b: Breakdown): string {
  if (b.unknownPct >= 60) return 'Add recognized tickers for a full read'
  switch (grade) {
    case 'A':
      return 'Solid, low-cost, well-diversified portfolio'
    case 'B':
      return 'Good portfolio with a couple of things to tighten'
    case 'C':
      return 'Workable, but a few gaps are worth fixing'
    case 'D':
      return 'Some real risks here worth addressing'
  }
}

function fmtPct(n: number): string {
  return `${Math.round(n)}%`
}
