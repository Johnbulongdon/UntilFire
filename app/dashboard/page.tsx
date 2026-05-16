"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
  BarChart, Bar,
} from "recharts";
import TransactionsTab from "./TransactionsTab";
import UpgradeModal from "./UpgradeModal";
import CategoriesTab from "./CategoriesTab";
import RecurringTab from "./RecurringTab";
import ReportsTab from "./ReportsTab";
import ProfileTab from "./ProfileTab";
import Logo from "@/app/components/Logo";
import FeedbackWidget from "./FeedbackWidget";
import { monteCarloFIRE } from "@/lib/fire";
import { FALLBACK_RATES, convertUSDAmount, formatUSDInCurrency, getCurrencySymbol } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────
type Expenses = Record<string, number>;

type PlaidAccount = {
  id: string;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  balance_current: number | null;
  balance_available: number | null;
  balance_limit: number | null;
  iso_currency_code: string;
  mask: string | null;
  plaid_item_id: string;
  updated_at: string;
};
type TabKey =
  | "overview"
  | "cashflow"
  | "assets"
  | "liabilities"
  | "fire-calculator"
  | "reports"
  | "learning-hub"
  | "profile";

type LearnStageId =
  | "starting-out"
  | "building-momentum"
  | "approaching-fire"
  | "living-in-fire";

