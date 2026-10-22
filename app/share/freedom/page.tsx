import { Metadata } from 'next'
import Link from 'next/link'
import { parseFreedomYear } from '@/lib/freedom-share'
import { siteUrl } from '@/lib/site'
import styles from './FreedomShare.module.css'

interface Props {
  searchParams: Promise<{ y?: string }>
}

const START = '/?start=onboarding&source=share-freedom-year'

/**
 * Where a shared freedom year lands (D-98). It exists for the preview image
 * and a way into the calculator; it is noindex and canonical to the landing
 * page, so share links never compete with it in search.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { y } = await searchParams
  const year = parseFreedomYear(y)
  const title = year ? `Free to stop working in ${year} | UntilFire` : 'When could you stop working? | UntilFire'
  const description = 'Find the year work becomes optional for you. Free, no sign-up, about a minute.'
  const image = year ? `/api/og/freedom?y=${year}` : '/api/og/freedom'
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: siteUrl('/') },
    openGraph: { title, description, url: siteUrl('/'), siteName: 'UntilFire', type: 'website', images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function FreedomSharePage({ searchParams }: Props) {
  const { y } = await searchParams
  const year = parseFreedomYear(y)

  return (
    <main style={{ background: 'var(--uf-ground)', color: 'var(--uf-ink)', minHeight: '100vh', padding: 'var(--uf-s7) var(--uf-s6)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 'var(--uf-s5)', justifyItems: 'center', textAlign: 'center' }}>
        <div style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 20, padding: 'var(--uf-s6) var(--uf-s5)', width: '100%', display: 'grid', gap: 'var(--uf-s4)', justifyItems: 'center' }}>
          {year ? (
            <>
              <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                Someone could stop working in
              </p>
              <h1 className="uf-t-display" style={{ margin: 0, color: 'var(--uf-teal)' }}>{year}</h1>
              <p className="uf-t-h2" style={{ margin: 0 }}>When could you?</p>
            </>
          ) : (
            <h1 className="uf-t-h2" style={{ margin: 0 }}>When could you stop working?</h1>
          )}
          <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>
            Answer a few questions about your pay, savings and spending. Free, no sign-up, about a minute.
          </p>
          <Link
            href={START}
            className={`uf-t-body ${styles.primaryLink}`}
            style={{ display: 'inline-block', background: 'var(--uf-green)', padding: 'var(--uf-s3) var(--uf-s5)', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}
          >
            Find my freedom year →
          </Link>
        </div>
      </div>
    </main>
  )
}
