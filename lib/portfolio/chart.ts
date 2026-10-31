// Shared chart helpers + brand palette for the portfolio report.
// Pure — safe to import from edge image routes and server pages.

import type { Holding } from '@/lib/portfolio/parse'
import { normalizeHoldings } from '@/lib/portfolio/parse'
import type { Grade } from '@/lib/portfolio/rules'

// Allocation fills use Next Horizon palette B; grades retain semantic ink.
export const SLICE_COLORS = [
  "#BCE9DA", "#FFD4B8", "#D9CEF3", "#B9D9F7", "#FFE58A",
  "#F4CEE3", "#CDE6AE", "#F7C6CB", "#DED8CD", "#EEE9FA",
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
  A: '#17684B',
  B: '#2C826C',
  C: '#815A16',
  D: '#B63D46',
}
