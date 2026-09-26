'use client'

import { useState, useMemo } from 'react'
import Logo from '@/app/components/Logo'
import Link from 'next/link'
import { Card, Field, Input, SegmentedControl, Stat } from '@/components/ui'
import styles from './SavingsRateCalculator.module.css'
import { REAL_RETURN, yearsToTarget } from '@/lib/fire/strategies/traditional'
import { DEFAULT_RETURN_PCT, RECOMMENDED_RETURN_PCT, RETURN_OPTIONS, RETURN_RECOMMENDATION } from '@/lib/fire-number'
import Factor from '@/app/calculators/4-percent-rule/Factor'

const C = {
  bg: 'var(--uf-surface)',
  card: 'var(--uf-card)',
  border: 'var(--uf-border)',
  text: 'var(--uf-ink)',
  muted: 'var(--uf-ink-2)',
  mutedLight: 'var(--uf-ink-3)',
  accent: 'var(--uf-green)',
  teal: 'var(--uf-teal)',
}

// The freedom date's own projection (lib/fire), so this page and the main
// calculator give the same answer for the same person.
function yearsToFIRE(sr: number, annualReturn = REAL_RETURN, currentSavings = 0, annualIncome = 100000): number {
  if (sr <= 0) return Infinity
  if (sr >= 1) return 0
  const annualExpenses = annualIncome * (1 - sr)
  return yearsToTarget(currentSavings, annualIncome * sr, annualExpenses * 25, annualReturn, 100) ?? Infinity
}

const BENCHMARK_RATES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]

