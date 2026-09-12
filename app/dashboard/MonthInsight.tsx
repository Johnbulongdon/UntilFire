"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Delta, Money } from "@/components/ui";
import { EXPENSE_CATEGORIES, loadCatCustomizations, resolveDisplay } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { convertUSDAmount, type SupportedCurrency } from "@/lib/currency";

/**
 * One month, understood.
 *
 * Reports answers "how am I trending" over 3, 6 or 12 months. It could not
 * answer "why was August like that", which is the question people actually
 * ask — and the one that decides whether a freedom date is trustworthy.
 *
 * The exclusion toggles are the point. A FIRE target is 25x annual spending,
 * so a single £4,000 holiday sitting in one month inflates the monthly
 * average, inflates the target, and moves the freedom date — the one number
 * this product exists to produce. Being able to say "ignore Travel, that was
 * a one-off" is what makes the rest of the number honest.
 *
 * The comparison is against the median of the user's OTHER months rather
 * than a budget, so it works for someone who has never set one. Median
 * rather than mean because the outlier month is exactly what we are trying
 * to see past.
 */

type Tx = {
  date: string;
  amount: number;
  refund_amount: number;
  currency: string;
  category: string;
  transaction_type: "expense" | "income" | "transfer";
};

const netAmt = (t: Tx) => Math.max(0, t.amount - (t.refund_amount || 0));
const toUSD = (amount: number, currency: string, rates: Record<string, number>) => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const WITHDRAWAL_MULTIPLE = 25; // 4% safe withdrawal — same rule as the rest of the app

