// Backtested portfolio metrics from monthly price series.
// Simulates monthly rebalancing to target weights.
// Risk-free rate is treated as 0 for Sharpe/Sortino — standard for
// ETF comparison tools where the goal is relative, not absolute, assessment.

import { toMonthly, type PricePoint } from '@/lib/market/stooq'
import type { Holding } from '@/lib/portfolio/parse'

export interface PortfolioMetrics {
  totalReturn: number       // percent, e.g. 76.04
  benchmarkReturn: number   // percent, S&P 500 over same period
  cagr: number              // percent annualized
  benchmarkCagr: number
  volatility: number        // percent annualized std dev of monthly returns
  sharpe: number            // annualized (rf = 0)
  sortino: number           // annualized (rf = 0)
  maxDrawdown: number       // percent, negative, e.g. -25.06
  beta: number
  alpha: number             // percent annualized
  years: number
  portfolioSeries: number[] // normalized to 100 at start, monthly
  benchmarkSeries: number[] // normalized to 100 at start, monthly
}

export function computeMetrics(
  holdings: Holding[],
  pricesByTicker: Map<string, PricePoint[]>,
  benchmarkDaily: PricePoint[],
  windowYears = 5,
): PortfolioMetrics | null {
  const benchmarkMonthly = toMonthly(benchmarkDaily)
  if (benchmarkMonthly.length < 13) return null

  // Collect monthly series for each holding with data.
  const seriesByTicker = new Map<string, PricePoint[]>()
  for (const h of holdings) {
    const daily = pricesByTicker.get(h.ticker)
    if (!daily || daily.length < 13) continue
    seriesByTicker.set(h.ticker, toMonthly(daily))
  }
  if (seriesByTicker.size === 0) return null

  // Find the intersection of dates across all series + benchmark.
  const benchDates = new Set(benchmarkMonthly.map((p) => p.date))
  let commonDates = benchDates
  for (const [, series] of seriesByTicker) {
    const s = new Set(series.map((p) => p.date))
    commonDates = new Set([...commonDates].filter((d) => s.has(d)))
  }

  const sortedDates = Array.from(commonDates).sort()
  const maxMonths = windowYears * 12 + 1
  const window = sortedDates.slice(-maxMonths)
  if (window.length < 13) return null

  // Build price lookup maps.
  const benchMap = new Map(benchmarkMonthly.map((p) => [p.date, p.close]))
  const tickerMaps = new Map<string, Map<string, number>>()
  for (const [ticker, series] of seriesByTicker) {
    tickerMaps.set(ticker, new Map(series.map((p) => [p.date, p.close])))
  }

  // Normalize holding weights to 100% across tickers that have data.
  const activeHoldings = holdings.filter((h) => seriesByTicker.has(h.ticker))
  const totalWeight = activeHoldings.reduce((s, h) => s + h.weight, 0)
  const weights = new Map(activeHoldings.map((h) => [h.ticker, h.weight / totalWeight]))

  // Compute monthly returns for portfolio and benchmark.
  const portMonthlyReturns: number[] = []
  const benchMonthlyReturns: number[] = []
  const portSeries: number[] = [100]
  const benchSeries: number[] = [100]

  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1]
    const curr = window[i]

    // Portfolio return = weighted sum of individual ticker returns.
    let portReturn = 0
    for (const [ticker, weight] of weights) {
      const tickerMap = tickerMaps.get(ticker)!
      const pPrev = tickerMap.get(prev)
      const pCurr = tickerMap.get(curr)
      if (pPrev && pCurr && pPrev > 0) {
        portReturn += weight * (pCurr / pPrev - 1)
      }
    }

    const bPrev = benchMap.get(prev) ?? 0
    const bCurr = benchMap.get(curr) ?? 0
    const benchReturn = bPrev > 0 ? bCurr / bPrev - 1 : 0

    portMonthlyReturns.push(portReturn)
    benchMonthlyReturns.push(benchReturn)
    portSeries.push(portSeries[portSeries.length - 1] * (1 + portReturn))
    benchSeries.push(benchSeries[benchSeries.length - 1] * (1 + benchReturn))
  }

  const n = portMonthlyReturns.length
  if (n < 12) return null
  const years = n / 12

  const portTotal = portSeries[portSeries.length - 1] / 100 - 1
  const benchTotal = benchSeries[benchSeries.length - 1] / 100 - 1

  const portCagr = (Math.pow(1 + portTotal, 1 / years) - 1) * 100
  const benchCagr = (Math.pow(1 + benchTotal, 1 / years) - 1) * 100

  const portVol = annualizedStd(portMonthlyReturns) * 100
  const benchVar = variance(benchMonthlyReturns)
  const cov = covariance(portMonthlyReturns, benchMonthlyReturns)
  const beta = benchVar > 0 ? cov / benchVar : 1
  const alpha = (portCagr - beta * benchCagr)

  const meanMonthly = mean(portMonthlyReturns)
  const sharpe = portVol > 0 ? (meanMonthly * 12 * 100) / portVol : 0
  const sortino = sortinoDev(portMonthlyReturns) > 0
    ? (meanMonthly * 12 * 100) / (sortinoDev(portMonthlyReturns) * 100)
    : 0
  const maxDrawdown = computeMaxDrawdown(portSeries) * 100

  return {
    totalReturn: round(portTotal * 100),
    benchmarkReturn: round(benchTotal * 100),
    cagr: round(portCagr),
    benchmarkCagr: round(benchCagr),
    volatility: round(portVol),
    sharpe: round(sharpe),
    sortino: round(sortino),
    maxDrawdown: round(maxDrawdown),
    beta: round(beta),
    alpha: round(alpha),
    years: round(years),
    portfolioSeries: portSeries.map((v) => round(v)),
    benchmarkSeries: benchSeries.map((v) => round(v)),
  }
}

// --- Statistical helpers ---

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

function variance(xs: number[]): number {
  const m = mean(xs)
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length
}

function covariance(xs: number[], ys: number[]): number {
  const mx = mean(xs)
  const my = mean(ys)
  return xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.length
}

function annualizedStd(monthlyReturns: number[]): number {
  return Math.sqrt(variance(monthlyReturns) * 12)
}

function sortinoDev(monthlyReturns: number[]): number {
  const downside = monthlyReturns.filter((r) => r < 0)
  if (downside.length === 0) return 0
  const mse = downside.reduce((s, r) => s + r * r, 0) / monthlyReturns.length
  return Math.sqrt(mse * 12)
}

function computeMaxDrawdown(series: number[]): number {
  let peak = series[0]
  let maxDD = 0
  for (const v of series) {
    if (v > peak) peak = v
    const dd = (v - peak) / peak
    if (dd < maxDD) maxDD = dd
  }
  return maxDD
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

// Encode a series to a compact URL param: round to 1dp, join with ~.
export function encodeSeries(series: number[]): string {
  return series.map((v) => v.toFixed(1)).join('~')
}

// Decode a series from a URL param.
export function decodeSeries(param: string | null | undefined): number[] {
  if (!param) return []
  return param.split('~').map(Number).filter((n) => !isNaN(n))
}
