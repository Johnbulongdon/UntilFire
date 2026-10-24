import Link from 'next/link'
import { getStageArticles, learnStages } from '@/lib/learn'
import LearnStagePicker, { type StagePanel } from './LearnStagePicker'
import styles from './LearnHub.module.css'

export const metadata = {
  title: 'FIRE Learning Hub — Financial Independence Guides by Stage | UntilFire',
  description: 'Learn financial independence and early retirement step by step. FIRE guides, calculators, and next steps organized by stage — from the basics to living off your portfolio.',
  keywords: 'FIRE guides, financial independence learning, early retirement education, FIRE basics, how to reach FIRE, FIRE stages',
  alternates: {
    canonical: 'https://www.untilfire.com/learn',
  },
}

/**
 * Three reads per stage, never the same article twice on the page: an
 * article listed under two stages shows under the first.
 */
function stagePanels(): StagePanel[] {
  const shown = new Set<string>()
  return learnStages.map((stage) => {
    const reads = getStageArticles(stage.id).filter((a) => !shown.has(a.slug)).slice(0, 3)
    reads.forEach((a) => shown.add(a.slug))
    return {
      id: stage.id,
      label: stage.label,
      tagline: stage.tagline,
      reads: reads.map((a) => ({ slug: a.slug, title: a.title, readTime: a.readTime })),
      tool: stage.calculatorLinks[0] ?? null,
    }
  })
}

export default function LearnHubPage() {
  return (
    <>
    <main className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.hero}>
          <h1 className={`uf-t-display ${styles.title}`} style={{ margin: 0 }}>Learn FIRE</h1>
          <p className="uf-t-lead" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>Where are you? Three reads for each stage.</p>
        </header>

        <LearnStagePicker stages={stagePanels()} />

        <nav className={`uf-t-body ${styles.more}`} aria-label="More to read">
          <span>More:</span>
          <Link href="/learn/articles">All articles</Link>
          <Link href="/learn/topics">By topic</Link>
          <Link href="/fire-number">FIRE number by city</Link>
        </nav>
      </div>
    </main>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'FIRE Learning Hub — Financial Independence Guides by Stage',
            description: 'FIRE guides and calculators organized by stage: starting out, building momentum, approaching FIRE, and living in FIRE.',
            url: 'https://www.untilfire.com/learn',
            hasPart: learnStages.map((stage) => ({
              '@type': 'WebPage',
              name: stage.label,
              url: `https://www.untilfire.com/learn/stages/${stage.id}`,
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
              { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://www.untilfire.com/learn' },
            ],
          },
        ]),
      }}
    />
    </>
  )
}
