'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import { Badge, Card, Field, Input, Progress, SegmentedControl } from '@/components/ui'
import {
  DEFAULT_WITHDRAWAL_RATE, RECOMMENDED_TAX_RATE, TAX_RATES, WITHDRAWAL_RATES,
  fireNumber, fireProgress, recommendedWithdrawalRate,
} from '@/lib/fire-number'
import { formatMoney } from '@/lib/money'
import styles from './FireNumber.module.css'
import Factor from './Factor'

const CATEGORIES = [
  { label: 'Housing', key: 'housing', default: 1800 },
  { label: 'Food and groceries', key: 'food', default: 600 },
  { label: 'Transport', key: 'transport', default: 400 },
  { label: 'Health and insurance', key: 'health', default: 300 },
  { label: 'Fun and travel', key: 'fun', default: 400 },
  { label: 'Everything else', key: 'other', default: 500 },
]

const num = (raw: string) => (raw.trim() === '' ? 0 : Number(raw) || 0)
const whole = (n: number) => formatMoney(Math.round(n))
const pctLabel = (n: number) => `${n}%`

/**
 * The FIRE number with every factor named. Each one starts at the plain 25×
 * rule and carries a recommendation the reader can take with one tap, so the
 * number is theirs and they can see what moved it. Maths: lib/fire-number.ts.
 */