const LEARNING_STAGES: { id: LearnStageId; label: string; whatMattersNow: string }[] = [
  {
    id: "starting-out",
    label: "Starting Out",
    whatMattersNow: "Learn the basics first: FIRE, savings rate, and compounding before you optimize anything.",
  },
  {
    id: "building-momentum",
    label: "Building Momentum",
    whatMattersNow: "Improve the machine: account strategy, savings pace, and choosing the right FIRE path for your life.",
  },
  {
    id: "approaching-fire",
    label: "Approaching FIRE",
    whatMattersNow: "Pressure-test the plan: target size, assumptions, and sequence risk matter more as FIRE gets closer.",
  },
  {
    id: "living-in-fire",
    label: "Living in FIRE",
    whatMattersNow: "Protect the portfolio: withdrawals, tax-aware access, and resilience through real retirement years.",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const EXPENSE_CATS = [
  { key: "housing",       label: "Housing",       icon: "🏠", color: "#818cf8" },
  { key: "food",          label: "Food & Dining",  icon: "🍔", color: "#f97316" },
  { key: "transport",     label: "Transport",      icon: "🚗", color: "#22d3a5" },
  { key: "subscriptions", label: "Subscriptions",  icon: "📱", color: "#a78bfa" },
  { key: "healthcare",    label: "Healthcare",     icon: "🏥", color: "#ef4444" },
  { key: "entertainment", label: "Entertainment",  icon: "🎬", color: "#fbbf24" },
  { key: "other",         label: "Other",          icon: "📦", color: "#6b6b85" },
];

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (
  n: number,
  currency: string,
  rates: Record<string, number>,
  compact = false,
) => formatUSDInCurrency(n, currency, rates, { compact });

const toUSD = (amount: number, currency: string, rates: Record<string, number>) => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

// ─── FIRE Engine ──────────────────────────────────────────────────────────────
function calcProjection({
  annualIncome, monthlyExpenses, k401, rothIRA, taxable, cashSavings = 0,
  totalDebt, mortgageBalance, mortgageMonthly,
  growthRate = 0.07, withdrawalRate = 0.04, years = 50,
}: {
  annualIncome: number; monthlyExpenses: number; k401: number;
  rothIRA: number; taxable: number; cashSavings?: number; totalDebt: number;
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
  let curCash    = cashSavings;
  let curDebt    = totalDebt;
  let curMort    = mortgageBalance;
  let fireYear: number | null = null;
  let totalContributed = k401 + rothIRA + taxable + cashSavings;

  for (let y = 0; y <= years; y++) {
    const investable = cur401k + curRoth + curTaxable + curCash;
    const netWorth   = investable - curDebt - curMort;
    if (fireYear === null && investable >= fireTarget && y > 0) fireYear = y;
    const contributed = Math.min(totalContributed, investable);
    data.push({
      year: y,
      "401(k)":        Math.round(cur401k),
      "Roth IRA":      Math.round(curRoth),
      "Taxable":       Math.round(curTaxable),
      "Net Worth":     Math.round(netWorth),
      "FIRE Target":   Math.round(fireTarget),
      "Investable":    Math.round(investable),
      "Debt":          Math.round(-(curDebt + curMort)),
      "Contributions": Math.round(contributed),
      "Market Growth": Math.round(Math.max(investable - contributed, 0)),
    });
    totalContributed += Math.max(annualSavings, 0);
    cur401k    = cur401k    * (1 + growthRate) + k401Contrib;
    curRoth    = curRoth    * (1 + growthRate) + rothContrib;
    curTaxable = curTaxable * (1 + growthRate) + taxableContrib;
    curCash    = curCash    * (1 + growthRate);
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

// ─── Shared UI ────────────────────────────────────────────────────────────────
function NumberInput({ value, onChange, placeholder = "0", prefix = "$", currency, rates }: {
  value: number; onChange: (v: number) => void;
  placeholder?: string; prefix?: string;
  currency?: string; rates?: Record<string, number>;
}) {
  const [focused, setFocused] = useState(false);
  const displayValue = currency && rates
    ? Number.isFinite(value)
      ? convertUSDAmount(value, currency, rates)
      : value
    : value;
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
        type="number" value={displayValue || ""} placeholder={placeholder}
        onChange={e => {
          const nextValue = Number(e.target.value);
          if (currency && rates && currency !== "USD") {
            const rate = rates[currency];
            onChange(rate ? nextValue / rate : nextValue);
            return;
          }
          onChange(nextValue);
        }}
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

const ChartTooltip = ({ active, payload, label, currency = "USD", rates = FALLBACK_RATES }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", fontFamily: "Inter, sans-serif", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ color: "#64748B", marginBottom: 6 }}>Year {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value, currency, rates, true)}</div>
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

// ─── Monte Carlo Probability Card ─────────────────────────────────────────────
function MonteCarloCard({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, growthRate, withdrawalRate, displayCurrency, displayRates }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; growthRate: number; withdrawalRate: number;
  displayCurrency: string; displayRates: Record<string, number>;
}) {
  const [extraSavings, setExtraSavings] = useState(0);
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);

  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const annualExpenses = monthlyExpenses * 12;
  const fireTarget     = annualExpenses / withdrawalRate;
  const annualSavings  = income * 12 - annualExpenses;
  const investable     = k401 + rothIRA + taxable + cashSavings;

  const base = useMemo(() => {
    if (fireTarget <= 0 || income <= 0) return null;
    return monteCarloFIRE({ initialInvestable: investable, annualSavings, fireTarget, meanReturn: growthRate });
  }, [investable, annualSavings, fireTarget, growthRate, income]);

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
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
          Enter your income and expenses in the <strong>Goals</strong> section above to see your retirement success probability.
        </p>
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
          <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "#64748B", marginBottom: 4, fontWeight: 700 }}>
            Success Probability
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 14, lineHeight: 1.5 }}>
            Chance of reaching your FIRE number before your target age, based on 10,000 randomised market simulations.
          </div>
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
          <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>1,000 simulations · σ=12% annual returns</p>
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
          +{fmtMoney(extraSavings)}/mo
        </span>
        {yearDelta > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "#ECFDF5", borderRadius: 20, padding: "4px 12px", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
            −{yearDelta} yr
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>drag to simulate</span>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Overview Tab ───────────────────────────────────────────────────
function DashTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, actuals: _actuals = {}, actualIncome = 0, actualExpenses = 0, cityName = "", prevIncome = 0, prevExpenses = 0, userName = "", displayCurrency, displayRates, onTabChange }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
  actuals?: Record<string, number>; actualIncome?: number; actualExpenses?: number; cityName?: string;
  prevIncome?: number; prevExpenses?: number; userName?: string;
  displayCurrency: string; displayRates: Record<string, number>;
  onTabChange?: (tab: TabKey) => void;
}) {
  const [chartPeriod, setChartPeriod] = useState<"5Y" | "15Y" | "All">("15Y");
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);

  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const { data, fireYear, fireTarget, annualSavings } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate]);

  const investable  = k401 + rothIRA + taxable + cashSavings;
  const savingsRate = income > 0 ? ((annualSavings / 12) / income) * 100 : 0;
  const progress    = fireTarget > 0 ? Math.min(100, (investable / fireTarget) * 100) : 0;
  const chartData   = data.slice(0, Math.min(data.length, (fireYear ?? 30) + 6));
  const retireYear  = fireYear ? new Date().getFullYear() + fireYear : null;

  // Greeting
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = (userName.split(" ")[0] || "").trim();
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const formattedDate = `${DAY_NAMES[now.getDay()]} · ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const monthName = MONTH_NAMES[now.getMonth()];
  const prevMonthName = MONTH_NAMES[(now.getMonth() + 11) % 12];

  // Chart period filter
  const periodData = useMemo(() => {
    const limit = chartPeriod === "5Y" ? 5 : chartPeriod === "15Y" ? 15 : chartData.length - 1;
    return chartData.filter(d => d.year <= limit);
  }, [chartData, chartPeriod]);

  // Chart summary at FIRE year
  const firePoint = fireYear
    ? (chartData[Math.min(fireYear, chartData.length - 1)] ?? chartData[chartData.length - 1])
    : chartData[chartData.length - 1];
  const contribAtFire = firePoint?.["Contributions"] ?? 0;
  const marketAtFire  = firePoint?.["Market Growth"] ?? 0;

  // KPI trends — cashflow transactions only
  const hasActuals       = actualIncome > 0 || actualExpenses > 0;
  const hasPrev          = prevIncome > 0 || prevExpenses > 0;
  const netSurplus       = actualIncome - actualExpenses;
  const prevNet          = prevIncome - prevExpenses;
  const actualSavingsRate = actualIncome > 0 ? (netSurplus / actualIncome) * 100 : 0;
  const prevSavingsRate   = prevIncome > 0 ? (prevNet / prevIncome) * 100 : 0;
  const trendPct = (cur: number, prev: number) => prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100;
  const incomeTrend  = hasPrev ? trendPct(actualIncome, prevIncome) : null;
  const expenseTrend = hasPrev ? trendPct(actualExpenses, prevExpenses) : null;
  const netTrend     = hasPrev ? trendPct(netSurplus, prevNet) : null;
  const srDelta      = (hasPrev && prevIncome > 0) ? actualSavingsRate - prevSavingsRate : null;

  // Status pill
  const statusLabel = savingsRate >= 50 ? "Ahead of schedule" : savingsRate >= 25 ? "On track" : income > 0 ? "Behind schedule" : "No data yet";
  const statusColor = savingsRate >= 50 ? "#059669" : savingsRate >= 25 ? "#20D4BF" : income > 0 ? "#F59E0B" : "#94A3B8";
  const TrendBadge = ({ pct, pp, inverse = false }: { pct?: number | null; pp?: number | null; inverse?: boolean }) => {
    const val = pp ?? pct;
    if (val === null || val === undefined) return null;
    const isPositive = inverse ? val < 0 : val > 0;
    const color = isPositive ? "#059669" : "#DC2626";
    const label = pp !== undefined && pp !== null
      ? `${Math.abs(pp).toFixed(1)} pp vs ${prevMonthName}`
      : `${Math.abs(pct!).toFixed(1)}% vs ${prevMonthName}`;
    return (
      <span style={{ fontSize: 11, color, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
        {val > 0 ? "▲" : "▼"} {label}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Greeting header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px" }}>
            Good {timeOfDay}{firstName ? `, ${firstName}` : ""}
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 3, fontFamily: "Inter, sans-serif" }}>
            {formattedDate}{cityName ? ` · 📍 ${cityName}` : ""}
          </div>
        </div>
      </div>

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <div className="uf-card" style={{ padding: 0, overflow: "hidden", display: "flex", minHeight: 180 }}>
        {/* Left: white side — FIRE year + 3 mini-stat boxes */}
        <div style={{ flex: "0 0 55%", padding: "28px 32px", background: "#FFFFFF" }}>
          <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1.2px", textTransform: "uppercase", color: "#64748B", fontWeight: 700, marginBottom: 8 }}>
            FIRE Target Year
          </div>
          {retireYear ? (
            <>
              <div style={{ fontSize: "clamp(48px, 7vw, 72px)", fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-4px", lineHeight: 1 }}>
                {retireYear}
              </div>
              {/* 3 mini-stat boxes */}
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", flex: "1 1 0", minWidth: 90 }}>
                  <div style={{ fontSize: 9, fontFamily: "Manrope, sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8", fontWeight: 700, marginBottom: 4 }}>Years Remaining</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", fontFamily: "Inter, sans-serif" }}>{fireYear} yr</div>
                </div>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", flex: "1 1 0", minWidth: 70 }}>
                  <div style={{ fontSize: 9, fontFamily: "Manrope, sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8", fontWeight: 700, marginBottom: 4 }}>Progress</div>
                  <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "Inter, sans-serif", color: progress >= 50 ? "#059669" : progress >= 20 ? "#20D4BF" : "#F59E0B" }}>{progress.toFixed(0)}%</div>
                </div>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", flex: "1 1 0", minWidth: 100 }}>
                  <div style={{ fontSize: 9, fontFamily: "Manrope, sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8", fontWeight: 700, marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "Inter, sans-serif", color: statusColor }}>{statusLabel}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#CBD5E1", fontFamily: "Manrope, sans-serif", letterSpacing: "-2px" }}>—</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#94A3B8", fontFamily: "Inter, sans-serif" }}>Add income &amp; expenses in the Cashflow tab</div>
            </>
          )}
        </div>

        {/* Right: dark side — Target + progress bar */}
        <div style={{ flex: "0 0 45%", padding: "28px 32px", background: "#003527", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(98,250,227,0.07) 0%, transparent 70%)", top: -80, right: -60, pointerEvents: "none" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative", height: "100%" }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4, fontWeight: 700 }}>FIRE Target</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Inter, sans-serif", color: "#FFFFFF" }}>{fmtMoney(fireTarget, true)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4, fontWeight: 700 }}>Investable Assets</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Inter, sans-serif", color: "#62FAE3" }}>{fmtMoney(investable, true)}</div>
              </div>
            </div>
            <div style={{ marginTop: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif" }}>{fmtMoney(0)}</span>
                <span style={{ fontSize: 13, color: "#62FAE3", fontFamily: "Inter, sans-serif", fontWeight: 700 }}>{progress.toFixed(0)}%</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif" }}>{fmtMoney(fireTarget, true)}</span>
              </div>
              <div style={{ height: 7, background: "rgba(255,255,255,0.12)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #20D4BF, #62FAE3)", borderRadius: 99, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── This Month KPI row ──────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>This month</div>
          {hasActuals && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "Inter, sans-serif" }}>
                {monthName} 1–{now.getDate()} · partial month
              </span>
              <button onClick={() => onTabChange?.("cashflow")} style={{ fontSize: 12, color: "#059669", fontWeight: 600, fontFamily: "Inter, sans-serif", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                view full →
              </button>
            </div>
          )}
        </div>

        {hasActuals ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div className="uf-card" style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, marginBottom: 8, fontFamily: "Inter, sans-serif" }}>Income</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px", color: "#059669" }}>{fmtMoney(actualIncome)}</div>
                <div style={{ marginTop: 5 }}><TrendBadge pct={incomeTrend} /></div>
              </div>
              <div className="uf-card" style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, marginBottom: 8, fontFamily: "Inter, sans-serif" }}>Expenses</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px", color: "#DC2626" }}>{fmtMoney(actualExpenses)}</div>
                <div style={{ marginTop: 5 }}><TrendBadge pct={expenseTrend} inverse /></div>
              </div>
              <div className="uf-card" style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, marginBottom: 8, fontFamily: "Inter, sans-serif" }}>Net Surplus</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px", color: netSurplus >= 0 ? "#059669" : "#DC2626" }}>
                  {netSurplus < 0 ? "−" : ""}{fmtMoney(Math.abs(netSurplus))}
                </div>
                <div style={{ marginTop: 5 }}><TrendBadge pct={netTrend} /></div>
              </div>
              <div className="uf-card" style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, marginBottom: 8, fontFamily: "Inter, sans-serif" }}>Savings Rate</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px", color: actualSavingsRate >= 50 ? "#059669" : actualSavingsRate >= 25 ? "#20D4BF" : "#F59E0B" }}>
                  {actualSavingsRate.toFixed(1)}%
                </div>
                <div style={{ marginTop: 5 }}><TrendBadge pp={srDelta} /></div>
              </div>
            </div>
            {netSurplus > 0 && retireYear && (
              <div style={{ marginTop: 10, padding: "12px 16px", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.15)", borderRadius: 10, fontSize: 13, color: "#047857", fontFamily: "Inter, sans-serif" }}>
                Your {monthName} surplus of {fmtMoney(netSurplus)} pulled your FIRE date earlier — at this pace you&apos;d reach FIRE in {retireYear}.
              </div>
            )}
          </>
        ) : (
          <button onClick={() => onTabChange?.("cashflow")}
            style={{ width: "100%", padding: "20px 24px", background: "rgba(5,150,105,0.04)", border: "1.5px dashed #A7F3D0", borderRadius: 12, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontFamily: "inherit", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(5,150,105,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(5,150,105,0.04)"; }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", fontFamily: "Manrope, sans-serif", marginBottom: 4 }}>
                Log your first transaction for {monthName}
              </div>
              <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
                Track your income and expenses to see your real savings rate and how fast you&apos;re moving toward FIRE.
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}
      </div>

      {/* ── Path to FIRE chart ──────────────────────────────────────────── */}
      <div className="uf-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>Path to FIRE</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2, fontFamily: "Inter, sans-serif" }}>Projected net worth, year by year</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["5Y", "15Y", "All"] as const).map(p => (
              <button key={p} onClick={() => setChartPeriod(p)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", fontFamily: "Inter, sans-serif", background: chartPeriod === p ? "#064E3B" : "transparent", color: chartPeriod === p ? "#fff" : "#64748B", borderColor: chartPeriod === p ? "#064E3B" : "#E2E8F0" }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={periodData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmtMoney(v, true)} tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const contrib = (payload.find(p => p.dataKey === "Contributions")?.value as number) ?? 0;
                const mkt = (payload.find(p => p.dataKey === "Market Growth")?.value as number) ?? 0;
                return (
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "Inter, sans-serif", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: "#0F172A" }}>Year {label}</div>
                    <div style={{ color: "#064E3B" }}>You contribute: {fmtMoney(contrib, true)}</div>
                    <div style={{ color: "#20D4BF" }}>Market grows: {fmtMoney(mkt, true)}</div>
                    <div style={{ color: "#64748B", marginTop: 6, borderTop: "1px solid #E2E8F0", paddingTop: 6 }}>Total: {fmtMoney(contrib + mkt, true)}</div>
                  </div>
                );
              }}
            />
            {fireYear && <ReferenceLine x={fireYear} stroke="#20D4BF" strokeDasharray="4 3" strokeWidth={1.5} />}
            <Bar dataKey="Contributions" stackId="a" fill="#064E3B" radius={[0, 0, 3, 3]} />
            <Bar dataKey="Market Growth" stackId="a" fill="#20D4BF" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#064E3B", display: "inline-block", flexShrink: 0 }} /> You contribute
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#20D4BF", display: "inline-block", flexShrink: 0 }} /> Market grows
            </span>
          </div>
          {(contribAtFire > 0 || marketAtFire > 0) && (
            <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif", textAlign: "right" }}>
              By {retireYear ?? "target"}: <span style={{ color: "#064E3B", fontWeight: 600 }}>{fmtMoney(contribAtFire, true)}</span> from you · <span style={{ color: "#20D4BF", fontWeight: 600 }}>{fmtMoney(marketAtFire, true)}</span> from compounding
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Calculators Hub Tab ─────────────────────────────────────────────────────
const CALCULATORS = [
  {
    href: "/calculators/4-percent-rule",
    title: "FIRE Number Calculator",
    description: "Calculate exactly how much you need to retire. Adjust the withdrawal rate and see how it changes your target.",
    tag: "FIRE · Retirement",
    color: "#064E3B",
    label: "FI",
  },
  {
    href: "/calculators/savings-rate",
    title: "Savings Rate Calculator",
    description: "Find your savings rate and see exactly how it shifts your FIRE date — the single most powerful FIRE lever.",
    tag: "FIRE · Core",
    color: "#059669",
    label: "SR",
  },
  {
    href: "/calculators/coast-fire",
    title: "Coast FIRE Calculator",
    description: "Find the magic number where you can stop saving and let compound growth carry you to retirement.",
    tag: "FIRE · Strategy",
    color: "#20D4BF",
    label: "~",
  },
  {
    href: "/calculators/compound-interest",
    title: "Compound Interest Calculator",
    description: "Project how your investments grow with regular contributions over any time horizon.",
    tag: "Investing",
    color: "#047857",
    label: "↗",
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

function _CalculatorsTab() {
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
              <p style={{ fontSize: 12, color: c.color, fontWeight: 600, margin: 0 }}>Open calculator →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Budget Tracker Tab ───────────────────────────────────────────────────────
function BudgetTab({ income, setIncome, expenses, setExpenses, actuals, displayCurrency, displayRates }: {
  income: number; setIncome: (v: number) => void;
  expenses: Expenses; setExpenses: (e: Expenses) => void;
  actuals: Record<string, number>;
  displayCurrency: string; displayRates: Record<string, number>;
}) {
  const fmtMoney = (n: number) => fmt(n, displayCurrency, displayRates);
  const currencyPrefix = getCurrencySymbol(displayCurrency);
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
        <NumberInput
          value={income}
          onChange={setIncome}
          placeholder="5000"
          prefix={currencyPrefix}
          currency={displayCurrency}
          rates={displayRates}
        />
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
                  <NumberInput
                    value={expenses[cat.key] || 0}
                    onChange={v => setExpenses({ ...expenses, [cat.key]: v })}
                    prefix={currencyPrefix}
                    currency={displayCurrency}
                    rates={displayRates}
                  />
                  <div style={{ height: 4, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, income > 0 ? ((expenses[cat.key] || 0) / income) * 100 : 0)}%`, background: cat.color, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                </div>
                {spent > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontFamily: "Inter, sans-serif", color: over ? "#DC2626" : "#64748B" }}>
                      {over ? "⚠ " : ""}Spent {fmtMoney(spent)}{budget > 0 ? ` / ${fmtMoney(budget)}` : ""}
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
              { label: "Total Expenses", val: fmtMoney(totalExp), color: "#DC2626" },
              { label: "Monthly Savings", val: fmtMoney(Math.max(0, savings)), color: "#059669" },
              { label: "Savings Rate", val: `${rate.toFixed(1)}%`, color: rate >= 50 ? "#064E3B" : rate >= 25 ? "#059669" : "#DC2626" },
              { label: "Annual Savings", val: fmtMoney(Math.max(0, savings) * 12), color: "#19181E" },
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
              <span>Savings rate</span><span>{rate.toFixed(1)}% {rate >= 50 ? "🔥 FIRE pace" : rate >= 25 ? "· Good" : "· Needs work"}</span>
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

