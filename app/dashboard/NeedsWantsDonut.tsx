"use client";

import { Card } from "@/components/ui";
import { moneyMono } from "./MoneyCards";

/** Needs and Wants keep these colours wherever the two groups appear on Budget. */
export const NEEDS_COLOR = "var(--uf-chart-3)";
export const WANTS_COLOR = "var(--uf-chart-2)";
const BILLS_COLOR = "color-mix(in srgb, var(--uf-chart-3) 60%, #000)";
const REST_COLOR = "var(--uf-surface-2)";

const R = 60;
const C = 2 * Math.PI * R;

/**
 * The month's take-home pay as one ring (D-134): Needs (bills the darker
 * part), Wants and what isn't spent yet, against 50/30/20. Three slices
 * only, so a pie stays readable; the goals are words and small bars beside
 * it, never marks on the ring. Without income it shows the spending split.
 */
export default function NeedsWantsDonut({ income, needsBills, needsOther, wants, monthName, fmt }: {
  /** Monthly take-home pay; 0 when unknown. */
  income: number;
  /** Bills (spent or still due) in need categories. */
  needsBills: number;
  /** Everything else spent in need categories. */
  needsOther: number;
  wants: number;
  monthName: string;
  fmt: (n: number) => string;
}) {
  const needs = needsBills + needsOther;
  const used = needs + wants;
  const hasIncome = income > 0;
  const total = hasIncome ? Math.max(income, used) : used;
  if (total <= 0) return null;
  const rest = hasIncome ? Math.max(0, income - used) : 0;
  const pct = (n: number) => Math.round((n / total) * 100);

  const parts = [
    { key: "bills", value: needsBills, color: BILLS_COLOR },
    { key: "needs", value: needsOther, color: NEEDS_COLOR },
    { key: "wants", value: wants, color: WANTS_COLOR },
    { key: "rest", value: rest, color: REST_COLOR },
  ].filter((p) => p.value > 0);
  let offset = 0;
  const arcs = parts.map((p) => {
    const length = (p.value / total) * C;
    const arc = { ...p, dash: Math.max(0, length - (parts.length > 1 ? 2.5 : 0)), offset };
    offset += length;
    return arc;
  });

  const label = hasIncome
    ? `Of your ${fmt(income)} take-home: Needs ${pct(needs)}%, goal 50%. Wants ${pct(wants)}%, goal 30%. Not spent yet ${pct(rest)}%, goal 20%.`
    : `Spent in ${monthName}: Needs ${pct(needs)}%, Wants ${pct(wants)}%.`;

  return (
    <Card style={{ display: "grid", gap: 12 }}>
      <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700 }}>
        {hasIncome ? <>Your <b style={moneyMono}>{fmt(income)}</b> take-home · 50/30/20</> : <>Where {monthName} went</>}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <svg role="img" aria-label={label} width="132" height="132" viewBox="0 0 160 160" style={{ flex: "none" }}>
          <circle r={R} cx="80" cy="80" fill="none" stroke={REST_COLOR} strokeWidth="26" />
          {arcs.map((a) => (
            <circle key={a.key} r={R} cx="80" cy="80" fill="none" stroke={a.color} strokeWidth="26"
              strokeDasharray={`${a.dash} ${C}`} strokeDashoffset={-a.offset} transform="rotate(-90 80 80)" />
          ))}
          <text x="80" y="74" textAnchor="middle" fontSize="13" fill="var(--uf-ink-3)" fontFamily="Inter, sans-serif">{hasIncome ? "Saving" : "Spent"}</text>
          <text x="80" y="98" textAnchor="middle" fontSize="21" fontWeight="800" fill="var(--uf-ink)" fontFamily="Inter, sans-serif" style={moneyMono}>
            {fmt(hasIncome ? rest : used)}
          </text>
        </svg>
        <div style={{ flex: "1 1 180px", display: "grid", gap: 12, minWidth: 0 }}>
          <Legend color={NEEDS_COLOR} name="Needs" pct={pct(needs)} note={hasIncome ? `of 50% goal${needsBills > 0 ? " · bills inside" : ""}` : fmt(needs)} goal={hasIncome ? 50 : undefined} />
          <Legend color={WANTS_COLOR} name="Wants" pct={pct(wants)} note={hasIncome ? "of 30% goal" : fmt(wants)} goal={hasIncome ? 30 : undefined} />
          {hasIncome && <Legend color={REST_COLOR} name="Not spent yet" pct={pct(rest)} note={pct(rest) >= 20 ? "20% goal: on track" : "20% goal: below"} />}
        </div>
      </div>
    </Card>
  );
}

function Legend({ color, name, pct, note, goal }: { color: string; name: string; pct: number; note: string; goal?: number }) {
  const over = goal != null && pct > goal;
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: color, border: "1px solid var(--uf-border)", flex: "none" }} />
        <span className="uf-t-body" style={{ flex: 1, fontWeight: 600 }}>{name}</span>
        <b className="uf-t-body" style={{ ...moneyMono, color: over ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{pct}%</b>
      </div>
      <span className="uf-t-small" style={{ marginLeft: 18, color: over ? "var(--uf-neg-ink)" : "var(--uf-ink-3)" }}>{over ? `over the ${goal}% goal` : note}</span>
      {goal != null && (
        <div aria-hidden style={{ marginLeft: 18, height: 6, borderRadius: 3, background: "var(--uf-surface-2)", overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: `${Math.min(1, pct / goal) * 100}%`, background: over ? "var(--uf-neg)" : color }} />
        </div>
      )}
    </div>
  );
}
