'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceDot,
} from 'recharts'
import Logo from '@/app/components/Logo'
import { Badge, Card, Money, Slider, Stat } from '@/components/ui'
import { formatMoney } from '@/lib/money'

/**
 * Coast FIRE calculator.
 *
 * The model, because the first version of this page had it wrong. Coast FIRE
 * is not "never contribute again from today" — it is "contribute until the
 * balance can finish the job on its own, THEN stop". The earlier chart assumed
 * you stopped today, which is only correct for someone who has already
 * arrived, and it never asked what you contribute, so it could not find the
 * age where you get to stop. That age is what the page is for.
 *
 * Three phases, in order:
 *
 *   accumulate   contributions, until the coast age
 *   coast        no contributions, growth only, until retirement
 *   drawdown     spending, from retirement onward
 *
 * Which is why the curve rises and then falls. Coasting is about contributions
 * stopping, not about work stopping or money stopping — conflating those was
 * the other thing the old chart got wrong by ending at retirement, exactly
 * where the interesting question starts.
 *
 * Everything is in today's money: the return is real, so spending stays flat
 * rather than being inflated and then deflated back again.
 */

/** Recharts' ResponsiveContainer measures its parent through a ResizeObserver
 *  and reports 0 on a statically prerendered page, which renders a chart with
 *  no width and no second callback to correct it. Measuring here instead is a
 *  dozen lines and cannot fail that way. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.getBoundingClientRect().width || fallback)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fallback])

  return [ref, width] as const
}

const money = (v: number) => formatMoney(v)
const pct = (v: number) => `${v.toFixed(1)}%`
const ageLabel = (v: number) => `${v}`
const perMonth = (v: number) => `${formatMoney(v / 12)}/mo`

/**
 * How far past retirement to carry the projection.
 *
 * Ten years, not thirty. At a sustainable withdrawal rate the pot keeps
 * growing after retirement — that is the 4% rule working — so a projection to
 * 95 ran the axis to $13M and squashed the accumulation curve, which is the
 * part this page is about, into the bottom tenth of the plot. Ten years is
 * enough to show the shape of what happens next without letting it dominate.
 */
const YEARS_PAST_RETIREMENT = 10

