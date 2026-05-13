import { Metadata } from 'next'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ city?: string; year?: string; years?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { city = 'Your City', year = '', years = '' } = await searchParams

  const safeCity = city.slice(0, 40)
  const ogUrl = `/api/og?city=${encodeURIComponent(safeCity)}&year=${encodeURIComponent(year)}&years=${encodeURIComponent(years)}`

  return {
    title: `FIRE timeline for ${safeCity} — retire by ${year}`,
    description: `${years} years away on a typical income. Free calculator — find out when you could retire in your city.`,
    openGraph: {
      title: `FIRE timeline for ${safeCity} — retire by ${year}`,
      description: `${years} years away on a typical income. Free calculator — find out when you could retire in your city.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `Retire in ${safeCity} by ${year}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `FIRE timeline for ${safeCity} — retire by ${year}`,
      description: `${years} years away on a typical income. Free calculator — find out when you could retire in your city.`,
      images: [ogUrl],
    },
  }
}

export default async function SharePage({ searchParams }: Props) {
  const { city = 'Your City', year = '', years = '' } = await searchParams
  const safeCity = city.slice(0, 40)
  const yearsNum = parseInt(years, 10) || 0

  return (
    <main style={{
      minHeight: '100vh',
      background: '#F7F9FB',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Manrope', sans-serif",
      padding: '40px 24px',
      color: '#19181E',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500&display=swap');`}</style>

      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 56, fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: '#064E3B' }}>
          Until<span style={{ color: '#20D4BF' }}>Fire</span>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 20,
          padding: '40px 32px 36px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
          marginBottom: 32,
        }}>
          <p style={{ fontSize: 13, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: "'Inter', sans-serif" }}>
            Retire in
          </p>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 4px', color: '#064E3B', letterSpacing: '-0.02em' }}>
            {safeCity}
          </h1>
          <p style={{ fontSize: 56, fontWeight: 800, color: '#059669', margin: '0 0 10px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            by {year}
          </p>
          {yearsNum > 0 && (
            <p style={{ fontSize: 16, color: '#64748B', margin: '0 0 0', fontFamily: "'Inter', sans-serif" }}>
              {yearsNum} years away · based on a typical income
            </p>
          )}
        </div>

        {/* Divider */}
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 20 }}>
          What does your city look like?
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: '#059669',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 16,
            padding: '14px 36px',
            borderRadius: 10,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Calculate yours — free →
        </Link>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 14, fontFamily: "'Inter', sans-serif" }}>
          No login required. Takes 60 seconds.
        </p>
      </div>
    </main>
  )
}
