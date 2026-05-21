import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'What FIRE Type Are You? — Lean, Fat, Barista, Coast | UntilFire',
  description:
    'Take the 2-minute quiz to discover your FIRE personality. Find out whether Lean FIRE, Fat FIRE, Barista FIRE, or Coast FIRE fits your lifestyle and retirement goals.',
  keywords:
    'fire type quiz, lean fire vs fat fire, barista fire, coast fire, what type of fire am i, financial independence personality',
  alternates: { canonical: `${SITE_URL}/fire-type` },
  openGraph: {
    title: 'What FIRE Type Are You? — UntilFire',
    description:
      'Take the 2-minute quiz to discover whether Lean, Fat, Barista, or Coast FIRE fits your life.',
    url: `${SITE_URL}/fire-type`,
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What FIRE Type Are You? — UntilFire',
    description:
      'Take the 2-minute quiz to discover whether Lean, Fat, Barista, or Coast FIRE fits your life.',
  },
}

export default function FireTypeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
