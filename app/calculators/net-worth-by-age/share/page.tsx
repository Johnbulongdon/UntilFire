import { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import PercentileTrack from '@/app/components/PercentileTrack'
import { parseNetWorthShare, sharePct, shareWho } from '@/lib/net-worth-share'
import styles from '../NetWorthByAge.module.css'

const PAGE_URL = 'https://www.untilfire.com/calculators/net-worth-by-age'

interface Props {
  searchParams: Promise<{ a?: string; p?: string }>
}

/**
 * Where a shared net worth result lands. It exists for the preview image and
 * a way into the calculator; it is noindex and canonical to the page itself,
 * so share links never compete with it in search.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { a, p } = await searchParams
  const share = parseNetWorthShare(a, p)
  const title = share
    ? `Ahead of ${sharePct(share)} of ${shareWho(share)} | UntilFire`
    : 'How does your net worth compare? | UntilFire'
  const description = 'Compare your net worth with US households your age, from Federal Reserve data in today’s dollars. Free, no sign-up.'
  const image = share ? `/api/og/net-worth?a=${share.band}&p=${share.pct ?? 'top'}` : '/api/og/net-worth'
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: PAGE_URL },
    openGraph: { title, description, url: PAGE_URL, siteName: 'UntilFire', type: 'website', images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function NetWorthSharePage({ searchParams }: Props) {
  const { a, p } = await searchParams
  const share = parseNetWorthShare(a, p)
  const who = share ? shareWho(share) : ''

  return (
    <main style={{ background: 'var(--uf-ground)', color: 'var(--uf-ink)', minHeight: '100vh', padding: 'var(--uf-s7) var(--uf-s6)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 'var(--uf-s5)', justifyItems: 'center', textAlign: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo variant="auto" size={22} /></Link>
        <div style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 20, padding: 'var(--uf-s6) var(--uf-s5)', width: '100%', display: 'grid', gap: 'var(--uf-s4)', justifyItems: 'center' }}>
          {share ? (
            <>
              <h1 className="uf-t-h2" style={{ margin: 0, lineHeight: 1.25 }}>
                Someone&apos;s net worth is ahead of <span style={{ color: 'var(--uf-teal)' }}>{sharePct(share)}</span> of {who}
              </h1>
              <PercentileTrack position={share.pct ?? 99.5} label={`Ahead of ${sharePct(share)} of ${who}`} width="100%" />
            </>
          ) : (
            <h1 className="uf-t-h2" style={{ margin: 0 }}>How does your net worth compare with people your age?</h1>
          )}
          <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>
            From the Federal Reserve&apos;s Survey of Consumer Finances, in today&apos;s dollars. Free, no sign-up, and your net worth stays in your browser.
          </p>
          <Link
            href="/calculators/net-worth-by-age"
            className={`uf-t-body ${styles.primaryLink}`}
            style={{ display: 'inline-block', background: 'var(--uf-green)', padding: 'var(--uf-s3) var(--uf-s5)', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}
          >
            See how you compare →
          </Link>
        </div>
      </div>
    </main>
  )
}