// ─── User Nav ─────────────────────────────────────────────────────────────────
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

// ─── Portfolio Overview Tab ───────────────────────────────────────────────────
function PortfolioOverviewTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, displayCurrency, displayRates, plaidAccounts = [] }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
  displayCurrency: string; displayRates: Record<string, number>;
  plaidAccounts?: PlaidAccount[];
}) {
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);
  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const { fireYear, fireTarget } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate]);

  const plaidAssets       = plaidAccounts.filter(a => a.type === "depository" || a.type === "investment").reduce((s, a) => s + (a.balance_current ?? 0), 0);
  const plaidLiabilities  = plaidAccounts.filter(a => a.type === "credit" || a.type === "loan").reduce((s, a) => s + (a.balance_current ?? 0), 0);
  const investable = k401 + rothIRA + taxable + cashSavings + plaidAssets;
  const netWorth   = investable - totalDebt - mortgageBalance - plaidLiabilities;
  const progress   = fireTarget > 0 ? Math.min(100, (investable / fireTarget) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Net worth hero */}
      <div className="uf-card" style={{ padding: "28px 32px", background: "#003527", borderColor: "transparent" }}>
        <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: "#62FAE3", marginBottom: 10, fontWeight: 700 }}>Net Worth</div>
        <div style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, color: netWorth >= 0 ? "#FFFFFF" : "#FCA5A5", fontFamily: "Manrope, sans-serif", letterSpacing: "-2px", lineHeight: 1 }}>
          {fmtMoney(netWorth)}
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
          {fmtMoney(investable, true)} investable assets · {fmtMoney(totalDebt + mortgageBalance, true)} total debt
        </div>
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
            <span>{fmtMoney(investable, true)} saved</span>
            <span style={{ color: "#62FAE3", fontWeight: 700 }}>{progress.toFixed(1)}% to FIRE</span>
            <span>{fmtMoney(fireTarget, true)} target</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#62FAE3", borderRadius: 99, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Investable Assets",  val: fmtMoney(investable, true),   color: "#059669",  sub: "All accounts" },
          { label: "Net Worth",          val: fmtMoney(netWorth, true),      color: netWorth >= 0 ? "#059669" : "#DC2626", sub: "Assets − debt" },
          { label: "Total Debt",         val: fmtMoney(totalDebt + mortgageBalance, true), color: "#DC2626", sub: "Consumer + mortgage" },
          { label: "FIRE Progress",      val: `${progress.toFixed(0)}%`, color: progress >= 75 ? "#059669" : "#20D4BF", sub: fireYear ? `${fireYear} yrs to FIRE` : "—" },
        ].map(k => (
          <KpiCard key={k.label} label={k.label} value={k.val} sub={k.sub} color={k.color} />
        ))}
      </div>

      {/* Account breakdown table */}
      <div className="uf-card">
        <SectionLabel icon="🏦" text="Account Snapshot" color="#064E3B" />
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
                    {row.val >= 0 ? fmtMoney(row.val) : `−${fmtMoney(Math.abs(row.val))}`}
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

