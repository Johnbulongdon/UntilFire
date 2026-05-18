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
  currency: string;
  category: string;
  transaction_type: "expense" | "income";
};

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
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
      padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontWeight: 700, color: "#19181E", marginBottom: 6 }}>{label}</div>
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
        .select("id, date, amount, currency, category, transaction_type")
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
        .filter(t => t.transaction_type !== "income")
        .reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
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

  const avgIncome   = activeMths.reduce((s, m) => s + m.income, 0)   / (activeMths.length || 1);
  const avgExpenses = activeMths.reduce((s, m) => s + m.expenses, 0) / (activeMths.length || 1);
  const avgRate     = activeMths.reduce((s, m) => s + m.savingsRate, 0) / (activeMths.length || 1);

  const catTotals = useMemo(() => {
    const periodTxns = transactions.filter(
      t => t.date >= months[0] && t.transaction_type !== "income"
    );
    return EXPENSE_CATEGORIES.map(cat => {
      const { color, emoji } = resolveDisplay({ color: cat.color, emoji: cat.emoji }, catCustomizations, cat.key);
      return {
        ...cat,
        color,
        emoji,
        total: periodTxns
          .filter(t => t.category === cat.key)
          .reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0),
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
      <div style={{ textAlign: "center", padding: "80px 24px", color: "#94A3B8", fontSize: 14 }}>
        Loading reports…
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "#19181E", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Reports
          </h2>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            Monthly income, expenses, and savings trends.
          </p>
        </div>
        <div style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
          padding: "64px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#19181E", marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 14, color: "#64748B", maxWidth: 340, margin: "0 auto", lineHeight: 1.7 }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "#19181E", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Reports
          </h2>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            Monthly income, expenses, and savings trends.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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
              <div key={kpi.label} style={{ background: "#003527", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, fontFamily: "Inter, sans-serif", letterSpacing: "-1px" }}>
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
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#19181E", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Income vs Expenses
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => formatUSDInCurrency(v, displayCurrency, displayRates, { compact: true })}
              tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false}
              width={45}
            />
              <Tooltip content={<ChartTooltip displayCurrency={displayCurrency} displayRates={displayRates} />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: "#64748B" }}>{value}</span>}
            />
            <Bar dataKey="income"   name="Income"   fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Category breakdown ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#19181E", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Spending by Category · last {period} months
        </div>
        {catTotals.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>
            No expense transactions in this period
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {catTotals.map(cat => {
              const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
              return (
                <div key={cat.key} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto auto", gap: 14, alignItems: "center" }}>
                  {/* Circle */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: cat.color, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 20,
                  }}>
                    {cat.emoji}
                  </div>
                  {/* Bar */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#19181E", marginBottom: 4 }}>{cat.label}</div>
                    <div style={{ height: 6, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: cat.color + "88", borderRadius: 99 }} />
                    </div>
                  </div>
                  {/* Pct */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textAlign: "right", minWidth: 38 }}>
                    {pct.toFixed(0)}%
                  </div>
                  {/* Amount */}
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#19181E", fontFamily: "Inter, sans-serif", textAlign: "right", minWidth: 80 }}>
                    {fmtDisplay(cat.total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Month-by-month table ──────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#19181E", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Month by Month
        </div>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 80px",
          gap: 8, padding: "0 0 10px", borderBottom: "1px solid #F1F5F9",
          fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em",
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
              style={{
                display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 80px",
                gap: 8, padding: "12px 0", borderBottom: "1px solid #F8FAFC",
                fontSize: 14, fontFamily: "Inter, sans-serif",
              }}
            >
              <span style={{ fontWeight: 600, color: "#64748B", fontFamily: "Manrope, sans-serif", fontSize: 13 }}>
                {row.label}
              </span>
              <span style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : "#059669" }}>
                {empty ? "—" : fmtDisplay(row.income)}
              </span>
              <span style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : "#19181E" }}>
                {empty ? "—" : fmtDisplay(row.expenses)}
              </span>
              <span style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : row.net >= 0 ? "#059669" : "#DC2626" }}>
                {empty ? "—" : (row.net >= 0 ? "+" : "") + fmtDisplay(row.net)}
              </span>
              <span style={{ textAlign: "right", fontWeight: 700, color: empty ? "#CBD5E1" : rateColor(row.savingsRate) }}>
                {empty ? "—" : row.savingsRate.toFixed(0) + "%"}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
