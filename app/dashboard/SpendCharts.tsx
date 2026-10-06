"use client";

import { useMemo } from "react";
import { bucketFor, daysInMonth, type DateRange } from "@/lib/spend-range";

/**
 * The three views of a range on Transactions (D-31): Line is the running
 * total against the usual pace, Bars is each day/week/month against the
 * usual level, Calendar is each day shaded by how much went out. The same
 * meaning at every range; only the bar size changes (lib/spend-range).
 */

export type Daily = Map<string, number>; // YYYY-MM-DD → USD
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function daysOf(range: DateRange, today: string): string[] {
  const out: string[] = [];
  const [y, m] = range.start.split("-").map(Number);
  for (let d = new Date(y, m - 1, 1); iso(d) <= range.end && iso(d) <= today; d.setDate(d.getDate() + 1)) out.push(iso(d));
  return out;
}
const monthShort = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" }); };

/** The key under a chart: each mark drawn as it appears, with a one-word name. */
function ChartKey({ items }: { items: { mark: "line" | "dash" | "bar" | "barSoft"; label: string }[] }) {
  const swatch = (m: string) => m === "line" ? <i style={{ width: 16, height: 0, borderTop: "2.5px solid var(--uf-chart-1)" }} />
    : m === "dash" ? <i style={{ width: 16, height: 0, borderTop: "2px dashed var(--uf-ink-3)" }} />
    : <i style={{ width: 10, height: 10, borderRadius: 2, background: m === "bar" ? "var(--uf-chart-1)" : "color-mix(in oklab, var(--uf-chart-1) 28%, var(--uf-card))" }} />;
  return (
    <div className="uf-t-small" style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--uf-ink-3)", marginTop: 6 }}>
      {items.map((it) => <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{swatch(it.mark)}{it.label}</span>)}
    </div>
  );
}

/** Running total against usual pace. `usualByDay[d]` is the usual spend through day d of a month. */
export function LineView({ range, today, daily, usualByDay, usualMonth, fmt }: {
  range: DateRange; today: string; daily: Daily; usualByDay: number[] | null; usualMonth: number | null; fmt: (n: number) => string;
}) {
  const W = 360, H = 170, P = 6, base = H - 18;
  const all = useMemo(() => {
    const days: string[] = [];
    for (const m of range.months) for (let d = 1; d <= daysInMonth(m); d++) days.push(`${m}-${String(d).padStart(2, "0")}`);
    return days;
  }, [range]);
  let run = 0;
  const mine = all.filter((d) => d <= today).map((d) => (run += daily.get(d) ?? 0));
  const usual = usualByDay && usualMonth != null
    ? all.map((d) => range.months.indexOf(d.slice(0, 7)) * usualMonth + usualByDay[Number(d.slice(8, 10))])
    : null;
  const max = Math.max(1, mine.at(-1) ?? 0, usual?.at(-1) ?? 0) * 1.08;
  const x = (i: number) => P + (i / Math.max(1, all.length - 1)) * (W - 2 * P);
  const y = (v: number) => base - (v / max) * (base - 12);
  const path = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const end = mine.length - 1, gap = usual && end >= 0 ? mine[end] - usual[end] : null;
  const ticks = range.months.length === 1 ? [0, 9, 19, all.length - 1] : range.months.map((m) => all.indexOf(`${m}-01`));

  return (
    <div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }} role="img"
      aria-label={`Running total ${fmt(mine.at(-1) ?? 0)}${gap != null ? `, ${fmt(Math.abs(gap))} ${gap >= 0 ? "above" : "below"} your usual pace` : ""}`}>
      {usual && <path d={path(usual)} fill="none" stroke="var(--uf-ink-3)" strokeWidth={2} strokeDasharray="4 4" />}
      {end >= 0 && <path d={`${path(mine)} L${x(end)} ${base} L${x(0)} ${base} Z`} fill="color-mix(in oklab, var(--uf-chart-1) 14%, transparent)" />}
      {end >= 0 && <path d={path(mine)} fill="none" stroke="var(--uf-chart-1)" strokeWidth={2.5} strokeLinejoin="round" />}
      {end >= 0 && <circle cx={x(end)} cy={y(mine[end])} r={5} fill="var(--uf-chart-1)" stroke="var(--uf-card)" strokeWidth={2} />}
      {gap != null && Math.abs(gap) >= 1 && (
        <text x={x(end) + (end > all.length * 0.7 ? -10 : 10)} y={y(mine[end]) - 8} textAnchor={end > all.length * 0.7 ? "end" : "start"} style={{ ...mono, fontSize: 13, fontWeight: 700, fill: "var(--uf-ink)" }}>
          {gap >= 0 ? "+" : "−"}{fmt(Math.abs(gap))}
        </text>
      )}
      <line x1={P} x2={W - P} y1={base} y2={base} stroke="var(--uf-border)" />
      {ticks.map((i) => i >= 0 && (
        <text key={i} x={x(i)} y={H - 4} textAnchor={i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"} style={{ ...mono, fontSize: 11, fill: "var(--uf-ink-3)" }}>
          {range.months.length === 1 ? Number(all[i].slice(8, 10)) : monthShort(all[i].slice(0, 7))}
        </text>
      ))}
    </svg>
    <ChartKey items={[{ mark: "line", label: "So far" }, ...(usual ? [{ mark: "dash" as const, label: "Usual pace" }] : [])]} />
    </div>
  );
}

