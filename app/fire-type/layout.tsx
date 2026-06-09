import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'What FIRE Type Are You? | UntilFire',
  description:
    'Take the 2-minute quiz to discover how you naturally think about financial independence, then calculate your real FIRE number.',
  keywords: [
    'fire type quiz',
    'financial independence personality',
    'fire personality test',
    'retirement personality quiz',
    'work optionality quiz',
  ],
  alternates: { canonical: 'https://www.untilfire.com/fire-type' },
  openGraph: {
    title: 'What FIRE Type Are You? | UntilFire',
    description:
      'Take the 2-minute quiz to discover how you naturally think about financial independence, then calculate your real FIRE number.',
    url: 'https://www.untilfire.com/fire-type',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What FIRE Type Are You? | UntilFire',
    description:
      'Take the 2-minute quiz to discover how you naturally think about financial independence, then calculate your real FIRE number.',
  },
}

export default function FireTypeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
