"use client";

import React from "react";
import {
  ComposedChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from "recharts";
import { formatMoney } from "@/lib/money";

/* Fixed width rather than ResponsiveContainer.
 *
 * ResponsiveContainer measures its parent through a ResizeObserver, and on
 * this statically-prerendered page it measured 0 on mount and never got a
 * second callback to correct itself — the charts rendered as
 * <div style="width:0"> and nothing else. The app's own charts sit in a
 * dashboard whose layout resolves before they mount, so they are fine; a
 * reference page does not need that machinery. Pinned dimensions inside a
 * scrollable wrapper are deterministic and screenshot reliably.
 */
const W = 852;
const H = 210;

function Plot({ children }: { children: React.ReactNode }) {
  return <div style={{ overflowX: "auto", maxWidth: "100%" }}>{children}</div>;
}

/**
 * Chart specimens for /styleguide.
 *
 * The series colours are --uf-chart-1..3, a three-slot categorical palette
 * validated for colour-blind separation against both theme surfaces. Three is
 * the ceiling, not a starting point: a fourth hue could not clear the
 * separation floor against these three, so a fourth series folds into "Other"
 * or becomes a second chart.
 *
 * Data lines are `linear`, never `monotone`. A monotone spline draws a curve
 * through the points, which means it invents values between them that the data
 * never had — on a projection sampled every five years the curve bulges away
 * from the true compound path in the gaps, and the reader has no way to know
 * which parts they are allowed to trust. Straight segments are honest about
 * where the measurements actually are. (The area FILL may still fade; it is
 * the data line itself that must stay solid and unsmoothed.)
 *
 * Every chart here follows the same rules the app should:
 *   · horizontal grid only, in --uf-chart-grid, never vertical
 *   · axes in --uf-chart-axis at 11px, no axis lines
 *   · figures in DM Mono with tabular numerals
 *   · a legend whenever there are two or more series, so identity is never
 *     carried by colour alone (the dark palette sits in the tritan floor band,
 *     which makes the legend a requirement rather than a nicety)
 *   · one y-axis, always — never a second scale on the right
 */

const CHART = {
  s1: "var(--uf-chart-1)",
  s2: "var(--uf-chart-2)",
  s3: "var(--uf-chart-3)",
  grid: "var(--uf-chart-grid)",
  axis: "var(--uf-chart-axis)",
};

/* Axis ticks go through the shared formatter — a kit that ships its own
   second money formatter is the exact problem lib/money.ts exists to end. It
   also puts the sign outside the symbol, so a negative tick reads −$5k rather
   than $-5k. */
const money = (n: number) => formatMoney(n, { style: "compact" });

const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11, fontFamily: "var(--uf-font-mono)" },
  tickLine: false,
  axisLine: false,
} as const;

/* One tooltip for every chart in the app — card surface, warm border,
   mono figures. Recharts' default is a white box with a grey border that
   belongs to a different product. */
