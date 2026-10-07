"use client";

/**
 * Home's calm cards (D-39): the freedom date, this month, and one quiet row.
 *
 * Progress is drawn, not described. Each card leads with one number and the
 * bar that number fills; colour is the category colours in "This month" and
 * teal for freedom and progress, nothing else. Read-only, like all of Home:
 * every figure is computed by the dashboard and passed in.
 */

import { Card } from "@/components/ui";

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const muted: React.CSSProperties = { color: "var(--uf-ink-3)" };
const trackStyle: React.CSSProperties = { position: "relative", borderRadius: 999, background: "var(--uf-surface-2)", overflow: "hidden" };
const link: React.CSSProperties = { background: "none", border: "none", padding: 0, font: "inherit", color: "var(--uf-pos-ink)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };

/** A teal bar filled to `share` (0–1). */
export function ProgressTrack({ share, height = 8, label }: { share: number; height?: number; label: string }) {
  const pct = Math.max(0, Math.min(1, share)) * 100;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} style={{ ...trackStyle, height }}>
      <i style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "var(--uf-teal)", borderRadius: 999 }} />
    </div>
  );
}

const PERIODS = ["5Y", "15Y", "All"] as const;
export type ChartPeriod = typeof PERIODS[number];

export function FreedomCard({ dateLabel, yearsAway, age, invested, target, fmt, period, onPeriod, children }: {
  /** "March 2041"; null until the plan has enough to project. */
  dateLabel: string | null;
  yearsAway: number | null;
  age: number | null;
  invested: number;
  target: number;
  fmt: (n: number, compact?: boolean) => string;
  period: ChartPeriod;
  onPeriod: (p: ChartPeriod) => void;
  /** The chart, drawn by the dashboard from the same projection as the date. */
  children: React.ReactNode;
}) {
  const share = target > 0 ? invested / target : 0;
  return (
    <Card style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="uf-t-small" style={muted}>Work becomes optional</div>
          {dateLabel ? (
            <>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(32px, 6vw, 40px)", fontWeight: 700, color: "var(--uf-teal)", lineHeight: 1.1 }}>{dateLabel}</div>
              {yearsAway != null && (
                <div className="uf-t-small" style={{ color: "var(--uf-ink-2)", marginTop: 2 }}>
                  In {yearsAway} {yearsAway === 1 ? "year" : "years"}{age ? `, at ${age}` : ""}
                </div>
              )}
            </>
          ) : (
            <div className="uf-t-body" style={{ color: "var(--uf-ink-2)" }}>Finish your setup to see your freedom date.</div>
          )}
        </div>
        <div role="group" aria-label="Chart range" style={{ display: "inline-flex", background: "var(--uf-surface-2)", borderRadius: 999, padding: 3 }}>
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={p === period} onClick={() => onPeriod(p)}
              style={{ border: "none", borderRadius: 999, padding: "4px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: p === period ? "var(--uf-card)" : "transparent", color: p === period ? "var(--uf-ink)" : "var(--uf-ink-3)", boxShadow: p === period ? "var(--uf-e1)" : "none" }}>
              {p}
            </button>
          ))}
        </div>
      </div>
      {target > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <ProgressTrack share={share} height={10} label="Progress to your FIRE number" />
          <div className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "var(--uf-ink-2)" }}>
            <span><b style={{ ...mono, color: "var(--uf-ink)" }}>{fmt(invested, true)}</b> of <span style={mono}>{fmt(target, true)}</span> FIRE number</span>
            <b style={mono}>{Math.min(100, Math.round(share * 100))}%</b>
          </div>
        </div>
      )}
      {children}
    </Card>
  );
}

export interface MonthCategory { key: string; label: string; color: string; usd: number }

