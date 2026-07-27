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
import { SITE_URL } from '@/lib/site'

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('uf-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
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
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What is a FIRE number?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Your FIRE number is the total savings or investment portfolio you need to retire early and live off investment returns indefinitely. It is typically calculated as 25× your annual expenses, based on the 4% safe withdrawal rate.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How do I calculate my freedom date?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Your freedom date is the point when your investments can cover your living expenses without needing to work. UntilFire calculates it from your income, monthly savings, current net worth, and target spending, then projects when your portfolio hits 25× annual expenses.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What is the difference between lean FIRE, fat FIRE, barista FIRE, and coast FIRE?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Lean FIRE means retiring on a minimal budget (typically under $40k/year). Fat FIRE means retiring with a larger portfolio for a comfortable lifestyle. Barista FIRE means partially retiring with part-time work to cover some expenses. Coast FIRE means you have saved enough that, with no further contributions, your portfolio will grow to your FIRE number by traditional retirement age.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How much do I need to retire early?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'You need approximately 25 times your annual expenses invested in a diversified portfolio to retire early — this is known as your FIRE number. For example, if you spend $50,000 per year, you need roughly $1.25 million. UntilFire calculates your exact target based on your location, spending, and tax situation.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What savings rate do I need for financial independence?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Higher savings rates dramatically shorten the timeline to financial independence. Saving 10% of your income takes roughly 40 years. Saving 25% takes about 32 years. Saving 50% takes around 17 years. Saving 70%+ can get you to financial independence in under 10 years. UntilFire shows your exact timeline based on your current numbers.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What is the 4% rule for retirement?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: "The 4% rule states that you can withdraw 4% of your portfolio in the first year of retirement, then adjust for inflation each year, with a high probability of the portfolio lasting 30+ years. It comes from the Trinity Study. This means your FIRE number is 25× your annual expenses (1 ÷ 4% = 25).",
                  },
                },
              ],
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
              url: SITE_URL,
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${SITE_URL}/?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
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
              url: SITE_URL,
              logo: `${SITE_URL}/icon.png`,
              description: 'Personal finance that sets you free. UntilFire helps you calculate your FIRE number, freedom date, and monthly plan to reach financial independence.',
              sameAs: [
                'https://twitter.com/untilfire',
              ],
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