function UfTooltip({ active, payload, label, format }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string | number;
  format?: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = format ?? ((n: number) => n.toLocaleString());
  return (
    <div style={{
      background: "var(--uf-card)", border: "1px solid var(--uf-border)",
      borderRadius: "var(--uf-r-control)", boxShadow: "var(--uf-e2)",
      padding: "10px 12px", fontFamily: "var(--uf-font)", fontSize: 12,
    }}>
      <div style={{ color: "var(--uf-ink-3)", fontSize: 11, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: i ? 4 : 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: "var(--uf-ink-2)" }}>{p.name}</span>
          <span style={{
            marginLeft: "auto", fontFamily: "var(--uf-font-mono)",
            fontVariantNumeric: "tabular-nums", color: "var(--uf-ink)", fontWeight: 500,
          }}>{fmt(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

const legendProps = {
  wrapperStyle: { fontFamily: "var(--uf-font)", fontSize: 12, color: "var(--uf-ink-2)" },
  iconType: "circle" as const,
  iconSize: 8,
};

/* ── 1. projection: the shape the whole product is about ─────────────── */

const FIRE_TARGET = 1_500_000;

/* $1,500/mo from $50k at 7% real — crosses the target around year 26, which
   is the point of the chart. Scale the data to the reference line, not the
   other way round: a target line pinned to the baseline reads as an axis. */
const PROJECTION = Array.from({ length: 7 }, (_, i) => {
  const yrs = i * 5;
  const r = 0.07, K = 1500 * 12 / r;
  return { year: `+${yrs}y`, portfolio: Math.round((50000 + K) * Math.pow(1 + r, yrs) - K) };
});

export function ProjectionSpecimen() {
  return (
    <Plot>
      <ComposedChart width={W} height={H} data={PROJECTION} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sgFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.s1} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART.s1} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} width={52} tickFormatter={money} />
        <Tooltip content={<UfTooltip format={(n) => `$${Math.round(n).toLocaleString()}`} />} cursor={{ stroke: CHART.grid }} />
        <ReferenceLine y={FIRE_TARGET} stroke={CHART.axis} strokeDasharray="4 5"
          label={{ value: "FIRE target  $1.5M", position: "insideTopRight", fill: CHART.axis, fontSize: 11, offset: 8 }} />
        <Area type="linear" dataKey="portfolio" name="Portfolio" stroke={CHART.s1} strokeWidth={2} fill="url(#sgFill)" />
      </ComposedChart>
    </Plot>
  );
}

/* ── 2. two series, the maximum before a legend is doing real work ───── */

const grow = (monthly: number, yrs: number) => {
  const r = 0.07, K = monthly * 12 / r;
  return Math.round((50000 + K) * Math.pow(1 + r, yrs) - K);
};
const COMPARE = [0, 5, 10, 15, 20, 25].map(yrs => ({
  year: `+${yrs}y`,
  base: grow(1500, yrs),
  boosted: grow(2300, yrs),
}));

export function CompareSpecimen() {
  return (
    <Plot>
      <ComposedChart width={W} height={H} data={COMPARE} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} width={52} tickFormatter={money} />
        <Tooltip content={<UfTooltip format={(n) => `$${Math.round(n).toLocaleString()}`} />} cursor={{ stroke: CHART.grid }} />
        <Legend {...legendProps} />
        <Line type="linear" dataKey="base" name="Saving $1,500/mo" stroke={CHART.s2} strokeWidth={2} dot={false} />
        <Line type="linear" dataKey="boosted" name="Saving $2,300/mo" stroke={CHART.s1} strokeWidth={2} dot={false} />
      </ComposedChart>
    </Plot>
  );
}

/* ── 3. magnitude: one hue, direct labels, no legend for a single series ─ */

const SPEND = [
  { cat: "Housing", amount: 2100 },
  { cat: "Food", amount: 720 },
  { cat: "Transport", amount: 430 },
  { cat: "Health", amount: 260 },
  { cat: "Other", amount: 490 },
];

export function SpendSpecimen() {
  return (
    <Plot>
      <BarChart width={W} height={H} data={SPEND} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={money} />
        <YAxis type="category" dataKey="cat" {...axisProps} width={78} />
        <Tooltip content={<UfTooltip format={(n) => `$${n.toLocaleString()}/mo`} />} cursor={{ fill: "var(--uf-surface)" }} />
        <Bar dataKey="amount" name="Monthly" radius={[0, 4, 4, 0]}>
          {SPEND.map((d) => (
            <Cell key={d.cat} fill={d.cat === "Other" ? "var(--uf-surface-2)" : CHART.s1} />
          ))}
        </Bar>
      </BarChart>
    </Plot>
  );
}

/* ── 4. money in and money out ───────────────────────────────────────
 * Income and expenses are one quantity with a direction, not two unrelated
 * series, so they share one axis and one zero line: bars up are money in,
 * bars down are money out, and the month where the pair nets negative is
 * visible without reading a single number. Two separate charts side by side
 * would hide exactly that.
 */

const CASHFLOW = [
  { month: "Apr", income: 8000, expenses: -5200 },
  { month: "May", income: 8000, expenses: -4900 },
  { month: "Jun", income: 8000, expenses: -6400 },
  { month: "Jul", income: 9600, expenses: -5100 },
  { month: "Aug", income: 8000, expenses: -8700 },
  { month: "Sep", income: 8000, expenses: -5000 },
];

export function CashflowSpecimen() {
  return (
    <Plot>
      <BarChart width={W} height={H} data={CASHFLOW} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                barCategoryGap="26%" stackOffset="sign">
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={money} />
        <Tooltip content={<UfTooltip format={(n) => `$${Math.abs(Math.round(n)).toLocaleString()}`} />}
                 cursor={{ fill: "var(--uf-surface)" }} />
        <Legend {...legendProps} />
        <ReferenceLine y={0} stroke={CHART.axis} strokeWidth={1} />
        <Bar dataKey="income" name="Money in" fill={CHART.s1} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Money out" fill={CHART.s3} radius={[0, 0, 4, 4]} />
      </BarChart>
    </Plot>
  );
}

export { UfTooltip };
