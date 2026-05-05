"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
} from "recharts";
import TransactionsTab from "./TransactionsTab";
import { loadDefaultScenario, monteCarloFIRE, saveDefaultScenario } from "@/lib/fire";
import { consumeCalculatorPrefill, type CalculatorPrefill } from "@/lib/journey";
import { identifyUser, trackDashboardFirstView } from "@/lib/analytics";

// 閳光偓閳光偓閳光偓 Types 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
type Expenses = Record<string, number>;
type TabKey =
  | "portfolio-overview" | "portfolio-assets" | "portfolio-liabilities"
  | "plan-goals"         | "plan-simulations" | "plan-calculators"
  | "insights-spending"  | "insights-overview" | "insights-trends"
  | "expenses";

type DashboardNavItem =
  | { type: "tab"; key: TabKey; label: string; icon: string }
  | { type: "link"; href: string; label: string; icon: string };

// 閳光偓閳光偓閳光偓 Constants 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
const EXPENSE_CATS = [
  { key: "housing",       label: "Housing",       icon: "棣冨綌", color: "#818cf8" },
  { key: "food",          label: "Food & Dining",  icon: "棣冨礉", color: "#f97316" },
  { key: "transport",     label: "Transport",      icon: "棣冩", color: "#22d3a5" },
  { key: "subscriptions", label: "Subscriptions",  icon: "棣冩懌", color: "#a78bfa" },
  { key: "healthcare",    label: "Healthcare",     icon: "棣冨綖", color: "#ef4444" },
  { key: "entertainment", label: "Entertainment",  icon: "棣冨箑", color: "#fbbf24" },
  { key: "other",         label: "Other",          icon: "棣冩憹", color: "#6b6b85" },
];

// 閳光偓閳光偓閳光偓 Formatters 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
const fmt = (n: number, compact = false) => {
  if (compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (compact && Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return "$" + Math.round(n).toLocaleString();
};

const fmtSigned = (n: number, compact = false) => (n < 0 ? `-${fmt(Math.abs(n), compact)}` : fmt(n, compact));

// 閳光偓閳光偓閳光偓 FIRE Engine 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function calcProjection({
  annualIncome, monthlyExpenses, k401, rothIRA, taxable,
  totalDebt, mortgageBalance, mortgageMonthly,
  growthRate = 0.07, withdrawalRate = 0.04, years = 50,
}: {
  annualIncome: number; monthlyExpenses: number; k401: number;
  rothIRA: number; taxable: number; totalDebt: number;
  mortgageBalance: number; mortgageMonthly: number;
  growthRate?: number; withdrawalRate?: number; years?: number;
}) {
  const annualExpenses = monthlyExpenses * 12;
  const annualMortgage = mortgageMonthly * 12;
  const annualSavings  = annualIncome - annualExpenses - annualMortgage;
  const fireTarget     = annualExpenses * (1 / withdrawalRate);

  const k401Contrib    = Math.min(Math.max(annualSavings * 0.4, 0), 23000);
  const rothContrib    = Math.min(Math.max(annualSavings * 0.2, 0), 7000);
  const taxableContrib = Math.max(annualSavings - k401Contrib - rothContrib, 0);

  const data: Record<string, number>[] = [];
  let cur401k    = k401;
  let curRoth    = rothIRA;
  let curTaxable = taxable;
  let curDebt    = totalDebt;
  let curMort    = mortgageBalance;
  let fireYear: number | null = null;

  for (let y = 0; y <= years; y++) {
    const investable = cur401k + curRoth + curTaxable;
    const netWorth   = investable - curDebt - curMort;
    if (fireYear === null && investable >= fireTarget && y > 0) fireYear = y;
    data.push({
      year: y,
      "401(k)":     Math.round(cur401k),
      "Roth IRA":   Math.round(curRoth),
      "Taxable":    Math.round(curTaxable),
      "Net Worth":  Math.round(netWorth),
      "FIRE Target":Math.round(fireTarget),
      "Investable": Math.round(investable),
      "Debt":       Math.round(-(curDebt + curMort)),
    });
    cur401k    = cur401k    * (1 + growthRate) + k401Contrib;
    curRoth    = curRoth    * (1 + growthRate) + rothContrib;
    curTaxable = curTaxable * (1 + growthRate) + taxableContrib;
    if (curDebt > 0) {
      const interest = curDebt * 0.05;
      const payment  = Math.min(curDebt + interest, Math.max(annualSavings * 0.3, 0));
      curDebt = Math.max(0, curDebt + interest - payment);
    }
    if (curMort > 0) {
      const mInt = curMort * 0.065;
      const prin = Math.max(0, annualMortgage - mInt);
      curMort = Math.max(0, curMort - prin);
    }
  }
  return { data, fireYear, fireTarget, annualSavings };
}

// 閳光偓閳光偓閳光偓 Shared UI 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function NumberInput({ value, onChange, placeholder = "0", prefix = "$" }: {
  value: number; onChange: (v: number) => void;
  placeholder?: string; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "#F1F5F9", borderRadius: 8, padding: "9px 12px",
      border: `1.5px solid ${focused ? "#047857" : "#E2E8F0"}`,
      boxShadow: focused ? "0 0 0 3px rgba(6,78,59,0.10)" : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      <span style={{ color: "#94A3B8", fontSize: 13, fontFamily: "Inter, sans-serif" }}>{prefix}</span>
      <input
        type="number" value={value || ""} placeholder={placeholder}
        onChange={e => onChange(Number(e.target.value))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ background: "none", border: "none", outline: "none", color: "#19181E", fontSize: 14, width: "100%", fontFamily: "Inter, sans-serif" }}
      />
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748B", fontWeight: 700 }}>
        {label}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>{hint}</span>}
    </div>
  );
}

function KpiCard({ label, value, sub, color = "#19181E", glow = false }: {
  label: string; value: string; sub?: string; color?: string; glow?: boolean;
}) {
  return (
    <div className={`uf-card ${glow ? "uf-card-glow" : ""}`} style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#64748B", marginBottom: 8, fontFamily: "Manrope, sans-serif", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "Manrope, sans-serif", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748B", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", fontFamily: "Inter, sans-serif", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ color: "#64748B", marginBottom: 6 }}>Year {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value, true)}</div>
      ))}
    </div>
  );
};

