import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from '../lib/auth-context'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import LoadingSplash from './components/LoadingSplash'
import {
  UNTILFIRE_ANCHOR_COPY,
  UNTILFIRE_ANCHOR_DESCRIPTION,
} from '@/lib/positioning'
import { BRAND_PROFILES, SITE_URL } from '@/lib/site'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08080e',
}

export const metadata: Metadata = {
  title: 'UntilFire | Personal Finance That Sets You Free',
  description: UNTILFIRE_ANCHOR_COPY,
  keywords:
    'FIRE calculator, financial independence retire early, freedom date calculator, when can I retire, personal finance planning, work optionality, financial freedom, early retirement calculator, FIRE number, savings rate calculator, coast FIRE, barista FIRE, lean FIRE, fat FIRE, retirement timeline, how much do I need to retire',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'UntilFire — Find Your Freedom Date in 60 Seconds',
    description: UNTILFIRE_ANCHOR_DESCRIPTION,
    url: SITE_URL,
    siteName: 'UntilFire',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'UntilFire — personal finance that sets you free' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UntilFire — Find Your Freedom Date in 60 Seconds',
    description: UNTILFIRE_ANCHOR_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
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
        {/* Theme, decided before first paint so there is no flash.

            Warm cream is the default for everyone, including visitors whose
            device prefers dark: the landing page is a first impression and it
            should be the same one for every new visitor. We deliberately do
            NOT read prefers-color-scheme here — doing so used to mean a
            dark-mode device saw a dark marketing page on its very first visit,
            before the person had expressed any preference about this product.

            Dark is opt-in, and once opted into it sticks everywhere: the
            toggle (toggleDark in app/dashboard/page.tsx) writes 'dark' or
            'light' to uf-theme, and only an explicit 'dark' turns it on. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('uf-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        {/* Decide the logo-reveal splash before first paint: first load of a
            session only, and never for reduced-motion. Keeps it flash-free and
            off internal navigations. See app/components/LoadingSplash.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var s=sessionStorage.getItem('uf_splash_seen')==='1';if(!r&&!s){document.documentElement.setAttribute('data-splash','1');sessionStorage.setItem('uf_splash_seen','1')}}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
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
              browserRequirements: 'Requires JavaScript',
              featureList: [
                'FIRE number calculator',
                'Freedom date calculator',
                'Savings rate calculator',
                'Coast FIRE calculator',
                'Monthly plan to reach financial independence',
                'Budget tracking with needs vs wants analysis',
                'Multi-currency support',
                'AI-powered transaction categorisation',
                'Bank connection via Plaid',
              ],
              about: {
                '@type': 'Thing',
                name: 'Financial Independence Retire Early (FIRE)',
                description: 'A financial movement focused on extreme savings and investment to allow retirement far earlier than traditional timelines.',
              },
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free plan — calculate your freedom date with no account required',
              },
              publisher: {
                '@type': 'Organization',
                name: 'UntilFire',
                url: SITE_URL,
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'UntilFire',
              alternateName: ['Until Fire', 'untilfire.com'],
              url: SITE_URL,
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'UntilFire',
              alternateName: 'Until Fire',
              url: SITE_URL,
              logo: `${SITE_URL}/icon.png`,
              description: 'Personal finance that sets you free. UntilFire helps you calculate your FIRE number, freedom date, and monthly plan to reach financial independence.',
              sameAs: BRAND_PROFILES,
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'hello@untilfire.com',
                contactType: 'Support',
              },
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'US',
              },
            }),
          }}
        />
        <LoadingSplash />
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