export default function CoastFireCalculator() {
  const [currentAge, setCurrentAge] = useState(30)
  const [currentSavings, setCurrentSavings] = useState(50_000)
  const [monthlyContribution, setMonthlyContribution] = useState(1_000)
  const [retireAge, setRetireAge] = useState(65)
  const [annualExpenses, setAnnualExpenses] = useState(50_000)
  const [returnRate, setReturnRate] = useState(7)
  const [withdrawalRate, setWithdrawalRate] = useState(4)

  const [chartRef, chartWidth] = useWidth<HTMLDivElement>(320)

  const result = useMemo(() => {
    const r = returnRate / 100
    const wr = withdrawalRate / 100
    const contribution = monthlyContribution * 12
    const retire = Math.max(currentAge + 1, retireAge)
    const planTo = retire + YEARS_PAST_RETIREMENT
    const fireTarget = wr > 0 ? annualExpenses / wr : 0

    /** What you need at a given age for growth alone to finish by retirement. */
    const coastNumberAt = (a: number) => fireTarget / Math.pow(1 + r, Math.max(0, retire - a))

    /**
     * The earliest age the balance can carry itself. Found by walking forward
     * rather than solved in closed form: with contributions in the mix there
     * is no clean inverse, and a loop over sixty-five integers is free.
     */
    let coastAge: number | null = null
    let balance = currentSavings
    for (let a = currentAge; a <= retire; a++) {
      if (balance >= coastNumberAt(a)) { coastAge = a; break }
      balance = balance * (1 + r) + contribution
    }

    /** One path. Contributions stop at `stopAt`; spending starts at retirement. */
    const project = (stopAt: number) => {
      const out: { age: number; value: number }[] = []
      let bal = currentSavings
      for (let a = currentAge; a <= planTo; a++) {
        out.push({ age: a, value: Math.max(0, Math.round(bal)) })
        bal = a < retire
          ? bal * (1 + r) + (a < stopAt ? contribution : 0)
          : bal * (1 + r) - annualExpenses
        if (bal < 0) bal = 0
      }
      return out
    }

    const coasting = project(coastAge ?? retire)
    const contributing = project(retire)

    const series = coasting.map((p, i) => ({
      age: p.age,
      coasting: p.value,
      // Only worth drawing where the two differ; before the coast age they are
      // the same line and a second stroke on top of the first reads as an
      // artefact rather than a comparison.
      contributing: contributing[i].value,
    }))

    const at = (list: { age: number; value: number }[], a: number) =>
      list.find((p) => p.age === a)?.value ?? 0

    const atRetireCoasting = at(coasting, retire)
    const atRetireContributing = at(contributing, retire)

    /** The age the money runs out, if it does. */
    const depletedAt = coasting.find((p) => p.age > retire && p.value <= 0)?.age ?? null

    return {
      fireTarget, coastAge, series, retire,
      atRetireCoasting, atRetireContributing, depletedAt,
      incomeCoasting: atRetireCoasting * wr,
      incomeContributing: atRetireContributing * wr,
      ceiling: Math.max(fireTarget, ...series.map((p) => Math.max(p.coasting, p.contributing))) * 1.08,
      yearsCoasting: coastAge === null ? null : Math.max(0, coastAge - currentAge),
    }
  }, [currentAge, currentSavings, monthlyContribution, retireAge, annualExpenses, returnRate, withdrawalRate])

  // Shorter on a phone: the results card is sticky, so every pixel it takes is
  // a pixel of sliders the reader cannot see while dragging them.
  const narrow = chartWidth < 420
  const chartHeight = narrow ? 150 : 250

  return (
    <div style={{ background: 'var(--uf-ground)', minHeight: '100vh', color: 'var(--uf-ink)' }}>
      <nav
        style={{
          borderBottom: '1px solid var(--uf-border)', padding: 'var(--uf-s4) var(--uf-s6)',
          background: 'var(--uf-card)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 'var(--uf-s4)', flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}><Logo variant="light" size={22} /></Link>
        <div style={{ display: 'flex', gap: 'var(--uf-s4)', alignItems: 'center' }}>
          <Link href="/calculators" className="uf-t-body" style={{ color: 'var(--uf-ink-2)', textDecoration: 'none' }}>
            ← All calculators
          </Link>
          {/* A link, not a Button: Button renders a <button>, and nesting one
              inside an anchor is invalid markup screen readers announce twice. */}
          <Link
            href="/?source=calculator-coast-fire"
            className="uf-t-body"
            style={{
              background: 'var(--uf-green)', color: '#fff',
              padding: 'var(--uf-s2) var(--uf-s4)', borderRadius: 999,
              fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            Find your freedom date
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'var(--uf-s7) var(--uf-s6)' }}>
        <header style={{ marginBottom: 'var(--uf-s6)', maxWidth: 680 }}>
          <Badge tone="muted" style={{ marginBottom: 'var(--uf-s3)' }}>FIRE · Strategy</Badge>
          <h1 className="uf-t-h1" style={{ margin: '0 0 var(--uf-s3)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Coast FIRE Calculator
          </h1>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: 0, lineHeight: 1.7 }}>
            Coast FIRE is the point where you can stop paying into retirement and let what you
            already hold finish the job. Not the point where you stop working — just the point where
            the saving becomes optional.
          </p>
        </header>

        <div className="uf-calc">
          <div className="uf-calc-results">
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--uf-s4)', marginBottom: 'var(--uf-s4)' }}>
                <Stat
                  label="Stop contributing at"
                  value={
                    result.coastAge === null
                      ? <span className="uf-t-data" style={{ fontSize: narrow ? 20 : 28, fontWeight: 700 }}>Not yet</span>
                      : <span className="uf-t-data" style={{ fontSize: narrow ? 24 : 34, fontWeight: 700, color: 'var(--uf-teal)' }}>{result.coastAge}</span>
                  }
                  delta={
                    result.yearsCoasting === null
                      ? 'Raise the contribution or the return'
                      : result.yearsCoasting === 0 ? 'You are already there' : `${result.yearsCoasting} years away`
                  }
                />
                <Stat
                  label={`Pot at ${result.retire}`}
                  value={<Money amount={result.atRetireCoasting} format="compact" size={narrow ? 24 : 34} />}
                  delta={`${formatMoney(result.fireTarget, { style: 'compact' })} target`}
                />
                <Stat
                  label={`Income from ${result.retire}`}
                  value={<span className="uf-t-data" style={{ fontSize: narrow ? 20 : 26, fontWeight: 700 }}>{perMonth(result.incomeCoasting)}</span>}
                  delta={`${formatMoney(result.incomeCoasting)} a year at ${withdrawalRate}%`}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--uf-border)', paddingTop: 'var(--uf-s4)' }}>
                <h2 className="uf-t-small" style={{ margin: '0 0 var(--uf-s2)', fontWeight: 700, color: 'var(--uf-ink-2)' }}>
                  {result.coastAge === null
                    ? `Your pot from ${currentAge} onward`
                    : `Paying in to ${result.coastAge}, coasting to ${result.retire}, then spending`}
                </h2>

                <div ref={chartRef} style={{ width: '100%' }}>
                  <ComposedChart
                    width={Math.max(280, chartWidth)}
                    height={chartHeight}
                    data={result.series}
                    margin={{ top: 8, right: narrow ? 12 : 56, bottom: 0, left: 4 }}
                  >
                    <defs>
                      <linearGradient id="coastFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--uf-teal)" stopOpacity={0.26} />
                        <stop offset="100%" stopColor="var(--uf-teal)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--uf-chart-grid)" strokeDasharray="2 4" vertical={false} />
                    <XAxis
                      dataKey="age" tickLine={false} axisLine={false}
                      tick={{ fill: 'var(--uf-ink-3)', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                      interval="preserveStartEnd" minTickGap={30}
                    />
                    <YAxis
                      domain={[0, result.ceiling]}
                      tickLine={false} axisLine={false} width={52}
                      tick={{ fill: 'var(--uf-ink-3)', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                      tickFormatter={(v) => formatMoney(v as number, { style: 'compact' })}
                    />
                    <Tooltip
                      cursor={{ stroke: 'var(--uf-border)' }}
                      contentStyle={{
                        background: 'var(--uf-card)', border: '1px solid var(--uf-border)',
                        borderRadius: 12, fontSize: 13, fontFamily: "'Manrope', sans-serif",
                      }}
                      labelFormatter={(a) => `Age ${a}`}
                      formatter={(v, name) => [formatMoney(v as number), name as string]}
                    />
                    {/* A key, because there was not one. Two grey dashed lines
                        with no legend is a puzzle, not a chart. */}
                    <Legend
                      verticalAlign="bottom" height={26} iconType="plainline" iconSize={16}
                      wrapperStyle={{ fontSize: 11, fontFamily: "'Manrope', sans-serif", color: 'var(--uf-ink-2)' }}
                    />
                    <ReferenceLine
                      y={result.fireTarget}
                      stroke="var(--uf-ink-3)" strokeDasharray="4 4"
                      label={narrow ? undefined : {
                        value: formatMoney(result.fireTarget, { style: 'compact' }),
                        position: 'right', fill: 'var(--uf-ink-3)', fontSize: 11,
                      }}
                    />
                    {/* linear, never monotone: a spline invents balances
                        between the sampled years that the path never had. */}
                    <Area
                      type="linear" dataKey="coasting" name="Coasting"
                      stroke="var(--uf-teal)" strokeWidth={2}
                      fill="url(#coastFill)" dot={false} isAnimationActive={false}
                    />
                    <Line
                      type="linear" dataKey="contributing" name="If you kept paying in"
                      stroke="var(--uf-chart-2)" strokeWidth={1.5} strokeDasharray="5 4"
                      dot={false} isAnimationActive={false}
                    />
                    {result.coastAge !== null && (
                      <ReferenceDot
                        x={result.coastAge} y={result.series.find((p) => p.age === result.coastAge)?.coasting ?? 0} r={5}
                        fill="var(--uf-teal)" stroke="var(--uf-card)" strokeWidth={2}
                      />
                    )}
                    <ReferenceLine
                      x={result.retire} stroke="var(--uf-border-2)"
                      label={narrow ? undefined : {
                        value: `Retire ${result.retire}`, position: 'insideTopLeft',
                        fill: 'var(--uf-ink-3)', fontSize: 11,
                      }}
                    />
                  </ComposedChart>
                </div>
              </div>
            </Card>
          </div>

          <div className="uf-calc-inputs">
            <Card>
              <div style={{ display: 'grid', gap: 'var(--uf-s5)' }}>
                <Slider label="Current age" value={currentAge} onChange={setCurrentAge}
                  min={18} max={75} step={1} format={ageLabel} />
                <Slider label="Current savings and investments" value={currentSavings} onChange={setCurrentSavings}
                  min={0} max={2_000_000} step={5_000} format={money} />
                <Slider label="Paying in each month" value={monthlyContribution} onChange={setMonthlyContribution}
                  min={0} max={10_000} step={100} format={money}
                  hint="What you add to investments now. Coasting is when this can stop." />
                <Slider label="Retire at" value={retireAge} onChange={setRetireAge}
                  min={currentAge + 1} max={85} step={1} format={ageLabel}
                  hint="When spending starts, not when contributions stop." />
                <Slider label="Annual spending in retirement" value={annualExpenses} onChange={setAnnualExpenses}
                  min={10_000} max={250_000} step={1_000} format={money} />
                <Slider label="Expected annual return" value={returnRate} onChange={setReturnRate}
                  min={1} max={12} step={0.1} format={pct}
                  hint="After inflation. Long-run real return is around 7%." />
                <Slider label="Withdrawal rate" value={withdrawalRate} onChange={setWithdrawalRate}
                  min={2} max={6} step={0.1} format={pct}
                  hint="4% is the common starting point." />
              </div>
            </Card>
          </div>
        </div>

        <Card style={{ marginTop: 'var(--uf-s5)', marginBottom: 'var(--uf-s5)', maxWidth: 760 }}>
          <p className="uf-t-body" style={{ color: 'var(--uf-ink-2)', margin: 0, lineHeight: 1.75 }}>
            {result.coastAge === null ? (
              <>
                On these numbers the pot never reaches the point where it can finish alone before {result.retire}.
                Raising what you pay in, retiring later or spending less in retirement all move it.
              </>
            ) : (
              <>
                Paying in {formatMoney(monthlyContribution)} a month, you reach Coast FIRE at{' '}
                <strong style={{ color: 'var(--uf-ink)' }}>{result.coastAge}</strong>. Stop there and you retire at{' '}
                {result.retire} on <strong style={{ color: 'var(--uf-ink)' }}>{perMonth(result.incomeCoasting)}</strong>.
                Keep paying in the whole way and it is {perMonth(result.incomeContributing)} instead — the difference
                between those two is what the extra {result.retire - result.coastAge} years of contributions buy you.
                {result.depletedAt && <> On this spending the pot runs out at {result.depletedAt}.</>}
              </>
            )}
          </p>
        </Card>

        <Card style={{ marginBottom: 'var(--uf-s5)', maxWidth: 760 }}>
          <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>What is Coast FIRE?</h2>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: '0 0 var(--uf-s4)', lineHeight: 1.8 }}>
            Coast FIRE is a milestone before full financial independence. Once your pot passes the
            Coast number you can stop paying into retirement entirely, because what you already hold
            will compound to your full target by the age you picked. You may well carry on working —
            it is the saving that becomes optional, not the job.
          </p>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: '0 0 var(--uf-s4)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--uf-ink)' }}>The formula:</strong>{' '}
            <span style={{ fontFamily: "'DM Mono', monospace" }}>
              Coast number = FIRE target ÷ (1 + r)<sup>years to retirement</sup>
            </span>
          </p>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: 0, lineHeight: 1.8 }}>
            Everything here is in today&apos;s money — the return is after inflation, so the spending
            figure does not need inflating either. And the pot usually keeps rising after you retire:
            it only turns down when you draw more than it earns, so at a 4% withdrawal against a 7%
            return it climbs. Push the withdrawal rate past the return and you will see it fall.
            Your freedom date is the other half of the picture:{' '}
            <Link href="/?source=calculator-coast-fire" style={{ color: 'var(--uf-green)', fontWeight: 700 }}>
              work out when you could stop
            </Link>.
          </p>
        </Card>
      </div>
    </div>
  )
}
