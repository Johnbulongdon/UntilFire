'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './LearnHub.module.css'

export type StagePanel = {
  id: string
  label: string
  tagline: string
  reads: { slug: string; title: string; readTime: string }[]
  tool: { href: string; label: string } | null
}

/**
 * One stage at a time. Every panel is in the HTML, so the reads stay
 * crawlable; the ones not picked are hidden, not missing.
 */
export default function LearnStagePicker({ stages }: { stages: StagePanel[] }) {
  const [active, setActive] = useState(stages[0]?.id)

  return (
    <div>
      <div role="tablist" aria-label="Your FIRE stage" className={styles.tabs}>
        {stages.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={active === s.id}
            aria-controls={`panel-${s.id}`}
            className={styles.tab}
            onClick={() => setActive(s.id)}
          >
            <span className={`uf-t-data ${styles.tabN}`}>{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>

      {stages.map((s) => (
        <section
          key={s.id}
          role="tabpanel"
          id={`panel-${s.id}`}
          aria-labelledby={`tab-${s.id}`}
          hidden={active !== s.id}
          className={styles.panel}
        >
          <p className="uf-t-lead" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>{s.tagline}</p>
          <ol className={styles.reads}>
            {s.reads.map((r) => (
              <li key={r.slug}>
                <Link href={`/learn/${r.slug}`} className={styles.read}>
                  <span className="uf-t-h3">{r.title}</span>
                  <span className="uf-t-small" style={{ color: 'var(--uf-ink-3)', whiteSpace: 'nowrap' }}>{r.readTime}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className={styles.panelLinks}>
            {s.tool && <Link href={s.tool.href}>Try the {s.tool.label} →</Link>}
            <Link href={`/learn/stages/${s.id}`}>Everything for this stage →</Link>
          </div>
        </section>
      ))}
    </div>
  )
}