/** One bar per day, week or month; the dashed level is the usual for that bar size. */
export function BarsView({ range, today, daily, usualMonth, fmt }: {
  range: DateRange; today: string; daily: Daily; usualMonth: number | null; fmt: (n: number) => string;
}) {
  const size = bucketFor(range.months.length);
  const bars = useMemo(() => {
    const out: { key: string; label: string; v: number; now: boolean }[] = [];
    if (size === "month") {
      for (const m of range.months) {
        let v = 0; daily.forEach((n, d) => { if (d.startsWith(m)) v += n; });
        out.push({ key: m, label: monthShort(m), v, now: today.startsWith(m) });
      }
    } else {
      const days = daysOf(range, today);
      const step = size === "week" ? 7 : 1;
      for (let i = 0; i < days.length; i += step) {
        const chunk = days.slice(i, i + step);
        out.push({ key: chunk[0], label: size === "day" ? String(Number(chunk[0].slice(8))) : `${monthShort(chunk[0].slice(0, 7))} ${Number(chunk[0].slice(8))}`,
          v: chunk.reduce((s, d) => s + (daily.get(d) ?? 0), 0), now: chunk.includes(today) });
      }
    }
    return out;
  }, [range, today, daily, size]);
  const level = usualMonth == null ? null : size === "month" ? usualMonth : (usualMonth * (size === "week" ? 7 : 1)) / 30.4;
  const max = Math.max(1, level ?? 0, ...bars.map((b) => b.v)) * 1.1;
  const every = Math.ceil(bars.length / 8);

  return (
    <div>
    <div role="img" aria-label={`${bars.length} ${size}s${level != null ? `, usual ${fmt(level)} per ${size}` : ""}`}
      style={{ position: "relative", height: 170, display: "flex", alignItems: "flex-end", gap: bars.length > 20 ? 2 : 6 }}>
      {level != null && (
        <>
          <i style={{ position: "absolute", left: 0, right: 0, bottom: 20 + (level / max) * 140, borderTop: "2px dashed var(--uf-ink-3)" }} />
          <span className="uf-t-small" style={{ ...mono, position: "absolute", right: 0, bottom: 24 + (level / max) * 140, color: "var(--uf-ink-3)", background: "var(--uf-card)", paddingLeft: 4 }}>{fmt(level)}</span>
        </>
      )}
      {bars.map((b, i) => (
        <div key={b.key} title={`${b.label}: ${fmt(b.v)}`} style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4, justifyItems: "center" }}>
          <i style={{ width: "100%", maxWidth: 44, height: Math.max(b.v > 0 ? 2 : 0, (b.v / max) * 140), borderRadius: "4px 4px 0 0",
            background: b.now ? "var(--uf-chart-1)" : "color-mix(in oklab, var(--uf-chart-1) 28%, var(--uf-card))" }} />
          <span style={{ ...mono, fontSize: 10, height: 12, color: b.now ? "var(--uf-ink)" : "var(--uf-ink-3)", whiteSpace: "nowrap" }}>{i % every === 0 ? b.label : ""}</span>
        </div>
      ))}
    </div>
    <ChartKey items={[{ mark: "bar", label: "Now" }, { mark: "barSoft", label: "Earlier" }, ...(level != null ? [{ mark: "dash" as const, label: `Usual ${size}` }] : [])]} />
    </div>
  );
}

