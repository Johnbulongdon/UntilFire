"use client";

/**
 * The freedom curve on Home (inside FreedomCard): full-bleed, edge to edge
 * of the yellow card. Today is a dot only (its words live in the card's
 * pill); every milestone and the goal drop a dotted line to one label row at
 * the bottom, so labels never sit on the line or on each other.
 */

import { useEffect, useRef, useState } from "react";

type Point = { year: number; value: number; actual: boolean };

const ROW = 50;       // label row under the curve
const TOP = 22;       // room above the end dot
const PAD = 24;       // matches the card's side padding, so dots line up with the text
const LABEL_GAP = 84; // centre-to-centre room two milestone labels need
const END_ROOM = 96;  // a milestone label this close to the end gives way to "Free"

export function FreedomCurve({ points, target, todayYear, milestones, move, fmt, todayNote }: {
  points: Point[];
  target: number;
  todayYear: number;
  milestones: { year: number; value: number; label: string }[];
  /** A move to the retirement city (D-82): its year, flag image and name. */
  move?: { year: number; flagUri: string | null; city: string } | null;
  fmt: (n: number) => string;
  /** Extra line in today's hover, e.g. the investments / safety cash split. */
  todayNote?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<Point | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const h = w > 0 && w < 480 ? 200 : 230;
  const ok = w > 0 && points.length > 1;
  const first = points[0]?.year ?? todayYear, last = points[points.length - 1]?.year ?? todayYear;
  const top = Math.max(target, ...points.map((p) => p.value), 1);
  const X = (y: number) => PAD + ((y - first) / Math.max(1, last - first)) * (w - 2 * PAD);
  const Y = (v: number) => TOP + (1 - Math.max(0, v) / top) * (h - TOP - ROW - 14);
  const base = h - ROW;

  const end = points[points.length - 1];
  const today = points.find((p) => p.year === todayYear) ?? points[0];
  const line = ok ? `M0,${Y(points[0].value)} ` + points.map((p) => `L${X(p.year)},${Y(p.value)}`).join(" ") : "";
  const area = ok ? `${line} L${w},${Y(end.value)} L${w},${h} L0,${h} Z` : "";

  // Keep milestone labels apart from each other and from the end label.
  const shown: typeof milestones = [];
  if (ok) {
    let lastX = -Infinity;
    for (const m of milestones) {
      const x = X(m.year);
      if (x - lastX < LABEL_GAP || X(last) - x < END_ROOM) continue;
      shown.push(m);
      lastX = x;
    }
  }

  const drop = (x: number, y: number, name: string, sub: string, anchor: "middle" | "end", key: string) => (
    <g key={key}>
      <line x1={x} x2={x} y1={y + 8} y2={base + 4} stroke="var(--uf-teal-line)" strokeDasharray="2 4" />
      <text x={x} y={base + 22} textAnchor={anchor} fontSize={12} fontWeight={700} fill="var(--uf-ink)">{name}</text>
      <text x={x} y={base + 38} textAnchor={anchor} fontSize={12} fill="var(--uf-ink-2)">{sub}</text>
    </g>
  );

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    let best = points[0];
    for (const p of points) if (Math.abs(X(p.year) - x) < Math.abs(X(best.year) - x)) best = p;
    setHover(best);
  };

  const mv = ok && move && points.some((p) => p.year === move.year) ? points.find((p) => p.year === move.year)! : null;

  return (
    <div ref={ref} style={{ position: "relative", margin: "4px calc(-1 * var(--uf-s5)) calc(-1 * var(--uf-s5))", height: h }}>
      {ok && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" }}
          role="img" aria-label={`Freedom curve from ${fmt(today.value)} today to ${fmt(end.value)} in ${last}${shown.length ? `, passing ${shown.map((m) => `${m.label} in ${m.year}`).join(", ")}` : ""}.`}>
          <path d={area} fill="var(--uf-teal-soft)" />
          <path d={line} fill="none" stroke="var(--uf-ink)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {shown.map((m) => drop(X(m.year), Y(m.value), m.label, String(m.year), "middle", m.label))}
          {drop(X(last), Y(end.value), `Free · ${fmt(target)}`, String(last), "end", "end")}
          {shown.map((m) => <circle key={`d${m.label}`} cx={X(m.year)} cy={Y(m.value)} r={5} fill="var(--uf-card)" stroke="var(--uf-ink)" strokeWidth={2.5} />)}
          {mv && move && (
            <g aria-label={`Move to ${move.city} in ${move.year}`}>
              <circle cx={X(mv.year)} cy={Y(mv.value) - 22} r={13} fill="var(--uf-card)" stroke="var(--uf-ink)" strokeWidth={1.5} />
              {move.flagUri
                ? <image href={move.flagUri} x={X(mv.year) - 9} y={Y(mv.value) - 28} width={18} height={12} preserveAspectRatio="xMidYMid slice" />
                : <text x={X(mv.year)} y={Y(mv.value) - 17} textAnchor="middle" fontSize={13}>{"\u{1F4CD}"}</text>}
            </g>
          )}
          <circle cx={X(today.year)} cy={Y(today.value)} r={7} fill="var(--uf-ink)" stroke="var(--uf-card)" strokeWidth={2} />
          <circle cx={X(last)} cy={Y(end.value)} r={9} fill="var(--uf-ink)" stroke="var(--uf-card)" strokeWidth={2} />
          {hover && <circle cx={X(hover.year)} cy={Y(hover.value)} r={5} fill="var(--uf-ink)" stroke="var(--uf-card)" strokeWidth={2} pointerEvents="none" />}
          <rect x={0} y={0} width={w} height={base} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}
      {ok && hover && (
        <div className="uf-t-small" style={{
          position: "absolute", pointerEvents: "none", top: Math.max(0, Y(hover.value) - 64),
          left: Math.min(Math.max(8, X(hover.year) - 70), w - 188), width: 180,
          background: "var(--uf-card)", borderRadius: 12, padding: "8px 10px", boxShadow: "var(--uf-e2)",
        }}>
          <div style={{ color: "var(--uf-ink-2)" }}>
            {hover.year}{hover.year === todayYear ? " · today" : hover.actual ? "" : " · projected"}
            {move && hover.year >= move.year ? ` · in ${move.city}` : ""}
          </div>
          <b style={{ fontFamily: "var(--uf-font-mono)", color: "var(--uf-ink)" }}>{fmt(hover.value)}</b>
          {hover.year === todayYear && todayNote && <div style={{ color: "var(--uf-ink-2)", whiteSpace: "pre-line" }}>{todayNote}</div>}
        </div>
      )}
    </div>
  );
}
