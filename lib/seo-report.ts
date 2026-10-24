export type SeoDimension = 'total' | 'page' | 'query'

export interface SeoSearchRow {
  date: string
  dimension: SeoDimension
  dimension_value: string
  clicks: number
  impressions: number
  ctr: number | null
  position: number | null
}

export interface SeoMetricSummary {
  clicks: number
  impressions: number
  ctr: number | null
  position: number | null
}

export interface SeoDimensionSummary extends SeoMetricSummary {
  value: string
  branded?: boolean
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/

export function shiftIsoDate(date: string, days: number): string {
  if (!isoDate.test(date)) throw new Error(`Invalid ISO date: ${date}`)
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function seoWindow(end: string, days = 28) {
  if (days < 1) throw new Error('SEO window must contain at least one day')
  return { start: shiftIsoDate(end, -(days - 1)), end }
}

function inWindow(date: string, start: string, end: string) {
  return date >= start && date <= end
}

export function summarizeSeoRows(
  rows: SeoSearchRow[],
  start: string,
  end: string,
): SeoMetricSummary {
  const selected = rows.filter((row) => inWindow(row.date, start, end))
  const clicks = selected.reduce((sum, row) => sum + row.clicks, 0)
  const impressions = selected.reduce((sum, row) => sum + row.impressions, 0)
  const positioned = selected.filter(
    (row) => row.position !== null && row.impressions > 0,
  )
  const positionImpressions = positioned.reduce(
    (sum, row) => sum + row.impressions,
    0,
  )
  const weightedPosition = positioned.reduce(
    (sum, row) => sum + (row.position ?? 0) * row.impressions,
    0,
  )

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : null,
    position:
      positionImpressions > 0
        ? weightedPosition / positionImpressions
        : null,
  }
}

export function isBrandedQuery(query: string): boolean {
  const compact = query.toLowerCase().replace(/[^a-z0-9]/g, '')
  return compact.includes('untilfire')
}

export function aggregateSeoDimension(
  rows: SeoSearchRow[],
  dimension: 'page' | 'query',
  start: string,
  end: string,
  limit = 20,
): SeoDimensionSummary[] {
  const groups = new Map<string, SeoSearchRow[]>()
  for (const row of rows) {
    if (row.dimension !== dimension || !inWindow(row.date, start, end)) continue
    const group = groups.get(row.dimension_value) ?? []
    group.push(row)
    groups.set(row.dimension_value, group)
  }

  return Array.from(groups.entries())
    .map(([value, group]) => ({
      value,
      ...summarizeSeoRows(group, start, end),
      ...(dimension === 'query' ? { branded: isBrandedQuery(value) } : {}),
    }))
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
    .slice(0, limit)
}