const SHADES = [0, 22, 46, 72, 100];
/** Shade cut-offs from the person's own spending days: 40th, 70th and 90th percentile. */
export function shadeCuts(values: number[]): [number, number, number] {
  const v = values.filter((x) => x > 0).sort((a, b) => a - b);
  const q = (p: number) => v[Math.floor(p * (v.length - 1))] ?? 0;
  return [q(0.4), q(0.7), q(0.9)];
}

/** Each day shaded by money out; a full month with numbers, or small months side by side. */
export function CalendarView({ range, today, daily, fmt, selectedDay, onSelectDay, onZoomMonth }: {
  range: DateRange; today: string; daily: Daily; fmt: (n: number) => string;
  selectedDay: string | null; onSelectDay: (d: string | null) => void; onZoomMonth: (month: string) => void;
}) {
  const cuts = useMemo(() => shadeCuts(daysOf(range, today).map((d) => daily.get(d) ?? 0)), [range, today, daily]);
  const lvl = (v: number) => (v <= 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);
  const shade = (l: number) => `color-mix(in oklab, var(--uf-chart-1) ${SHADES[l]}%, var(--uf-surface-2))`;
  const single = range.months.length === 1;
  const legend = ["$0", `< ${fmt(cuts[0])}`, `${fmt(cuts[0])}+`, `${fmt(cuts[1])}+`, `${fmt(cuts[2])}+`];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: single ? "1fr" : "repeat(auto-fill, minmax(min(200px, 44%), 1fr))", gap: "16px 20px" }}>
        {range.months.map((m) => {
          const lead = (new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).getDay() + 6) % 7;
          return (
            <div key={m} style={{ display: "grid", gap: 6, alignContent: "start" }}>
              {!single && (
                <button type="button" onClick={() => onZoomMonth(m)} aria-label={`Show ${monthShort(m)} only`} className="uf-t-label"
                  style={{ justifySelf: "start", border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--uf-ink-2)", font: "inherit", fontWeight: 700 }}>
                  {monthShort(m)}
                </button>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: single ? 4 : 3 }}>
                {single && ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`h${i}`} className="uf-t-small" style={{ textAlign: "center", color: "var(--uf-ink-3)" }}>{d}</span>)}
                {Array.from({ length: lead }, (_, i) => <i key={`b${i}`} />)}
                {Array.from({ length: daysInMonth(m) }, (_, i) => {
                  const d = `${m}-${String(i + 1).padStart(2, "0")}`, future = d > today, v = daily.get(d) ?? 0, l = lvl(v), on = selectedDay === d;
                  return (
                    <button key={d} type="button" disabled={future || !single} onClick={() => onSelectDay(on ? null : d)}
                      aria-label={future ? undefined : `${d}: ${fmt(v)}`} title={future ? "" : `${Number(d.slice(8))} ${monthShort(m)} · ${fmt(v)}`}
                      style={{ aspectRatio: single ? "1.4" : "1", minWidth: 0, borderRadius: single ? 6 : 3, padding: single ? 4 : 0, textAlign: "left", font: "inherit",
                        cursor: future || !single ? "default" : "pointer", border: on ? "2px solid var(--uf-ink)" : future ? "1px dashed var(--uf-border)" : "none",
                        background: future ? "transparent" : shade(l), color: l >= 3 ? "var(--uf-card)" : "var(--uf-ink-3)" }}>
                      {single && <span style={{ ...mono, fontSize: 10 }}>{i + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="uf-t-small" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", color: "var(--uf-ink-3)" }}>
        {SHADES.map((_, i) => (
          <span key={i} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <i style={{ width: 12, height: 12, borderRadius: 3, background: shade(i) }} /><span style={mono}>{legend[i]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export const calendarAllowed = (months: number, phone: boolean) => months <= (phone ? 6 : 12);
