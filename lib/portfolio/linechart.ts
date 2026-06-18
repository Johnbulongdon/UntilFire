// Build SVG polyline points strings for the portfolio vs benchmark chart.
// Pure math — safe to call from server components and edge image routes.

export interface LineChartPaths {
  portfolioPoints: string
  benchmarkPoints: string
  baselineY: number
  minLabel: string
  maxLabel: string
  startLabel: string
  endLabel: string
  finalPortfolio: number
  finalBenchmark: number
}

export function buildLineChartPaths(
  portfolioSeries: number[],
  benchmarkSeries: number[],
  width: number,
  height: number,
  padX = 0,
  padY = 16,
): LineChartPaths {
  const combined = [...portfolioSeries, ...benchmarkSeries]
  const minVal = Math.min(...combined)
  const maxVal = Math.max(...combined)
  const range = maxVal - minVal || 1

  function toX(i: number, total: number): number {
    return padX + ((i / (total - 1)) * (width - padX * 2))
  }
  function toY(v: number): number {
    return height - padY - ((v - minVal) / range) * (height - padY * 2)
  }

  function toPoints(series: number[]): string {
    return series.map((v, i) => `${toX(i, series.length).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  }

  const baselineY = toY(100)
  const n = portfolioSeries.length
  const startDate = `Start`
  const endDate = `Now`

  return {
    portfolioPoints: toPoints(portfolioSeries),
    benchmarkPoints: toPoints(benchmarkSeries),
    baselineY,
    minLabel: `${minVal.toFixed(0)}`,
    maxLabel: `${maxVal.toFixed(0)}`,
    startLabel: startDate,
    endLabel: endDate,
    finalPortfolio: portfolioSeries[n - 1] ?? 100,
    finalBenchmark: benchmarkSeries[n - 1] ?? 100,
  }
}
