// Shared chart helpers + brand palette for the portfolio report.
// Pure — safe to import from edge image routes and server pages.

import type { Holding } from '@/lib/portfolio/parse'
import { normalizeHoldings } from '@/lib/portfolio/parse'
import type { Grade } from '@/lib/portfolio/rules'

// Allocation slice palette (brand teal/orange family + supporting tones).
export const SLICE_COLORS = [
  '#22d3a5',
  '#f97316',
  '#34d399',
  '#60a5fa',
  '#fbbf24',
  '#a78bfa',
  '#f472b6',
  '#2dd4bf',
  '#fb7185',
  '#94a3b8',
]

export interface DonutSegment {
  ticker: string
  weight: number
  color: string
  // Stroke dash values for a circle of the given circumference.
  dashArray: string
  dashOffset: string
}

// Build donut segments for an SVG <circle> stack (stroke-dasharray technique).
// Caller renders one circle per segment, all rotated -90deg to start at top.
export function buildDonutSegments(rawHoldings: Holding[], circumference: number): DonutSegment[] {
  const holdings = normalizeHoldings(rawHoldings)
  const segments: DonutSegment[] = []
  let cumulative = 0
  holdings.forEach((h, i) => {
    const fraction = h.weight / 100
    const len = fraction * circumference
    segments.push({
      ticker: h.ticker,
      weight: h.weight,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      dashArray: `${len} ${circumference - len}`,
      dashOffset: `${-cumulative * circumference}`,
    })
    cumulative += fraction
  })
  return segments
}

export const GRADE_COLORS: Record<Grade, string> = {
  A: '#22d3a5',
  B: '#34d399',
  C: '#fbbf24',
  D: '#f97316',
}
