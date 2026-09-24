"use client";

/**
 * One month of expected money, in date order — the month as a budget.
 *
 * The category Budget is a set of monthly totals with no dates on them. The
 * Expected list has the dates. This puts the two together: every dated
 * payment in and out for the month, day by day, then one line for the
 * budget's day-to-day spending that has no date, then what is left.
 *
 * The allowance line is the budget's monthly spending less the repeating
 * bills already listed here, so a bill is never counted twice — and adding a
 * regular payment to Expected moves it out of the estimate and onto its day.
 * The same dates and the same allowance drive the contribution forecast in
 * Plan → Contributions, so what is planned here is what that page works from.
 */

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  expandForMonth, monthlyAllowance, type ExpectedItem,
} from "@/lib/cashflow-forecast";

export interface ExpectedMonthProps {
  items: (ExpectedItem & { completed?: boolean })[];
  /** The Budget tab's monthly spending, for the day-to-day allowance line. */
  budgetMonthlySpending: number;
  /** Formats a USD amount in the user's display currency. */
  formatAmount: (usd: number) => string;
  /** Injectable for tests. */
  today?: Date;
}

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export default function ExpectedMonth({ items, budgetMonthlySpending, formatAmount, today = new Date() }: ExpectedMonthProps) {
  const [offset, setOffset] = useState(0);
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const lines = expandForMonth(items, view.getFullYear(), view.getMonth());
  const allowance = monthlyAllowance(budgetMonthlySpending, items);

  const incoming = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const datedOut = -lines.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0);
  const outgoing = datedOut + allowance;
  const left = incoming - outgoing;
  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatAmount(Math.abs(n))}`;
  const monthName = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <section className="uf-month" aria-label={`Expected money for ${monthName}`} data-testid="uf-expected-month">
      <div className="uf-month-head">
        <div>
          <span className="uf-t-label" style={{ color: "var(--uf-ink-2)" }}>Your month</span>
          <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "var(--uf-s1) 0 0" }}>
            Everything you expect in and out, in date order. Plan → Contributions works from these dates.
          </p>
        </div>
        <div className="uf-month-nav">
          <Button variant="ghost" size="sm" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)}>‹</Button>
          <span className="uf-t-body" style={{ fontWeight: 700, minWidth: 140, textAlign: "center" }}>{monthName}</span>
          <Button variant="ghost" size="sm" aria-label="Next month" onClick={() => setOffset((o) => o + 1)}>›</Button>
        </div>
      </div>

      {lines.length === 0 && allowance === 0 ? (
        <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "var(--uf-s3) 0 0" }}>
          Nothing expected this month yet. Add your paycheck and regular bills below and they&apos;ll appear here on their dates.
        </p>
      ) : (
        <>
          <ul className="uf-month-list">
            {lines.map((l, i) => (
              <li key={`${l.iso}-${l.description}-${i}`} className={`uf-month-row${l.paid ? " is-paid" : ""}`}>
                <span className="uf-month-date">{dayLabel(l.iso)}</span>
                <span className="uf-month-what">
                  {l.description}
                  <span className="uf-month-tag">
                    {[l.recurring ? "repeats" : null, l.paid ? "paid" : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="uf-month-amt" style={{ ...mono, color: l.amount > 0 ? "var(--uf-pos-ink)" : "var(--uf-ink)" }}>
                  {signed(l.amount)}
                </span>
              </li>
            ))}
            {allowance > 0 && (
              <li className="uf-month-row uf-month-allowance">
                <span className="uf-month-date">All month</span>
                <span className="uf-month-what">
                  Day-to-day spending
                  <span className="uf-month-tag">estimate · your budget less the repeating bills above</span>
                </span>
                <span className="uf-month-amt" style={mono}>{signed(-allowance)}</span>
              </li>
            )}
          </ul>

          <dl className="uf-month-totals">
            <div><dt>In</dt><dd style={{ ...mono, color: "var(--uf-pos-ink)" }}>{formatAmount(incoming)}</dd></div>
            <div><dt>Out</dt><dd style={mono}>{formatAmount(outgoing)}</dd></div>
            <div>
              <dt>Left for the month</dt>
              <dd style={{ ...mono, fontWeight: 700, color: left < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>
                {left < 0 ? "−" : ""}{formatAmount(Math.abs(left))}
              </dd>
            </div>
          </dl>
          {incoming === 0 && (
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "var(--uf-s2) 0 0" }}>
              No income is expected this month. If you&apos;re paid regularly, add your paycheck as a repeating payment.
            </p>
          )}
        </>
      )}

      <style>{`
        .uf-month {
          background: var(--uf-card); border: 1px solid var(--uf-border);
          border-radius: var(--uf-r-card); padding: var(--uf-s4);
        }
        .uf-month-head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--uf-s3); flex-wrap: wrap; }
        .uf-month-nav { display: flex; align-items: center; gap: var(--uf-s1); }
        .uf-month-list { list-style: none; margin: var(--uf-s3) 0 0; padding: 0; border-top: 1px solid var(--uf-border); }
        .uf-month-row {
          display: grid; grid-template-columns: 104px minmax(0, 1fr) auto;
          gap: var(--uf-s3); align-items: baseline;
          padding: var(--uf-s2) 0; border-bottom: 1px solid var(--uf-border); font-size: 14px;
        }
        .uf-month-row.is-paid .uf-month-what, .uf-month-row.is-paid .uf-month-amt { color: var(--uf-ink-2) !important; }
        .uf-month-allowance { background: var(--uf-surface); padding-left: var(--uf-s2); padding-right: var(--uf-s2); }
        .uf-month-date { color: var(--uf-ink-2); font-size: 13px; white-space: nowrap; }
        .uf-month-what { min-width: 0; color: var(--uf-ink); }
        .uf-month-tag { margin-left: var(--uf-s2); font-size: 11px; color: var(--uf-ink-2); }
        .uf-month-amt { text-align: right; white-space: nowrap; }
        .uf-month-totals { display: flex; gap: var(--uf-s5); flex-wrap: wrap; margin: var(--uf-s3) 0 0; }
        .uf-month-totals div { display: flex; flex-direction: column; gap: 2px; }
        .uf-month-totals dt { font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--uf-ink-2); }
        .uf-month-totals dd { margin: 0; font-size: 18px; }
        @media (max-width: 560px) {
          .uf-month-row { grid-template-columns: minmax(0, 1fr) auto; row-gap: 2px; }
          .uf-month-date { grid-column: 1 / -1; }
          .uf-month-tag { display: block; margin-left: 0; }
        }
      `}</style>
    </section>
  );
}
