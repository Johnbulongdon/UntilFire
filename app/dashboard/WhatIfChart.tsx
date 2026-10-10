"use client";

/**
 * Compare's chart (D-69): your plan dashed, the changed plan solid on top,
 * the years each change covers marked, and the milestones above it, lit when
 * the changes moved them and grey when not.
 */
export type ChartMilestone = { key: string; icon: string; label: string; at: number; moved: boolean };
export type ChartSpan = { key: string; icon: string; label: string; from: number; to: number | null };

export default function WhatIfChart({ base, next, target, milestones, spans, ageAt, height = 250, width = 560 }: {
  /** Invested each year from now, your plan and the changed plan. */
  base: number[]; next: number[];
  target: number;
  /** Years from now. */
  milestones: ChartMilestone[]; spans: ChartSpan[];
  /** Axis label for a year from now: an age or a calendar year. */
  ageAt: (year: number) => number;
  height?: number;
  /** Drawing width: narrower on a phone so the words stay readable. */
  width?: number;
}) {
  const W = width, H = height, top = 44, bottom = 24, left = 8, right = 12;
  // Up to a few years past freedom: the pension marker shows when it falls inside, without stretching the chart.
  const last = Math.max(10, Math.min(base.length - 1, Math.ceil(Math.max(...milestones.filter((m) => m.key !== "pension").map((m) => m.at), 0)) + 4));
  const max = Math.max(target * 1.08, ...base.slice(0, last + 1), ...next.slice(0, last + 1), 1);
  const x = (y: number) => left + (y / last) * (W - left - right);
  const y = (v: number) => H - bottom - (Math.max(0, v) / max) * (H - top - bottom);
  const path = (s: number[]) => s.slice(0, last + 1).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const step = last > 30 ? 10 : 5;
  const ticks = Array.from({ length: last + 1 }, (_, i) => i).filter((i) => ageAt(i) % step === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your plan against the changed plan, invested each year" style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
      <line x1={left} x2={W - right} y1={y(target)} y2={y(target)} stroke="var(--uf-border-2)" strokeDasharray="5 5" />
      <text x={left} y={y(target) - 5} fontSize="10.5" fill="var(--uf-ink-3)">Enough to be free</text>
      {spans.map((s) => s.to != null ? (
        <g key={s.key}>
          <rect x={x(s.from)} y={top} width={Math.max(2, x(Math.min(s.to, last)) - x(s.from))} height={H - top - bottom} fill="var(--uf-neg-bg)" opacity={0.45} />
          <text x={x(s.from) + 4} y={H - bottom - 6} fontSize="10" fill="var(--uf-neg-ink)">{s.icon} {s.label}</text>
        </g>
      ) : (
        <g key={s.key}>
          <line x1={x(s.from)} x2={x(s.from)} y1={top} y2={H - bottom} stroke="var(--uf-teal)" strokeDasharray="3 4" />
          <text x={x(s.from) + 4} y={H - bottom - 6} fontSize="10" fill="var(--uf-teal-deep)">{s.icon} {s.label}</text>
        </g>
      ))}
      <path d={path(base)} fill="none" stroke="var(--uf-ink-3)" strokeWidth={2.2} strokeDasharray="6 5" />
      <path d={path(next)} fill="none" stroke="var(--uf-teal)" strokeWidth={3} />
      {ticks.map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--uf-ink-3)" fontFamily="var(--uf-font-mono)">{ageAt(i)}</text>)}
      {milestones.filter((m) => m.at <= last).map((m, i, list) => {
        // Two close together: only the one that moved keeps its words, so neither covers the other.
        const close = list.some((o, j) => j !== i && Math.abs(x(o.at) - x(m.at)) < 64);
        const words = !close || m.moved || !list.some((o, j) => j !== i && o.moved && Math.abs(x(o.at) - x(m.at)) < 64);
        return (
        <g key={m.key} transform={`translate(${x(m.at)},14)`}>
          <circle r={12} fill={m.moved ? "var(--uf-teal-soft)" : "var(--uf-surface-2)"} stroke={m.moved ? "var(--uf-teal)" : "var(--uf-border-2)"} />
          <text y={4.5} textAnchor="middle" fontSize="12" opacity={m.moved ? 1 : 0.5}>{m.icon}</text>
          {words && <text y={28} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={m.moved ? "var(--uf-teal-deep)" : "var(--uf-ink-3)"}>{m.label}</text>}
        </g>
        );
      })}
    </svg>
  );
}
