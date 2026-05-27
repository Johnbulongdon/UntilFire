import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from '../lib/auth-context'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import {
  UNTILFIRE_ANCHOR_COPY,
  UNTILFIRE_ANCHOR_DESCRIPTION,
} from '@/lib/positioning'
import { SITE_URL } from '@/lib/site'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08080e',
}

export const metadata: Metadata = {
  title: 'UntilFire | Know When You Can Stop Working',
  description: UNTILFIRE_ANCHOR_COPY,
  keywords:
    'FIRE planner, financial independence, retire early, FIRE number, retirement timeline, savings rate calculator, how much to retire, 4% rule calculator',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'UntilFire | Know When You Can Stop Working',
    description: UNTILFIRE_ANCHOR_DESCRIPTION,
    url: SITE_URL,
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UntilFire | Know When You Can Stop Working',
    description: UNTILFIRE_ANCHOR_DESCRIPTION,
  },
  metadataBase: new URL(SITE_URL),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Existing script (keep) */}
        <Script id="remove-extension-attributes" strategy="beforeInteractive">
          {`
            document.addEventListener('DOMContentLoaded', function() {
              document.body.removeAttribute('cz-shortcut-listen')
              document.body.removeAttribute('g_installed')
            })
          `}
        </Script>
      </head>

      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'UntilFire',
              url: SITE_URL,
              description: UNTILFIRE_ANCHOR_COPY,
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
        <AuthProvider>
          {children}

          <Toaster position="top-right" />

          {/* Vercel Analytics */}
          <Analytics />

          <Script
  src="https://www.googletagmanager.com/gtag/js?id=G-L8EQM1LL1S"
  strategy="afterInteractive"
/>

<Script id="ga4-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-L8EQM1LL1S');
  `}
</Script>

          {/* Ahrefs Analytics */}
          <Script
            src="https://analytics.ahrefs.com/analytics.js"
            data-key="FiPq4kEv/tSkbCGk1licIA"
            strategy="afterInteractive"
          />
        </AuthProvider>
      </body>
    </html>
  )
}
