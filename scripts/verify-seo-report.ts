import assert from 'node:assert/strict'
import {
  aggregateSeoDimension,
  isBrandedQuery,
  seoWindow,
  shiftIsoDate,
  summarizeSeoRows,
  type SeoSearchRow,
} from '../lib/seo-report.ts'

const rows: SeoSearchRow[] = [
  { date: '2026-09-01', dimension: 'total', dimension_value: '', clicks: 2, impressions: 100, ctr: .02, position: 10 },
  { date: '2026-09-02', dimension: 'total', dimension_value: '', clicks: 3, impressions: 50, ctr: .06, position: 20 },
  { date: '2026-09-01', dimension: 'query', dimension_value: 'until fire', clicks: 1, impressions: 10, ctr: .1, position: 4 },
  { date: '2026-09-02', dimension: 'query', dimension_value: 'fire calculator', clicks: 2, impressions: 40, ctr: .05, position: 12 },
  { date: '2026-09-01', dimension: 'page', dimension_value: 'https://www.untilfire.com/', clicks: 2, impressions: 80, ctr: .025, position: 8 },
]

assert.equal(shiftIsoDate('2026-09-01', -1), '2026-08-31')
assert.deepEqual(seoWindow('2026-09-28'), { start: '2026-09-01', end: '2026-09-28' })

const totals = summarizeSeoRows(rows.filter((row) => row.dimension === 'total'), '2026-09-01', '2026-09-28')
assert.equal(totals.clicks, 5)
assert.equal(totals.impressions, 150)
assert.equal(totals.ctr, 5 / 150)
assert.equal(totals.position, (10 * 100 + 20 * 50) / 150)

const queries = aggregateSeoDimension(rows, 'query', '2026-09-01', '2026-09-28')
assert.equal(queries[0].value, 'fire calculator')
assert.equal(queries[1].branded, true)
assert.equal(isBrandedQuery('UntilFire.com'), true)
assert.equal(isBrandedQuery('until fire calculator'), true)
assert.equal(isBrandedQuery('fire calculator'), false)

console.log('SEO report ok: 28-day windows, weighted position, CTR and branded query grouping verified.')
