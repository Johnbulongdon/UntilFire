import Link from 'next/link'

export const metadata = { title: 'Topics — UntilFire' }

export default function TopicsPage() {
  return (
    <div style={{ background: '#F7F9FB', minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
      <nav style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em', color: '#064E3B' }}>
          Until<span style={{ color: '#20D4BF' }}>Fire</span>
        </Link>
        <Link href="/dashboard" style={{ color: '#64748B', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
      </nav>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
        <p style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Learn</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#19181E', letterSpacing: '-0.03em', margin: '0 0 16px' }}>Topics</h1>
        <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 40 }}>
          Browse FIRE concepts by topic — savings rate, withdrawal rates, tax-advantaged accounts, and more. Coming soon.
        </p>
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📚</div>
          <p style={{ fontWeight: 700, fontSize: 18, color: '#19181E', margin: '0 0 8px' }}>Topics coming soon</p>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>A curated index of FIRE concepts and strategies is on the way.</p>
        </div>
      </div>
    </div>
  )
}