export function MonthCard({ spent, budget, categories, free, freeUntil, fmt, onOpen }: {
  spent: number;
  /** The month's spending budget; 0 when none is set. */
  budget: number;
  /** Largest first; the card shows three and folds the rest into Other. */
  categories: MonthCategory[];
  free: number | null;
  freeUntil: string | null;
  fmt: (n: number) => string;
  onOpen: () => void;
}) {
  const top = categories.slice(0, 3);
  const rest = categories.slice(3).reduce((s, c) => s + c.usd, 0);
  const shown = rest > 0 ? [...top, { key: "_rest", label: "Other", color: "var(--uf-ink-3)", usd: rest }] : top;
  const scale = Math.max(budget, spent, shown.reduce((sum, c) => sum + c.usd, 0), 1);
  return (
    <Card style={{ display: "grid", gap: 10, alignContent: "start" }}>
      <div className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: 8, ...muted }}>
        <span>This month</span>
        <button type="button" onClick={onOpen} style={link}>Transactions →</button>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...mono, fontSize: 28, fontWeight: 600 }}>{fmt(spent)}</span>
        {budget > 0 && <span className="uf-t-small" style={muted}>of <span style={mono}>{fmt(budget)}</span> budget</span>}
      </div>
      <div role="img" aria-label={`Spent ${fmt(spent)}${budget > 0 ? ` of ${fmt(budget)}` : ""}: ${shown.map((c) => `${c.label} ${fmt(c.usd)}`).join(", ")}`}
        style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2, background: "var(--uf-surface-2)" }}>
        {shown.map((c) => <i key={c.key} style={{ width: `${(c.usd / scale) * 100}%`, background: c.color }} />)}
      </div>
      {shown.length > 0 && (
        <div className="uf-t-small" style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "var(--uf-ink-2)" }}>
          {shown.map((c) => <span key={c.key}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: c.color, marginRight: 5 }} />{c.label}</span>)}
        </div>
      )}
      {free != null && (
        <div className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>
          <b style={{ ...mono, color: free < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{free < 0 ? `Over by ${fmt(-free)}` : fmt(free)}</b>
          {free >= 0 ? " free to spend" : ""}{freeUntil ? ` until ${freeUntil}` : ""}
        </div>
      )}
    </Card>
  );
}

const cell: React.CSSProperties = { display: "grid", gap: 8, padding: "14px 18px", background: "var(--uf-card)", color: "inherit", textAlign: "left", border: "none", font: "inherit", cursor: "pointer" };
const head: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, color: "var(--uf-ink-2)" };

export function GlanceRow({ netWorth, runway, onPlan, fmt, onNetWorth, onRunway, onMonths }: {
  netWorth: number;
  /** Months covered, the floor and the target, in months; null without spending to measure. */
  runway: { months: number; floor: number; target: number } | null;
  /** Finished months, oldest first; null before any finished month. */
  onPlan: boolean[] | null;
  fmt: (n: number) => string;
  onNetWorth: () => void;
  onRunway: () => void;
  onMonths: () => void;
}) {
  const on = onPlan?.filter(Boolean).length ?? 0;
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* A 1px gap over a border-coloured grid draws the dividers in one row or three. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 1, background: "var(--uf-border)" }}>
        <button type="button" onClick={onNetWorth} style={cell}>
          <span className="uf-t-small" style={head}>Net worth <span style={muted}>›</span></span>
          <b style={{ ...mono, fontSize: 18, color: netWorth < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{fmt(netWorth)}</b>
        </button>
        {runway && (
          <button type="button" onClick={onRunway} style={cell}>
            <span className="uf-t-small" style={head}>Safety runway <span style={mono}>{runway.months.toFixed(1)} of {runway.target} mo</span></span>
            <div style={{ position: "relative" }}>
              <ProgressTrack share={runway.months / runway.target} label={`Safety runway: ${runway.months.toFixed(1)} of ${runway.target} months`} />
              <i title={`Floor: ${runway.floor} months`} style={{ position: "absolute", top: -3, bottom: -3, left: `${Math.min(100, (runway.floor / runway.target) * 100)}%`, width: 2, background: "var(--uf-ink)" }} />
            </div>
          </button>
        )}
        {onPlan && (
          <button type="button" onClick={onMonths} style={cell}>
            <span className="uf-t-small" style={head}>Months on plan <span style={mono}>{on} of {onPlan.length}</span></span>
            <div role="img" aria-label={`${on} of ${onPlan.length} finished months on plan`} style={{ display: "flex", gap: 3 }}>
              {onPlan.map((ok, i) => <i key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: ok ? "var(--uf-teal)" : "var(--uf-surface-2)" }} />)}
            </div>
          </button>
        )}
      </div>
    </Card>
  );
}
