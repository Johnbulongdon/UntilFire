"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import { Button } from "@/components/ui";

/**
 * Insights, "What changed" (John, 5 Nov 2026): the last finished month
 * against your usual month, the two categories that moved most, what one of
 * them would do to your freedom date if it stayed, and six months of what was
 * left over. Usual is the median of the months before it, so one odd month
 * does not set the bar. Budget's own numbers are not repeated here.
 */

type Tx = { date: string; amount: number; refund_amount: number; currency: string; category: string; transaction_type: "expense" | "income" | "transfer" };
export type CatInfo = { label: string; emoji: string };

const net = (t: Tx) => Math.max(0, t.amount - (t.refund_amount || 0));
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthName = (k: string, opts: Intl.DateTimeFormatOptions = { month: "long" }) =>
  new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString("en-US", opts);
const yrs = (y: number) => `${Math.abs(y).toFixed(1)} ${Math.abs(y) >= 0.95 && Math.abs(y) < 1.05 ? "year" : "years"}`;

export default function WhatChanged({ transactions, toUsd, money, short = money, cat, shift, budgets = {}, onOpenTransactions }: {
  transactions: Tx[];
  toUsd: (t: Tx, amount: number) => number;
  money: (usd: number) => string;
  /** Compact money for chart labels. */
  short?: (usd: number) => string;
  cat: (key: string) => CatInfo;
  /** Years the freedom date moves if monthly spending changed by this many dollars for good. */
  shift?: (monthlyUsd: number) => number | null;
  budgets?: Record<string, number>;
  onOpenTransactions: () => void;
}) {
  const data = useMemo(() => {
    const now = new Date();
    const keys = Array.from({ length: 7 }, (_, i) => ym(new Date(now.getFullYear(), now.getMonth() - 7 + i, 1)));
    const month = keys[6];
    const spend: Record<string, number> = {}, inc: Record<string, number> = {};
    const byCat: Record<string, Record<string, number>> = {};
    for (const t of transactions) {
      const k = t.date.slice(0, 7);
      if (!keys.includes(k)) continue;
      if (t.transaction_type === "expense") {
        const v = toUsd(t, net(t));
        spend[k] = (spend[k] || 0) + v;
        const c = t.category || "other";
        (byCat[c] ??= {})[k] = (byCat[c][k] || 0) + v;
      } else if (t.transaction_type === "income") inc[k] = (inc[k] || 0) + toUsd(t, t.amount);
    }
    const before = keys.slice(0, 6).filter((k) => (spend[k] || 0) > 0 || (inc[k] || 0) > 0);
    const usual = median(before.map((k) => spend[k] || 0));
    const changes = Object.entries(byCat).map(([c, m]) => {
      const now = m[month] || 0, was = median(before.map((k) => m[k] || 0));
      return { c, now, was, diff: now - was };
    }).filter((x) => Math.abs(x.diff) >= 20).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 2);
    const bars = keys.slice(1).map((k) => ({ k, label: monthName(k, { month: "short" }), left: (inc[k] || 0) - (spend[k] || 0) }))
      .filter((b, i, all) => all.slice(0, i + 1).some((x) => x.left !== 0));
    return { month, spent: spend[month] || 0, usual, enough: before.length >= 2 && (spend[month] || 0) > 0, changes, bars };
  }, [transactions, toUsd]);

  if (!data.enough) return null;
  const diff = data.spent - data.usual;
  const moved = shift ? shift(diff) : null;
  const up = data.changes.find((x) => x.diff > 0);
  const upShift = up && shift ? shift(up.diff) : null;
  const name = monthName(data.month);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section aria-label={`${name} against a usual month`} style={{ background: "var(--uf-yellow)", color: "#151719", borderRadius: 20, padding: 20, display: "grid", gap: 6 }}>
        <span className="uf-t-small" style={{ color: "#5C5130", fontWeight: 700 }}>What changed in {name}</span>
        <span style={{ font: "800 clamp(26px, 5vw, 34px)/1.1 var(--uf-font-display)", fontVariantNumeric: "tabular-nums" }}>
          {Math.abs(diff) < 20 ? "A usual month" : `${money(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than usual`}</span>
        <span className="uf-t-small" style={{ color: "#5C5130" }}>
          You spent {money(data.spent)}. A usual month is {money(data.usual)}.
          {moved !== null && Math.abs(diff) >= 20 && (Math.abs(moved) < 0.05 ? " Your freedom date didn't move." : ` If every month were like this, freedom comes ${yrs(moved)} ${moved > 0 ? "later" : "sooner"}.`)}
        </span>
      </section>

      {data.changes.length > 0 && <section aria-label="Biggest changes" style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 18, padding: 16, display: "grid", gap: 10 }}>
        <b className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-ink)" }}>Biggest changes</b>
        {data.changes.map((x) => {
          const info = cat(x.c);
          return <div key={x.c} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-hidden style={{ fontSize: 18 }}>{info.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}><b className="uf-t-small" style={{ fontWeight: 700, display: "block", color: "var(--uf-ink)" }}>{info.label}</b>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{money(x.now)} · usually {money(x.was)}</span></span>
            <b className="uf-t-small" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: x.diff > 0 ? "var(--uf-neg-ink)" : "var(--uf-pos-ink)" }}>
              {x.diff > 0 ? "▲" : "▼"} {money(Math.abs(x.diff))}</b>
          </div>;
        })}
      </section>}

      {up && upShift !== null && Math.abs(upShift) >= 0.05 && <section aria-label={`If ${cat(up.c).label} stayed this high`} style={{ background: "var(--uf-mint)", color: "var(--uf-ink)", borderRadius: 18, padding: 16, display: "grid", gap: 8 }}>
        <b className="uf-t-small" style={{ fontWeight: 700 }}>{cat(up.c).emoji} If {cat(up.c).label} stayed this high</b>
        <span className="uf-t-small">Freedom comes <b>{yrs(upShift)} later</b>.{budgets[up.c] > 0 && <> Your budget is {money(budgets[up.c])}.</>}</span>
        <span><Button size="sm" variant="secondary" onClick={onOpenTransactions}>See transactions</Button></span>
      </section>}

      {data.bars.length >= 2 && <section aria-label="Left over each month" style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 18, padding: 16, display: "grid", gap: 8 }}>
        <span><b className="uf-t-small" style={{ fontWeight: 700, display: "block", color: "var(--uf-ink)" }}>Last {data.bars.length} months</b>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>What was left over after spending. Below the line means more went out than came in.</span></span>
        <div style={{ width: "100%", minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.bars} margin={{ top: 18, right: 4, bottom: 0, left: 4 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--uf-ink-3)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <ReferenceLine y={0} stroke="var(--uf-border)" />
              <Bar dataKey="left" maxBarSize={56} radius={[6, 6, 6, 6]} isAnimationActive={false}
                label={{ position: "top", fontSize: 10, fill: "var(--uf-ink-2)", formatter: (v: unknown) => short(Number(v)) }}>
                {data.bars.map((b) => <Cell key={b.k} fill={b.left >= 0 ? "var(--uf-pos)" : "var(--uf-neg-ink)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>}
    </div>
  );
}
