import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from '../lib/auth-context'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'UntilFire | Find Your FIRE Number',
  description:
    'Calculate when you can retire based on your city, income, and spending. Get your FIRE number and retirement timeline in about 60 seconds for free.',
  keywords:
    'FIRE calculator, financial independence, retire early, FIRE number, savings rate calculator, how much to retire, 4% rule calculator',
  alternates: {
    canonical: 'https://www.untilfire.com',
  },
  openGraph: {
    title: 'UntilFire | Find Your FIRE Number',
    description: 'Your city. Your income. Your exact retirement date. Takes 60 seconds.',
    url: 'https://www.untilfire.com',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UntilFire | Find Your FIRE Number',
    description: 'Your city. Your income. Your exact retirement date. Takes 60 seconds.',
  },
  metadataBase: new URL('https://www.untilfire.com'),
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
              url: 'https://www.untilfire.com',
              description: 'Free FIRE calculator for finding your financial independence number based on your city, income, and spending.',
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
