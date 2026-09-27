import Link from 'next/link'

const guides = [
  { href: '/fire-number/fire-by-state', label: 'FIRE number by state' },
  { href: '/fire-number/best-states', label: 'Best states for FIRE' },
  { href: '/fire-number/cheapest-cities', label: 'Cheapest cities for FIRE' },
  { href: '/fire-number/most-expensive-cities', label: 'Most expensive FIRE cities' },
  { href: '/fire-number/no-income-tax-states', label: 'No-income-tax states' },
]

export default function UsFireGuideLinks({ current }: { current: string }) {
  const related = guides.filter((guide) => guide.href !== current)

  return (
    <section aria-labelledby="more-us-fire-guides" style={{ margin: '42px 0' }}>
      <h2 id="more-us-fire-guides" style={{ fontSize: 20, fontWeight: 800, color: 'var(--uf-green-900)', margin: '0 0 8px' }}>
        Compare another US FIRE path
      </h2>
      <p style={{ fontSize: 14, color: 'var(--uf-ink-2)', lineHeight: 1.65, margin: '0 0 14px' }}>
        Cost, state taxes, and the lifestyle you want can change the portfolio you need. Use the comparison that matches your next decision.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {related.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            style={{
              textDecoration: 'none',
              background: 'var(--uf-card)',
              border: '1px solid var(--uf-border)',
              borderRadius: 999,
              padding: '10px 14px',
              color: 'var(--uf-green-900)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {guide.label} →
          </Link>
        ))}
      </div>
    </section>
  )
}
