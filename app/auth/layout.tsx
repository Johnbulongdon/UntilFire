import type { Metadata } from 'next'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: siteUrl('/auth/callback') },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