// ─── Assets Tab ───────────────────────────────────────────────────────────────
function AssetsTab({ k401, setK401, rothIRA, setRothIRA, taxable, setTaxable, cashSavings, setCashSavings, growthRate, setGrowthRate, withdrawalRate, setWithdrawalRate, actualNetCashflow = 0, displayCurrency, displayRates, plaidAccounts = [], onRefreshAccounts }: {
  k401: number; setK401: (v: number) => void;
  rothIRA: number; setRothIRA: (v: number) => void;
  taxable: number; setTaxable: (v: number) => void;
  cashSavings: number; setCashSavings: (v: number) => void;
  growthRate: number; setGrowthRate: (v: number) => void;
  withdrawalRate: number; setWithdrawalRate: (v: number) => void;
  actualNetCashflow?: number;
  displayCurrency: string; displayRates: Record<string, number>;
  plaidAccounts?: PlaidAccount[];
  onRefreshAccounts?: () => void;
}) {
  const fmtMoney = (n: number) => fmt(n, displayCurrency, displayRates);
  const currencyPrefix = getCurrencySymbol(displayCurrency);
  const total = k401 + rothIRA + taxable + cashSavings;

  const bankAssets = plaidAccounts.filter(a => a.type === "depository" || a.type === "investment");
  const bankAssetsTotal = bankAssets.reduce((s, a) => s + (a.balance_current ?? 0), 0);
  const [hideZeroAssets, setHideZeroAssets] = useState(true);
  const visibleAssets = hideZeroAssets ? bankAssets.filter(a => (a.balance_current ?? 0) !== 0) : bankAssets;
  const hiddenAssetCount = bankAssets.length - visibleAssets.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {bankAssets.length > 0 && (
        <div className="uf-card" style={{ background: "rgba(5,150,105,0.04)", border: "1px solid rgba(5,150,105,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🏦</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#064E3B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Connected Bank Accounts</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {hiddenAssetCount > 0 || !hideZeroAssets ? (
                <button onClick={() => setHideZeroAssets(h => !h)} style={{ background: "none", border: "none", color: "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  {hideZeroAssets ? `Show $0 (${hiddenAssetCount})` : "Hide $0"}
                </button>
              ) : null}
              {onRefreshAccounts && (
                <button onClick={onRefreshAccounts} style={{ background: "none", border: "none", color: "#047857", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  ↻ Refresh
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {visibleAssets.map(a => (
              <div key={a.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#19181E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>
                  <span style={{ textTransform: "capitalize" }}>{a.subtype?.replace(/-/g, " ") ?? a.type}</span>
                  {a.mask && <span style={{ marginLeft: 6 }}>•••• {a.mask}</span>}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", marginTop: 4 }}>{fmtMoney(a.balance_current ?? 0)}</div>
                {a.balance_available != null && a.balance_available !== a.balance_current && (
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{fmtMoney(a.balance_available)} available</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(5,150,105,0.2)" }}>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Total from banks</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#064E3B" }}>{fmtMoney(bankAssetsTotal)}</span>
          </div>
        </div>
      )}
      <div>
        <div className="uf-card">
          <SectionLabel icon="📈" text="Investment Accounts" color="#059669" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <FieldRow label="Cash & Savings">
                <NumberInput
                  value={cashSavings}
                  onChange={setCashSavings}
                  placeholder="0"
                  prefix={currencyPrefix}
                  currency={displayCurrency}
                  rates={displayRates}
                />
              </FieldRow>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
                Checking, HYSA, emergency fund
                {actualNetCashflow !== 0 && (
                  <span style={{ marginLeft: 8 }}>
                    · Cashflow net this month:{" "}
                    <span style={{ color: actualNetCashflow >= 0 ? "#059669" : "#DC2626", fontWeight: 600 }}>
                      {actualNetCashflow >= 0 ? "+" : "−"}{fmtMoney(Math.abs(actualNetCashflow))}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <FieldRow label="401(k) Balance">
              <NumberInput
                value={k401}
                onChange={setK401}
                placeholder="0"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </FieldRow>
            <FieldRow label="Roth IRA Balance">
              <NumberInput
                value={rothIRA}
                onChange={setRothIRA}
                placeholder="0"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </FieldRow>
            <FieldRow label="Taxable Brokerage">
              <NumberInput
                value={taxable}
                onChange={setTaxable}
                placeholder="0"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </FieldRow>
          </div>
        </div>

      </div>

      {total > 0 && (
        <div className="uf-card" style={{ background: "rgba(5,150,105,0.04)", border: "1px solid rgba(5,150,105,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {[
              { label: "Cash", val: fmtMoney(cashSavings), pct: total > 0 ? (cashSavings / total * 100).toFixed(0) : "0", color: "#0ea5e9" },
              { label: "401(k)", val: fmtMoney(k401), pct: total > 0 ? (k401 / total * 100).toFixed(0) : "0", color: "#059669" },
              { label: "Roth IRA", val: fmtMoney(rothIRA), pct: total > 0 ? (rothIRA / total * 100).toFixed(0) : "0", color: "#20D4BF" },
              { label: "Taxable", val: fmtMoney(taxable), pct: total > 0 ? (taxable / total * 100).toFixed(0) : "0", color: "#047857" },
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

// ─── Liabilities Tab ──────────────────────────────────────────────────────────
function LiabilitiesTab({ totalDebt, setTotalDebt, mortgageBalance, setMortgageBalance, mortgageMonthly, setMortgageMonthly, displayCurrency, displayRates, plaidAccounts = [], onRefreshAccounts }: {
  totalDebt: number; setTotalDebt: (v: number) => void;
  mortgageBalance: number; setMortgageBalance: (v: number) => void;
  mortgageMonthly: number; setMortgageMonthly: (v: number) => void;
  displayCurrency: string; displayRates: Record<string, number>;
  plaidAccounts?: PlaidAccount[];
  onRefreshAccounts?: () => void;
}) {
  const fmtMoney = (n: number) => fmt(n, displayCurrency, displayRates);
  const currencyPrefix = getCurrencySymbol(displayCurrency);
  const totalLiabilities = totalDebt + mortgageBalance;

  const bankLiabilities = plaidAccounts.filter(a => a.type === "credit" || a.type === "loan");
  const bankLiabilitiesTotal = bankLiabilities.reduce((s, a) => s + (a.balance_current ?? 0), 0);
  const [hideZeroLiab, setHideZeroLiab] = useState(true);
  const visibleLiabilities = hideZeroLiab ? bankLiabilities.filter(a => (a.balance_current ?? 0) !== 0) : bankLiabilities;
  const hiddenLiabCount = bankLiabilities.length - visibleLiabilities.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {bankLiabilities.length > 0 && (
        <div className="uf-card" style={{ background: "rgba(220,38,38,0.03)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>💳</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Connected Cards & Loans</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {hiddenLiabCount > 0 || !hideZeroLiab ? (
                <button onClick={() => setHideZeroLiab(h => !h)} style={{ background: "none", border: "none", color: "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  {hideZeroLiab ? `Show $0 (${hiddenLiabCount})` : "Hide $0"}
                </button>
              ) : null}
              {onRefreshAccounts && (
                <button onClick={onRefreshAccounts} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  ↻ Refresh
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {visibleLiabilities.map(a => (
              <div key={a.id} style={{ background: "#fff", border: "1px solid #FCA5A5", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#19181E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>
                  <span style={{ textTransform: "capitalize" }}>{a.subtype?.replace(/-/g, " ") ?? a.type}</span>
                  {a.mask && <span style={{ marginLeft: 6 }}>•••• {a.mask}</span>}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#DC2626", marginTop: 4 }}>{fmtMoney(a.balance_current ?? 0)}</div>
                {a.balance_limit != null && (
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>of {fmtMoney(a.balance_limit)} limit</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(220,38,38,0.2)" }}>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Total from banks</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#991B1B" }}>{fmtMoney(bankLiabilitiesTotal)}</span>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="uf-card">
          <SectionLabel icon="💳" text="Consumer Debt" color="#DC2626" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FieldRow label="Non-Mortgage Debt" hint="Credit cards, auto loans, student loans">
              <NumberInput
                value={totalDebt}
                onChange={setTotalDebt}
                placeholder="0"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </FieldRow>
          </div>
        </div>

        <div className="uf-card">
          <SectionLabel icon="🏠" text="Mortgage" color="#DC2626" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FieldRow label="Mortgage Balance">
              <NumberInput
                value={mortgageBalance}
                onChange={setMortgageBalance}
                placeholder="0"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </FieldRow>
            <FieldRow label="Monthly Payment">
              <NumberInput
                value={mortgageMonthly}
                onChange={setMortgageMonthly}
                placeholder="0"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </FieldRow>
          </div>
        </div>
      </div>

      {totalLiabilities > 0 && (
        <div className="uf-card" style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { label: "Consumer Debt",  val: fmtMoney(totalDebt),           color: "#DC2626" },
              { label: "Mortgage",       val: fmtMoney(mortgageBalance),      color: "#DC2626" },
              { label: "Total Liabilities", val: fmtMoney(totalLiabilities), color: "#19181E" },
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

// ─── Goals Tab ────────────────────────────────────────────────────────────────
const FIRE_GOAL_OPTIONS = [
  { id: "early-retirement", label: "Early Retirement",    icon: "🏖️", desc: "Stop working entirely and live off your portfolio" },
  { id: "coast-fire",       label: "Coast FIRE",          icon: "🚀", desc: "Save enough now, let compound growth carry you" },
  { id: "barista-fire",     label: "Barista FIRE",        icon: "☕", desc: "Part-time income covers expenses, portfolio grows" },
  { id: "fat-fire",         label: "Fat FIRE",            icon: "💎", desc: "Full retirement with a luxury lifestyle buffer" },
];

function GoalsTab({ fireAge, setFireAge, onBack }: { fireAge: number; setFireAge: (v: number) => void; onBack: () => void }) {
  const [goalId, setGoalId] = useState("early-retirement");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
        ← Back to Calculator
      </button>
      <div className="uf-card">
        <SectionLabel icon="🎯" text="FIRE Goal Type" color="#064E3B" />
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
        <SectionLabel icon="🎂" text="Current Age" color="#064E3B" />
        <div style={{ maxWidth: 280 }}>
          <FieldRow label="Your current age" hint="Used to calculate your FIRE date">
            <NumberInput value={fireAge} onChange={setFireAge} placeholder="30" prefix="🎂" />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}

// ─── Simulations Tab ──────────────────────────────────────────────────────────
function SimulationsTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, growthRate, withdrawalRate, displayCurrency, displayRates, onBack }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; growthRate: number; withdrawalRate: number; displayCurrency: string; displayRates: Record<string, number>; onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
        ← Back to Calculator
      </button>
      <div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 700, color: "#19181E", margin: "0 0 4px" }}>Monte Carlo Simulation</h2>
        <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>10,000 randomised market scenarios to estimate your probability of reaching FIRE.</p>
      </div>
      <MonteCarloCard
        income={income} expenses={expenses}
        k401={k401} rothIRA={rothIRA} taxable={taxable} cashSavings={cashSavings}
        growthRate={growthRate} withdrawalRate={withdrawalRate}
        displayCurrency={displayCurrency} displayRates={displayRates}
      />
    </div>
  );
}

// ─── FIRE Calculator Menu Tab ────────────────────────────────────────────────
function FireCalcMenuTab({
  fireAge,
  onOpenGoals,
  onOpenSimulation,
}: {
  fireAge: number;
  onOpenGoals: () => void;
  onOpenSimulation: () => void;
}) {
  const [fireTypeResult, setFireTypeResult] = useState<{ code: string; name: string } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("uf_fire_type_result");
      if (raw) setFireTypeResult(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const tools = [
    {
      icon: "🎯",
      title: "Set Your Goals",
      desc: "Choose your FIRE style — Early Retirement, Coast, Barista, or Fat FIRE — and set your target retirement age.",
      meta: `Target: retire at ${fireAge}`,
      label: "Open Goals →",
      onClick: onOpenGoals,
    },
    {
      icon: "🎲",
      title: "Monte Carlo Simulation",
      desc: "Run 10,000 randomised market scenarios to see your probability of reaching FIRE by your target age.",
      meta: "Stress-test your plan",
      label: "Run Simulation →",
      onClick: onOpenSimulation,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "#19181E", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
          FIRE Calculator
        </h2>
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
          Choose a tool below to model your path to financial independence.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        {tools.map(tool => (
          <div
            key={tool.title}
            style={{
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
              padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <div style={{ fontSize: 48, lineHeight: 1 }}>{tool.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#19181E", fontFamily: "Manrope, sans-serif", marginBottom: 8 }}>
                {tool.title}
              </div>
              <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>
                {tool.desc}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {tool.meta}
            </div>
            <button
              onClick={tool.onClick}
              style={{
                background: "linear-gradient(135deg, #059669, #064E3B)",
                color: "#fff", border: "none", borderRadius: 10,
                padding: "12px 0", fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: "inherit", marginTop: "auto",
              }}
            >
              {tool.label}
            </button>
          </div>
        ))}

        {/* FIRE Type quiz card */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>🧭</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#19181E", fontFamily: "Manrope, sans-serif", marginBottom: 8 }}>
              {fireTypeResult ? "Your FIRE Type" : "FIRE Type Quiz"}
            </div>
            <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>
              {fireTypeResult
                ? "Discover how your personality shapes your path to financial independence."
                : "8 quick questions to discover your FIRE personality — how you naturally think about financial independence."}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {fireTypeResult ? `${fireTypeResult.code} — ${fireTypeResult.name}` : "2 minutes · No login"}
          </div>
          <a
            href={`/fire-type?source=dashboard-fire-calc${fireTypeResult ? `&type=${fireTypeResult.code}` : ""}`}
            style={{
              background: "linear-gradient(135deg, #059669, #064E3B)",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 0", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "inherit", marginTop: "auto",
              textDecoration: "none", textAlign: "center", display: "block",
            }}
          >
            {fireTypeResult ? "View / retake quiz →" : "Find my FIRE Type →"}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Trends Tab (kept for reference, not wired to sidebar) ───────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TrendsTab({ income, expenses, k401, rothIRA, taxable, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, displayCurrency, displayRates }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
  displayCurrency: string; displayRates: Record<string, number>;
}) {
  const [chartTab, setChartTab] = useState<"growth" | "accounts" | "networth">("growth");
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);

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
              <YAxis tickFormatter={v => fmtMoney(v, true)} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip currency={displayCurrency} rates={displayRates} />} />
              {fireYear && <ReferenceLine x={fireYear} stroke="#064E3B" strokeDasharray="4 3" label={{ value: "🔥 FIRE", fill: "#064E3B", fontSize: 10, fontFamily: "Inter" }} />}
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
              <YAxis tickFormatter={v => fmtMoney(v, true)} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip currency={displayCurrency} rates={displayRates} />} />
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
              <YAxis tickFormatter={v => fmtMoney(v, true)} tick={{ fill: "#64748B", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip currency={displayCurrency} rates={displayRates} />} />
              <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
              {fireYear && <ReferenceLine x={fireYear} stroke="#064E3B" strokeDasharray="4 3" label={{ value: "🔥 FIRE", fill: "#064E3B", fontSize: 10, fontFamily: "Inter" }} />}
              <Line type="monotone" dataKey="Net Worth" stroke="#059669" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Debt" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 10 }}>
          {chartTab === "growth" && "Green = investable assets · Dark dashed = FIRE target"}
          {chartTab === "accounts" && "Stacked: 401(k) · Roth IRA · Taxable brokerage"}
          {chartTab === "networth" && "Total net worth vs debt paydown over time"}
        </p>
      </div>
    </div>
  );
}

// ─── Learning Hub Tab ────────────────────────────────────────────────────────
function LearningHubTab({ recommendedStageId }: { recommendedStageId: LearnStageId }) {
  const recommendedStage = LEARNING_STAGES.find(stage => stage.id === recommendedStageId) ?? LEARNING_STAGES[1];
  const resources = [
    { href: `/learn/stages/${recommendedStageId}`, label: `You're likely in: ${recommendedStage.label}`, desc: recommendedStage.whatMattersNow, icon: "🧭" },
    { href: "/learn", label: "Choose your stage", desc: "Use the guided public learning hub instead of starting from a flat article list", icon: "🌱" },
    { href: "/learn/articles", label: "All Articles", desc: "Browse the full library when you want every FIRE guide in one place", icon: "📄" },
    { href: "/learn/topics", label: "Topics", desc: "Browse concepts: 4% rule, tax optimisation, coast FIRE", icon: "📚" },
  ];
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: "#059669", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>Learning Hub</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>Build your knowledge by stage</h2>
        <p style={{ fontSize: 15, color: "#64748B", margin: 0 }}>Start with the stage that fits your progress, then switch anytime if you want broader reading.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {LEARNING_STAGES.map(stage => (
            <Link
              key={stage.id}
              href={`/learn/stages/${stage.id}`}
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 999,
                border: stage.id === recommendedStageId ? "1px solid #047857" : "1px solid #E2E8F0",
                background: stage.id === recommendedStageId ? "rgba(209,250,229,0.45)" : "#ffffff",
                color: stage.id === recommendedStageId ? "#065F46" : "#334155",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {stage.label}
            </Link>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {resources.map(r => (
          <Link key={r.href} href={r.href} style={{ textDecoration: "none" }}>
            <div className="uf-card" style={{ padding: "24px", cursor: "pointer", transition: "box-shadow 0.15s" }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{r.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{r.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar items (flat) ─────────────────────────────────────────────────────
const SIDEBAR_ITEMS: { key: TabKey; label: string; svg: string }[] = [
  {
    key: "overview",
    label: "Overview",
    svg: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  },
  {
    key: "cashflow",
    label: "Cashflow",
    svg: '<path d="M5 17 9 13l3 3 7-7"/><path d="M14 6h5v5"/>',
  },
  {
    key: "assets",
    label: "Assets",
    svg: '<path d="M4 20h16"/><rect x="5" y="10" width="3" height="8"/><rect x="10.5" y="6" width="3" height="12"/><rect x="16" y="13" width="3" height="5"/>',
  },
  {
    key: "liabilities",
    label: "Liabilities",
    svg: '<circle cx="12" cy="12" r="8"/><path d="M14 9.5c-.5-.6-1.5-1-2.5-1-1.5 0-2.5.8-2.5 2s1 1.6 2.5 1.9c1.5.3 2.5.9 2.5 2 0 1.3-1.1 2.1-2.5 2.1-1 0-2-.4-2.5-1M12 7v1M12 16.5v1"/>',
  },
  {
    key: "fire-calculator",
    label: "FIRE Calculator",
    svg: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3.5" rx="0.5"/><circle cx="9" cy="13" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="0.6" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="0.6" fill="currentColor" stroke="none"/><circle cx="9" cy="16" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"/><circle cx="15" cy="16" r="0.6" fill="currentColor" stroke="none"/>',
  },
  {
    key: "reports",
    label: "Reports",
    svg: '<path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13l2 2 4-4"/>',
  },
  {
    key: "learning-hub",
    label: "Learning Hub",
    svg: '<path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12"/><path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"/><path d="M9 10h6M9 14h4"/>',
  },
  {
    key: "profile",
    label: "Profile",
    svg: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  },
];

// ─── Root ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [cashflowSubTab, setCashflowSubTab] = useState<"cashflow" | "categories" | "recurring" | "budgets">("cashflow");
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [fireCalcSubTab, setFireCalcSubTab] = useState<"menu" | "goals" | "simulation">("menu");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradedBanner, setUpgradedBanner] = useState(false);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  // Read initial tab from URL query string (e.g. ?tab=cashflow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as TabKey | null;
    const valid: TabKey[] = [
      "overview", "cashflow", "assets", "liabilities",
      "fire-calculator", "reports", "learning-hub", "profile",
    ];
    if (t && valid.includes(t)) setTab(t);
    if (params.get("upgraded") === "true") {
      const sessionId = params.get("session_id");
      setUpgradedBanner(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("upgraded");
      url.searchParams.delete("session_id");
      window.history.replaceState(null, "", url.toString());

      if (sessionId) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          fetch("/api/stripe/sync-subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ session_id: sessionId }),
          }).catch(() => { /* best-effort */ });
        });
      }
    }
  }, []);

  // Keep URL in sync so bookmarks / back-button work
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  // Refresh Plaid account balances whenever the user navigates to assets/liabilities
  useEffect(() => {
    if (tab === "assets" || tab === "liabilities") {
      refreshPlaidAccounts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Budget state
  const [income,   setIncome]   = useState(0);
  const [expenses, setExpenses] = useState<Expenses>({ housing: 0, food: 0, transport: 0, subscriptions: 0, healthcare: 0, entertainment: 0, other: 0 });

  // FIRE profile state (stored in expenses._fire_profile to avoid schema changes)
  const [fireAge,         setFireAge]         = useState(30);
  const [k401,            setK401]            = useState(0);
  const [rothIRA,         setRothIRA]         = useState(0);
  const [taxable,         setTaxable]         = useState(0);
  const [cashSavings,     setCashSavings]     = useState(0);
  const [totalDebt,       setTotalDebt]       = useState(0);
  const [mortgageBalance, setMortgageBalance] = useState(0);
  const [mortgageMonthly, setMortgageMonthly] = useState(0);
  const [growthRate,      setGrowthRate]      = useState(0.07);
  const [withdrawalRate,  setWithdrawalRate]  = useState(0.04);
  const [cityName,        setCityName]        = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const suggestedLearnStage = useMemo<LearnStageId>(() => {
    const investable = k401 + rothIRA + taxable + cashSavings;
    const monthlyExpenses = Object.entries(expenses)
      .filter(([key]) => !key.startsWith("_"))
      .reduce((sum, [, amount]) => sum + (amount || 0), 0);
    const { fireYear, fireTarget } = calcProjection({
      annualIncome: income * 12,
      monthlyExpenses,
      k401,
      rothIRA,
      taxable,
      cashSavings,
      totalDebt,
      mortgageBalance,
      mortgageMonthly,
      growthRate,
      withdrawalRate,
    });
    const progress = fireTarget > 0 ? (investable / fireTarget) * 100 : 0;

    if (progress >= 85 || (fireYear !== null && fireYear <= 5)) return "living-in-fire";
    if (progress >= 45 || (fireYear !== null && fireYear <= 12)) return "approaching-fire";
    if (investable > 0 || income > 0) return "building-momentum";
    return "starting-out";
  }, [cashSavings, expenses, growthRate, income, k401, mortgageBalance, mortgageMonthly, rothIRA, taxable, totalDebt, withdrawalRate]);
  const [rawActuals, setRawActuals] = useState<{ category: string; amount: number; currency: string; transaction_type?: string }[]>([]);
  const [rawPrevActuals, setRawPrevActuals] = useState<{ category: string; amount: number; currency: string; transaction_type?: string }[]>([]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const actuals = useMemo(() => {
    const agg: Record<string, number> = {};
    rawActuals
      .filter(e => !e.transaction_type || e.transaction_type === "expense")
      .forEach(e => { agg[e.category] = (agg[e.category] || 0) + toUSD(e.amount, e.currency, rates); });
    return agg;
  }, [rawActuals, rates]);
  const actualIncome = useMemo(
    () => rawActuals
      .filter(e => e.transaction_type === "income")
      .reduce((s, e) => s + toUSD(e.amount, e.currency, rates), 0),
    [rawActuals, rates]
  );
  const actualExpenses = useMemo(
    () => rawActuals
      .filter(e => e.transaction_type === "expense")
      .reduce((s, e) => s + toUSD(e.amount, e.currency, rates), 0),
    [rawActuals, rates]
  );
  const prevIncome = useMemo(
    () => rawPrevActuals
      .filter(e => e.transaction_type === "income")
      .reduce((s, e) => s + toUSD(e.amount, e.currency, rates), 0),
    [rawPrevActuals, rates]
  );
  const prevExpenses = useMemo(
    () => rawPrevActuals
      .filter(e => e.transaction_type === "expense")
      .reduce((s, e) => s + toUSD(e.amount, e.currency, rates), 0),
    [rawPrevActuals, rates]
  );
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoaded   = useRef(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD")
      .then(r => r.json())
      .then(d => { if (d.rates) setRates(d.rates); })
      .catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }

      setUserId(session.user.id);
      setUserEmail(session.user.email ?? "");

      supabase
        .from("profiles")
        .select("default_currency")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile?.default_currency) setDefaultCurrency(profile.default_currency);
        });

      // Fetch user display name
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const name = (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "";
          setUserName(name);
        }
      });

      // Fetch current-month and previous-month actuals
      // Use gte/lt instead of LIKE — more reliable on PostgreSQL date columns
      const nowD = new Date();
      const thisStart = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonthD = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1);
      const thisEnd = `${nextMonthD.getFullYear()}-${String(nextMonthD.getMonth() + 1).padStart(2, '0')}-01`;
      const prevD = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
      const prevStart = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}-01`;

      supabase.from("expenses").select("category, amount, currency, transaction_type")
        .eq("user_id", session.user.id)
        .gte("date", thisStart)
        .lt("date", thisEnd)
        .then(({ data: expData }) => {
          if (expData) {
            setRawActuals(expData.map(e => ({ category: e.category, amount: e.amount, currency: e.currency ?? "USD", transaction_type: e.transaction_type ?? "expense" })));
          }
        });

      supabase.from("expenses").select("category, amount, currency, transaction_type")
        .eq("user_id", session.user.id)
        .gte("date", prevStart)
        .lt("date", thisStart)
        .then(({ data: prevData }) => {
          if (prevData) {
            setRawPrevActuals(prevData.map(e => ({ category: e.category, amount: e.amount, currency: e.currency ?? "USD", transaction_type: e.transaction_type ?? "expense" })));
          }
        });

      // Fetch Plaid account balances
      fetch("/api/plaid/accounts", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(r => r.ok ? r.json() : null).then(d => {
        if (d?.accounts) setPlaidAccounts(d.accounts);
      }).catch(() => {});

      supabase.from("user_budget").select("*").eq("user_id", session.user.id).single().then(({ data }) => {
        // Consume calculator wizard prefill (written by landing page before login redirect)
        let prefill: import("@/lib/journey").CalculatorPrefill = {};
        try {
          const raw = localStorage.getItem("uf_calc_prefill");
          if (raw) { prefill = JSON.parse(raw); localStorage.removeItem("uf_calc_prefill"); }
        } catch {}
        const prefillIncome = prefill.monthlyIncome ?? prefill.income;

        if (data) {
          setIncome(prefillIncome || data.income || 0);
          const raw = data.expenses || {};
          const fp  = raw._fire_profile || {};
          const { _fire_profile: _, ...budgetExpenses } = raw;
          const mergedExpenses = { housing: 0, food: 0, transport: 0, subscriptions: 0, healthcare: 0, entertainment: 0, other: 0, ...budgetExpenses };
          setExpenses(mergedExpenses);
          // Apply wizard spend estimate only when existing budget is all-zero
          const hasAnyExpense = Object.values(mergedExpenses).some(v => (v as number) > 0);
          if (!hasAnyExpense && prefill.monthlySpendEstimate) {
            setExpenses(prev => ({ ...prev, other: prefill.monthlySpendEstimate! }));
          }
          setFireAge(data.fire_age || 30);
          setK401(fp.k401 || data.fire_assets || 0);
          setRothIRA(fp.rothIRA || 0);
          setTaxable(fp.taxable || 0);
          // Seed cashSavings from wizard portfolio balance when no existing data
          setCashSavings(fp.cashSavings || (prefill.portfolioBalance && prefill.portfolioBalance > 0 ? prefill.portfolioBalance : 0));
          setTotalDebt(fp.totalDebt || 0);
          setMortgageBalance(fp.mortgageBalance || 0);
          setMortgageMonthly(fp.mortgageMonthly || 0);
          setGrowthRate(fp.growthRate || 0.07);
          setWithdrawalRate(fp.withdrawalRate || 0.04);
          setCityName(fp.cityName || prefill.cityName || "");
        } else {
          // New user — no saved budget yet, seed everything from wizard
          if (prefillIncome) setIncome(prefillIncome);
          if (prefill.monthlySpendEstimate) setExpenses(prev => ({ ...prev, other: prefill.monthlySpendEstimate! }));
          if (prefill.currentAge) setFireAge(prefill.currentAge);
          if (prefill.cityName) setCityName(prefill.cityName);
          if (prefill.portfolioBalance && prefill.portfolioBalance > 0) setCashSavings(prefill.portfolioBalance);
        }
        isLoaded.current = true;
        setProfileLoading(false);
      });
    });
  }, []);

  // Warn if user closes the tab while a save is in flight
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === "saving") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveStatus]);

  // Auto-save with 1s debounce
  useEffect(() => {
    if (!isLoaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const fireProfile = { k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, cityName };
      const { error: saveError } = await supabase.from("user_budget").upsert({
        user_id:     session.user.id,
        income,
        expenses:    { ...expenses, _fire_profile: fireProfile },
        fire_age:    fireAge,
        fire_assets: k401, // keep backwards-compatible
        updated_at:  new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (saveError) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    }, 1000);
  }, [income, expenses, fireAge, k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, cityName]);

  async function refreshPlaidAccounts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const r = await fetch("/api/plaid/accounts", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => null);
    if (!r?.ok) return;
    const d = await r.json().catch(() => null);
    if (d?.accounts) setPlaidAccounts(d.accounts);
  }

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

        .uf-sidebar-logo { padding: 22px 20px 20px; font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 800; color: #064E3B; letter-spacing: -0.04em; text-decoration: none; display: block; border-bottom: 1px solid #E2E8F0; }
        .uf-sidebar-logo span { color: #20D4BF; }
        .uf-sidebar-nav { padding: 16px 10px 4px; display: flex; flex-direction: column; gap: 2px; }
        .uf-sidebar-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #64748B; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; background: transparent; width: 100%; text-align: left; font-family: 'Manrope', sans-serif; }
        .uf-sidebar-item:hover { background: rgba(226,232,240,0.5); color: #1E3A2F; }
        .uf-sidebar-item.active { background: rgba(209,250,229,0.5); border-color: #047857; color: #065F46; }
        .uf-sidebar-icon { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: inherit; }
        .uf-sidebar-bottom { margin-top: auto; padding: 14px 16px; border-top: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 8px; }

        select option { background: #ffffff; }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

        @media(max-width: 900px) {
          .uf-sidebar { width: 196px; }
          .uf-content { padding: 20px 20px 48px; }
        }
        @media(max-width: 640px) {
          .uf-shell { flex-direction: column; }
          .uf-sidebar { width: 100%; min-height: unset; height: auto; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; flex-direction: row; border-right: none; border-top: 1px solid #E2E8F0; background: #fff; padding: 0; }
          .uf-sidebar-logo { display: none; }
          .uf-sidebar-nav { flex-direction: row; padding: 4px 0; gap: 0; flex: 1; justify-content: space-around; }
          .uf-sidebar-item { flex-direction: column; padding: 6px 4px; font-size: 9px; gap: 2px; flex: 1; justify-content: center; align-items: center; border-radius: 0; min-width: 0; }
          .uf-sidebar-bottom { display: none; }
          .uf-content { padding: 16px 14px 80px; }
        }
      `}</style>

      <div className="uf-shell">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="uf-sidebar">
          <Link href="/" className="uf-sidebar-logo"><Logo variant="light" size={26} /></Link>

          <nav className="uf-sidebar-nav">
            {SIDEBAR_ITEMS.map(item => (
              <button
                key={item.key}
                className={`uf-sidebar-item ${tab === item.key ? "active" : ""}`}
                onClick={() => { setTab(item.key); if (item.key !== "fire-calculator") setFireCalcSubTab("menu"); }}
              >
                <span className="uf-sidebar-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: item.svg }} />
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="uf-sidebar-bottom">
            {saveStatus === "saving" && <span style={{ color: "#64748B", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Saving…</span>}
            {saveStatus === "saved"  && <span style={{ color: "#059669", fontSize: 12, fontFamily: "Inter, sans-serif" }}>✓ Saved</span>}
            {saveStatus === "error"  && <span style={{ color: "#dc2626", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Save failed</span>}
            <UserNav />
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="uf-main">
          <div className="uf-content">
            {upgradedBanner && (
              <div style={{
                background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10,
                padding: "12px 18px", marginBottom: 16,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 14, color: "#065F46", fontWeight: 600 }}>
                  🎉 Welcome to Pro! Your bank connections are now unlimited.
                </span>
                <button
                  onClick={() => setUpgradedBanner(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#065F46", fontSize: 20, lineHeight: 1 }}
                >×</button>
              </div>
            )}
            {tab === "overview" && (
              <DashTab
                income={income} expenses={expenses}
                k401={k401} rothIRA={rothIRA} taxable={taxable} cashSavings={cashSavings}
                totalDebt={totalDebt} mortgageBalance={mortgageBalance}
                mortgageMonthly={mortgageMonthly} growthRate={growthRate}
                withdrawalRate={withdrawalRate}
                actuals={actuals}
                actualIncome={actualIncome}
                actualExpenses={actualExpenses}
                cityName={cityName}
                prevIncome={prevIncome}
                prevExpenses={prevExpenses}
                userName={userName}
                displayCurrency={defaultCurrency}
                displayRates={rates}
                onTabChange={setTab}
              />
            )}
            {tab === "cashflow" && (
              <div>
                {/* Cashflow sub-tab nav */}
                <div style={{ display: "flex", gap: 28, borderBottom: "1px solid #E2E8F0", marginBottom: 28 }}>
                  {(["cashflow", "categories", "recurring", "budgets"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setCashflowSubTab(t); if (t === "categories") setCategoriesKey(k => k + 1); }}
                      style={{
                        background: "none", border: "none", padding: "0 0 14px",
                        fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        letterSpacing: "-0.3px", marginBottom: -1,
                        color: cashflowSubTab === t ? "#047857" : "#64748B",
                        borderBottom: `2px solid ${cashflowSubTab === t ? "#047857" : "transparent"}`,
                      }}
                    >
                      {t === "cashflow" ? "Cashflow" : t === "categories" ? "Categories" : t === "recurring" ? "Recurring" : "Budgets"}
                    </button>
                  ))}
                </div>
                {cashflowSubTab === "cashflow" && <TransactionsTab defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} onUpgradeClick={() => setUpgradeOpen(true)} />}
                {cashflowSubTab === "categories" && <CategoriesTab key={categoriesKey} displayCurrency={defaultCurrency} displayRates={rates} />}
                {cashflowSubTab === "recurring" && <RecurringTab defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} />}
                {cashflowSubTab === "budgets" && (
                  <BudgetTab income={income} setIncome={setIncome} expenses={expenses} setExpenses={setExpenses} actuals={actuals} displayCurrency={defaultCurrency} displayRates={rates} />
                )}
              </div>
            )}
            {tab === "assets" && profileLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[180, 120, 120].map((h, i) => (
                  <div key={i} style={{ background: "#E2E8F0", borderRadius: 16, height: h, animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            )}
            {tab === "assets" && !profileLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <PortfolioOverviewTab
                  income={income} expenses={expenses}
                  k401={k401} rothIRA={rothIRA} taxable={taxable} cashSavings={cashSavings}
                  totalDebt={totalDebt} mortgageBalance={mortgageBalance}
                  mortgageMonthly={mortgageMonthly} growthRate={growthRate}
                  withdrawalRate={withdrawalRate}
                  displayCurrency={defaultCurrency}
                  displayRates={rates}
                  plaidAccounts={plaidAccounts}
                />
                <div style={{ borderTop: "1px solid #E2E8F0" }} />
                <AssetsTab
                  k401={k401} setK401={setK401}
                  rothIRA={rothIRA} setRothIRA={setRothIRA}
                  taxable={taxable} setTaxable={setTaxable}
                  cashSavings={cashSavings} setCashSavings={setCashSavings}
                  growthRate={growthRate} setGrowthRate={setGrowthRate}
                  withdrawalRate={withdrawalRate} setWithdrawalRate={setWithdrawalRate}
                  actualNetCashflow={actualIncome - actualExpenses}
                  displayCurrency={defaultCurrency}
                  displayRates={rates}
                  plaidAccounts={plaidAccounts}
                  onRefreshAccounts={refreshPlaidAccounts}
                />
              </div>
            )}
            {tab === "liabilities" && profileLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[100, 100].map((h, i) => (
                  <div key={i} style={{ background: "#E2E8F0", borderRadius: 16, height: h, animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            )}
            {tab === "liabilities" && !profileLoading && (
              <LiabilitiesTab
                totalDebt={totalDebt} setTotalDebt={setTotalDebt}
                mortgageBalance={mortgageBalance} setMortgageBalance={setMortgageBalance}
                mortgageMonthly={mortgageMonthly} setMortgageMonthly={setMortgageMonthly}
                displayCurrency={defaultCurrency}
                displayRates={rates}
                plaidAccounts={plaidAccounts}
                onRefreshAccounts={refreshPlaidAccounts}
              />
            )}
            {tab === "fire-calculator" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {fireCalcSubTab === "menu" && (
                  <FireCalcMenuTab
                    fireAge={fireAge}
                    onOpenGoals={() => setFireCalcSubTab("goals")}
                    onOpenSimulation={() => setFireCalcSubTab("simulation")}
                  />
                )}
                {fireCalcSubTab === "goals" && (
                  <GoalsTab
                    fireAge={fireAge} setFireAge={setFireAge}
                    onBack={() => setFireCalcSubTab("menu")}
                  />
                )}
                {fireCalcSubTab === "simulation" && (
                  <SimulationsTab
                    income={income} expenses={expenses}
                    k401={k401} rothIRA={rothIRA} taxable={taxable} cashSavings={cashSavings}
                    growthRate={growthRate} withdrawalRate={withdrawalRate}
                    displayCurrency={defaultCurrency}
                    displayRates={rates}
                    onBack={() => setFireCalcSubTab("menu")}
                  />
                )}
              </div>
            )}
            {tab === "reports" && <ReportsTab displayCurrency={defaultCurrency} displayRates={rates} />}
            {tab === "learning-hub" && <LearningHubTab recommendedStageId={suggestedLearnStage} />}
            {tab === "profile" && userId && (
              <ProfileTab userId={userId} userEmail={userEmail} defaultCurrency={defaultCurrency} onDefaultCurrencyChange={setDefaultCurrency} onTabChange={setTab} />
            )}
          </div>
        </main>
      </div>
      <FeedbackWidget />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
