import type { Metadata } from 'next'
import ExploreClient from './ExploreClient'
import './explore.css'

/**
 * Explore (D-58): every city on one map. The city pages stay the pages that
 * rank; this is where people who arrive to browse compare them, and each
 * city links on to its own page.
 */
export const metadata: Metadata = {
  title: 'Where could you retire? Cost of living and your freedom year by city | UntilFire',
  description: 'Compare what it costs to live in hundreds of US and international cities, and see the year each one could set you free. Free, no signup.',
  alternates: { canonical: 'https://www.untilfire.com/explore' },
}

export default function ExplorePage() {
  return <main style={{ background: 'var(--uf-bg)', minHeight: '100vh' }}><ExploreClient /></main>
}
