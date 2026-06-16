"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { FALLBACK_RATES, formatUSDInCurrency } from "@/lib/currency";
import { EXPENSE_CATEGORIES, loadCatCustomizations, resolveDisplay } from "@/lib/categories";

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

// ─── Types ────────────────────────────────────────────────────────────────────
type RawTx = {
  id: string;
  date: string;
  amount: number;
  refund_amount: number;
  currency: string;
  category: string;
  transaction_type: "expense" | "income" | "transfer";
};

// Net expense amount after refunds — mirrors Cashflow (TransactionsTab).
const netAmt = (t: { amount: number; refund_amount: number }) =>
  Math.max(0, t.amount - (t.refund_amount || 0));

type MonthSummary = {
  month: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function lastNMonths(n: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${d.getFullYear()}-${m}`);
  }
  return months;
}

function rateColor(rate: number): string {
  if (rate >= 30) return "#62FAE3";
  if (rate >= 10) return "#fbbf24";
  return "#FCA5A5";
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, displayCurrency, displayRates }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; displayCurrency: string; displayRates: Record<string, number> }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 10,
      padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontWeight: 700, color: "var(--uf-text)", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16, color: p.color, fontWeight: 600 }}>
          <span>{p.name}</span>
          <span>{formatUSDInCurrency(p.value, displayCurrency, displayRates)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function ReportsTab({ displayCurrency = "USD", displayRates = FALLBACK_RATES }: {
  displayCurrency?: string;
  displayRates?: Record<string, number>;
}) {
  const [transactions, setTransactions] = useState<RawTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesFallback, setRatesFallback] = useState(false);
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const [catCustomizations] = useState(loadCatCustomizations);
  const fmtDisplay = (n: number) => formatUSDInCurrency(n, displayCurrency, displayRates);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD")
      .then(r => r.json())
      .then(d => { if (d.rates) setRates(d.rates); else setRatesFallback(true); })
      .catch(() => setRatesFallback(true));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      supabase
        .from("expenses")
        .select("id, date, amount, refund_amount, currency, category, transaction_type")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (data) setTransactions(data as RawTx[]);
          setLoading(false);
        });
    });
  }, []);

  const months = useMemo(() => lastNMonths(period), [period]);

  const monthlySummaries: MonthSummary[] = useMemo(() =>
    months.map(month => {
      const monthTxns = transactions.filter(t => t.date.startsWith(month));
      const income = monthTxns
        .filter(t => t.transaction_type === "income")
        .reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
      const expenses = monthTxns
        .filter(t => t.transaction_type === "expense")
        .reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0);
      const net = income - expenses;
      const savingsRate = income > 0 ? (net / income) * 100 : 0;
      return { month, label: fmtMonth(month), income, expenses, net, savingsRate };
    }),
    [months, transactions, rates]
  );

  const activeMths = useMemo(() =>
    monthlySummaries.filter(m => m.income > 0 || m.expenses > 0),
    [monthlySummaries]
  );

  const { avgIncome, avgExpenses, avgRate } = useMemo(() => {
    const n = activeMths.length || 1;
    let totalInc = 0, totalExp = 0, totalNet = 0;
    for (const m of activeMths) { totalInc += m.income; totalExp += m.expenses; totalNet += m.net; }
    return {
      avgIncome:  totalInc / n,
      avgExpenses: totalExp / n,
      avgRate: totalInc > 0 ? (totalNet / totalInc) * 100 : 0,
    };
  }, [activeMths]);

  const catTotals = useMemo(() => {
    const periodTxns = transactions.filter(
      t => t.date >= months[0] && t.transaction_type === "expense"
    );
    return EXPENSE_CATEGORIES.map(cat => {
      const { color, emoji } = resolveDisplay({ color: cat.color, emoji: cat.emoji }, catCustomizations, cat.key);
      return {
        ...cat,
        color,
        emoji,
        total: periodTxns
          .filter(t => t.category === cat.key)
          .reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0),
      };
    })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [months, transactions, rates, catCustomizations]);

  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0);

  const hasAny = transactions.length > 0;
  const chartData = [...monthlySummaries]; // oldest → newest already

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--uf-text-3)", fontSize: 14 }}>
        Loading reports…
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--uf-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Reports
          </h2>
          <p style={{ color: "var(--uf-text-2)", fontSize: 13, margin: 0 }}>
            Monthly income, expenses, and savings trends.
          </p>
        </div>
        <div style={{
          background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16,
          padding: "64px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "var(--uf-text)", marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 14, color: "var(--uf-text-2)", maxWidth: 340, margin: "0 auto", lineHeight: 1.7 }}>
            Add some transactions in <strong>Cashflow</strong> to see your monthly spending reports here.
          </div>
        </div>
      </div>
    );
  }

  const periodBtnStyle = (p: 3 | 6 | 12): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit", border: "1.5px solid",
    borderColor: period === p ? "#059669" : "#E2E8F0",
    background: period === p ? "#059669" : "#fff",
    color: period === p ? "#fff" : "#64748B",
  });

  return (
    <div className="uf-reports" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        .uf-reports { width: 100%; max-width: 100%; overflow-x: hidden; }
        .uf-report-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .uf-report-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .uf-report-periods { display: flex; gap: 6px; }
        .uf-report-kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .uf-report-kpi-card { min-width: 0; background: #003527; border-radius: 16px; padding: 20px 24px; }
        .uf-report-card { background: var(--uf-card); border: 1px solid var(--uf-border); border-radius: 16px; padding: 24px; max-width: 100%; overflow: hidden; }
        .uf-report-chart { width: 100%; min-width: 0; }
        .uf-report-category-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto auto; gap: 14px; align-items: center; }
        .uf-report-category-name { min-width: 0; }
        .uf-report-month-grid { display: grid; grid-template-columns: 80px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 80px; gap: 8px; }
        .uf-report-money { min-width: 0; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }

        @media (max-width: 640px) {
          .uf-reports { gap: 18px !important; }
          .uf-report-header { flex-direction: column; align-items: stretch; }
          .uf-report-controls { align-items: stretch; }
          .uf-report-periods { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); }
          .uf-report-periods button { width: 100%; }
          .uf-report-kpi-grid { grid-template-columns: 1fr; gap: 10px; }
          .uf-report-kpi-card { padding: 18px 20px; }
          .uf-report-card { padding: 18px 14px; border-radius: 14px; }
          .uf-report-chart { height: 210px; }
          .uf-report-category-row { grid-template-columns: 36px minmax(0, 1fr) 30px 62px; gap: 8px; }
          .uf-report-category-row > div:first-child { width: 36px !important; height: 36px !important; font-size: 18px !important; }
          .uf-report-category-row > div:nth-child(3), .uf-report-category-row > div:last-child { min-width: 0 !important; font-size: 12px !important; }
          .uf-report-category-name > div:first-child { font-size: 12px !important; }
          .uf-report-month-grid { grid-template-columns: 54px minmax(52px, 1fr) minmax(52px, 1fr) minmax(52px, 1fr) 42px; gap: 6px; }
          .uf-report-month-grid.uf-report-table-head { font-size: 9px !important; letter-spacing: 0.04em !important; }
          .uf-report-month-row { font-size: 12px !important; }
          .uf-report-month-row span:first-child { font-size: 12px !important; }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="uf-report-header">
        <div>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--uf-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Reports
          </h2>
          <p style={{ color: "var(--uf-text-2)", fontSize: 13, margin: 0 }}>
            Monthly income, expenses, and savings trends.
          </p>
        </div>
        <div className="uf-report-controls">
          <div className="uf-report-periods">
            {([3, 6, 12] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={periodBtnStyle(p)}>
                {p}m
              </button>
            ))}
          </div>
          {ratesFallback && (
            <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600 }}>
              ⚠ Estimated rates — live fetch failed
            </div>
          )}
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="uf-report-kpi-grid">
        {activeMths.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", background: "#003527", borderRadius: 16, padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
            No transactions in this period — try a wider range or add some in Cashflow.
          </div>
        ) : (
          <>
            {[
              { label: "Avg Monthly Income",   value: fmtDisplay(avgIncome),           color: "#62FAE3" },
              { label: "Avg Monthly Expenses", value: fmtDisplay(avgExpenses),         color: "#FCA5A5" },
              { label: "Avg Savings Rate",     value: avgRate.toFixed(0) + "%", color: rateColor(avgRate) },
            ].map(kpi => (
              <div key={kpi.label} className="uf-report-kpi-card">
                <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, fontFamily: "Manrope, sans-serif", letterSpacing: "-1px" }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                  avg over {activeMths.length} month{activeMths.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Income vs Expenses chart ──────────────────────────────────────── */}
      <div className="uf-report-card">
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--uf-text)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Income vs Expenses
        </div>
        <div className="uf-report-chart">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--uf-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => formatUSDInCurrency(v, displayCurrency, displayRates, { compact: true })}
              tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false}
              width={45}
            />
              <Tooltip content={<ChartTooltip displayCurrency={displayCurrency} displayRates={displayRates} />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: "var(--uf-text-2)" }}>{value}</span>}
            />
            <Bar dataKey="income"   name="Income"   fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* ── Category breakdown ────────────────────────────────────────────── */}
      <div className="uf-report-card">
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--uf-text)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Spending by Category · last {period} months
        </div>
        {catTotals.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--uf-text-3)", textAlign: "center", padding: "24px 0" }}>
            No expense transactions in this period
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {catTotals.map(cat => {
              const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
              return (
                <div key={cat.key} className="uf-report-category-row">
                  {/* Circle */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: cat.color, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 20,
                  }}>
                    {cat.emoji}
                  </div>
                  {/* Bar */}
                  <div className="uf-report-category-name">
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-text)", marginBottom: 4 }}>{cat.label}</div>
                    <div style={{ height: 6, background: "var(--uf-surface-2)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: cat.color + "88", borderRadius: 99 }} />
                    </div>
                  </div>
                  {/* Pct */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-3)", textAlign: "right", minWidth: 38 }}>
                    {pct.toFixed(0)}%
                  </div>
                  {/* Amount */}
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", textAlign: "right", minWidth: 80 }}>
                    {fmtDisplay(cat.total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Month-by-month table ──────────────────────────────────────────── */}
      <div className="uf-report-card">
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--uf-text)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Month by Month
        </div>
        {/* Header */}
        <div className="uf-report-month-grid uf-report-table-head" style={{
          padding: "0 0 10px", borderBottom: "1px solid var(--uf-border)",
          fontSize: 10, fontWeight: 700, color: "var(--uf-text-3)", textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          <span>Month</span>
          <span style={{ textAlign: "right" }}>Income</span>
          <span style={{ textAlign: "right" }}>Expenses</span>
          <span style={{ textAlign: "right" }}>Net</span>
          <span style={{ textAlign: "right" }}>Rate</span>
        </div>
        {/* Rows — newest first */}
        {[...monthlySummaries].reverse().map(row => {
          const empty = row.income === 0 && row.expenses === 0;
          return (
            <div
              key={row.month}
              className="uf-report-month-grid uf-report-month-row"
              style={{
                padding: "12px 0", borderBottom: "1px solid var(--uf-border)",
                fontSize: 14, fontFamily: "Manrope, sans-serif",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", fontSize: 13 }}>
                {row.label}
              </span>
              <span className="uf-report-money" style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : "#059669" }}>
                {empty ? "—" : fmtDisplay(row.income)}
              </span>
              <span className="uf-report-money" style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : "#19181E" }}>
                {empty ? "—" : fmtDisplay(row.expenses)}
              </span>
              <span className="uf-report-money" style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : row.net >= 0 ? "#059669" : "#DC2626" }}>
                {empty ? "—" : (row.net >= 0 ? "+" : "") + fmtDisplay(row.net)}
              </span>
              <span style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : rateColor(row.savingsRate) }}>
                {empty || row.income === 0 ? "—" : Math.max(-999, Math.min(999, row.savingsRate)).toFixed(0) + "%"}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