export default function FourPercentRuleCalculator() {
  const [mode, setMode] = useState<'total' | 'categories'>('total')
  const [spendingRaw, setSpendingRaw] = useState('60000')
  const [categories, setCategories] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.key, String(c.default)])),
  )
  const [rate, setRate] = useState<number>(DEFAULT_WITHDRAWAL_RATE)
  const [stopAgeRaw, setStopAgeRaw] = useState('')
  const [tax, setTax] = useState(0)
  const [incomeRaw, setIncomeRaw] = useState('')
  const [savedRaw, setSavedRaw] = useState('')

  const spending = mode === 'total'
    ? num(spendingRaw)
    : Object.values(categories).reduce((sum, v) => sum + num(v), 0) * 12
  const stopAge = stopAgeRaw.trim() === '' ? null : Math.floor(Number(stopAgeRaw))
  const stopAgeValid = stopAge === null || (Number.isFinite(stopAge) && stopAge >= 18 && stopAge <= 90)
  const rec = recommendedWithdrawalRate(stopAgeValid ? stopAge : null)
  const income = num(incomeRaw)
  const saved = num(savedRaw)

  const r = useMemo(
    () => fireNumber({ annualSpending: spending, otherIncome: income, taxRatePct: tax, withdrawalRatePct: rate }),
    [spending, income, tax, rate],
  )
  const progress = fireProgress(saved, r.fireNumber)

  return (
    <div className={styles.page} style={{ background: 'var(--uf-ground)', color: 'var(--uf-ink)' }}>
      <nav style={{ borderBottom: '1px solid var(--uf-border)', padding: 'var(--uf-s4) var(--uf-s6)', background: 'var(--uf-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--uf-s4)', flexWrap: 'wrap' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo variant="auto" size={22} /></Link>
        <Link href="/calculators" className="uf-t-body" style={{ color: 'var(--uf-ink-2)', textDecoration: 'none' }}>← All calculators</Link>
      </nav>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'var(--uf-s7) var(--uf-s6) var(--uf-s5)' }}>
        <header style={{ marginBottom: 'var(--uf-s6)', maxWidth: 680 }}>
          <Badge tone="muted" style={{ marginBottom: 'var(--uf-s3)' }}>FIRE · Retirement</Badge>
          <h1 className="uf-t-h1" style={{ margin: '0 0 var(--uf-s3)', lineHeight: 1.1 }}>FIRE Number Calculator</h1>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: 0 }}>
            How much you need invested to make work optional.
          </p>
        </header>

        <div className="uf-calc ph-no-capture">
          <div className={`uf-calc-results ${styles.results}`}>
            <Card>
              <div className="uf-t-label" style={{ color: 'var(--uf-ink-2)' }}>Your FIRE number · today&apos;s dollars</div>
              <div className="uf-t-data" aria-live="polite" style={{ fontSize: 40, fontWeight: 700, margin: 'var(--uf-s1) 0 var(--uf-s4)' }}>
                {whole(r.fireNumber)}
              </div>
              <dl className={`uf-t-body ${styles.breakdown}`}>
                <dt>{whole(spending)} a year × {Number(r.multiple.toFixed(1))}</dt><dd className="uf-t-data">{whole(r.fromSpending)}</dd>
                {r.otherIncomeReduction > 0 && <><dt>Other income covers {whole(income)} a year</dt><dd className="uf-t-data">−{whole(r.otherIncomeReduction)}</dd></>}
                {r.taxAddition > 0 && <><dt>Tax on withdrawals ({tax}%)</dt><dd className="uf-t-data">+{whole(r.taxAddition)}</dd></>}
              </dl>
              <p className="uf-t-body" style={{ margin: 'var(--uf-s4) 0 0', color: 'var(--uf-ink-2)' }}>
                {r.fireNumber > 0
                  ? <>First year: take out {whole(r.firstYearWithdrawal)}, then raise it with prices.</>
                  : <>Other income covers your spending.</>}
              </p>
              {saved > 0 && (
                <Progress value={progress / 100} label="Progress to your FIRE number" caption={`${formatMoney(saved, { style: 'compact' })} of ${formatMoney(r.fireNumber, { style: 'compact' })}`} style={{ marginTop: 'var(--uf-s4)' }} />
              )}
              <div style={{ borderTop: '1px solid var(--uf-border)', marginTop: 'var(--uf-s4)', paddingTop: 'var(--uf-s4)' }}>
                <Link href="/?source=calculator-4-percent-rule" className={`uf-t-body ${styles.primaryLink}`}>When will you reach it? →</Link>
              </div>
            </Card>
          </div>

          <div className="uf-calc-inputs">
            <Card style={{ display: 'grid', gap: 'var(--uf-s5)' }}>
              <Factor title="Yearly spending" hint="What you'll spend each year once work is optional. Most people start from what they spend now; include health insurance if you'll leave an employer plan.">
                <SegmentedControl label="How to enter spending" size="sm" value={mode} onChange={setMode} options={[{ value: 'total', label: 'Total' }, { value: 'categories', label: 'By category' }]} />
                {mode === 'total' ? (
                  <Field label="Per year (USD)" htmlFor="fn-spending">
                    <Input id="fn-spending" numeric type="number" inputMode="decimal" min={0} step={1000} value={spendingRaw} onChange={(e) => setSpendingRaw(e.target.value)} />
                  </Field>
                ) : CATEGORIES.map((c) => (
                  <Field key={c.key} label={`${c.label} per month`} htmlFor={`fn-${c.key}`}>
                    <Input id={`fn-${c.key}`} numeric type="number" inputMode="decimal" min={0} step={50} value={categories[c.key]} onChange={(e) => setCategories((prev) => ({ ...prev, [c.key]: e.target.value }))} />
                  </Field>
                ))}
              </Factor>

              <Factor
                title="Withdrawal rate"
                hint="The share of your savings you take out in the first year. Lower is safer and needs a bigger number."
                recommendation={`${rec.rate}%`}
                recommendationWhy={rec.why}
                onUseRecommendation={rate === rec.rate ? undefined : () => setRate(rec.rate)}
                applied={rate === rec.rate}
              >
                <SegmentedControl label="Withdrawal rate" size="sm" value={String(rate)} onChange={(v) => setRate(Number(v))} options={WITHDRAWAL_RATES.map((v) => ({ value: String(v), label: pctLabel(v) }))} />
                <Field label="Age you want to stop working (optional)" htmlFor="fn-stop-age" error={stopAgeValid ? undefined : 'Enter an age from 18 to 90.'}>
                  <Input id="fn-stop-age" numeric type="number" inputMode="numeric" min={18} max={90} placeholder="e.g. 45" value={stopAgeRaw} onChange={(e) => setStopAgeRaw(e.target.value)} />
                </Field>
              </Factor>

              <Factor
                title="Tax on withdrawals"
                hint="Money from a traditional 401(k) or IRA is taxed as income when you take it out; Roth money isn't, and taxable accounts usually owe less."
                recommendation={`${RECOMMENDED_TAX_RATE}%`}
                recommendationWhy={`${RECOMMENDED_TAX_RATE}% if most of your savings are in a traditional 401(k) or IRA, or you're not sure. 0% if they're mostly Roth.`}
                onUseRecommendation={tax === RECOMMENDED_TAX_RATE ? undefined : () => setTax(RECOMMENDED_TAX_RATE)}
                applied={tax === RECOMMENDED_TAX_RATE}
              >
                <SegmentedControl label="Tax on withdrawals" size="sm" value={String(tax)} onChange={(v) => setTax(Number(v))} options={TAX_RATES.map((v) => ({ value: String(v), label: pctLabel(v) }))} />
              </Factor>

              <Factor
                title="Other income"
                hint="A pension, rent or part-time work you'll have from the day you stop. It pays for part of your spending, so you need less saved."
                recommendation="only if it starts when you stop"
                recommendationWhy="Count income that's reliable and starts the day you stop. Social Security starts at 62 at the earliest, so leave it out if you'll stop sooner."
              >
                <Field label="Per year (USD)" htmlFor="fn-income">
                  <Input id="fn-income" numeric type="number" inputMode="decimal" min={0} step={1000} placeholder="0" value={incomeRaw} onChange={(e) => setIncomeRaw(e.target.value)} />
                </Field>
              </Factor>

              <Factor title="Saved so far (optional)" hint="Investments and savings meant for this goal. Shows how far along you are.">
                <Field label="USD" htmlFor="fn-saved">
                  <Input id="fn-saved" numeric type="number" inputMode="decimal" min={0} step={1000} placeholder="0" value={savedRaw} onChange={(e) => setSavedRaw(e.target.value)} />
                </Field>
              </Factor>

              <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-3)' }}>Private: stays in your browser.</p>
            </Card>
          </div>
          <div className={styles.miniBar} aria-hidden="true">
            <span className="uf-t-label" style={{ color: 'var(--uf-ink-2)' }}>Your FIRE number</span>
            <span className="uf-t-data" style={{ fontSize: 18, fontWeight: 700 }}>{whole(r.fireNumber)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
