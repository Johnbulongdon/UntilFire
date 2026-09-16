'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts'
import Logo from '@/app/components/Logo'
import { Badge, Card, Money, Progress, Slider, Stat } from '@/components/ui'
import { formatMoney } from '@/lib/money'

/**
 * Coast FIRE calculator.
 *
 * Rebuilt on the design system. The old version hand-rolled its inputs, cards
 * and progress bar, invented a type scale (36, 42, 12, 15) and painted the
 * headline figure in --uf-chart-2 — a categorical series colour used as a
 * brand accent. Teal is what progress toward a freedom date looks like here,
 * and that is exactly what a Coast FIRE number is.
 *
 * The chart is the point of the rebuild. Coast FIRE is a claim about a curve
 * meeting a line: your balance compounds, the target sits flat, and the
 * question is whether they meet before you retire. A column of six numbers
 * cannot show that, and the crossing is the whole idea.
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
const age = (v: number) => `${v}`

export default function CoastFireCalculator() {
  const [annualExpenses, setAnnualExpenses] = useState(50_000)
  const [currentAge, setCurrentAge] = useState(30)
  const [retireAge, setRetireAge] = useState(65)
  const [currentSavings, setCurrentSavings] = useState(50_000)
  const [returnRate, setReturnRate] = useState(7)
  const [withdrawalRate, setWithdrawalRate] = useState(4)

  const [chartRef, chartWidth] = useWidth<HTMLDivElement>(320)

  const result = useMemo(() => {
    const exp = annualExpenses
    const startAge = currentAge
    const retire = retireAge
    const saved = Math.max(0, currentSavings)
    const r = returnRate / 100
    const wr = withdrawalRate / 100

    const years = Math.max(0, retire - startAge)
    const fireTarget = wr > 0 ? exp / wr : 0
    const coastNumber = fireTarget / Math.pow(1 + r, years)
    const gap = Math.max(0, coastNumber - saved)
    const alreadyCoast = saved >= coastNumber && coastNumber > 0

    // Sampled every year, not every five. The series is drawn with straight
    // segments — a spline would invent balances between the points — so the
    // sampling has to be fine enough that straight lines tell the truth about
    // a compound curve.
    const series = Array.from({ length: Math.round(years) + 1 }, (_, y) => ({
      age: startAge + y,
      balance: Math.round(saved * Math.pow(1 + r, y)),
      // The path of someone exactly at their Coast number today. By
      // construction it lands on the full target at the retirement age, so the
      // distance between the two lines IS the shortfall — drawn rather than
      // asserted in a sentence underneath.
      coasting: Math.round(coastNumber * Math.pow(1 + r, y)),
    }))

    // Where the curve meets the line. The one moment the whole page is about.
    const crossing = series.find((p) => p.balance >= fireTarget) ?? null

    return {
      fireTarget, coastNumber, gap, alreadyCoast, years, series, crossing,
      // The axis has to hold the target, or the line marking it is drawn off
      // the top and the reader sees a curve that simply stops.
      ceiling: Math.max(fireTarget, saved * Math.pow(1 + r, years)) * 1.08,
      progress: coastNumber > 0 ? Math.min(saved / coastNumber, 1) : 0,
      endBalance: series.length ? series[series.length - 1].balance : saved,
    }
  }, [annualExpenses, currentAge, retireAge, currentSavings, returnRate, withdrawalRate])

  // Shorter on a phone: the results card is sticky, so every pixel it takes
  // is a pixel of sliders the reader cannot see while dragging them.
  const narrow = chartWidth < 420
  const chartHeight = narrow ? 150 : 260

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
              inside an anchor is invalid markup that screen readers announce
              twice. Styled from the same tokens so it still reads as the
              primary action. */}
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

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'var(--uf-s7) var(--uf-s6) var(--uf-s7)' }}>
        <header style={{ marginBottom: 'var(--uf-s6)', maxWidth: 680 }}>
          <Badge tone="muted" style={{ marginBottom: 'var(--uf-s3)' }}>FIRE · Strategy</Badge>
          <h1
            className="uf-t-h1"
            style={{ margin: '0 0 var(--uf-s3)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
          >
            Coast FIRE Calculator
          </h1>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: 0, lineHeight: 1.7 }}>
            Coast FIRE is the point where you have enough invested that — even if you never contribute
            another pound — compound growth alone carries you to full retirement by your target age.
          </p>
        </header>

        <div className="uf-calc">
        <div className="uf-calc-results">
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--uf-s4)', marginBottom: 'var(--uf-s4)' }}>
              <Stat
                label="Your Coast FIRE number"
                value={<Money amount={result.coastNumber} format="compact" size={narrow ? 24 : 34} tone="freedom" />}
                delta={formatMoney(result.coastNumber)}
              />
              <Stat
                label={`Full FIRE target at ${result.years > 0 ? retireAge : currentAge}`}
                value={<Money amount={result.fireTarget} format="compact" size={narrow ? 24 : 34} />}
                delta={`${Math.round(100 / withdrawalRate)}× your annual spending`}
              />
            </div>

            <Progress
              value={result.progress}
              label="Progress to Coast FIRE"
              caption={
                result.alreadyCoast
                  ? 'Reached'
                  : `${formatMoney(result.gap, { style: 'compact' })} to go`
              }
              style={{ marginBottom: 'var(--uf-s5)' }}
            />

            <div style={{ borderTop: '1px solid var(--uf-border)', paddingTop: 'var(--uf-s4)' }}>
              <h2 className="uf-t-small" style={{ margin: '0 0 var(--uf-s2)', fontWeight: 700, color: 'var(--uf-ink-2)' }}>
                {narrow
                  ? `${result.years} years of growth, nothing added`
                  : `${result.years} years of growth from age ${currentAge} to ${retireAge}, with no further contributions`}
              </h2>
              {/* The caption explains the dashed line, but on a phone it costs
                  three lines of a card that has to stay short enough to leave
                  the sliders it controls on screen. */}
              <p className="uf-t-small" style={{ color: 'var(--uf-ink-3)', margin: '0 0 var(--uf-s3)', display: narrow ? 'none' : 'block' }}>
                From {formatMoney(currentSavings)} today to{' '}
                <strong style={{ color: 'var(--uf-ink)' }}>{formatMoney(result.endBalance)}</strong> at {retireAge},
                adding nothing.{' '}
                {result.alreadyCoast
                  ? `That clears the target at age ${result.crossing?.age ?? retireAge}; the dashed line is the minimum path that just makes it.`
                  : 'The dashed line is where you would need to be to coast — the gap between them is what is still missing.'}
              </p>

              <div ref={chartRef} style={{ width: '100%' }}>
                <ComposedChart
                  width={Math.max(280, chartWidth)}
                  height={chartHeight}
                  data={result.series}
                  margin={{ top: 18, right: narrow ? 12 : 56, bottom: 4, left: 4 }}
                >
                  <defs>
                    <linearGradient id="coastFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--uf-teal)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--uf-teal)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--uf-chart-grid)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="age" tickLine={false} axisLine={false}
                    tick={{ fill: 'var(--uf-ink-3)', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                    tickFormatter={(a) => `${a}`}
                    interval="preserveStartEnd" minTickGap={28}
                  />
                  <YAxis
                    domain={[0, result.ceiling]}
                    tickLine={false} axisLine={false} width={54}
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
                  <ReferenceLine
                    y={result.fireTarget}
                    stroke="var(--uf-ink-3)" strokeDasharray="4 4"
                    label={narrow ? undefined : {
                      value: formatMoney(result.fireTarget, { style: 'compact' }),
                      position: 'right', fill: 'var(--uf-ink-3)', fontSize: 11,
                    }}
                  />
                  {/* linear, never monotone: a spline draws balances between the
                      sampled years that the compound path never had. */}
                  <Area
                    type="linear" dataKey="balance" stroke="var(--uf-teal)" strokeWidth={2}
                    fill="url(#coastFill)" dot={false} isAnimationActive={false}
                    name="Your balance"
                  />
                  <Line
                    type="linear" dataKey="coasting" stroke="var(--uf-ink-3)" strokeWidth={1.5}
                    strokeDasharray="5 4" dot={false} isAnimationActive={false}
                    name="If you were coasting"
                  />
                  {/* Both ends of the curve, marked. Without them the chart
                      showed a line rising between two axes and left the reader
                      to work out what it started from and what it came to —
                      which are the two numbers the whole page compares.
                      Labels are dropped on a phone, where 280px cannot hold
                      them without overlapping the line they annotate. */}
                  <ReferenceDot
                    x={currentAge} y={Math.max(0, currentSavings)} r={4}
                    fill="var(--uf-card)" stroke="var(--uf-teal)" strokeWidth={2}
                  />
                  <ReferenceDot
                    x={retireAge} y={result.endBalance} r={5}
                    fill="var(--uf-teal)" stroke="var(--uf-card)" strokeWidth={2}
                    label={narrow ? undefined : {
                      value: `Age ${retireAge} · ${formatMoney(result.endBalance, { style: 'compact' })}`,
                      position: 'left', fill: 'var(--uf-ink)', fontSize: 11, offset: 12,
                    }}
                  />
                  {result.crossing && result.crossing.age < retireAge && (
                    <ReferenceDot
                      x={result.crossing.age} y={result.crossing.balance} r={5}
                      fill="var(--uf-teal)" stroke="var(--uf-card)" strokeWidth={2}
                      label={narrow ? undefined : {
                        value: `Covered at ${result.crossing.age}`,
                        position: 'top', fill: 'var(--uf-teal-deep)', fontSize: 11,
                      }}
                    />
                  )}
                </ComposedChart>
              </div>
            </div>
          </Card>
        </div>

          <div className="uf-calc-inputs">
            <Card>
              <div style={{ display: 'grid', gap: 'var(--uf-s5)' }}>
                <Slider
                  label="Annual expenses at retirement" value={annualExpenses} onChange={setAnnualExpenses}
                  min={10_000} max={250_000} step={1_000} format={money}
                />
                <Slider
                  label="Current savings and investments" value={currentSavings} onChange={setCurrentSavings}
                  min={0} max={2_000_000} step={5_000} format={money}
                />
                <Slider
                  label="Current age" value={currentAge} onChange={setCurrentAge}
                  min={18} max={75} step={1} format={age}
                />
                <Slider
                  label="Target retirement age" value={retireAge} onChange={setRetireAge}
                  min={30} max={85} step={1} format={age}
                />
                <Slider
                  label="Expected annual return" value={returnRate} onChange={setReturnRate}
                  min={1} max={12} step={0.1} format={pct}
                  hint="Long-run real return is around 7%."
                />
                <Slider
                  label="Withdrawal rate" value={withdrawalRate} onChange={setWithdrawalRate}
                  min={2} max={6} step={0.1} format={pct}
                  hint="4% is the common starting point."
                />
              </div>
            </Card>
          </div>
        </div>

        <Card style={{ marginTop: 'var(--uf-s5)', marginBottom: 'var(--uf-s5)', maxWidth: 760 }}>
            {result.alreadyCoast ? (
              <p className="uf-t-body" style={{ color: 'var(--uf-ink-2)', margin: '0 0 var(--uf-s5)', lineHeight: 1.7 }}>
                You have already passed it. If you stopped contributing today, your investments would
                still reach <strong style={{ color: 'var(--uf-ink)' }}>{formatMoney(result.endBalance)}</strong> by
                age {retireAge} — every pound you save from here buys time, not security.
              </p>
            ) : (
              <p className="uf-t-body" style={{ color: 'var(--uf-ink-2)', margin: '0 0 var(--uf-s5)', lineHeight: 1.7 }}>
                Another <strong style={{ color: 'var(--uf-ink)' }}>{formatMoney(result.gap)}</strong> invested
                and you could stop contributing entirely — growth alone would finish the job by age {retireAge}.
              </p>
            )}

        </Card>


        <Card style={{ marginBottom: 'var(--uf-s5)', maxWidth: 760 }}>
          <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>
            What is Coast FIRE?
          </h2>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: '0 0 var(--uf-s4)', lineHeight: 1.8 }}>
            Coast FIRE is a milestone before full financial independence. Once you reach your Coast
            number you can stop making retirement contributions entirely, because what you already
            hold will compound to your full target by the age you picked.
          </p>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: '0 0 var(--uf-s4)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--uf-ink)' }}>The formula:</strong>{' '}
            <span style={{ fontFamily: "'DM Mono', monospace" }}>
              Coast FIRE = FIRE target ÷ (1 + r)<sup>years to retirement</sup>
            </span>
          </p>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: 0, lineHeight: 1.8 }}>
            It is not the finish line. It is the point where the finish line stops depending on you —
            which is usually when people move to lower-stress work, drop to part time, or stop
            counting every month. Your freedom date is the other half of that picture:{' '}
            <Link href="/?source=calculator-coast-fire" style={{ color: 'var(--uf-green)', fontWeight: 700 }}>
              work out when you could stop
            </Link>.
          </p>
        </Card>
      </div>
    </div>
  )
}
