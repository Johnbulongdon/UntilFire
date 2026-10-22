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

const INPUTS = [
  { label: 'Your pay', icon: <path d="M3 7h18v10H3z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" /> },
  { label: 'What you save', icon: <path d="M6 9h12l-1 11H7z M9 9V6a3 3 0 0 1 6 0v3" /> },
  { label: 'What you spend', icon: <path d="M4 6h16M4 12h10M4 18h7" /> },
]

/** Today, the usual 65, and a question mark where the visitor's own year goes. */
function FreedomCurve() {
  return (
    <svg className={styles.art} viewBox="0 0 440 320" role="img" aria-label="A line rising from today toward your own freedom year, well before 65">
      <path className={styles.axis} d="M20 280 H420" strokeWidth="2" fill="none" />
      <path className={styles.past} d="M20 270 C110 268 190 258 250 214 S360 96 420 40" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" fill="none" />
      <path className={styles.curve} d="M40 268 C120 264 190 238 230 182 S290 92 318 70" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle className={styles.dotToday} cx="40" cy="268" r="8" />
      <text className={styles.label} x="40" y="304" textAnchor="middle">Today</text>
      <circle className={styles.dot65} cx="420" cy="40" r="9" strokeWidth="3" />
      <text className={styles.mono} x="420" y="22" textAnchor="end">Most people: 65</text>
      <circle className={styles.youHalo} cx="318" cy="70" r="34" />
      <circle className={styles.you} cx="318" cy="70" r="20" />
      <text className={styles.youMark} x="318" y="78" textAnchor="middle">?</text>
      <text className={styles.youLabel} x="276" y="64" textAnchor="end">Your year</text>
    </svg>
  )
}

// The page speaks to the visitor about their own year; the sharer's year
// only appears in the link preview they chose to post.
export default function FreedomSharePage() {
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 className={styles.title}>When could <em>you</em> stop working?</h1>
          <p className={styles.lede}>Most people wait until 65. Three answers show your own year.</p>
          <ul className={styles.inputs}>
            {INPUTS.map((input) => (
              <li key={input.label}>
                <span className={styles.chipIcon} aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{input.icon}</svg>
                </span>
                {input.label}
              </li>
            ))}
          </ul>
          <Link href={START} className={styles.cta}>Find my freedom year →</Link>
          <p className={styles.fine}>Free · no sign-up · about a minute</p>
        </div>
        <div className={styles.artWrap}><FreedomCurve /></div>
      </div>
    </main>
  )
}