function SectionLabel({ icon, text, color = "#064E3B" }: { icon: string; text: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 11, color, letterSpacing: "1px", textTransform: "uppercase" }}>{text}</span>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Monte Carlo Probability Card 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function MonteCarloCard({ income, expenses, k401, rothIRA, taxable, growthRate, withdrawalRate }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; growthRate: number; withdrawalRate: number;
}) {
  const [extraSavings, setExtraSavings] = useState(0);

  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const annualExpenses = monthlyExpenses * 12;
  const fireTarget     = annualExpenses / withdrawalRate;
  const annualSavings  = income * 12 - annualExpenses;
  const investable     = k401 + rothIRA + taxable;

  const base = useMemo(() => {
    if (fireTarget <= 0 || income <= 0) return null;
    return monteCarloFIRE({ initialInvestable: investable, annualSavings, fireTarget, meanReturn: growthRate });
  }, [investable, annualSavings, fireTarget, growthRate]);

  const delta = useMemo(() => {
    if (!base || extraSavings === 0) return null;
    return monteCarloFIRE({
      initialInvestable: investable,
      annualSavings: annualSavings + extraSavings * 12,
      fireTarget,
      meanReturn: growthRate,
    });
  }, [base, investable, annualSavings, fireTarget, growthRate, extraSavings]);

  if (!base) {
    return (
      <div className="uf-card" style={{ padding: "28px 32px", textAlign: "center" }}>
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>Add income &amp; expenses to see your success probability</p>
      </div>
    );
  }

  const result     = delta ?? base;
  const yearDelta  = delta ? Math.max(0, base.p50Years - delta.p50Years) : 0;
  const maxCount   = Math.max(...result.histogram.map(h => h.count), 1);
  const scoreColor = result.probability >= 80 ? "#059669" : result.probability >= 60 ? "#065F46" : result.probability >= 40 ? "#D97706" : "#DC2626";
  const scoreLabel = result.probability >= 80 ? "HIGHLY LIKELY" : result.probability >= 60 ? "LIKELY" : result.probability >= 40 ? "POSSIBLE" : "UNLIKELY";
  const pctYr      = (y: number) => y > 50 ? "50+ yr" : `${y} yr`;

  return (
    <div className="uf-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr" }}>

        {/* Score */}
        <div style={{ padding: "28px 28px 24px", borderRight: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "#64748B", marginBottom: 16, fontWeight: 700 }}>Success Probability</div>
          <div style={{ fontSize: 60, fontWeight: 800, color: scoreColor, fontFamily: "Manrope, sans-serif", letterSpacing: "-3px", lineHeight: 1, marginBottom: 4 }}>
            {result.probability}%
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor, letterSpacing: "0.8px", marginBottom: 24 }}>{scoreLabel}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {([
              { label: "Best case",  years: result.p10Years, color: "#059669" },
              { label: "Median",     years: result.p50Years, color: "#065F46" },
              { label: "Worst case", years: result.p90Years, color: "#94A3B8" },
            ] as const).map(row => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: row.color, background: `${row.color}18`, borderRadius: 20, padding: "3px 10px", fontFamily: "Inter, sans-serif" }}>
                  {pctYr(row.years)}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>1,000 simulations 璺?锜?12% annual returns</p>
        </div>

        {/* Histogram */}
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "#64748B", marginBottom: 12, fontWeight: 700 }}>Distribution</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
            {([["#059669", "Within 40 yr"], ["#D97706", "Beyond 40 yr"]] as const).map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {result.histogram.map(h => (
              <div key={h.bucket} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Inter, sans-serif", width: 36, flexShrink: 0, textAlign: "right" }}>{h.bucket}</span>
                <div style={{ flex: 1, height: 14, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(h.count / maxCount) * 100}%`, background: h.within40 ? "#059669" : "#D97706", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
                <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Inter, sans-serif", width: 26, flexShrink: 0, textAlign: "right" }}>
                  {Math.round((h.count / result.totalRuns) * 100)}%
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {([
              { label: "p10", val: result.p10Years, color: "#059669" },
              { label: "p50", val: result.p50Years, color: "#065F46" },
              { label: "p90", val: result.p90Years, color: "#94A3B8" },
            ] as const).map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontFamily: "Inter, sans-serif", color: m.color, textDecoration: "underline dotted" }}>{m.label}</span>
                <span style={{ fontSize: 10, fontFamily: "Inter, sans-serif", color: "#94A3B8", marginLeft: 2 }}>{pctYr(m.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What-if slider */}
      <div style={{ borderTop: "1px solid #E2E8F0", padding: "16px 28px", display: "flex", alignItems: "center", gap: 16, background: "#F8FAFC", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#64748B", flexShrink: 0 }}>What if you saved</span>
        <input type="range" min={0} max={2000} step={50} value={extraSavings}
          onChange={e => setExtraSavings(Number(e.target.value))}
          style={{ flex: 1, minWidth: 120, accentColor: "#064E3B" }} />
        <span style={{ fontSize: 13, fontFamily: "Inter, sans-serif", color: "#19181E", flexShrink: 0, minWidth: 90 }}>
          +${extraSavings.toLocaleString()}/mo
        </span>
        {yearDelta > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "#ECFDF5", borderRadius: 20, padding: "4px 12px", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
            +{yearDelta} yr
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>drag to simulate</span>
        )}
      </div>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Dashboard Overview Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function DashTab({ income, expenses, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, actuals, prefill, onOpenBudget, onOpenExpenses }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
  actuals: Record<string, number>;
  prefill: CalculatorPrefill | null;
  onOpenBudget: () => void;
  onOpenExpenses: () => void;
}) {
  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const { data, fireYear, fireTarget, annualSavings } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate]);

  const investable  = k401 + rothIRA + taxable;
  const netWorth    = investable - totalDebt - mortgageBalance;
  const savingsRate = income > 0 ? ((annualSavings / 12) / income) * 100 : 0;
  const progress    = fireTarget > 0 ? Math.min(100, (investable / fireTarget) * 100) : 0;
  const chartData   = data.slice(0, Math.min(data.length, (fireYear ?? 30) + 6));
  const activeCats  = EXPENSE_CATS.filter(c => (expenses[c.key] || 0) > 0);
  const hasActuals  = Object.values(actuals).some(v => v > 0);
  const housingRatio = income > 0 ? ((expenses.housing || 0) / income) * 100 : 0;
  const checklist = [
    { label: "Confirm monthly income", complete: income > 0, detail: income > 0 ? fmt(income) : "Needed for your timeline" },
    { label: "Set a target budget", complete: monthlyExpenses > 0, detail: monthlyExpenses > 0 ? fmt(monthlyExpenses) : "Open Budget to add spending targets" },
    { label: "Add current assets", complete: investable > 0, detail: investable > 0 ? fmt(investable, true) : "401(k), Roth IRA, or taxable accounts" },
    { label: "Review debt and mortgage", complete: totalDebt > 0 || mortgageBalance > 0 || mortgageMonthly > 0, detail: totalDebt > 0 || mortgageBalance > 0 ? fmtSigned(-(totalDebt + mortgageBalance), true) : "Add balances if they affect your runway" },
    { label: "Log your first expense", complete: hasActuals, detail: hasActuals ? `${Object.keys(actuals).length} categories tracked this month` : "Use Expenses to start tracking real spending" },
  ];
  const completedChecklist = checklist.filter((item) => item.complete).length;

  const retireYear = fireYear ? new Date().getFullYear() + fireYear : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* 閳光偓閳光偓 HERO: FIRE Score 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓 */}
      <div className="uf-card" style={{ padding: "28px 32px", background: "#003527", borderColor: "transparent", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(98,250,227,0.08) 0%, transparent 70%)", top: -100, right: -100, pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24, position: "relative" }}>
          {/* Left: headline */}
          <div>
            <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "#62FAE3", marginBottom: 10, fontWeight: 700 }}>
              Your FIRE Journey
            </div>
            {fireYear ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "clamp(48px, 8vw, 72px)", fontWeight: 800, color: "#FFFFFF", fontFamily: "Manrope, sans-serif", letterSpacing: "-3px", lineHeight: 1 }}>
                    {retireYear}
                  </span>
                  <span style={{ fontSize: 20, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                    retire by
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 16, color: "rgba(255,255,255,0.55)" }}>
                  <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{fireYear} years</span> away, target{" "}
                  <span style={{ color: "#62FAE3", fontFamily: "Inter, sans-serif" }}>{fmt(fireTarget, true)}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.4)", fontFamily: "Manrope, sans-serif", letterSpacing: "-2px" }}>
                  Set your inputs
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
                  Add income &amp; expenses in the Budget tab to see your FIRE date
                </div>
              </>
            )}
          </div>

          {/* Right: supporting KPIs */}
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4, fontWeight: 700 }}>Net Worth</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Manrope, sans-serif", color: netWorth >= 0 ? "#62FAE3" : "#FCA5A5" }}>{fmt(netWorth, true)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4, fontWeight: 700 }}>Savings Rate</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Manrope, sans-serif", color: savingsRate >= 50 ? "#62FAE3" : savingsRate >= 25 ? "#34D399" : "#FCA5A5" }}>
                {savingsRate.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif" }}>
              {fmt(investable, true)} saved
            </span>
            <span style={{ fontSize: 12, color: "#62FAE3", fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
              {progress.toFixed(1)}% to FIRE
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif" }}>
              {fmt(fireTarget, true)} target
            </span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#62FAE3", borderRadius: 99, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </div>
        </div>
      </div>

      <div className="uf-card" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#059669", marginBottom: 10 }}>
            Next best actions
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 24, letterSpacing: "-0.03em" }}>
            {prefill ? "We brought your calculator plan with you." : "Turn this estimate into a working plan."}
          </h2>
          <p style={{ margin: 0, color: "#64748B", lineHeight: 1.7 }}>
            {prefill
              ? `Your ${prefill.cityName || "latest"} projection is saved. Finish the missing inputs below so the dashboard becomes a real operating plan.`
              : "Confirm the missing inputs below so your dashboard becomes more than a rough estimate."}
          </p>
          {prefill && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              {prefill.fireTarget ? <span className="uf-tag" style={{ color: "#065F46", background: "rgba(209,250,229,0.7)" }}>Target {fmt(prefill.fireTarget, true)}</span> : null}
              {prefill.monthlyIncome ? <span className="uf-tag" style={{ color: "#065F46", background: "rgba(209,250,229,0.7)" }}>Income {fmt(prefill.monthlyIncome)}</span> : null}
              {prefill.monthlySavings ? <span className="uf-tag" style={{ color: "#065F46", background: "rgba(209,250,229,0.7)" }}>Savings {fmt(prefill.monthlySavings)}</span> : null}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <button onClick={onOpenBudget} style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Finish budget</button>
            <button onClick={onOpenExpenses} style={{ background: "#ffffff", color: "#064E3B", border: "1px solid #A7F3D0", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Log first expense</button>
            <Link href="/learn/why-savings-rate-matters-more-than-income" style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", borderRadius: 10, padding: "10px 14px", fontWeight: 700, textDecoration: "none" }}>Learn what moves your date</Link>
          </div>
        </div>

        <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 18, background: "#F8FAFC" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Complete your plan</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>{completedChecklist}/{checklist.length} complete</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {checklist.map((item) => (
              <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #E2E8F0" }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: item.complete ? "#059669" : "#E2E8F0", color: item.complete ? "#fff" : "#64748B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                  {item.complete ? "Done" : "Next"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#19181E" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monte Carlo probability card */}
      <MonteCarloCard
        income={income} expenses={expenses}
        k401={k401} rothIRA={rothIRA} taxable={taxable}
        growthRate={growthRate} withdrawalRate={withdrawalRate}
      />

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        {/* Wealth projection chart */}
        <div className="uf-card">
          <SectionLabel icon="棣冩惐" text="Wealth Projection" color="#059669" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTgt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#064E3B" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#064E3B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmt(v, true)} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<ChartTooltip />} />
              {fireYear && <ReferenceLine x={fireYear} stroke="#064E3B" strokeDasharray="4 3" label={{ value: "棣冩暉", fill: "#064E3B", fontSize: 12 }} />}
              <Area type="monotone" dataKey="FIRE Target" stroke="#064E3B" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gTgt)" dot={false} />
              <Area type="monotone" dataKey="Investable" stroke="#059669" strokeWidth={2.5} fill="url(#gInv)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Spending breakdown */}
        <div className="uf-card">
          <SectionLabel icon="棣冩崁" text="Spending Breakdown" color="#DC2626" />
          {activeCats.length === 0 ? (
            <div style={{ color: "#64748B", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
              Add expenses in the<br />Budget Tracker tab
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeCats.map(cat => {
                const val = expenses[cat.key] || 0;
                const pct = monthlyExpenses > 0 ? (val / monthlyExpenses) * 100 : 0;
                return (
                  <div key={cat.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#64748B" }}>{cat.icon} {cat.label}</span>
                      <span style={{ color: cat.color, fontFamily: "Inter, sans-serif" }}>{fmt(val)} <span style={{ color: "#94A3B8" }}>{pct.toFixed(0)}%</span></span>
                    </div>
                    <div style={{ height: 3, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 4, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Account snapshot + insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Account snapshot */}
        <div className="uf-card">
          <SectionLabel icon="棣冨綗" text="Account Snapshot" color="#064E3B" />
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                { label: "401(k)",            val: k401,                     color: "#059669" },
                { label: "Roth IRA",          val: rothIRA,                  color: "#20D4BF" },
                { label: "Taxable Brokerage", val: taxable,                  color: "#047857" },
                null,
                { label: "Consumer Debt",     val: -totalDebt,               color: "#DC2626" },
                { label: "Mortgage",          val: -mortgageBalance,         color: "#DC2626" },
                null,
                { label: "Net Worth",         val: netWorth, bold: true,     color: netWorth >= 0 ? "#059669" : "#DC2626" },
              ].map((row, i) => {
                if (!row) return (
                  <tr key={`d${i}`}><td colSpan={2} style={{ borderTop: "1px solid #E2E8F0", padding: "4px 0" }} /></tr>
                );
                return (
                  <tr key={row.label}>
                    <td style={{ padding: "6px 0", fontSize: 13, color: row.bold ? "#19181E" : "#64748B", fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", fontFamily: "Inter, sans-serif", fontSize: 13, color: row.color, fontWeight: row.bold ? 700 : 400 }}>
                      {fmtSigned(row.val)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <div className="uf-card">
          <SectionLabel icon="棣冩寱" text="Insights" color="#065F46" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                icon: "棣冩惓",
                title: "Savings Rate",
                body: savingsRate >= 50 ? `${savingsRate.toFixed(0)}% means you are on an aggressive FIRE track.` : savingsRate >= 25 ? `${savingsRate.toFixed(0)}% is solid. Pushing toward 50% can cut years off your date.` : `At ${savingsRate.toFixed(0)}%, reducing recurring expenses is your biggest lever.`,
                color: savingsRate >= 50 ? "#059669" : savingsRate >= 25 ? "#20D4BF" : "#DC2626",
              },
              {
                icon: "棣冨綌",
                title: "Housing Ratio",
                body: income > 0 && expenses.housing > 0 ? `Housing is ${housingRatio.toFixed(0)}% of take-home. ${housingRatio > 30 ? "Above 30% and likely your biggest cost lever." : "Under 30% and in a healthy range."}` : "Add housing expenses to see your ratio.",
                color: "#19181E",
              },
              {
                icon: "棣冩暉",
                title: "Rule of 25",
                body: `Target: ${fmt(fireTarget, true)}. Every $100 per month you cut lowers your FIRE number by about $30,000.`,
                color: "#19181E",
              },
            ].map(ins => (
              <div key={ins.title} style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 14 }}>{ins.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ins.color }}>{ins.title}</span>
                </div>
                <p style={{ fontSize: 12, color: "#64748B", margin: "6px 0 0", lineHeight: 1.5 }}>{ins.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Calculators Hub Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
const CALCULATORS = [
  {
    href: "/calculators/4-percent-rule",
    title: "FIRE Number Calculator",
    description: "Calculate exactly how much you need to retire. Adjust the withdrawal rate and see how it changes your target.",
    tag: "FIRE 璺?Retirement",
    color: "#064E3B",
    label: "FI",
  },
  {
    href: "/calculators/savings-rate",
    title: "Savings Rate Calculator",
    description: "Find your savings rate and see exactly how it shifts your FIRE date 閳?the single most powerful FIRE lever.",
    tag: "FIRE 璺?Core",
    color: "#059669",
    label: "SR",
  },
  {
    href: "/calculators/coast-fire",
    title: "Coast FIRE Calculator",
    description: "Find the magic number where you can stop saving and let compound growth carry you to retirement.",
    tag: "FIRE 璺?Strategy",
    color: "#20D4BF",
    label: "~",
  },
  {
    href: "/calculators/compound-interest",
    title: "Compound Interest Calculator",
    description: "Project how your investments grow with regular contributions over any time horizon.",
    tag: "Investing",
    color: "#047857",
    label: "CI",
  },
  {
    href: "/calculators/apy",
    title: "APY Calculator",
    description: "Convert APR to APY and see exactly how compounding frequency affects your real return.",
    tag: "Savings",
    color: "#20D4BF",
    label: "%",
  },
];

function CalculatorsTab() {
  return (
    <div>
      <p style={{ color: "#64748B", fontSize: 12, fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 }}>
        All tools
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {CALCULATORS.map(c => (
          <Link key={c.href} href={c.href} target="_blank" style={{ textDecoration: "none" }}>
            <div
              style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "24px 20px", height: "100%", display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = c.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: c.color, letterSpacing: "-1px" }}>
                {c.label}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: c.color, letterSpacing: "1.5px", textTransform: "uppercase", margin: 0 }}>{c.tag}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#19181E", margin: 0, letterSpacing: "-0.3px" }}>{c.title}</p>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.6, flexGrow: 1 }}>{c.description}</p>
              <p style={{ fontSize: 12, color: c.color, fontWeight: 600, margin: 0 }}>Open calculator</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Budget Tracker Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function BudgetTab({ income, setIncome, expenses, setExpenses, actuals }: {
  income: number; setIncome: (v: number) => void;
  expenses: Expenses; setExpenses: (e: Expenses) => void;
  actuals: Record<string, number>;
}) {
  const totalExp = EXPENSE_CATS.reduce((s, c) => s + (expenses[c.key] || 0), 0);
  const savings  = income - totalExp;
  const rate     = income > 0 ? (savings / income) * 100 : 0;
  const hasActuals = Object.values(actuals).some(v => v > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Income */}
      <div className="uf-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Monthly Income</div>
            <div style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>After-tax take-home pay</div>
          </div>
          <span className="uf-tag" style={{ color: "#059669", background: "rgba(5,150,105,0.1)" }}>INCOME</span>
        </div>
        <NumberInput value={income} onChange={setIncome} placeholder="5000" />
      </div>

      {/* Expenses */}
      <div className="uf-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Monthly Budget</div>
            <div style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>
              {hasActuals ? "Budget vs. this month's actual spending" : "Set your budget by category"}
            </div>
          </div>
          <span className="uf-tag" style={{ color: "#DC2626", background: "rgba(220,38,38,0.1)" }}>EXPENSES</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {EXPENSE_CATS.map(cat => {
            const budget = expenses[cat.key] || 0;
            const spent = actuals[cat.key] || 0;
            const over = budget > 0 && spent > budget;
            const spentPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            return (
              <div key={cat.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 80px", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "#64748B" }}>{cat.icon} {cat.label}</span>
                  <NumberInput value={expenses[cat.key] || 0} onChange={v => setExpenses({ ...expenses, [cat.key]: v })} />
                  <div style={{ height: 4, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, income > 0 ? ((expenses[cat.key] || 0) / income) * 100 : 0)}%`, background: cat.color, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                </div>
                {spent > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", color: over ? "#DC2626" : "#64748B" }}>
                      {over ? "閳?" : ""}Spent {fmt(spent)}{budget > 0 ? ` / ${fmt(budget)}` : ""}
                    </span>
                    {budget > 0 && (
                      <div style={{ height: 3, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${spentPct}%`, background: over ? "#DC2626" : "#059669", borderRadius: 4, transition: "width 0.4s" }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {income > 0 && (
        <div className="uf-card" style={{
          background: savings >= 0 ? "rgba(5,150,105,0.04)" : "rgba(220,38,38,0.04)",
          border: `1px solid ${savings >= 0 ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {[
              { label: "Total Expenses", val: fmt(totalExp), color: "#DC2626" },
              { label: "Monthly Savings", val: fmt(Math.max(0, savings)), color: "#059669" },
              { label: "Savings Rate", val: `${rate.toFixed(1)}%`, color: rate >= 50 ? "#064E3B" : rate >= 25 ? "#059669" : "#DC2626" },
              { label: "Annual Savings", val: fmt(Math.max(0, savings) * 12), color: "#19181E" },
            ].map(k => (
              <div key={k.label}>
                <div style={{ color: "#64748B", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: "Inter, sans-serif" }}>{k.label}</div>
                <div style={{ color: k.color, fontSize: 22, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>{k.val}</div>
              </div>
            ))}
          </div>
          {/* Rate bar */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>
              <span>Savings rate</span><span>{rate.toFixed(1)}% {rate >= 50 ? "棣冩暉 FIRE pace" : rate >= 25 ? "璺?Good" : "璺?Needs work"}</span>
            </div>
            <div style={{ height: 6, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, rate)}%`, background: rate >= 50 ? "#064E3B" : rate >= 25 ? "#059669" : "#DC2626", borderRadius: 99, transition: "width 0.6s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginTop: 5 }}>
              <span>0%</span><span>25%</span><span>50% FIRE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 閳光偓閳光偓閳光偓 User Nav 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function UserNav() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null));
  }, []);
  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  if (!email) return (
    <Link href="/login" style={{ background: "#064E3B", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Sign In</Link>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ color: "#64748B", fontSize: 13 }}>{email}</span>
      <button onClick={handleSignOut} style={{ background: "transparent", color: "#064E3B", border: "1px solid #064E3B", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Portfolio Overview Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function PortfolioOverviewTab({ income, expenses, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
}) {
  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const { fireYear, fireTarget } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate]);

  const investable = k401 + rothIRA + taxable;
  const netWorth   = investable - totalDebt - mortgageBalance;
  const progress   = fireTarget > 0 ? Math.min(100, (investable / fireTarget) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Net worth hero */}
      <div className="uf-card" style={{ padding: "28px 32px", background: "#003527", borderColor: "transparent" }}>
        <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "#62FAE3", marginBottom: 10, fontWeight: 700 }}>Net Worth</div>
        <div style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, color: netWorth >= 0 ? "#FFFFFF" : "#FCA5A5", fontFamily: "Manrope, sans-serif", letterSpacing: "-2px", lineHeight: 1 }}>
          {fmt(netWorth)}
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
          {fmt(investable, true)} investable assets 璺?{fmt(totalDebt + mortgageBalance, true)} total debt
        </div>
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
            <span>{fmt(investable, true)} saved</span>
            <span style={{ color: "#62FAE3", fontWeight: 700 }}>{progress.toFixed(1)}% to FIRE</span>
            <span>{fmt(fireTarget, true)} target</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#62FAE3", borderRadius: 99, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Investable Assets",  val: fmt(investable, true),   color: "#059669",  sub: "All accounts" },
          { label: "Net Worth",          val: fmt(netWorth, true),      color: netWorth >= 0 ? "#059669" : "#DC2626", sub: "Assets minus debt" },
          { label: "Total Debt",         val: fmt(totalDebt + mortgageBalance, true), color: "#DC2626", sub: "Consumer + mortgage" },
          { label: "FIRE Progress",      val: `${progress.toFixed(0)}%`, color: progress >= 75 ? "#059669" : "#20D4BF", sub: fireYear ? `${fireYear} yrs to FIRE` : "Set your inputs" },
        ].map(k => (
          <KpiCard key={k.label} label={k.label} value={k.val} sub={k.sub} color={k.color} />
        ))}
      </div>

      {/* Account breakdown table */}
      <div className="uf-card">
        <SectionLabel icon="棣冨綗" text="Account Snapshot" color="#064E3B" />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              { label: "401(k)",            val: k401,              color: "#059669" },
              { label: "Roth IRA",          val: rothIRA,           color: "#20D4BF" },
              { label: "Taxable Brokerage", val: taxable,           color: "#047857" },
              null,
              { label: "Consumer Debt",     val: -totalDebt,        color: "#DC2626" },
              { label: "Mortgage Balance",  val: -mortgageBalance,  color: "#DC2626" },
              null,
              { label: "Net Worth",         val: netWorth, bold: true, color: netWorth >= 0 ? "#059669" : "#DC2626" },
            ].map((row, i) => {
              if (!row) return <tr key={`d${i}`}><td colSpan={2} style={{ borderTop: "1px solid #E2E8F0", padding: "4px 0" }} /></tr>;
              return (
                <tr key={row.label}>
                  <td style={{ padding: "8px 0", fontSize: 14, color: row.bold ? "#19181E" : "#64748B", fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "Inter, sans-serif", fontSize: 14, color: row.color, fontWeight: row.bold ? 700 : 400 }}>
                    {fmtSigned(row.val)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Assets Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function AssetsTab({ k401, setK401, rothIRA, setRothIRA, taxable, setTaxable, growthRate, setGrowthRate, withdrawalRate, setWithdrawalRate }: {
  k401: number; setK401: (v: number) => void;
  rothIRA: number; setRothIRA: (v: number) => void;
  taxable: number; setTaxable: (v: number) => void;
  growthRate: number; setGrowthRate: (v: number) => void;
  withdrawalRate: number; setWithdrawalRate: (v: number) => void;
}) {
  const total = k401 + rothIRA + taxable;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="uf-card">
          <SectionLabel icon="棣冩惐" text="Investment Accounts" color="#059669" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FieldRow label="401(k) Balance">
              <NumberInput value={k401} onChange={setK401} placeholder="0" />
            </FieldRow>
            <FieldRow label="Roth IRA Balance">
              <NumberInput value={rothIRA} onChange={setRothIRA} placeholder="0" />
            </FieldRow>
            <FieldRow label="Taxable Brokerage">
              <NumberInput value={taxable} onChange={setTaxable} placeholder="0" />
            </FieldRow>
          </div>
        </div>

        <div className="uf-card">
          <SectionLabel icon="A" text="Assumptions" color="#64748B" />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Annual Return</span>
                <span style={{ fontSize: 13, color: "#064E3B", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{(growthRate * 100).toFixed(1)}%</span>
              </div>
              <input type="range" min={0.03} max={0.12} step={0.001} value={growthRate}
                onChange={e => setGrowthRate(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
                <span>3%</span><span>7% typical</span><span>12%</span>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Withdrawal Rate</span>
                <span style={{ fontSize: 13, color: "#064E3B", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{(withdrawalRate * 100).toFixed(1)}%</span>
              </div>
              <input type="range" min={0.03} max={0.06} step={0.001} value={withdrawalRate}
                onChange={e => setWithdrawalRate(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
                <span>3%</span><span>4% rule</span><span>6%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="uf-card" style={{ background: "rgba(5,150,105,0.04)", border: "1px solid rgba(5,150,105,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { label: "401(k)", val: fmt(k401), pct: total > 0 ? (k401 / total * 100).toFixed(0) : "0", color: "#059669" },
              { label: "Roth IRA", val: fmt(rothIRA), pct: total > 0 ? (rothIRA / total * 100).toFixed(0) : "0", color: "#20D4BF" },
              { label: "Taxable", val: fmt(taxable), pct: total > 0 ? (taxable / total * 100).toFixed(0) : "0", color: "#047857" },
            ].map(a => (
              <div key={a.label}>
                <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: a.color, fontFamily: "Inter, sans-serif" }}>{a.val}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{a.pct}% of portfolio</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Liabilities Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function LiabilitiesTab({ totalDebt, setTotalDebt, mortgageBalance, setMortgageBalance, mortgageMonthly, setMortgageMonthly }: {
  totalDebt: number; setTotalDebt: (v: number) => void;
  mortgageBalance: number; setMortgageBalance: (v: number) => void;
  mortgageMonthly: number; setMortgageMonthly: (v: number) => void;
}) {
  const totalLiabilities = totalDebt + mortgageBalance;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="uf-card">
          <SectionLabel icon="棣冩尭" text="Consumer Debt" color="#DC2626" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FieldRow label="Non-Mortgage Debt" hint="Credit cards, auto loans, student loans">
              <NumberInput value={totalDebt} onChange={setTotalDebt} placeholder="0" />
            </FieldRow>
          </div>
        </div>

        <div className="uf-card">
          <SectionLabel icon="棣冨綌" text="Mortgage" color="#DC2626" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FieldRow label="Mortgage Balance">
              <NumberInput value={mortgageBalance} onChange={setMortgageBalance} placeholder="0" />
            </FieldRow>
            <FieldRow label="Monthly Payment">
              <NumberInput value={mortgageMonthly} onChange={setMortgageMonthly} placeholder="0" />
            </FieldRow>
          </div>
        </div>
      </div>

      {totalLiabilities > 0 && (
        <div className="uf-card" style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { label: "Consumer Debt",  val: fmt(totalDebt),           color: "#DC2626" },
              { label: "Mortgage",       val: fmt(mortgageBalance),      color: "#DC2626" },
              { label: "Total Liabilities", val: fmt(totalLiabilities), color: "#19181E" },
            ].map(l => (
              <div key={l.label}>
                <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{l.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: l.color, fontFamily: "Inter, sans-serif" }}>{l.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Goals Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
const FIRE_GOAL_OPTIONS = [
  { id: "early-retirement", label: "Early Retirement", icon: "ER", desc: "Stop working entirely and live off your portfolio" },
  { id: "coast-fire", label: "Coast FIRE", icon: "CF", desc: "Save enough now, let compound growth carry you" },
  { id: "barista-fire", label: "Barista FIRE", icon: "BF", desc: "Part-time income covers expenses while your portfolio grows" },
  { id: "fat-fire", label: "Fat FIRE", icon: "FF", desc: "Full retirement with a luxury lifestyle buffer" },
];

function GoalsTab({ fireAge, setFireAge }: { fireAge: number; setFireAge: (v: number) => void }) {
  const [goalId, setGoalId] = useState("early-retirement");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="uf-card">
        <SectionLabel icon="棣冨箚" text="FIRE Goal Type" color="#064E3B" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {FIRE_GOAL_OPTIONS.map(g => (
            <button
              key={g.id}
              onClick={() => setGoalId(g.id)}
              style={{
                background: goalId === g.id ? "rgba(6,78,59,0.06)" : "#F8FAFC",
                border: `2px solid ${goalId === g.id ? "#047857" : "#E2E8F0"}`,
                borderRadius: 12, padding: "16px 18px", cursor: "pointer",
                textAlign: "left", transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{g.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: goalId === g.id ? "#064E3B" : "#19181E", fontFamily: "Manrope, sans-serif" }}>{g.label}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>{g.desc}</div>
            </button>
          ))}

        </div>
      </div>

      <div className="uf-card">
        <SectionLabel icon="棣冨范" text="Current Age" color="#064E3B" />
        <div style={{ maxWidth: 280 }}>
          <FieldRow label="Your current age" hint="Used to calculate your FIRE date">
            <NumberInput value={fireAge} onChange={setFireAge} placeholder="30" prefix="棣冨范" />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Simulations Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function SimulationsTab({ income, expenses, k401, rothIRA, taxable, growthRate, withdrawalRate }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; growthRate: number; withdrawalRate: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 700, color: "#19181E", margin: "0 0 4px" }}>Monte Carlo Simulation</h2>
        <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>10,000 randomised market scenarios to estimate your probability of reaching FIRE.</p>
      </div>
      <MonteCarloCard
        income={income} expenses={expenses}
        k401={k401} rothIRA={rothIRA} taxable={taxable}
        growthRate={growthRate} withdrawalRate={withdrawalRate}
      />
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Trends Tab 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
function TrendsTab({ income, expenses, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
}) {
  const [chartTab, setChartTab] = useState<"growth" | "accounts" | "networth">("growth");

  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const { data, fireYear } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate]);

  const chartData = data.slice(0, Math.min(data.length, (fireYear ?? 30) + 7));

  function ChartTabBtn({ id, label }: { id: "growth" | "accounts" | "networth"; label: string }) {
    return (
      <button onClick={() => setChartTab(id)} style={{
        background: chartTab === id ? "#064E3B" : "transparent",
        border: `1px solid ${chartTab === id ? "#064E3B" : "#E2E8F0"}`,
        borderRadius: 6, padding: "5px 13px",
        color: chartTab === id ? "#fff" : "#64748B",
        fontFamily: "Inter, sans-serif", fontSize: 11,
        letterSpacing: "0.06em", textTransform: "uppercase",
        cursor: "pointer", transition: "all 0.2s",
      }}>{label}</button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="uf-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 15 }}>Wealth Projection</span>
          <div style={{ display: "flex", gap: 6 }}>
            <ChartTabBtn id="growth" label="Growth" />
            <ChartTabBtn id="accounts" label="Accounts" />
            <ChartTabBtn id="networth" label="Net Worth" />
          </div>
        </div>

        {chartTab === "growth" && (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gI3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gT3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#064E3B" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#064E3B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmt(v, true)} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip />} />
              {fireYear && <ReferenceLine x={fireYear} stroke="#064E3B" strokeDasharray="4 3" label={{ value: "棣冩暉 FIRE", fill: "#064E3B", fontSize: 10, fontFamily: "Inter" }} />}
              <Area type="monotone" dataKey="FIRE Target" stroke="#064E3B" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gT3)" dot={false} />
              <Area type="monotone" dataKey="Investable" stroke="#059669" strokeWidth={2.5} fill="url(#gI3)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartTab === "accounts" && (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {[["g401d","#059669"],["gRothd","#20D4BF"],["gTaxd","#047857"]].map(([id, c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.04} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmt(v, true)} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter", color: "#64748B", paddingTop: 10 }} />
              {fireYear && <ReferenceLine x={fireYear} stroke="#064E3B" strokeDasharray="4 3" />}
              <Area type="monotone" dataKey="401(k)" stroke="#059669" strokeWidth={2} fill="url(#g401d)" dot={false} stackId="a" />
              <Area type="monotone" dataKey="Roth IRA" stroke="#20D4BF" strokeWidth={2} fill="url(#gRothd)" dot={false} stackId="a" />
              <Area type="monotone" dataKey="Taxable" stroke="#047857" strokeWidth={2} fill="url(#gTaxd)" dot={false} stackId="a" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartTab === "networth" && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmt(v, true)} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
              {fireYear && <ReferenceLine x={fireYear} stroke="#064E3B" strokeDasharray="4 3" label={{ value: "棣冩暉 FIRE", fill: "#064E3B", fontSize: 10, fontFamily: "Inter" }} />}
              <Line type="monotone" dataKey="Net Worth" stroke="#059669" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Debt" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 10 }}>
          {chartTab === "growth" && "Green = investable assets 璺?Dark dashed = FIRE target"}
          {chartTab === "accounts" && "Stacked: 401(k) 璺?Roth IRA 璺?Taxable brokerage"}
          {chartTab === "networth" && "Total net worth vs debt paydown over time"}
        </p>
      </div>
    </div>
  );
}

// 閳光偓閳光偓閳光偓 Sidebar groups definition 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓
const DASHBOARD_NAV: DashboardNavItem[] = [
  { type: "tab", key: "insights-overview", label: "Dashboard", icon: "D" },
  { type: "tab", key: "insights-spending", label: "Budget", icon: "B" },
  { type: "tab", key: "plan-calculators", label: "FIRE Calculator", icon: "F" },
  { type: "tab", key: "expenses", label: "Expenses", icon: "E" },
  { type: "link", href: "/learn", label: "Learning Hub", icon: "L" },
];

function normalizeTab(raw: string | null): TabKey {
  switch (raw) {
    case "dashboard":
    case "overview":
    case "portfolio-overview":
    case "insights-overview":
      return "insights-overview";
    case "budget":
    case "spending":
    case "insights-spending":
      return "insights-spending";
    case "fire":
    case "calculator":
    case "calculators":
    case "plan-calculators":
      return "plan-calculators";
    case "expenses":
    case "transactions":
    case "insights-trends":
      return "expenses";
    case "portfolio-assets":
    case "portfolio-liabilities":
    case "plan-goals":
    case "plan-simulations":
      return raw;
    default:
      return "insights-overview";
  }
}

export default function Dashboard() {
  const [tab, setTab] = useState<TabKey>("insights-overview");

  // Read initial tab from URL query string and normalize old aliases.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTab(normalizeTab(params.get("tab")));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const canonical =
      tab === "insights-overview"
        ? "dashboard"
        : tab === "insights-spending"
          ? "budget"
          : tab === "plan-calculators"
            ? "fire"
            : tab === "expenses"
              ? "expenses"
              : tab;
    params.set("tab", canonical);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [tab]);

  // Budget state
  const [income,   setIncome]   = useState(0);
  const [expenses, setExpenses] = useState<Expenses>({ housing: 0, food: 0, transport: 0, subscriptions: 0, healthcare: 0, entertainment: 0, other: 0 });

  // FIRE profile state — persisted via the single default scenario
  // (lib/fire/scenarios.ts). user_budget is dual-written for back-compat.
  const [fireAge,         setFireAge]         = useState(30);
  const [k401,            setK401]            = useState(0);
  const [rothIRA,         setRothIRA]         = useState(0);
  const [taxable,         setTaxable]         = useState(0);
  const [totalDebt,       setTotalDebt]       = useState(0);
  const [mortgageBalance, setMortgageBalance] = useState(0);
  const [mortgageMonthly, setMortgageMonthly] = useState(0);
  const [growthRate,      setGrowthRate]      = useState(0.07);
  const [withdrawalRate,  setWithdrawalRate]  = useState(0.04);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [journeyPrefill, setJourneyPrefill] = useState<CalculatorPrefill | null>(null);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoaded   = useRef(false);

  // Load from Supabase on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      // Fetch current-month actuals from expenses table
      const nowD = new Date();
      const thisMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
      supabase.from("expenses").select("category, amount")
        .eq("user_id", session.user.id)
        .like("date", `${thisMonth}-%`)
        .then(({ data: expData }) => {
          if (expData) {
            const agg: Record<string, number> = {};
            expData.forEach(e => { agg[e.category] = (agg[e.category] || 0) + e.amount; });
            setActuals(agg);
          }
        });
      loadDefaultScenario(supabase, session.user.id).then((scenario) => {
        // Check for calculator prefill from the landing page
        const prefill = consumeCalculatorPrefill() || {};
        const seededIncome = prefill.monthlyIncome || prefill.income || 0;
        const hadPrefill = Object.keys(prefill).length > 0;
        setJourneyPrefill(hadPrefill ? prefill : null);

        // Funnel: dashboard first view per session. Identify links the
        // anonymous PostHog distinct id to the supabase user so the upstream
        // calculator events stitch to the same person.
        identifyUser(session.user.id);
        const viaUpgrade =
          new URLSearchParams(window.location.search).get("upgraded") === "true";
        trackDashboardFirstView({
          hadCalculatorPrefill: hadPrefill,
          viaUpgrade,
          scenarioId: scenario.scenarioId,
        });

        setIncome(seededIncome || scenario.monthlyIncome || 0);
        setExpenses({
          housing: 0, food: 0, transport: 0, subscriptions: 0,
          healthcare: 0, entertainment: 0, other: 0,
          ...(scenario.budgetCategories as Expenses),
        });
        setFireAge(scenario.fireAge);
        setK401(scenario.k401);
        setRothIRA(scenario.rothIRA);
        setTaxable(scenario.taxable);
        setTotalDebt(scenario.totalDebt);
        setMortgageBalance(scenario.mortgageBalance);
        setMortgageMonthly(scenario.mortgageMonthly);
        setGrowthRate(scenario.growthRate);
        setWithdrawalRate(scenario.withdrawalRate);
        isLoaded.current = true;
      });
    });
  }, []);

  // Auto-save with 1s debounce
  useEffect(() => {
    if (!isLoaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await saveDefaultScenario(supabase, session.user.id, {
        monthlyIncome: income,
        fireAge,
        k401, rothIRA, taxable, totalDebt,
        mortgageBalance, mortgageMonthly,
        growthRate, withdrawalRate,
        budgetCategories: expenses as Record<string, number>,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1000);
  }, [income, expenses, fireAge, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: #E2E8F0; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #064E3B; border: 3px solid #F7F9FB; cursor: pointer; box-shadow: 0 0 0 2px #064E3B; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }

        .uf-card { background: #ffffff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 24px; }
        .uf-card-glow { box-shadow: 0 0 0 1px rgba(6,78,59,0.3), 0 0 24px rgba(6,78,59,0.08); border-color: rgba(6,78,59,0.35) !important; }
        .uf-tag { font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

        .uf-shell { display: flex; min-height: 100vh; }
        .uf-sidebar { width: 248px; min-height: 100vh; position: sticky; top: 0; height: 100vh; overflow-y: auto; background: #F8FAFC; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; flex-shrink: 0; }
        .uf-main { flex: 1; overflow-y: auto; min-width: 0; }
        .uf-content { max-width: 1060px; margin: 0 auto; padding: 32px 36px 60px; }

        .uf-sidebar-logo { padding: 22px 20px 14px; font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 800; color: #064E3B; letter-spacing: -0.04em; text-decoration: none; display: block; border-bottom: 1px solid #E2E8F0; }
        .uf-sidebar-logo span { color: #20D4BF; }
        .uf-sidebar-group { padding: 18px 10px 4px; }
        .uf-sidebar-group-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94A3B8; padding: 0 10px 6px; }
        .uf-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 13px; font-weight: 500; color: #475569; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; margin-bottom: 2px; background: transparent; width: 100%; text-align: left; font-family: 'Manrope', sans-serif; }
        .uf-sidebar-item:hover { background: rgba(209,250,229,0.3); color: #1E3A2F; }
        .uf-sidebar-item.active { background: rgba(209,250,229,0.5); border-color: #047857; color: #065F46; font-weight: 600; }
        .uf-sidebar-item.active .uf-sidebar-icon { color: #059669; }
        .uf-sidebar-icon { font-size: 13px; width: 16px; text-align: center; color: #94A3B8; flex-shrink: 0; }
        .uf-sidebar-bottom { margin-top: auto; padding: 14px 16px; border-top: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 8px; }

        select option { background: #ffffff; }

        @media(max-width: 900px) {
          .uf-sidebar { width: 196px; }
          .uf-content { padding: 20px 20px 48px; }
        }
        @media(max-width: 640px) {
          .uf-shell { flex-direction: column; }
          .uf-sidebar { width: 100%; min-height: unset; height: auto; position: static; flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid #E2E8F0; }
          .uf-sidebar-group { display: flex; flex-direction: row; padding: 8px 8px 8px; gap: 4px; }
          .uf-sidebar-group-label { display: none; }
          .uf-content { padding: 16px 14px 48px; }
        }
      `}</style>

      <div className="uf-shell">
        {/* 閳光偓閳光偓 Sidebar 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓 */}
        <aside className="uf-sidebar">
          <Link href="/" className="uf-sidebar-logo">Until<span>Fire</span></Link>

          <div className="uf-sidebar-group">
            <div className="uf-sidebar-group-label">Workspace</div>
            {DASHBOARD_NAV.map(item =>
              item.type === "tab" ? (
                <button
                  key={item.key}
                  className={`uf-sidebar-item ${tab === item.key ? "active" : ""}`}
                  onClick={() => setTab(item.key)}
                >
                  <span className="uf-sidebar-icon">{item.icon}</span>
                  {item.label}
                </button>
              ) : (
                <Link key={item.href} href={item.href} className="uf-sidebar-item" style={{ textDecoration: "none" }}>
                  <span className="uf-sidebar-icon">{item.icon}</span>
                  {item.label}
                </Link>
              )
            )}
          </div>

          <div className="uf-sidebar-bottom">
            {saveStatus === "saving" && <span style={{ color: "#64748B", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Saving...</span>}
            {saveStatus === "saved"  && <span style={{ color: "#059669", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Saved</span>}
            <UserNav />
          </div>
        </aside>

        {/* 閳光偓閳光偓 Main content 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓 */}
        <main className="uf-main">
          <div className="uf-content">
            {tab === "portfolio-overview" && (
              <PortfolioOverviewTab
                income={income} expenses={expenses}
                k401={k401} rothIRA={rothIRA} taxable={taxable}
                totalDebt={totalDebt} mortgageBalance={mortgageBalance}
                mortgageMonthly={mortgageMonthly} growthRate={growthRate}
                withdrawalRate={withdrawalRate}
              />
            )}
            {tab === "portfolio-assets" && (
              <AssetsTab
                k401={k401} setK401={setK401}
                rothIRA={rothIRA} setRothIRA={setRothIRA}
                taxable={taxable} setTaxable={setTaxable}
                growthRate={growthRate} setGrowthRate={setGrowthRate}
                withdrawalRate={withdrawalRate} setWithdrawalRate={setWithdrawalRate}
              />
            )}
            {tab === "portfolio-liabilities" && (
              <LiabilitiesTab
                totalDebt={totalDebt} setTotalDebt={setTotalDebt}
                mortgageBalance={mortgageBalance} setMortgageBalance={setMortgageBalance}
                mortgageMonthly={mortgageMonthly} setMortgageMonthly={setMortgageMonthly}
              />
            )}
            {tab === "plan-goals" && (
              <GoalsTab fireAge={fireAge} setFireAge={setFireAge} />
            )}
            {tab === "plan-simulations" && (
              <SimulationsTab
                income={income} expenses={expenses}
                k401={k401} rothIRA={rothIRA} taxable={taxable}
                growthRate={growthRate} withdrawalRate={withdrawalRate}
              />
            )}
            {tab === "plan-calculators" && <CalculatorsTab />}
            {tab === "insights-spending" && (
              <BudgetTab income={income} setIncome={setIncome} expenses={expenses} setExpenses={setExpenses} actuals={actuals} />
            )}
            {tab === "insights-overview" && (
              <DashTab
                income={income} expenses={expenses}
                k401={k401} rothIRA={rothIRA} taxable={taxable}
                totalDebt={totalDebt} mortgageBalance={mortgageBalance}
                mortgageMonthly={mortgageMonthly} growthRate={growthRate}
                withdrawalRate={withdrawalRate}
                actuals={actuals}
                prefill={journeyPrefill}
                onOpenBudget={() => setTab("insights-spending")}
                onOpenExpenses={() => setTab("expenses")}
              />
            )}
            {tab === "expenses" && <TransactionsTab />}
          </div>
        </main>
      </div>
    </>
  );
}
