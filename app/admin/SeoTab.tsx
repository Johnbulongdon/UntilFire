'use client'

import { useEffect, useState } from 'react'

interface Metrics {
  clicks: number
  impressions: number
  ctr: number | null
  position: number | null
}

interface DimensionRow extends Metrics {
  value: string
  branded?: boolean
}

interface Report {
  status: 'ok' | 'empty'
  through?: string
  latestStored?: string
  message?: string
  current?: { start: string; end: string; metrics: Metrics }
  previous?: { start: string; end: string; metrics: Metrics }
  queryCoverage?: { branded: Metrics; nonBranded: Metrics; note: string }
  topQueries?: DimensionRow[]
  topPages?: DimensionRow[]
  truncated?: boolean
  sync?: {
    status: 'running' | 'ok' | 'error'
    started_at: string
    finished_at: string | null
    considered: number
    acted: number
    error: string | null
  } | null
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: '18px 16px',
}
const muted: React.CSSProperties = { color: '#64748B', fontSize: 12 }

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const percent = (value: number | null) =>
  value === null ? '—' : `${(value * 100).toFixed(1)}%`
const position = (value: number | null) =>
  value === null ? '—' : value.toFixed(1)
const syncTime = (report: Report) => {
  const value = report.sync?.finished_at ?? report.sync?.started_at
  return value ? new Date(value).toLocaleString() : null
}

function delta(
  current: number | null,
  previous: number | null,
  lowerIsBetter = false,
  scale = 1,
  digits = 0,
) {
  if (current === null || previous === null) return { text: 'No comparison', good: null }
  const difference = current - previous
  if (Math.abs(difference) < 0.0001) return { text: 'No change', good: null }
  const display = lowerIsBetter ? -difference : difference
  return {
    text: `${display > 0 ? '+' : ''}${(display * scale).toFixed(digits)}${scale === 100 ? ' pp' : ''} vs prior`,
    good: display > 0,
  }
}

export default function SeoTab({ token }: { token: string }) {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/seo', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error ?? 'Failed to load')
        return body as Report
      })
      .then(setReport)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load'))
  }, [token])

  if (error) return <p style={{ color: '#DC2626' }}>{error}</p>
  if (!report) return <p style={muted}>Loading search performance…</p>
  if (report.status === 'empty') {
    return (
      <div style={card}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>No Search Console rows yet</h2>
        <p style={{ ...muted, margin: 0 }}>{report.message}</p>
      </div>
    )
  }

  const current = report.current!
  const previous = report.previous!
  const metricCards = [
    {
      label: 'Organic clicks',
      value: integer.format(current.metrics.clicks),
      delta: delta(current.metrics.clicks, previous.metrics.clicks),
    },
    {
      label: 'Search impressions',
      value: integer.format(current.metrics.impressions),
      delta: delta(current.metrics.impressions, previous.metrics.impressions),
    },
    {
      label: 'Search CTR',
      value: percent(current.metrics.ctr),
      delta: delta(current.metrics.ctr, previous.metrics.ctr, false, 100, 1),
    },
    {
      label: 'Weighted position',
      value: position(current.metrics.position),
      delta: delta(current.metrics.position, previous.metrics.position, true, 1, 1),
    },
  ]

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Organic search scoreboard</h2>
          <div style={muted}>
            Current 28 days: {current.start}–{current.end} · previous: {previous.start}–{previous.end}
          </div>
        </div>
        <div style={{ ...muted, textAlign: 'right' }}>
          Data through <b>{report.through}</b><br />
          Latest stored: <b>{report.latestStored ?? '—'}</b><br />
          Sync: <b>{report.sync?.status ?? 'unknown'}</b>{syncTime(report) ? ` · ${syncTime(report)}` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {metricCards.map((metric) => (
          <div key={metric.label} style={card}>
            <div style={{ ...muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{metric.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 2px' }}>{metric.value}</div>
            <div style={{ fontSize: 12, color: metric.delta.good === null ? '#64748B' : metric.delta.good ? '#047857' : '#B91C1C' }}>
              {metric.delta.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
        <MetricGroup label="Branded queries" metrics={report.queryCoverage!.branded} />
        <MetricGroup label="Non-branded queries" metrics={report.queryCoverage!.nonBranded} />
        <div style={muted}>
          <b>Discovery only.</b> Search clicks are visits, not calculator completions or registrations. Use the PostHog funnel filtered by <code>landing_source=organic-*</code> for activation.
          <div style={{ marginTop: 6 }}>{report.queryCoverage!.note}</div>
        </div>
      </div>

      {report.truncated && (
        <div style={{ ...card, borderColor: '#F59E0B', color: '#92400E', fontSize: 13 }}>
          The detailed row limit was reached. Property totals are complete, but the page/query tables show only the highest-volume stored subset.
        </div>
      )}

      <SearchTable title="Top search queries" rows={report.topQueries ?? []} query />
      <SearchTable title="Top landing pages" rows={report.topPages ?? []} />
    </div>
  )
}

function MetricGroup({ label, metrics }: { label: string; metrics: Metrics }) {
  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
        <span><b>{integer.format(metrics.clicks)}</b> clicks</span>
        <span><b>{integer.format(metrics.impressions)}</b> impressions</span>
        <span><b>{percent(metrics.ctr)}</b> CTR</span>
        <span><b>{position(metrics.position)}</b> position</span>
      </div>
    </div>
  )
}

function SearchTable({ title, rows, query = false }: { title: string; rows: DimensionRow[]; query?: boolean }) {
  return (
    <div style={{ ...card, overflowX: 'auto' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>{title}</h2>
      {rows.length === 0 ? (
        <p style={muted}>No visible rows in this window.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748B' }}>
              <th style={{ padding: '8px 6px' }}>{query ? 'Query' : 'Page'}</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Clicks</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Impressions</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>CTR</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Position</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.value} style={{ borderTop: '1px solid #E2E8F0' }}>
                <td style={{ padding: '9px 6px', maxWidth: 540, overflowWrap: 'anywhere' }}>
                  {row.value}
                  {query && row.branded && <span style={{ ...muted, marginLeft: 6 }}>brand</span>}
                </td>
                <td style={{ padding: '9px 6px', textAlign: 'right' }}>{integer.format(row.clicks)}</td>
                <td style={{ padding: '9px 6px', textAlign: 'right' }}>{integer.format(row.impressions)}</td>
                <td style={{ padding: '9px 6px', textAlign: 'right' }}>{percent(row.ctr)}</td>
                <td style={{ padding: '9px 6px', textAlign: 'right' }}>{position(row.position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
