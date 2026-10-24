import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import {
  aggregateSeoDimension,
  isBrandedQuery,
  seoWindow,
  shiftIsoDate,
  summarizeSeoRows,
  type SeoSearchRow,
} from '@/lib/seo-report'

const PAGE_SIZE = 1000
const MAX_DIMENSION_ROWS = 20_000

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req)
  if ('error' in auth) return auth.error
  const { admin } = auth

  const [{ data: latestRows, error: latestError }, { data: syncRun }] = await Promise.all([
    admin
      .from('seo_search_console')
      .select('date')
      .eq('dimension', 'total')
      .order('date', { ascending: false })
      .limit(1),
    admin
      .from('job_runs')
      .select('status,started_at,finished_at,considered,acted,error')
      .eq('job', 'gsc_sync')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (latestError) {
    return NextResponse.json({ error: latestError.message }, { status: 500 })
  }

  const latestStored = latestRows?.[0]?.date as string | undefined
  if (!latestStored) {
    return NextResponse.json({
      status: 'empty',
      sync: syncRun ?? null,
      message: 'Search Console is configured but has no stored impressions yet.',
    })
  }

  // Search Console commonly revises the newest three days. End comparisons
  // before that moving edge even when the sync has already stored a partial
  // row for yesterday.
  const reportingLagEnd = shiftIsoDate(new Date().toISOString().slice(0, 10), -3)
  const through = latestStored < reportingLagEnd ? latestStored : reportingLagEnd
  const current = seoWindow(through)
  const previousEnd = shiftIsoDate(current.start, -1)
  const previous = seoWindow(previousEnd)

  const { data: totalRows, error: totalError } = await admin
    .from('seo_search_console')
    .select('date,dimension,dimension_value,clicks,impressions,ctr,position')
    .eq('dimension', 'total')
    .gte('date', previous.start)
    .lte('date', current.end)
    .order('date', { ascending: true })

  if (totalError) {
    return NextResponse.json({ error: totalError.message }, { status: 500 })
  }

  const [pageResult, queryResult] = await Promise.all([
    readDimension('page'),
    readDimension('query'),
  ])

  if (pageResult.error || queryResult.error) {
    return NextResponse.json(
      { error: pageResult.error ?? queryResult.error },
      { status: 500 },
    )
  }

  const totals = (totalRows ?? []) as SeoSearchRow[]
  const queries = queryResult.rows

  return NextResponse.json({
    status: 'ok',
    through,
    latestStored,
    current: {
      ...current,
      metrics: summarizeSeoRows(totals, current.start, current.end),
    },
    previous: {
      ...previous,
      metrics: summarizeSeoRows(totals, previous.start, previous.end),
    },
    queryCoverage: {
      branded: summarizeSeoRows(
        queries.filter((row) => isBrandedQuery(row.dimension_value)),
        current.start,
        current.end,
      ),
      nonBranded: summarizeSeoRows(
        queries.filter((row) => !isBrandedQuery(row.dimension_value)),
        current.start,
        current.end,
      ),
      note: 'Google anonymises rare queries, so query totals do not equal property totals.',
    },
    topQueries: aggregateSeoDimension(
      queries,
      'query',
      current.start,
      current.end,
      20,
    ),
    topPages: aggregateSeoDimension(
      pageResult.rows,
      'page',
      current.start,
      current.end,
      20,
    ),
    truncated: pageResult.truncated || queryResult.truncated,
    sync: syncRun ?? null,
  })

  async function readDimension(dimension: 'page' | 'query'): Promise<{
    rows: SeoSearchRow[]
    truncated: boolean
    error?: string
  }> {
    const rows: SeoSearchRow[] = []
    for (let from = 0; from < MAX_DIMENSION_ROWS; from += PAGE_SIZE) {
      const { data, error } = await admin
        .from('seo_search_console')
        .select('date,dimension,dimension_value,clicks,impressions,ctr,position')
        .eq('dimension', dimension)
        .gte('date', current.start)
        .lte('date', current.end)
        .order('date', { ascending: true })
        .order('dimension_value', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) return { rows, truncated: false, error: error.message }
      const batch = (data ?? []) as SeoSearchRow[]
      rows.push(...batch)
      if (batch.length < PAGE_SIZE) return { rows, truncated: false }
    }
    return { rows, truncated: true }
  }
}
