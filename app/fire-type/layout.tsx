import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'What FIRE Type Are You? — FIRE personality quiz | UntilFire',
  description:
    'Take the 2-minute quiz to discover how you naturally think about financial independence, then calculate your real FIRE number.',
  keywords:
    'fire type quiz, financial independence personality, fire personality test, retirement personality quiz, work optionality quiz',
  alternates: { canonical: `${SITE_URL}/fire-type` },
  openGraph: {
    title: 'What FIRE Type Are You? — UntilFire',
    description:
      'Take the 2-minute quiz to discover how you naturally think about financial independence, then calculate your real FIRE number.',
    url: `${SITE_URL}/fire-type`,
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What FIRE Type Are You? — UntilFire',
    description:
      'Take the 2-minute quiz to discover how you naturally think about financial independence, then calculate your real FIRE number.',
  },
}

export default function FireTypeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}