export default function MonthInsight({
  transactions,
  rates,
  displayCurrency = "USD",
  displayRates,
}: {
  transactions: Tx[];
  rates: Record<string, number>;
  displayCurrency?: SupportedCurrency | string;
  displayRates?: Record<string, number>;
}) {
  const [catCustomizations] = useState(loadCatCustomizations);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  // Convert a USD figure into what the user reads in. Same path as every
  // other display figure — a second conversion helper is a second answer.
  const disp = (usd: number) => convertUSDAmount(usd, displayCurrency, displayRates ?? {});

  const expenses = useMemo(
    () => transactions.filter((t) => t.transaction_type === "expense"),
    [transactions],
  );

  /** Months that actually have spending, newest first. */
  const months = useMemo(() => {
    const set = new Set(expenses.map((t) => t.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [expenses]);

  // Default to the most recent month with data. A part-way-through current
  // month would read as a spending collapse, so prefer a complete one when
  // there is a choice.
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState<string>(() => {
    const complete = months.find((m) => m !== thisMonth);
    return complete ?? months[0] ?? thisMonth;
  });

  /** Per-category totals for the selected month, largest first. */
  const rows = useMemo(() => {
    const inMonth = expenses.filter((t) => t.date.startsWith(month));
    return EXPENSE_CATEGORIES.map((cat) => {
      const { color, emoji } = resolveDisplay(
        { color: cat.color, emoji: cat.emoji }, catCustomizations, cat.key);
      return {
        key: cat.key,
        label: cat.label,
        color,
        emoji,
        total: inMonth
          .filter((t) => t.category === cat.key)
          .reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0),
      };
    })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses, month, rates, catCustomizations]);

  const grossTotal = rows.reduce((s, r) => s + r.total, 0);
  const includedTotal = rows.filter((r) => !excluded.has(r.key)).reduce((s, r) => s + r.total, 0);
  const removed = grossTotal - includedTotal;

  /** The same exclusions applied to every other month, so the comparison is like for like. */
  const baseline = useMemo(() => {
    const totals = months
      .filter((m) => m !== month && m !== thisMonth)
      .map((m) =>
        expenses
          .filter((t) => t.date.startsWith(m) && !excluded.has(t.category))
          .reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0),
      )
      .filter((n) => n > 0);
    return { value: median(totals), count: totals.length };
  }, [expenses, months, month, thisMonth, excluded, rates]);

  const vsBaseline = includedTotal - baseline.value;
  const targetAtThisRate = includedTotal * 12 * WITHDRAWAL_MULTIPLE;
  const targetAtBaseline = baseline.value * 12 * WITHDRAWAL_MULTIPLE;
  const targetDelta = targetAtThisRate - targetAtBaseline;

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  if (!months.length) return null;
  const maxRow = rows.length ? rows[0].total : 1;

  return (
    <section style={{
      background: "var(--uf-card)", border: "1px solid var(--uf-border)",
      borderRadius: "var(--uf-r-card)", padding: "var(--uf-s5)",
    }}>
      {/* Header + month picker */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--uf-s4)", flexWrap: "wrap", marginBottom: "var(--uf-s5)" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--uf-teal)" }}>
            One month
          </div>
          <h3 style={{ fontFamily: "var(--uf-font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.018em", margin: "8px 0 0", color: "var(--uf-ink)" }}>
            {monthLabel(month)}
          </h3>
        </div>
        <select
          aria-label="Month to analyse"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            fontFamily: "var(--uf-font)", fontSize: 14, padding: "11px 14px",
            border: "1px solid var(--uf-border-2)", borderRadius: "var(--uf-r-control)",
            background: "var(--uf-card)", color: "var(--uf-ink)", cursor: "pointer",
          }}
        >
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}{m === thisMonth ? " (so far)" : ""}</option>
          ))}
        </select>
      </div>

      {/* The headline */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--uf-s4)", flexWrap: "wrap", marginBottom: 6 }}>
        <Money amount={disp(includedTotal)} currency={displayCurrency} size={34} />
        {excluded.size > 0 && (
          <Badge tone="muted">
            {excluded.size} excluded · {formatMoney(disp(removed), { currency: displayCurrency })} removed
          </Badge>
        )}
        {baseline.count > 0 && (
          <Delta
            value={disp(vsBaseline)}
            goodWhen="down"
            currency={displayCurrency}
            context={`vs your ${baseline.count}-month median`}
            size={13}
          />
        )}
      </div>
      <p style={{ fontSize: 13, color: "var(--uf-ink-3)", margin: "0 0 var(--uf-s5)" }}>
        {month === thisMonth ? "Month in progress — not yet comparable." : "Spent this month"}
        {excluded.size > 0 ? ", excluding what you switched off below." : "."}
      </p>

      {/* Categories, sorted, one hue — magnitudes rather than identities */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((r) => {
          const off = excluded.has(r.key);
          return (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              aria-pressed={!off}
              style={{
                display: "grid", gridTemplateColumns: "minmax(120px, 160px) minmax(0, 1fr) auto",
                alignItems: "center", gap: "var(--uf-s3)", width: "100%", textAlign: "left",
                padding: "9px 10px", border: "1px solid transparent", borderRadius: "var(--uf-r-control)",
                background: "transparent", cursor: "pointer", fontFamily: "var(--uf-font)",
                opacity: off ? 0.42 : 1,
                transition: "opacity var(--uf-dur-1) var(--uf-ease), background var(--uf-dur-1) var(--uf-ease)",
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: 600, color: "var(--uf-ink)",
                textDecoration: off ? "line-through" : "none",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{r.label}</span>
              <span style={{ height: 8, background: "var(--uf-surface-2)", borderRadius: 999, overflow: "hidden" }}>
                <span style={{
                  display: "block", height: "100%", borderRadius: 999,
                  width: `${Math.max(2, (r.total / maxRow) * 100)}%`,
                  background: off ? "var(--uf-border-2)" : "var(--uf-chart-1)",
                }} />
              </span>
              <Money amount={disp(r.total)} currency={displayCurrency} size={13}
                     tone={off ? "muted" : "default"} />
            </button>
          );
        })}
      </div>

      {excluded.size > 0 && (
        <div style={{ marginTop: "var(--uf-s3)" }}>
          <Button size="sm" variant="ghost" onClick={() => setExcluded(new Set())}>
            Show everything again
          </Button>
        </div>
      )}

      {/* What it means for the target. Stated as a conditional, because one
          month is not a rate — saying otherwise would be the same mistake as
          treating a holiday as your baseline. */}
      {baseline.count > 0 && includedTotal > 0 && (
        <div style={{
          marginTop: "var(--uf-s5)", padding: "var(--uf-s4)",
          background: "var(--uf-surface)", borderRadius: "var(--uf-r-control)",
        }}>
          <div style={{ fontSize: 13, color: "var(--uf-ink-2)", lineHeight: 1.65 }}>
            If every month looked like this one, your FIRE target would be{" "}
            <strong style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--uf-ink)" }}>
              {formatMoney(disp(targetAtThisRate), { currency: displayCurrency, style: "compact" })}
            </strong>{" "}
            — {targetDelta === 0 ? "the same as" : (
              <>
                <strong style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", color: targetDelta < 0 ? "var(--uf-pos)" : "var(--uf-neg)" }}>
                  {formatMoney(Math.abs(disp(targetDelta)), { currency: displayCurrency, style: "compact" })}
                </strong>{" "}
                {targetDelta < 0 ? "lower than" : "higher than"}
              </>
            )}{" "}
            your median month at 25&times; annual spending.
          </div>
        </div>
      )}
    </section>
  );
}
