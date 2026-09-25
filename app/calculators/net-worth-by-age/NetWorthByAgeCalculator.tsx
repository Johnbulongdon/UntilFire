'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import PercentileTrack from '@/app/components/PercentileTrack'
import { Badge, Card, Field, Input } from '@/components/ui'
import { compareNetWorth, percentileToday } from '@/lib/net-worth-compare'
import { NET_WORTH_BENCHMARKS } from '@/lib/net-worth-benchmarks'
import { NET_WORTH_INFLATION } from '@/lib/net-worth-inflation'
import { formatMoney } from '@/lib/money'
import styles from './NetWorthByAge.module.css'

/**
 * Net worth against US households of the same age, as a page of its own.
 *
 * The same comparison the free result and Home show (lib/net-worth-compare.ts),
 * reachable from search without doing the calculator first. It hands on to
 * the freedom date, which is what the product is for.
 */
export default function NetWorthByAgeCalculator() {
  const [ageRaw, setAgeRaw] = useState('')
  const [netWorthRaw, setNetWorthRaw] = useState('')

  const age = ageRaw.trim() === '' ? null : Math.floor(Number(ageRaw))
  const ageValid = age === null || (Number.isFinite(age) && age >= 18 && age <= 110)
  const netWorth = netWorthRaw.trim() === '' ? null : Number(netWorthRaw)

  const comparison = useMemo(() => {
    if (netWorth === null || !Number.isFinite(netWorth) || !ageValid) return null
    return compareNetWorth(
      { netWorthUsd: netWorth, age, ageAssumed: age === null, currency: 'USD' },
      NET_WORTH_BENCHMARKS,
      NET_WORTH_INFLATION,
    )
  }, [netWorth, age, ageValid])

  const median = comparison
    ? percentileToday(NET_WORTH_BENCHMARKS, comparison.band, 50, NET_WORTH_INFLATION)
    : null
  const who = comparison ? `US households ${comparison.bandLabel}` : ''

  return (
    <div style={{ background: 'var(--uf-ground)', color: 'var(--uf-ink)' }}>
      <nav
        style={{
          borderBottom: '1px solid var(--uf-border)', padding: 'var(--uf-s4) var(--uf-s6)',
          background: 'var(--uf-card)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 'var(--uf-s4)', flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}><Logo variant="light" size={22} /></Link>
        <Link href="/calculators" className="uf-t-body" style={{ color: 'var(--uf-ink-2)', textDecoration: 'none' }}>
          ← All calculators
        </Link>
      </nav>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'var(--uf-s7) var(--uf-s6) var(--uf-s5)' }}>
        <header style={{ marginBottom: 'var(--uf-s6)', maxWidth: 680 }}>
          <Badge tone="muted" style={{ marginBottom: 'var(--uf-s3)' }}>Net worth · United States</Badge>
          <h1 className="uf-t-h1" style={{ margin: '0 0 var(--uf-s3)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Net Worth by Age: How Do You Compare?
          </h1>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: 0, lineHeight: 1.7 }}>
            See how your net worth compares with US households your age, from the Federal Reserve&apos;s
            Survey of Consumer Finances, adjusted to today&apos;s dollars. Free, no sign-up.
          </p>
        </header>

        {/* ph-no-capture keeps this block out of session recordings, so what
            someone types about their money is never recorded. */}
        <div className="uf-calc ph-no-capture">
          <div className="uf-calc-results">
            <Card>
              {comparison ? (
                <>
                  <p className="uf-t-h3" style={{ margin: '0 0 var(--uf-s3)', lineHeight: 1.3 }}>
                    {comparison.aboveTop
                      ? <>Your net worth is ahead of <span style={{ color: 'var(--uf-teal)' }}>more than 99%</span> of {who}</>
                      : comparison.aheadOfPct >= 1
                        ? <>Your net worth is ahead of <span style={{ color: 'var(--uf-teal)' }}>{comparison.aheadOfPct}%</span> of {who}</>
                        : <>Your net worth is at the start line for {who}</>}
                  </p>
                  <PercentileTrack
                    position={comparison.aboveTop ? 99.5 : comparison.aheadOfPct}
                    label={comparison.aboveTop ? `Ahead of more than 99% of ${who}` : `Ahead of ${comparison.aheadOfPct}% of ${who}`}
                    width="100%"
                  />
                  {median !== null && (
                    <p className="uf-t-body" style={{ margin: 'var(--uf-s3) 0 0', color: 'var(--uf-ink-2)' }}>
                      The median for {who} is{' '}
                      <span className="uf-t-data" style={{ color: 'var(--uf-ink)', fontWeight: 700 }}>{formatMoney(Math.round(median / 1000) * 1000)}</span>
                      {comparison.allAges && ' — add your age to compare with people your age'}.
                    </p>
                  )}
                  <div style={{ borderTop: '1px solid var(--uf-border)', marginTop: 'var(--uf-s4)', paddingTop: 'var(--uf-s4)' }}>
                    <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s3)' }}>
                      Where you stand is one number. The next one is when work becomes optional.
                    </p>
                    <Link
                      href="/?source=net-worth-by-age"
                      className={`uf-t-body ${styles.primaryLink}`}
                      style={{
                        display: 'inline-block', background: 'var(--uf-green)',
                        padding: 'var(--uf-s3) var(--uf-s5)', borderRadius: 999,
                        fontWeight: 700, textDecoration: 'none',
                      }}
                    >
                      Find your freedom date →
                    </Link>
                  </div>
                </>
              ) : (
                <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>
                  {ageValid
                    ? 'Enter your net worth to see where you stand. Add your age to compare with people your age.'
                    : 'Enter an age from 18 to 110, or leave it blank to compare with all households.'}
                </p>
              )}
            </Card>
          </div>

          <div className="uf-calc-inputs">
            <Card>
              <div style={{ display: 'grid', gap: 'var(--uf-s4)' }}>
                <Field
                  label="Net worth (USD)"
                  htmlFor="nw-net-worth"
                  hint="Everything you own minus everything you owe. Below zero is fine."
                >
                  <Input
                    id="nw-net-worth" numeric type="number" inputMode="decimal"
                    placeholder="e.g. 150000" value={netWorthRaw}
                    onChange={(e) => setNetWorthRaw(e.target.value)}
                  />
                </Field>
                <Field
                  label="Your age"
                  htmlFor="nw-age"
                  hint="Optional. Without it you are compared with all households."
                  error={ageValid ? undefined : 'Enter an age from 18 to 110.'}
                >
                  <Input
                    id="nw-age" numeric type="number" inputMode="numeric"
                    placeholder="e.g. 35" min={18} max={110} value={ageRaw}
                    onChange={(e) => setAgeRaw(e.target.value)}
                  />
                </Field>
                <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-3)' }}>
                  Calculated in your browser. Your net worth isn&apos;t sent to us or saved.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