export default function SavingsRateCalculator() {
  const [income, setIncome] = useState('80000')
  const [expenses, setExpenses] = useState('50000')
  const [currentSavings, setCurrentSavings] = useState('20000')
  const [returnPct, setReturnPct] = useState<number>(DEFAULT_RETURN_PCT)

  const { sr, monthlySaved, years, table } = useMemo(() => {
    const inc = parseFloat(income) || 0
    const exp = parseFloat(expenses) || 0
    const saved = parseFloat(currentSavings) || 0

    const annualSaved = Math.max(0, inc - exp)
    const monthlySaved = annualSaved / 12
    const sr = inc > 0 ? annualSaved / inc : 0

    const years = yearsToFIRE(sr, returnPct / 100, saved, inc)

    const table = BENCHMARK_RATES.map((rate) => ({
      rate,
      years: yearsToFIRE(rate, returnPct / 100, saved, inc),
      isYours: Math.abs(rate - sr) < 0.025,
    }))

    return { sr, monthlySaved, annualSaved, years, table }
  }, [income, expenses, currentSavings, returnPct])

  const fmtYrs = (y: number) =>
    y === Infinity ? '50+ yrs' : y < 1 ? 'Already FIRE!' : `${y.toFixed(1)} yrs`

  return (
    <div className={styles.page} style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Manrope', sans-serif" }}>
      <nav className={styles.nav} style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: 'var(--uf-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--uf-s4)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo variant="auto" size={22} />
        </Link>
        <div className={styles.navLinks}>
          <Link href="/calculators" style={{ color: C.muted, textDecoration: 'none', fontSize: 14 }}>← All calculators</Link>
          <Link href="/?source=calculator-savings-rate" className={styles.secondaryLink}>
            Find my freedom date →
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
            FIRE · Core
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            Savings Rate Calculator
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            Enter your annual take-home income, expenses and current investments to find
            your savings percentage. Compare how saving more could change your estimated
            years to financial independence — free, with no signup.
          </p>
        </div>

        {/* Inputs remain annual; IDs connect the labels for keyboard and screen-reader use. */}
        <Card style={{ marginBottom: 'var(--uf-s5)' }}>
          <div style={{ display: 'grid', gap: 'var(--uf-s5)' }}>
            <Field label="Annual take-home income (after tax, $)" htmlFor="savings-income">
              <Input id="savings-income" numeric type="number" value={income} onChange={e => setIncome(e.target.value)} style={{ fontSize: 16 }} min="0" step="1000" />
            </Field>
            <Field label="Annual expenses ($)" htmlFor="savings-expenses">
              <Input id="savings-expenses" numeric type="number" value={expenses} onChange={e => setExpenses(e.target.value)} style={{ fontSize: 16 }} min="0" step="1000" />
            </Field>
            <Field label="Current savings / investments ($)" htmlFor="savings-investments">
              <Input id="savings-investments" numeric type="number" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} style={{ fontSize: 16 }} min="0" step="1000" />
            </Field>
            <Factor
              title="Growth after inflation"
              hint="How much your investments grow each year, beyond prices rising. Higher brings the date closer; lower is safer."
              recommendation={RETURN_RECOMMENDATION}
              onUseRecommendation={returnPct === RECOMMENDED_RETURN_PCT ? undefined : () => setReturnPct(RECOMMENDED_RETURN_PCT)}
            >
              <SegmentedControl label="Growth after inflation" size="sm" value={String(returnPct)} onChange={(v) => setReturnPct(Number(v))} options={RETURN_OPTIONS.map((v) => ({ value: String(v), label: `${v}%` }))} />
            </Factor>
          </div>
        </Card>

        <Card role="region" aria-labelledby="savings-result-heading" style={{ marginBottom: 'var(--uf-s5)' }}>
          <h2 id="savings-result-heading" className="uf-t-h2" style={{ margin: '0 0 var(--uf-s5)' }}>Your savings snapshot</h2>
          <div className={styles.results}>
            <Stat label="Your savings rate" value={`${Math.round(sr * 100)}%`} />
            <Stat label="Monthly saved" value={`$${Math.round(monthlySaved).toLocaleString()}`} />
            <Stat label="Years to FIRE" value={fmtYrs(years)} tone="freedom" delta={`${returnPct}% growth, 4% withdrawal`} deltaTone="default" />
          </div>

          {/* Rate vs years table */}
          <div style={{ borderTop: '1px solid var(--uf-green-100)', paddingTop: 20 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, fontWeight: 600 }}>
              How savings rate shifts your FIRE date
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {table.map(({ rate, years: y, isYours }) => (
                <div key={rate} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: isYours ? 'var(--uf-green-100)' : 'var(--uf-card)',
                  border: isYours ? '1px solid var(--uf-teal-line)' : '1px solid var(--uf-border)',
                  borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: isYours ? C.accent : C.muted, fontWeight: isYours ? 700 : 400, fontSize: 15, width: 36 }}>
                      {Math.round(rate * 100)}%
                    </span>
                    {isYours && <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: '1px' }}>← YOU</span>}
                  </div>
                  <span style={{ color: isYours ? C.accent : C.text, fontWeight: isYours ? 700 : 500, fontSize: 15 }}>
                    {fmtYrs(y)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card role="region" aria-labelledby="savings-next-heading" style={{ marginBottom: 'var(--uf-s6)' }}>
          <h2 id="savings-next-heading" className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>Turn your savings rate into a plan</h2>
          <p className="uf-t-lead" style={{ color: C.muted, margin: '0 0 var(--uf-s4)' }}>
            Explore your income, spending and investments in the full calculator to find your
            freedom date. Then choose whether to create an account to save your plan and track progress.
          </p>
          <Link href="/?source=calculator-savings-rate-result" className={styles.primaryLink}>
            Find my freedom date <span aria-hidden="true">→</span>
          </Link>
          <p className="uf-t-small" style={{ color: C.muted, margin: 'var(--uf-s3) 0 0' }}>
            Free to calculate. No account needed to see your result.
          </p>
        </Card>

        {/* SEO content */}
        <div style={{ color: C.muted, lineHeight: 1.8, fontSize: 15 }}>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
            How to read your estimated years to FIRE
          </h2>
          <p style={{ marginBottom: 16 }}>
            The comparison above uses your income and current investments for every savings rate.
            A higher rate means more money invested and less spending for your future portfolio
            to cover. Changing your starting investments also changes the timeline.
          </p>
          <p style={{ marginBottom: 16 }}>
            The model grows your investments once a year at the growth you choose (7% after
            inflation by default; we recommend planning at 5%) and adds the year&apos;s savings, the
            same projection as the freedom date calculator. Your FIRE target is 25 times annual
            expenses, using a 4% withdrawal assumption. Amounts are in today&apos;s purchasing power;
            returns and spending are held constant.
          </p>
          <p>
            These are planning estimates, not a promise that investments will grow at the rate you choose or that
            a 4% withdrawal will last. Taxes, fees, changing expenses and uneven market returns
            are not modeled separately. Use the full FIRE calculator to explore your wider plan.
          </p>
        </div>
      </div>
    </div>
  )
}
