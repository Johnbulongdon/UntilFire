/**
 * Percentiles of a weighted sample. Pure, no imports: used by the benchmark
 * build script and by its guard.
 */

export interface WeightedValue { value: number; weight: number }

/**
 * Cutpoints at 1% … 99%: cutpoints[k - 1] is the smallest value at or below
 * which at least k% of the total weight lies.
 */
export function weightedCutpoints(rows: WeightedValue[]): number[] {
  const sorted = rows.filter((r) => r.weight > 0 && Number.isFinite(r.value)).sort((a, b) => a.value - b.value)
  const total = sorted.reduce((sum, r) => sum + r.weight, 0)
  if (sorted.length === 0 || total <= 0) return []
  const cutpoints: number[] = []
  let cumulative = 0
  let i = 0
  for (let k = 1; k <= 99; k++) {
    const target = (k / 100) * total
    while (i < sorted.length - 1 && cumulative + sorted[i].weight < target) {
      cumulative += sorted[i].weight
      i++
    }
    cutpoints.push(sorted[i].value)
  }
  return cutpoints
}
