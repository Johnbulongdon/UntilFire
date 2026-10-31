import Logo from '@/app/components/Logo'
import { Metadata } from 'next'
import PortfolioForm from './PortfolioForm'

export const metadata: Metadata = {
  title: 'Rate My Portfolio — free instant checkup | UntilFire',
  description:
    'Paste your tickers and weights and get an instant, shareable portfolio health check: diversification, home bias, fund overlap, and fees. Free, no login.',
}

export default function PortfolioPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--uf-ground)',
        color: 'var(--uf-ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '80px 24px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 640, width: '100%', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          <Logo variant="auto" size={28} />
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>
          Is this portfolio OK?
        </h1>
        <p style={{ fontSize: 19, color: 'var(--uf-ink-2)', marginTop: 16, lineHeight: 1.5 }}>
          Paste your holdings and get an instant checkup — diversification, home-country bias, fund overlap, and fees —
          plus a shareable report card.
        </p>
      </div>
      <PortfolioForm />
    </main>
  )
}
