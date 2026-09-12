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

/* ── 5. part to whole ────────────────────────────────────────────────
 * A donut is legitimate for share-at-a-glance with six or fewer segments.
 * It is the wrong form for comparing close values — the eye cannot rank
 * arc lengths that are within a few percent of each other, which is why
 * every segment here is also directly labelled with its figure.
 *
 * Spending categories are MAGNITUDES, not identities: "Housing" is not a
 * different kind of thing from "Food", it is more of the same thing. So
 * this uses one hue stepped light to dark rather than five categorical
 * hues, and the order round the ring is the ranking.
 */

const SHARE = [
  { label: "Housing", value: 2100, step: 1 },
  { label: "Food", value: 720, step: 0.78 },
  { label: "Transport", value: 430, step: 0.56 },
  { label: "Health", value: 260, step: 0.34 },
  { label: "Other", value: 490, step: 0 },
];

function donutArc(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number) {
  const pt = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(rOut, a0);
  const [x1, y1] = pt(rOut, a1);
  const [x2, y2] = pt(rIn, a1);
  const [x3, y3] = pt(rIn, a0);
  return `M ${x0} ${y0} A ${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} ` +
         `L ${x2} ${y2} A ${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function ShareSpecimen() {
  const total = SHARE.reduce((n, d) => n + d.value, 0);
  const cx = 130, cy = 130, rOut = 104, rIn = 66;
  let angle = -Math.PI / 2;
  const segs = SHARE.map((d) => {
    const sweep = (d.value / total) * Math.PI * 2;
    // 2px of surface between segments — adjacent fills need a gap or the
    // boundary between two steps of one hue disappears.
    const gap = 0.012;
    const seg = { ...d, a0: angle + gap / 2, a1: angle + sweep - gap / 2, pct: d.value / total };
    angle += sweep;
    return seg;
  });

  return (
    <div style={{ display: "flex", gap: "var(--uf-s7)", alignItems: "center", flexWrap: "wrap" }}>
      <svg width={260} height={260} viewBox="0 0 260 260" role="img" aria-label="Spending share by category">
        {segs.map((s) => (
          <path
            key={s.label}
            d={donutArc(cx, cy, rOut, rIn, s.a0, s.a1)}
            fill={s.step === 0 ? "var(--uf-surface-2)" : "var(--uf-chart-1)"}
            fillOpacity={s.step === 0 ? 1 : s.step}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle"
              style={{ fontFamily: "var(--uf-font-mono)", fontSize: 19, fontWeight: 500, fill: "var(--uf-ink)" }}>
          {formatMoney(total)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
              style={{ fontFamily: "var(--uf-font)", fontSize: 11, fill: "var(--uf-ink-3)" }}>
          per month
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
        {segs.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{
              width: 11, height: 11, borderRadius: 3, flexShrink: 0,
              background: s.step === 0 ? "var(--uf-surface-2)" : "var(--uf-chart-1)",
              opacity: s.step === 0 ? 1 : s.step,
            }} />
            <span style={{ color: "var(--uf-ink-2)" }}>{s.label}</span>
            <span style={{
              marginLeft: "auto", fontFamily: "var(--uf-font-mono)",
              fontVariantNumeric: "tabular-nums", color: "var(--uf-ink)",
            }}>{formatMoney(s.value)}</span>
            <span style={{
              fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums",
              color: "var(--uf-ink-3)", width: 40, textAlign: "right",
            }}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 6. one ratio against a limit ────────────────────────────────────
 * The case a two-slice pie is usually reached for, and the case it is
 * worst at: "used vs available" is one number against a ceiling, and a
 * reader cannot judge 62% from two arcs but can read it instantly off a
 * track. The number is the chart; the track is the context.
 */

export function MeterSpecimen({ used = 6200, limit = 10000 }: { used?: number; limit?: number }) {
  const pct = Math.max(0, Math.min(1, used / limit));
  // Utilisation bands are a credit convention, not a design flourish: past
  // ~30% starts to affect a score, past ~70% reads as distress.
  const tone = pct > 0.7 ? "var(--uf-neg)" : pct > 0.3 ? "var(--uf-warn)" : "var(--uf-pos)";
  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <span style={{
          fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums",
          fontSize: 34, fontWeight: 500, color: tone,
        }}>{Math.round(pct * 100)}%</span>
        <span style={{ fontSize: 13, color: "var(--uf-ink-2)" }}>of your limit used</span>
        <span style={{
          marginLeft: "auto", fontFamily: "var(--uf-font-mono)",
          fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--uf-ink-2)",
        }}>{formatMoney(used)} of {formatMoney(limit)}</span>
      </div>
      <div style={{ height: 14, background: "var(--uf-surface-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, background: tone, borderRadius: 999 }} />
      </div>
      {/* Ticks are positioned at their true value, not spaced evenly — an
          evenly-spaced "30%" label sitting at a third of the width names a
          position the scale never reaches. */}
      <div style={{ position: "relative", height: 16, marginTop: 6 }}>
        {[0, 0.3, 0.7, 1].map((m) => (
          <span key={m} style={{
            position: "absolute", left: `${m * 100}%`,
            transform: m === 0 ? "none" : m === 1 ? "translateX(-100%)" : "translateX(-50%)",
            fontFamily: "var(--uf-font-mono)", fontSize: 10.5, color: "var(--uf-ink-3)",
          }}>{Math.round(m * 100)}%</span>
        ))}
      </div>
    </div>
  );
}

export { UfTooltip };
