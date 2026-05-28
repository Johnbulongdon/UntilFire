"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
  BarChart, Bar, ComposedChart, Area,
} from "recharts";
import TransactionsTab from "./TransactionsTab";
import PlaidConnect from "./PlaidConnect";
import UpgradeModal from "./UpgradeModal";
import TourModal from "./TourModal";
import CategoriesTab from "./CategoriesTab";
import RecurringTab from "./RecurringTab";
import ReportsTab from "./ReportsTab";
import ProfileTab from "./ProfileTab";
import Logo from "@/app/components/Logo";
import FeedbackWidget from "./FeedbackWidget";
import { monteCarloFIRE } from "@/lib/fire";
import { FALLBACK_RATES, convertUSDAmount, formatUSDInCurrency, getCurrencySymbol } from "@/lib/currency";
import { CITIES } from "@/lib/fire-data";
import { trackDashboardFirstView } from "@/lib/analytics";

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
  apy: number | null;
};
type PlaidHolding = {
  account_id: string;
  security_id: string;
  quantity: number;
  institution_price: number | null;
  institution_value: number | null;
  cost_basis: number | null;
  iso_currency_code: string | null;
};
type PlaidSecurity = {
  security_id: string;
  name: string | null;
  ticker_symbol: string | null;
  type: string | null;
};
type TabKey =
  | "overview"
  | "cashflow"
  | "assets"
  | "liabilities"
  | "fire-calculator"
  | "goals"
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
  targetMonthlyExpenses,
}: {
  annualIncome: number; monthlyExpenses: number; k401: number;
  rothIRA: number; taxable: number; cashSavings?: number; totalDebt: number;
  mortgageBalance: number; mortgageMonthly: number;
  growthRate?: number; withdrawalRate?: number; years?: number;
  targetMonthlyExpenses?: number;
}) {
  const annualExpenses       = monthlyExpenses * 12;
  const targetAnnualExpenses = targetMonthlyExpenses != null ? targetMonthlyExpenses * 12 : annualExpenses;
  const annualMortgage = mortgageMonthly * 12;
  const annualSavings  = annualIncome - annualExpenses - annualMortgage;
  const fireTarget     = targetAnnualExpenses * (1 / withdrawalRate);

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


function SectionLabel({ icon, text, color = "#064E3B" }: { icon: string; text: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 11, color, letterSpacing: "1px", textTransform: "uppercase" }}>{text}</span>
    </div>
  );
}

// ─── Monte Carlo Probability Card ─────────────────────────────────────────────
function MonteCarloCard({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, growthRate, withdrawalRate, displayCurrency, displayRates, onOpenBudgets, onOpenProfile }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; growthRate: number; withdrawalRate: number;
  displayCurrency: string; displayRates: Record<string, number>;
  onOpenBudgets?: () => void; onOpenProfile?: () => void;
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
        <div style={{ fontSize: 30, marginBottom: 10 }}>🎲</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#064E3B", margin: "0 0 8px", fontFamily: "Manrope, sans-serif" }}>
          Add your monthly basics first
        </h3>
        <p style={{ color: "#64748B", fontSize: 14, margin: "0 auto 18px", lineHeight: 1.6, maxWidth: 460 }}>
          Monte Carlo needs your income and monthly expenses before it can estimate your FIRE success probability. Add those in <strong>Cashflow → Budgets</strong>, then keep your FIRE age and goal settings in <strong>Profile</strong>.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onOpenBudgets} style={{ background: "#047857", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Add budget basics →
          </button>
          <button onClick={onOpenProfile} style={{ background: "#F0FDF4", color: "#047857", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Open Profile setup →
          </button>
        </div>
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
function DashTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, actuals: _actuals = {}, actualIncome = 0, actualExpenses = 0, cityName = "", prevIncome = 0, prevExpenses = 0, userName = "", displayCurrency, displayRates, plaidAccounts = [], retirementCityName = "", retirementCityCol = 0, lifestyleMultiplier = 1.0, fireAge = 0, nwSnapshots = [], onTabChange, onOpenOnboarding }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
  actuals?: Record<string, number>; actualIncome?: number; actualExpenses?: number; cityName?: string;
  prevIncome?: number; prevExpenses?: number; userName?: string;
  displayCurrency: string; displayRates: Record<string, number>;
  plaidAccounts?: PlaidAccount[];
  retirementCityName?: string; retirementCityCol?: number; lifestyleMultiplier?: number;
  fireAge?: number;
  nwSnapshots?: { portfolio_value: number; captured_at: string }[];
  onTabChange?: (tab: TabKey) => void;
  onOpenOnboarding?: () => void;
}) {
  const [chartPeriod, setChartPeriod] = useState<"5Y" | "15Y" | "All">("15Y");
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);

  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const targetMonthlyExpenses = retirementCityCol > 0
    ? (retirementCityCol * lifestyleMultiplier) / 12
    : undefined;

  const plaidAssets = plaidAccounts
    .filter(a => a.type === "depository" || a.type === "investment")
    .reduce((s, a) => s + (a.balance_current ?? 0), 0);
  const totalCash = cashSavings + plaidAssets;

  const { data, fireYear, fireTarget, annualSavings } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, cashSavings: totalCash, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate, targetMonthlyExpenses,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, totalCash, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses]);

  const nextMoveScenarios = useMemo(() => {
    if (!(income > 0 && fireYear !== null)) return null;
    return [
      {
        label: "Save $500/mo more",
        detail: "Redirect $500/month from spending to investments",
        result: calcProjection({ annualIncome: income * 12, monthlyExpenses: Math.max(0, monthlyExpenses - 500), k401, rothIRA, taxable, cashSavings: totalCash, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses }),
      },
      {
        label: "Cut expenses 10%",
        detail: `Reduce monthly spending from spending to ${Math.round(monthlyExpenses * 0.9).toLocaleString()}`,
        result: calcProjection({ annualIncome: income * 12, monthlyExpenses: monthlyExpenses * 0.9, k401, rothIRA, taxable, cashSavings: totalCash, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses }),
      },
      {
        label: "Grow income 10%",
        detail: "Raise, side income, or freelance — all goes straight to your FIRE date",
        result: calcProjection({ annualIncome: income * 1.1 * 12, monthlyExpenses, k401, rothIRA, taxable, cashSavings: totalCash, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses }),
      },
    ]
      .map(s => ({
        label: s.label,
        detail: s.detail,
        deltaYears: s.result.fireYear !== null ? Math.max(0, fireYear! - s.result.fireYear) : 0,
        newRetireYear: s.result.fireYear !== null ? new Date().getFullYear() + s.result.fireYear : null,
      }))
      .sort((a, b) => b.deltaYears - a.deltaYears);
  }, [income, monthlyExpenses, fireYear, k401, rothIRA, taxable, totalCash, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses]);

  const investable  = k401 + rothIRA + taxable + totalCash;
  const savingsRate = income > 0 ? ((annualSavings / 12) / income) * 100 : 0;
  const progress    = fireTarget > 0 ? Math.min(100, (investable / fireTarget) * 100) : 0;
  const rawChartData = data.slice(0, Math.min(data.length, (fireYear ?? 30) + 6));
  // S&P 500 benchmark + actual portfolio history blended with projection
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();

    // Group snapshots by calendar year (relative to today), keep last value per year
    const snapByRelYear: Record<number, number> = {};
    for (const snap of nwSnapshots) {
      const relYear = new Date(snap.captured_at).getFullYear() - currentYear;
      if (relYear < 0) snapByRelYear[relYear] = snap.portfolio_value;
    }
    const pastEntries = Object.entries(snapByRelYear)
      .map(([yr, val]) => ({ year: Number(yr), Actual: val } as Record<string, number>))
      .sort((a, b) => a.year - b.year);

    // Future projection (year 0 onward) with S&P 500 benchmark
    let sp = investable;
    const annualSav = Math.max(annualSavings, 0);
    const futureEntries = rawChartData.map((d, i) => {
      const spVal = Math.round(sp);
      sp = sp * 1.10 + annualSav;
      const entry: Record<string, number> = { ...d, "S&P 500": spVal };
      if (i === 0) entry.Actual = investable; // "you are here" marker at year 0
      return entry;
    });

    return [...pastEntries, ...futureEntries];
  }, [rawChartData, investable, annualSavings, nwSnapshots]);
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

      {/* ── Setup checklist ─────────────────────────────────────────────── */}
      <SetupChecklist
        income={income} expenses={expenses}
        k401={k401} rothIRA={rothIRA} taxable={taxable} cashSavings={cashSavings}
        cityName={cityName}
        plaidAccounts={plaidAccounts}
        onTabChange={onTabChange}
        onOpenOnboarding={onOpenOnboarding}
      />

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
      <div className="uf-card uf-hero-split" style={{ padding: 0, overflow: "hidden", display: "flex", minHeight: 180 }}>
        {/* Left: white side — FIRE year + 3 mini-stat boxes */}
        <div className="uf-hero-left" style={{ flex: "0 0 55%", padding: "28px 32px", background: "#FFFFFF" }}>
          <div style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", letterSpacing: "1.2px", textTransform: "uppercase", color: "#64748B", fontWeight: 700, marginBottom: 8 }}>
            FIRE Target Year
          </div>
          {retireYear ? (
            <>
              <div style={{ fontSize: "clamp(48px, 7vw, 72px)", fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-4px", lineHeight: 1 }}>
                {retireYear}
              </div>
              {retirementCityName && (
                <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, fontFamily: "Inter, sans-serif", marginTop: 4 }}>
                  🎯 {retirementCityName} · {LIFESTYLE_TIERS.find(t => t.multiplier === lifestyleMultiplier)?.label ?? "Standard"}
                </div>
              )}
              {/* 3 mini-stat boxes */}
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", flex: "1 1 0", minWidth: 90 }}>
                  <div style={{ fontSize: 9, fontFamily: "Manrope, sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8", fontWeight: 700, marginBottom: 4 }}>Years Remaining</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", fontFamily: "Inter, sans-serif" }}>{fireYear} yr</div>
                  {fireAge > 0 && <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Inter, sans-serif", marginTop: 2 }}>age {fireAge + (fireYear ?? 0)}</div>}
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
              <button
                onClick={() => onOpenOnboarding?.()}
                style={{ marginTop: 12, background: "#064E3B", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}
              >
                Get my FIRE number →
              </button>
            </>
          )}
        </div>

        {/* Right: dark side — Target + progress bar */}
        <div className="uf-hero-right" style={{ flex: "0 0 45%", padding: "28px 32px", background: "#003527", position: "relative", overflow: "hidden" }}>
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
            <div className="uf-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
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

      {/* ── Next Move: Highest-Impact Acceleration Card ──────────────────── */}
      {nextMoveScenarios && nextMoveScenarios.length > 0 && (() => {
        const [best, ...rest] = nextMoveScenarios;
        const fmtAccel = (yrs: number) =>
          yrs >= 2 ? `${yrs.toFixed(1)} years sooner` : `${Math.round(yrs * 12)} months sooner`;
        return (
          <div className="uf-card" style={{ border: "1.5px solid rgba(5,150,105,0.3)", background: "linear-gradient(135deg, rgba(5,150,105,0.03) 0%, #fff 100%)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#059669", marginBottom: 12, fontFamily: "Manrope, sans-serif" }}>
              Your Highest-Impact Move
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", marginBottom: 4 }}>{best.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{best.detail}</div>
              </div>
              {best.deltaYears > 0 && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px" }}>{fmtAccel(best.deltaYears)}</div>
                  {best.newRetireYear && retireYear && (
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, fontFamily: "Inter, sans-serif" }}>retire in {best.newRetireYear} vs {retireYear}</div>
                  )}
                </div>
              )}
            </div>
            {rest.filter(s => s.deltaYears > 0).slice(0, 2).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #F1F5F9", paddingTop: 10, marginTop: 10 }}>
                <span style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.08)", borderRadius: 20, padding: "3px 10px", fontFamily: "Inter, sans-serif" }}>
                  {fmtAccel(s.deltaYears)}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

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

        <style>{`@keyframes uf-chart-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div key={chartPeriod} style={{ animation: "uf-chart-enter 0.4s ease-out both" }}>
        <ResponsiveContainer width="100%" height={268}>
          <ComposedChart data={periodData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22d3a5" stopOpacity={0.38} />
                <stop offset="55%"  stopColor="#22d3a5" stopOpacity={0.10} />
                <stop offset="100%" stopColor="#22d3a5" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis
              dataKey="year"
              tickFormatter={v => String(new Date().getFullYear() + (v as number))}
              tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={v => fmtMoney(v, true)} tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              animationDuration={150}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const actual    = payload.find(p => p.dataKey === "Actual")?.value as number | undefined;
                const portfolio = (payload.find(p => p.dataKey === "Investable")?.value as number) ?? 0;
                const sp        = (payload.find(p => p.dataKey === "S&P 500")?.value as number) ?? 0;
                const crossed   = (actual ?? portfolio) >= fireTarget;
                const calYear   = new Date().getFullYear() + (label as number);
                return (
                  <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontFamily: "Inter, sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", transition: "opacity 0.15s ease" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: "#F8FAFC" }}>{calYear}</div>
                    {actual !== undefined && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "inline-block" }} />
                        Actual: {fmtMoney(actual, true)}{crossed ? " ✓" : ""}
                      </div>
                    )}
                    {portfolio > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#22d3a5" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3a5", display: "inline-block" }} />
                        Projected: {fmtMoney(portfolio, true)}{!actual && crossed ? " ✓" : ""}
                      </div>
                    )}
                    {sp > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f97316", marginTop: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
                        S&amp;P 500: {fmtMoney(sp, true)}
                      </div>
                    )}
                    <div style={{ color: "#64748B", marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 6 }}>
                      FIRE target: {fmtMoney(fireTarget, true)}
                    </div>
                  </div>
                );
              }}
            />
            {/* Horizontal FIRE target line */}
            <ReferenceLine y={fireTarget} stroke="#059669" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: "FIRE target", position: "insideTopRight", fontSize: 10, fill: "#059669", fontWeight: 700, fontFamily: "Inter" }} />
            {/* Vertical FIRE year line */}
            {fireYear && <ReferenceLine x={fireYear} stroke="#22d3a5" strokeDasharray="4 3" strokeWidth={1.5} />}
            {/* Actual portfolio history — solid white line up to today */}
            <Line type="monotone" dataKey="Actual" stroke="rgba(255,255,255,0.85)" strokeWidth={2} connectNulls={false} dot={{ r: 4, fill: "#22d3a5", stroke: "rgba(255,255,255,0.85)", strokeWidth: 1.5 }} activeDot={{ r: 5, fill: "#22d3a5" }} isAnimationActive animationBegin={0} animationDuration={900} animationEasing="ease-out" />
            {/* Projected portfolio area — teal gradient into the future */}
            <Area type="monotone" dataKey="Investable" stroke="#22d3a5" strokeWidth={2.5} fill="url(#portfolioGrad)" dot={false} activeDot={{ r: 5, fill: "#22d3a5" }} isAnimationActive animationBegin={200} animationDuration={1300} animationEasing="ease-out" />
            {/* S&P 500 benchmark — staggered after the area */}
            <Line type="monotone" dataKey="S&P 500" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 5, fill: "#f97316" }} isAnimationActive animationBegin={500} animationDuration={950} animationEasing="ease-out" />
          </ComposedChart>
        </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              <span style={{ width: 20, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.75)", display: "inline-block", flexShrink: 0 }} /> Actual
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              <span style={{ width: 20, height: 3, borderRadius: 2, background: "#22d3a5", display: "inline-block", flexShrink: 0 }} /> Projected (7% real)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              <span style={{ width: 20, height: 2, borderRadius: 1, background: "#f97316", display: "inline-block", flexShrink: 0, opacity: 0.7 }} /> S&amp;P 500 (10% nominal)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              <span style={{ width: 20, height: 2, borderRadius: 1, background: "#059669", display: "inline-block", flexShrink: 0, opacity: 0.7 }} /> FIRE target
            </span>
          </div>
          {retireYear && (
            <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif", textAlign: "right" }}>
              Projected freedom: <span style={{ color: "#22d3a5", fontWeight: 600 }}>{retireYear}</span>
              {fireYear && <span style={{ color: "#94A3B8" }}> · {fireAge > 0 ? `age ${fireAge + fireYear}` : `yr ${fireYear}`}</span>}
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

// ─── Survey Modal ─────────────────────────────────────────────────────────────
type SurveyResponses = {
  satisfaction: number | null;
  featuresUsed: string[];
  missing: string | null;
  missingOther: string;
  recommend: string | null;
  notes: string;
};

const SURVEY_FEATURES = [
  "FIRE Calculator",
  "Expense Tracking",
  "Bank Sync",
  "Retirement Target Planner",
  "Learning Hub",
];

const SURVEY_MISSING = [
  "Better budgeting tools",
  "More city / cost-of-living data",
  "AI-powered advice",
  "Mobile app",
  "Faster bank sync",
  "Other",
];

function SurveyModal({ onSubmit, onDismiss }: {
  onSubmit: (r: SurveyResponses) => Promise<void>;
  onDismiss: () => void;
}) {
  const [satisfaction, setSatisfaction]   = useState<number | null>(null);
  const [hovered,      setHovered]        = useState<number | null>(null);
  const [featuresUsed, setFeaturesUsed]   = useState<string[]>([]);
  const [missing,      setMissing]        = useState<string | null>(null);
  const [missingOther, setMissingOther]   = useState("");
  const [recommend,    setRecommend]      = useState<string | null>(null);
  const [notes,        setNotes]          = useState("");
  const [submitting,   setSubmitting]     = useState(false);
  const [done,         setDone]           = useState(false);

  const toggleFeature = (f: string) =>
    setFeaturesUsed(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({ satisfaction, featuresUsed, missing, missingOther, recommend, notes });
    setSubmitting(false);
    setDone(true);
  };

  const starDisplay = hovered ?? satisfaction ?? 0;

  if (done) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px" }}>Thank you!</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 8, fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>Your feedback shapes what we build next.</div>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px 24px", maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#059669", marginBottom: 6, fontFamily: "Manrope, sans-serif" }}>Optional check-in</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px" }}>Want to help us improve this?</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, fontFamily: "Inter, sans-serif" }}>A few optional questions · skip anytime</div>
          </div>
        </div>

        {/* Q1 — Satisfaction */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>1. If you have a minute, how is UntilFire feeling so far?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setSatisfaction(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                style={{ flex: 1, fontSize: 22, background: "none", border: `1.5px solid ${n <= starDisplay ? "#F59E0B" : "#E2E8F0"}`, borderRadius: 8, padding: "8px 0", cursor: "pointer", color: n <= starDisplay ? "#F59E0B" : "#E2E8F0", transition: "all 0.1s" }}
              >★</button>
            ))}
          </div>
          {satisfaction && (
            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "Inter, sans-serif" }}>
              {["", "Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"][satisfaction]}
            </div>
          )}
        </div>

        {/* Q2 — Features used */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>2. Which features do you use most? <span style={{ color: "#94A3B8", fontWeight: 400 }}>(pick any)</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SURVEY_FEATURES.map(f => {
              const active = featuresUsed.includes(f);
              return (
                <button key={f} onClick={() => toggleFeature(f)} style={{ padding: "7px 12px", borderRadius: 99, border: `1.5px solid ${active ? "#059669" : "#E2E8F0"}`, background: active ? "#F0FDF4" : "#F8FAFC", color: active ? "#064E3B" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  {active ? "✓ " : ""}{f}
                </button>
              );
            })}
          </div>
        </div>

        {/* Q3 — Missing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>3. Was anything confusing or missing?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SURVEY_MISSING.map(m => {
              const active = missing === m;
              return (
                <button key={m} onClick={() => setMissing(active ? null : m)} style={{ padding: "7px 12px", borderRadius: 99, border: `1.5px solid ${active ? "#F97316" : "#E2E8F0"}`, background: active ? "#FFF7ED" : "#F8FAFC", color: active ? "#C2410C" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  {m}
                </button>
              );
            })}
          </div>
          {missing === "Other" && (
            <input
              type="text"
              value={missingOther}
              onChange={e => setMissingOther(e.target.value)}
              placeholder="Tell us more…"
              style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", color: "#0F172A" }}
            />
          )}
        </div>

        {/* Q4 — Recommend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>4. Would you recommend UntilFire to a friend?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {([["yes", "👍 Yes", "#059669", "#F0FDF4"], ["maybe", "🤔 Maybe", "#6366F1", "#EEF2FF"], ["no", "👎 No", "#DC2626", "#FEF2F2"]] as const).map(([val, label, activeColor, activeBg]) => (
              <button key={val} onClick={() => setRecommend(recommend === val ? null : val)} style={{ flex: 1, padding: "9px 8px", borderRadius: 9, border: `1.5px solid ${recommend === val ? activeColor : "#E2E8F0"}`, background: recommend === val ? activeBg : "#F8FAFC", color: recommend === val ? activeColor : "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Q5 — Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>5. Anything else you&apos;d like us to know? <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span></div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Feature ideas, annoyances, compliments…"
            rows={3}
            style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", resize: "none", color: "#0F172A" }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleSubmit}
            disabled={!satisfaction || submitting}
            style={{ background: satisfaction ? "#064E3B" : "#E5E7EB", color: satisfaction ? "#fff" : "#9CA3AF", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 15, fontWeight: 700, cursor: satisfaction ? "pointer" : "not-allowed", fontFamily: "Manrope, sans-serif" }}
          >
            {submitting ? "Sending…" : "Send feedback →"}
          </button>
          <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: "4px 0" }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding Modal ─────────────────────────────────────────────────────────
function OnboardingModal({ defaultCurrency, onComplete, onDismiss }: {
  defaultCurrency: string;
  onComplete: (income: number, spending: number, savings: number) => void;
  onDismiss: () => void;
}) {
  const [incomeMode, setIncomeMode] = useState<"monthly" | "annual">("monthly");
  const [inc, setInc] = useState("");
  const [spend, setSpend] = useState("");
  const [save, setSave] = useState("");

  const toNum = (s: string) => parseFloat(s.replace(/,/g, "")) || 0;
  const fmt = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? s : n.toLocaleString();
  };

  const monthlyIncome = incomeMode === "annual" ? Math.round(toNum(inc) / 12) : toNum(inc);

  const handleSubmit = () => {
    onComplete(monthlyIncome, toNum(spend), toNum(save));
  };

  const Field = ({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: "Manrope, sans-serif", letterSpacing: "0.02em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 600, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>{defaultCurrency}</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          onBlur={e => onChange(fmt(e.target.value))}
          placeholder="0"
          style={{ width: "100%", paddingLeft: 52, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 16, fontWeight: 600, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box", color: "#111827" }}
          onFocus={e => { e.target.style.borderColor = "#064E3B"; }}
        />
      </div>
      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }}>{hint}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px 28px", maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#20D4BF", marginBottom: 8, fontFamily: "Manrope, sans-serif" }}>Welcome to UntilFire</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px", lineHeight: 1.25 }}>
            Let&apos;s find your FIRE number
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
            Income, spending, and current savings are enough to get started. You can refine everything later.
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => setIncomeMode("monthly")}
              style={{ border: `1.5px solid ${incomeMode === "monthly" ? "#064E3B" : "#E5E7EB"}`, background: incomeMode === "monthly" ? "#F0FDF4" : "#fff", color: incomeMode === "monthly" ? "#064E3B" : "#6B7280", borderRadius: 10, padding: "10px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}
            >
              Monthly take-home
            </button>
            <button
              type="button"
              onClick={() => setIncomeMode("annual")}
              style={{ border: `1.5px solid ${incomeMode === "annual" ? "#064E3B" : "#E5E7EB"}`, background: incomeMode === "annual" ? "#F0FDF4" : "#fff", color: incomeMode === "annual" ? "#064E3B" : "#6B7280", borderRadius: 10, padding: "10px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}
            >
              Gross annual
            </button>
          </div>
          <Field
            label={incomeMode === "annual" ? "Gross annual income" : "Monthly take-home pay"}
            hint={incomeMode === "annual" ? "Before tax, per year — we’ll use a rough monthly estimate" : "After tax, per month"}
            value={inc}
            onChange={setInc}
          />
          <Field label="Monthly spending" hint="Rent, food, everything — rough total is fine" value={spend} onChange={setSpend} />
          <Field label="Current savings / net worth" hint="Total across accounts and investments — 0 is okay" value={save} onChange={setSave} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            disabled={!inc}
            style={{ background: inc ? "#064E3B" : "#E5E7EB", color: inc ? "#fff" : "#9CA3AF", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 15, fontWeight: 700, cursor: inc ? "pointer" : "not-allowed", fontFamily: "Manrope, sans-serif", transition: "background 0.15s" }}
          >
            Get my FIRE number →
          </button>
          <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: "4px 0" }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Checklist ──────────────────────────────────────────────────────────
function SetupChecklist({ income, expenses, k401, rothIRA, taxable, cashSavings, cityName, plaidAccounts = [], onTabChange, onOpenOnboarding }: {
  income: number; expenses: Record<string, number | undefined>;
  k401: number; rothIRA: number; taxable: number; cashSavings: number;
  cityName: string;
  plaidAccounts?: PlaidAccount[];
  onTabChange?: (tab: TabKey) => void;
  onOpenOnboarding?: () => void;
}) {
  const hasExpenses = Object.values(expenses).some(v => (v ?? 0) > 0);
  const hasBankConnected = plaidAccounts.length > 0;
  const steps = [
    { label: "Set your income", done: income > 0, action: () => onOpenOnboarding?.(), cta: "Add income" },
    { label: "Add your expenses", done: hasExpenses, action: () => onTabChange?.("cashflow"), cta: "Go to Cashflow" },
    { label: "Connect your bank", done: hasBankConnected, action: () => onTabChange?.("assets"), cta: "Connect accounts" },
    { label: "Set your city", done: cityName !== "", action: () => onTabChange?.("profile"), cta: "Go to Profile" },
  ];
  const completedCount = steps.filter(s => s.done).length;
  if (completedCount === 4) return null;
  const pct = (completedCount / 4) * 100;

  return (
    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#064E3B", fontFamily: "Manrope, sans-serif" }}>Setup checklist</div>
          <div style={{ fontSize: 12, color: "#059669", fontFamily: "Inter, sans-serif", marginTop: 2 }}>{completedCount} of 4 complete</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#064E3B", fontFamily: "Manrope, sans-serif" }}>{Math.round(pct)}%</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: "#D1FAE5", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#059669", borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map(step => (
          <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: step.done ? "#059669" : "#D1FAE5", border: step.done ? "none" : "2px solid #6EE7B7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {step.done && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ flex: 1, fontSize: 13, color: step.done ? "#6B7280" : "#064E3B", fontFamily: "Inter, sans-serif", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</span>
            {!step.done && (
              <button onClick={step.action} style={{ background: "transparent", border: "none", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0, whiteSpace: "nowrap" }}>
                {step.cta} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────
function GoalsPageTab({
  retirementCityName, retirementCityCol, lifestyleMultiplier, withdrawalRate,
  displayCurrency, displayRates,
  onCityChange, onLifestyleChange,
}: {
  retirementCityName: string; retirementCityCol: number; lifestyleMultiplier: number; withdrawalRate: number;
  displayCurrency: string; displayRates: Record<string, number>;
  onCityChange: (name: string, col: number) => void;
  onLifestyleChange: (multiplier: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px" }}>Goals</div>
      <RetirementTargetCard
        retirementCityName={retirementCityName}
        retirementCityCol={retirementCityCol}
        lifestyleMultiplier={lifestyleMultiplier}
        withdrawalRate={withdrawalRate}
        displayCurrency={displayCurrency}
        displayRates={displayRates}
        onCityChange={onCityChange}
        onLifestyleChange={onLifestyleChange}
      />
    </div>
  );
}

// ─── Retirement Target Card ───────────────────────────────────────────────────
const LIFESTYLE_TIERS = [
  { label: "Frugal",   icon: "🌱", multiplier: 0.7 },
  { label: "Standard", icon: "🏡", multiplier: 1.0 },
  { label: "Lavish",   icon: "💎", multiplier: 1.5 },
];

function RetirementTargetCard({
  retirementCityName, retirementCityCol, lifestyleMultiplier, withdrawalRate,
  displayCurrency, displayRates,
  onCityChange, onLifestyleChange,
}: {
  retirementCityName: string; retirementCityCol: number; lifestyleMultiplier: number; withdrawalRate: number;
  displayCurrency: string; displayRates: Record<string, number>;
  onCityChange: (name: string, col: number) => void;
  onLifestyleChange: (multiplier: number) => void;
}) {
  const [citySearch, setCitySearch] = useState(retirementCityName);
  const [open, setOpen] = useState(false);
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);

  const filtered = citySearch.length > 0
    ? CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 8)
    : [];

  const currentTier = LIFESTYLE_TIERS.find(t => t.multiplier === lifestyleMultiplier) ?? LIFESTYLE_TIERS[1];
  const targetAnnualSpend = retirementCityCol > 0 ? retirementCityCol * lifestyleMultiplier : 0;
  const targetFIRENumber  = withdrawalRate > 0 ? targetAnnualSpend / withdrawalRate : 0;

  const handleSelect = (name: string, col: number) => {
    onCityChange(name, col);
    setCitySearch(name);
    setOpen(false);
  };

  const handleClear = () => {
    onCityChange("", 0);
    setCitySearch("");
    setOpen(false);
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>🎯 Retirement Target</div>

      {/* City search */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid #E2E8F0", borderRadius: 9, padding: "9px 12px", background: "#F8FAFC" }}>
          <span style={{ fontSize: 15 }}>📍</span>
          <input
            type="text"
            value={citySearch}
            placeholder="Where do you want to retire?"
            onChange={e => { setCitySearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0F172A", fontFamily: "Inter, sans-serif" }}
          />
          {retirementCityName && (
            <button onClick={handleClear} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
        {open && filtered.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
            {filtered.map(c => (
              <button
                key={c.key}
                onClick={() => handleSelect(c.name, c.col)}
                style={{ width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#0F172A", fontFamily: "Inter, sans-serif", display: "flex", gap: 8, alignItems: "center" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0FDF4")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <span>{c.flag}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>{fmtMoney(c.col / 12, true)}/mo</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lifestyle pills — only shown when a city is selected */}
      {retirementCityCol > 0 && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            {LIFESTYLE_TIERS.map(tier => {
              const monthlySpend = retirementCityCol * tier.multiplier / 12;
              const active = tier.multiplier === lifestyleMultiplier;
              return (
                <button
                  key={tier.label}
                  onClick={() => onLifestyleChange(tier.multiplier)}
                  style={{
                    flex: 1, padding: "9px 8px", border: `1.5px solid ${active ? "#059669" : "#E2E8F0"}`,
                    borderRadius: 9, background: active ? "#F0FDF4" : "#F8FAFC",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{tier.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#059669" : "#64748B", fontFamily: "Manrope, sans-serif" }}>{tier.label}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Inter, sans-serif" }}>{fmtMoney(monthlySpend, true)}/mo</span>
                </button>
              );
            })}
          </div>

          {/* Result row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF4", borderRadius: 9, padding: "10px 14px" }}>
            <span style={{ fontSize: 12, color: "#064E3B", fontFamily: "Inter, sans-serif" }}>
              {currentTier.icon} {retirementCityName} · {currentTier.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", fontFamily: "Manrope, sans-serif" }}>
              FIRE target: {fmtMoney(targetFIRENumber, true)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── User Nav ─────────────────────────────────────────────────────────────────
function UserNav({ onProfileClick, isProfileActive }: { onProfileClick: () => void; isProfileActive: boolean }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null));
  }, []);
  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  if (!email) return (
    <Link href="/login" style={{ background: "#064E3B", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Sign In</Link>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        onClick={onProfileClick}
        className={`uf-sidebar-item ${isProfileActive ? "active" : ""}`}
        style={{ width: "100%" }}
      >
        <span className="uf-sidebar-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0, flex: 1 }}>
          <span>Profile</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{email}</span>
        </div>
      </button>
      <button onClick={handleSignOut} style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", padding: "4px 14px", fontFamily: "Manrope, sans-serif" }}>
        Sign out
      </button>
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
function AssetsTab({ k401, setK401, rothIRA, setRothIRA, taxable, setTaxable, cashSavings, setCashSavings, growthRate: _growthRate, setGrowthRate: _setGrowthRate, withdrawalRate: _withdrawalRate, setWithdrawalRate: _setWithdrawalRate, actualNetCashflow = 0, displayCurrency, displayRates, plaidAccounts = [], onRefreshAccounts, onUpgradeClick, monthlyExpenses = 0, plaidHoldings = [], plaidSecurities = {}, holdingsNeedsReconnect = [], holdingsLoading = false }: {
  k401: number; setK401: (v: number) => void;
  rothIRA: number; setRothIRA: (v: number) => void;
  taxable: number; setTaxable: (v: number) => void;
  cashSavings: number; setCashSavings: (v: number) => void;
  growthRate: number; setGrowthRate: (v: number) => void;
  withdrawalRate: number; setWithdrawalRate: (v: number) => void;
  actualNetCashflow?: number;
  displayCurrency: string; displayRates: Record<string, number>;
  plaidAccounts?: PlaidAccount[];
  onUpgradeClick?: () => void;
  onRefreshAccounts?: () => void;
  monthlyExpenses?: number;
  plaidHoldings?: PlaidHolding[];
  plaidSecurities?: Record<string, PlaidSecurity>;
  holdingsNeedsReconnect?: string[];
  holdingsLoading?: boolean;
}) {
  const fmtMoney = (n: number) => fmt(n, displayCurrency, displayRates);
  const currencyPrefix = getCurrencySymbol(displayCurrency);
  const total = k401 + rothIRA + taxable + cashSavings;

  const bankAssets = plaidAccounts.filter(a => a.type === "depository" || a.type === "investment");
  const bankAssetsTotal = bankAssets.reduce((s, a) => s + (a.balance_current ?? 0), 0);
  const [hideZeroAssets, setHideZeroAssets] = useState(true);
  const visibleAssets = hideZeroAssets ? bankAssets.filter(a => (a.balance_current ?? 0) !== 0) : bankAssets;
  const hiddenAssetCount = bankAssets.length - visibleAssets.length;

  // ── Account type metadata ────────────────────────────────────────────────
  const ACCOUNT_TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
    checking:        { label: "Checking",      emoji: "🏧", color: "#3B82F6" },
    savings:         { label: "Savings",       emoji: "🏦", color: "#059669" },
    "money market":  { label: "Money Market",  emoji: "💰", color: "#0EA5E9" },
    money_market:    { label: "Money Market",  emoji: "💰", color: "#0EA5E9" },
    cd:              { label: "CD",            emoji: "📄", color: "#8B5CF6" },
    "credit card":   { label: "Credit Card",   emoji: "💳", color: "#F97316" },
    mortgage:        { label: "Mortgage",      emoji: "🏠", color: "#6366F1" },
    auto:            { label: "Auto Loan",     emoji: "🚗", color: "#F59E0B" },
    brokerage:       { label: "Brokerage",     emoji: "📈", color: "#059669" },
    ira:             { label: "IRA",           emoji: "📈", color: "#059669" },
  };
  const getTypeMeta = (subtype: string | null, type: string) => {
    const key = (subtype ?? "").toLowerCase().replace(/-/g, " ");
    return ACCOUNT_TYPE_META[key] ?? ACCOUNT_TYPE_META[type?.toLowerCase()] ?? { label: subtype ?? type, emoji: "💼", color: "#6B7280" };
  };

  // ── APY state (optimistic overrides while saving) ───────────────────────
  const [apyMap, setApyMap] = useState<Record<string, number | null>>({});
  const effectiveApy = (a: PlaidAccount) => apyMap[a.id] !== undefined ? apyMap[a.id] : a.apy;

  const handleSaveApy = async (accountId: string, apy: number | null) => {
    setApyMap(prev => ({ ...prev, [accountId]: apy }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/plaid/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ apy }),
    }).catch(() => null);
    if (!res?.ok) {
      const orig = plaidAccounts.find(a => a.id === accountId)?.apy ?? null;
      setApyMap(prev => ({ ...prev, [accountId]: orig }));
    } else {
      onRefreshAccounts?.();
    }
  };

  function ApyField({ account }: { account: PlaidAccount }) {
    const currentApy = effectiveApy(account);
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(currentApy != null ? String(currentApy) : "");
    useEffect(() => { setVal(currentApy != null ? String(currentApy) : ""); }, [currentApy]);

    const commit = () => {
      const n = parseFloat(val);
      handleSaveApy(account.id, isNaN(n) || n <= 0 ? null : n);
      setEditing(false);
    };

    if (editing) return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
        <input autoFocus type="number" step="0.01" min="0" max="20" value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          onBlur={commit}
          style={{ width: 68, border: "1px solid #059669", borderRadius: 6, padding: "3px 6px", fontSize: 12, outline: "none", fontFamily: "inherit" }}
          placeholder="e.g. 4.8"
        />
        <span style={{ fontSize: 12, color: "#64748B" }}>% APY</span>
      </div>
    );

    return (
      <button onClick={() => setEditing(true)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#94A3B8", textAlign: "left", padding: 0, fontFamily: "inherit", marginTop: 2 }}>
        {currentApy != null ? `${currentApy}% APY ✏️` : "＋ Enter APY"}
      </button>
    );
  }

  // ── Emergency fund logic ─────────────────────────────────────────────────
  const HYSA_THRESHOLD = 3.5;
  const savingsAccts = bankAssets.filter(a => (
    a.type === "depository" &&
    ["savings", "money market", "money_market"].includes((a.subtype ?? "").toLowerCase().replace(/-/g, " "))
  ));
  const hasPlaidSavings = savingsAccts.length > 0;
  const hasHysa = savingsAccts.some(a => (effectiveApy(a) ?? 0) >= HYSA_THRESHOLD);
  const emergencyFundBalance = hasPlaidSavings
    ? savingsAccts.reduce((s, a) => s + (a.balance_current ?? 0), 0)
    : cashSavings;
  const connectedBreakdown = {
    brokerageCash: bankAssets
      .filter(a => a.type === "investment")
      .reduce((s, a) => s + (a.balance_current ?? 0), 0),
  };
  const brokerageCashExcluded = connectedBreakdown.brokerageCash > 0;
  const efMin = monthlyExpenses * 3;
  const efMax = monthlyExpenses * 6;
  const efPct = efMin > 0 ? Math.min(100, (emergencyFundBalance / efMin) * 100) : 0;
  const efStatus = emergencyFundBalance >= efMax ? "full" : emergencyFundBalance >= efMin ? "ok" : emergencyFundBalance > 0 ? "partial" : "empty";
  const monthsCovered = monthlyExpenses > 0 ? emergencyFundBalance / monthlyExpenses : 0;
  const avgApy = savingsAccts.length > 0
    ? savingsAccts.filter(a => effectiveApy(a) != null).reduce((s, a) => s + (effectiveApy(a) ?? 0), 0) /
      Math.max(1, savingsAccts.filter(a => effectiveApy(a) != null).length)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PlaidConnect onTransactionsImported={onRefreshAccounts} onUpgradeClick={onUpgradeClick} />
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {visibleAssets.map(a => {
              const meta = getTypeMeta(a.subtype, a.type);
              const isSavingsType = ["savings", "money market", "money_market"].includes((a.subtype ?? "").toLowerCase().replace(/-/g, " "));
              const isHysaAccount = isSavingsType && (effectiveApy(a) ?? 0) >= HYSA_THRESHOLD;
              return (
                <div key={a.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.emoji}</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#19181E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{a.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ background: meta.color + "18", color: meta.color, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{meta.label}</span>
                    {isHysaAccount && <span style={{ background: "#DCFCE7", color: "#059669", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>HYSA ✓</span>}
                    {a.mask && <span style={{ fontSize: 11, color: "#94A3B8" }}>•••• {a.mask}</span>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", marginTop: 2 }}>{fmtMoney(a.balance_current ?? 0)}</div>
                  {a.balance_available != null && a.balance_available !== a.balance_current && (
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{fmtMoney(a.balance_available)} available</div>
                  )}
                  {isSavingsType && <ApyField account={a} />}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(5,150,105,0.2)" }}>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Total from banks</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#064E3B" }}>{fmtMoney(bankAssetsTotal)}</span>
          </div>
        </div>
      )}

      {/* ── Emergency Fund card ──────────────────────────────────────────── */}
      {monthlyExpenses > 0 && (
        <div className="uf-card" style={{
          background: efStatus === "full" ? "rgba(5,150,105,0.04)" : efStatus === "ok" ? "rgba(20,184,166,0.04)" : efStatus === "partial" ? "rgba(245,158,11,0.04)" : "rgba(220,38,38,0.04)",
          border: `1px solid ${efStatus === "full" ? "rgba(5,150,105,0.2)" : efStatus === "ok" ? "rgba(20,184,166,0.2)" : efStatus === "partial" ? "rgba(245,158,11,0.25)" : "rgba(220,38,38,0.2)"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#064E3B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Emergency Fund</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748B", fontWeight: 500 }}>3–6 months of expenses</span>
          </div>

          {/* Three-stat row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
            {[
              { label: "Current Savings", value: fmtMoney(emergencyFundBalance), color: efStatus === "full" || efStatus === "ok" ? "#059669" : "#19181E" },
              { label: "Min · 3 months", value: fmtMoney(efMin) },
              { label: "Target · 6 months", value: fmtMoney(efMax) },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color ?? "#19181E", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: "#F1F5F9", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${efPct}%`,
              background: efStatus === "full" ? "#059669" : efStatus === "ok" ? "#14B8A6" : efStatus === "partial" ? "#F59E0B" : "#DC2626",
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hasHysa ? 0 : 12 }}>
            {efStatus === "full" && <span style={{ background: "#DCFCE7", color: "#059669", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>✅ Fully funded ({monthsCovered.toFixed(1)} months)</span>}
            {efStatus === "ok" && <span style={{ background: "#CCFBF1", color: "#0F766E", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>✓ On track ({monthsCovered.toFixed(1)} months)</span>}
            {efStatus === "partial" && <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>⚠️ Partially funded ({monthsCovered.toFixed(1)} months)</span>}
            {efStatus === "empty" && <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>❌ Not started</span>}
            {hasHysa && avgApy > 0 && (
              <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>· earning ~{fmtMoney(Math.round(emergencyFundBalance * avgApy / 100 / 12))}/mo interest</span>
            )}
            {brokerageCashExcluded && (
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                · excludes {fmtMoney(connectedBreakdown.brokerageCash)} in brokerage cash reserved for investing
              </span>
            )}
          </div>

          {/* HYSA recommendation banner */}
          {!hasHysa && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>💡 Consider a High-Yield Savings Account (HYSA)</div>
              <div style={{ fontSize: 12, color: "#78350F", lineHeight: 1.5 }}>
                {plaidAccounts.length === 0
                  ? "Connect a bank to track your emergency fund automatically. Using your manual Cash & Savings entry above."
                  : !hasPlaidSavings
                    ? "No savings account detected. A HYSA earns 10–20× more than a typical checking account — top rates are currently 4.5–5.0% APY."
                    : "Enter your savings APY above. If it's below 3.5%, you may be leaving money on the table — top HYSA rates are currently 4.5–5.0% APY."}
              </div>
            </div>
          )}
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

      {plaidAccounts.some(a => a.type === "investment") && (
        <div className="uf-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionLabel icon="📊" text="Holdings" color="#059669" />
            {holdingsLoading && <span style={{ fontSize: 11, color: "#94A3B8" }}>Refreshing…</span>}
          </div>
          {holdingsNeedsReconnect.length > 0 && (
            <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#854D0E" }}>
              ⚠️ {holdingsNeedsReconnect.join(", ")}: Disconnect and reconnect to enable holdings data.
            </div>
          )}
          {plaidHoldings.length === 0 && !holdingsLoading ? (
            <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "20px 0" }}>
              No holdings data yet.{holdingsNeedsReconnect.length > 0 ? " Reconnect your account above." : ""}
            </div>
          ) : (
            <>
              <div className="uf-holdings-grid" style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #F1F5F9" }}>
                <span>Ticker</span><span className="uf-holdings-security">Security</span><span style={{ textAlign: "right" }}>Qty</span><span style={{ textAlign: "right" }}>Price</span><span style={{ textAlign: "right" }}>Value</span>
              </div>
              {[...plaidHoldings]
                .sort((a, b) => (b.institution_value ?? 0) - (a.institution_value ?? 0))
                .map((h, i) => {
                  const sec = plaidSecurities[h.security_id];
                  return (
                    <div key={i} className="uf-holdings-grid" style={{ fontSize: 13, padding: "7px 0", borderBottom: "1px solid #F8FAFC", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, color: "#059669", fontFamily: "monospace" }}>{sec?.ticker_symbol ?? "—"}</span>
                      <span className="uf-holdings-security" style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec?.name ?? "Unknown"}</span>
                      <span style={{ textAlign: "right", color: "#64748B" }}>{h.quantity.toFixed(h.quantity % 1 === 0 ? 0 : 4)}</span>
                      <span style={{ textAlign: "right", color: "#64748B" }}>{h.institution_price != null ? `$${h.institution_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</span>
                      <span style={{ textAlign: "right", fontWeight: 600, color: "#0F172A" }}>{h.institution_value != null ? `$${Math.round(h.institution_value).toLocaleString()}` : "—"}</span>
                    </div>
                  );
                })}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "2px solid #E2E8F0", fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: "#64748B" }}>Total portfolio value</span>
                <span style={{ color: "#059669" }}>${Math.round(plaidHoldings.reduce((s, h) => s + (h.institution_value ?? 0), 0)).toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      )}

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
  const [ageSaved, setAgeSaved] = useState(false);
  const ageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleAgeChange(nextAge: number) {
    setFireAge(nextAge);
    setAgeSaved(true);
    if (ageTimer.current) clearTimeout(ageTimer.current);
    ageTimer.current = setTimeout(() => setAgeSaved(false), 2200);
  }
  useEffect(() => () => { if (ageTimer.current) clearTimeout(ageTimer.current); }, []);
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
            <NumberInput value={fireAge} onChange={handleAgeChange} placeholder="30" prefix="🎂" />
          </FieldRow>
          <div style={{ marginTop: 10, fontSize: 12, color: ageSaved ? "#059669" : "#94A3B8", fontWeight: ageSaved ? 700 : 500 }}>
            {ageSaved ? "✓ Age updated — saving automatically" : "Your age saves automatically and updates your FIRE date."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Simulations Tab ──────────────────────────────────────────────────────────
function SimulationsTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, growthRate, withdrawalRate, displayCurrency, displayRates, onBack, onOpenBudgets, onOpenProfile }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; growthRate: number; withdrawalRate: number; displayCurrency: string; displayRates: Record<string, number>; onBack: () => void;
  onOpenBudgets?: () => void; onOpenProfile?: () => void;
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
        onOpenBudgets={onOpenBudgets} onOpenProfile={onOpenProfile}
      />
    </div>
  );
}

// ─── Investment Simulations Tab ──────────────────────────────────────────────
type DCAFreq = "weekly" | "bi-weekly" | "monthly" | "annually";

interface DCASimRow {
  year: number;
  portfolio: number;
  contributions: number;
  growth: number;
  real: number;
}

type Holding = {
  ticker: string;
  name: string;
  cagr: number;
  weight: number;
  custom?: boolean;
};

const ETF_DATA: Record<string, { name: string; cagr: number; category: string; stddev: number; maxDD: number }> = {
  VOO:  { name: "Vanguard S&P 500 ETF",            cagr: 0.107, category: "US Equity",         stddev: 0.16, maxDD: 0.57 },
  VTI:  { name: "Vanguard Total Stock Market ETF",  cagr: 0.107, category: "US Equity",         stddev: 0.16, maxDD: 0.57 },
  SPY:  { name: "SPDR S&P 500 ETF",                cagr: 0.107, category: "US Equity",         stddev: 0.16, maxDD: 0.57 },
  IVV:  { name: "iShares Core S&P 500 ETF",        cagr: 0.107, category: "US Equity",         stddev: 0.16, maxDD: 0.57 },
  SCHB: { name: "Schwab US Broad Market ETF",       cagr: 0.107, category: "US Equity",         stddev: 0.16, maxDD: 0.57 },
  QQQ:  { name: "Invesco Nasdaq-100 ETF",           cagr: 0.183, category: "US Growth",         stddev: 0.22, maxDD: 0.83 },
  ARKK: { name: "ARK Innovation ETF",               cagr: 0.035, category: "US Growth",         stddev: 0.55, maxDD: 0.75 },
  VT:   { name: "Vanguard Total World Stock ETF",   cagr: 0.092, category: "Global Equity",     stddev: 0.16, maxDD: 0.55 },
  VXUS: { name: "Vanguard Total Intl Stock ETF",    cagr: 0.059, category: "Intl Equity",       stddev: 0.17, maxDD: 0.57 },
  VEA:  { name: "Vanguard Developed Markets ETF",   cagr: 0.071, category: "Intl Equity",       stddev: 0.17, maxDD: 0.57 },
  VWO:  { name: "Vanguard Emerging Markets ETF",    cagr: 0.037, category: "Emerging Markets",  stddev: 0.22, maxDD: 0.65 },
  EFA:  { name: "iShares MSCI EAFE ETF",            cagr: 0.076, category: "Intl Equity",       stddev: 0.17, maxDD: 0.57 },
  BND:  { name: "Vanguard Total Bond Market ETF",   cagr: 0.017, category: "US Bonds",          stddev: 0.05, maxDD: 0.20 },
  AGG:  { name: "iShares Core US Aggregate Bond",   cagr: 0.015, category: "US Bonds",          stddev: 0.05, maxDD: 0.20 },
  BNDX: { name: "Vanguard Total Intl Bond ETF",     cagr: 0.008, category: "Intl Bonds",        stddev: 0.05, maxDD: 0.22 },
  SCHD: { name: "Schwab US Dividend Equity ETF",    cagr: 0.112, category: "US Dividend",       stddev: 0.14, maxDD: 0.40 },
  VIG:  { name: "Vanguard Dividend Appreciation",   cagr: 0.111, category: "US Dividend",       stddev: 0.14, maxDD: 0.40 },
  VYM:  { name: "Vanguard High Dividend Yield ETF", cagr: 0.095, category: "US Dividend",       stddev: 0.14, maxDD: 0.40 },
  VNQ:  { name: "Vanguard Real Estate ETF",         cagr: 0.087, category: "Real Estate",       stddev: 0.20, maxDD: 0.70 },
  GLD:  { name: "SPDR Gold Trust",                  cagr: 0.085, category: "Commodities",       stddev: 0.16, maxDD: 0.42 },
  IWM:  { name: "iShares Russell 2000 ETF",         cagr: 0.090, category: "US Small Cap",      stddev: 0.22, maxDD: 0.59 },
  AVUV: { name: "Avantis US Small Value ETF",       cagr: 0.150, category: "US Small Value",    stddev: 0.22, maxDD: 0.55 },
  XLK:  { name: "Technology Select Sector SPDR",    cagr: 0.204, category: "Sector – Tech",     stddev: 0.22, maxDD: 0.57 },
  SOXX: { name: "iShares Semiconductor ETF",        cagr: 0.220, category: "Sector – Semi",     stddev: 0.30, maxDD: 0.65 },
  AAPL: { name: "Apple Inc.",                        cagr: 0.220, category: "Individual Stock", stddev: 0.28, maxDD: 0.55 },
  MSFT: { name: "Microsoft Corp.",                   cagr: 0.220, category: "Individual Stock", stddev: 0.28, maxDD: 0.55 },
  NVDA: { name: "NVIDIA Corp.",                      cagr: 0.500, category: "Individual Stock", stddev: 0.60, maxDD: 0.66 },
  GOOGL:{ name: "Alphabet Inc.",                     cagr: 0.150, category: "Individual Stock", stddev: 0.28, maxDD: 0.55 },
  AMZN: { name: "Amazon.com Inc.",                   cagr: 0.160, category: "Individual Stock", stddev: 0.30, maxDD: 0.56 },
  TSLA: { name: "Tesla Inc.",                        cagr: 0.270, category: "Individual Stock", stddev: 0.65, maxDD: 0.73 },
};

const HOLDING_PALETTE = ["#059669", "#22d3a5", "#818cf8", "#f97316", "#fbbf24", "#ef4444", "#a78bfa", "#06b6d4"];

type Scenario = {
  id: "A" | "B" | "C";
  label: string;
  color: string;
  holdings: Holding[];
  initialAmount: number;
  dcaAmount: number;
  dcaFrequency: DCAFreq;
  years: number;
  glideEnabled: boolean;
  glideCurrentAge: number;
  glideRetirementAge: number;
  glideStartStock: number;
  glideEndStock: number;
};

function calcDCAProjection({
  initialAmount, dcaAmount, dcaFrequency, years, holdings, includeInflation,
  glideEnabled, currentAge, retirementAge, startStockPct, endStockPct,
}: {
  initialAmount: number; dcaAmount: number; dcaFrequency: DCAFreq; years: number;
  holdings: Holding[]; includeInflation: boolean;
  glideEnabled?: boolean; currentAge?: number; retirementAge?: number;
  startStockPct?: number; endStockPct?: number;
}): DCASimRow[] {
  const STOCK_RETURN = 0.107;
  const BOND_RETURN = 0.017;
  const periods: Record<DCAFreq, number> = { weekly: 52, "bi-weekly": 26, monthly: 12, annually: 1 };
  const annualContrib = dcaAmount * periods[dcaFrequency];
  const inflation = 0.03;
  const totalGlideYears = (retirementAge ?? 60) - (currentAge ?? 30);

  const rows: DCASimRow[] = [];
  let portfolio = initialAmount;
  let totalContrib = initialAmount;

  rows.push({ year: 0, portfolio: Math.round(portfolio), contributions: Math.round(totalContrib), growth: 0, real: Math.round(portfolio) });

  for (let y = 1; y <= years; y++) {
    let r: number;
    if (glideEnabled && totalGlideYears > 0) {
      const t = Math.min(y, totalGlideYears) / totalGlideYears;
      const stockFrac = ((startStockPct ?? 80) - ((startStockPct ?? 80) - (endStockPct ?? 40)) * t) / 100;
      r = stockFrac * STOCK_RETURN + (1 - stockFrac) * BOND_RETURN;
    } else {
      r = holdings.reduce((acc, h) => acc + (h.weight / 100) * h.cagr, 0);
    }
    portfolio = portfolio * (1 + r) + annualContrib * (1 + r / 2);
    totalContrib += annualContrib;
    const growth = Math.max(0, portfolio - totalContrib);
    const real = includeInflation ? portfolio / Math.pow(1 + inflation, y) : portfolio;
    rows.push({ year: y, portfolio: Math.round(portfolio), contributions: Math.round(totalContrib), growth: Math.round(growth), real: Math.round(real) });
  }
  return rows;
}

function calcPortfolioRisk(holdings: Holding[]): { volatility: number; maxDrawdown: number; sharpe: number; assetClasses: string[] } {
  const RISK_FREE = 0.04;
  let blendedReturn = 0;
  let weightedVol = 0;
  let weightedDD = 0;
  const classes = new Set<string>();
  for (const h of holdings) {
    const w = h.weight / 100;
    const etf = ETF_DATA[h.ticker];
    blendedReturn += w * h.cagr;
    weightedVol += w * (etf?.stddev ?? 0.18);
    weightedDD += w * (etf?.maxDD ?? 0.50);
    classes.add(etf?.category ?? "Other");
  }
  const sharpe = weightedVol > 0 ? (blendedReturn - RISK_FREE) / weightedVol : 0;
  return { volatility: weightedVol, maxDrawdown: weightedDD, sharpe, assetClasses: [...classes] };
}

function diversificationLabel(classes: string[]): { label: string; color: string } {
  const n = classes.length;
  if (n >= 4) return { label: "Well Diversified", color: "#059669" };
  if (n === 3) return { label: "Diversified", color: "#0ea5e9" };
  if (n === 2) return { label: "Moderate", color: "#f59e0b" };
  return { label: "Concentrated", color: "#ef4444" };
}

function riskProfileLabel(volatility: number): { label: string; color: string } {
  if (volatility < 0.10) return { label: "Conservative", color: "#059669" };
  if (volatility < 0.16) return { label: "Moderate", color: "#0ea5e9" };
  if (volatility < 0.22) return { label: "Aggressive", color: "#f59e0b" };
  return { label: "High Risk", color: "#ef4444" };
}

type PlanCardProps = {
  s: Scenario;
  updateScenario: (id: "A" | "B" | "C", patch: Partial<Omit<Scenario, "id">>) => void;
  updateHoldings: (id: "A" | "B" | "C", updater: (h: Holding[]) => Holding[]) => void;
};

function PlanCard({ s, updateScenario, updateHoldings }: PlanCardProps) {
  const [tickerInput, setTickerInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const blendedReturn = s.holdings.reduce((acc, h) => acc + (h.weight / 100) * h.cagr, 0);
  const suggestions = tickerInput.length >= 1
    ? Object.entries(ETF_DATA)
        .filter(([ticker, info]) =>
          !s.holdings.find(h => h.ticker === ticker) &&
          (ticker.startsWith(tickerInput.toUpperCase()) ||
           info.name.toLowerCase().includes(tickerInput.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  function addHolding(ticker: string) {
    const upper = ticker.toUpperCase().trim();
    if (!upper || s.holdings.find(h => h.ticker === upper)) { setTickerInput(""); setShowDropdown(false); return; }
    const info = ETF_DATA[upper];
    const newH: Holding = info
      ? { ticker: upper, name: info.name, cagr: info.cagr, weight: 0 }
      : { ticker: upper, name: upper, cagr: 0.07, weight: 0, custom: true };
    updateHoldings(s.id, hs => {
      const next = [...hs, newH];
      const w = Math.floor(100 / next.length);
      const rem = 100 - w * next.length;
      return next.map((h, i) => ({ ...h, weight: i === 0 ? w + rem : w }));
    });
    setTickerInput("");
    setShowDropdown(false);
  }

  function removeHolding(ticker: string) {
    updateHoldings(s.id, hs => {
      const next = hs.filter(h => h.ticker !== ticker);
      if (next.length === 0) return hs;
      const total = next.reduce((sum, h) => sum + h.weight, 0);
      if (total === 0) {
        const w = Math.floor(100 / next.length);
        return next.map((h, i) => ({ ...h, weight: i === 0 ? 100 - w * (next.length - 1) : w }));
      }
      const rebalanced = next.map(h => ({ ...h, weight: Math.round((h.weight / total) * 100) }));
      const diff = 100 - rebalanced.reduce((sum, h) => sum + h.weight, 0);
      if (diff !== 0) rebalanced[0] = { ...rebalanced[0], weight: rebalanced[0].weight + diff };
      return rebalanced;
    });
  }

  function updateWeight(ticker: string, val: number) {
    updateHoldings(s.id, hs => {
      const clamped = Math.max(0, Math.min(100, val));
      const idx = hs.findIndex(h => h.ticker === ticker);
      if (idx === -1) return hs;
      const delta = clamped - hs[idx].weight;
      const others = hs.filter((_, i) => i !== idx);
      const totalOthers = others.reduce((sum, h) => sum + h.weight, 0);
      const next = hs.map((h, i) => {
        if (i === idx) return { ...h, weight: clamped };
        if (totalOthers === 0) return { ...h, weight: Math.floor((100 - clamped) / others.length) };
        return { ...h, weight: Math.max(0, Math.round(h.weight - delta * (h.weight / totalOthers))) };
      });
      const sum = next.reduce((acc, h) => acc + h.weight, 0);
      if (sum !== 100 && next.length > 1) {
        const fixIdx = next.findIndex((h, i) => i !== idx && h.weight > 0);
        if (fixIdx !== -1) next[fixIdx] = { ...next[fixIdx], weight: Math.max(0, next[fixIdx].weight + (100 - sum)) };
      }
      return next;
    });
  }

  function updateCagr(ticker: string, cagr: number) {
    updateHoldings(s.id, hs => hs.map(h => h.ticker === ticker ? { ...h, cagr } : h));
  }

  return (
    <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 260 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
        <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 15, color: "#19181E" }}>{s.label}</span>
        {!s.glideEnabled && (
          <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: s.color }}>{(blendedReturn * 100).toFixed(1)}%/yr</span>
        )}
      </div>

      <FieldRow label="Starting Amount">
        <NumberInput value={s.initialAmount} onChange={v => updateScenario(s.id, { initialAmount: v })} />
      </FieldRow>

      <FieldRow label="DCA Amount">
        <div style={{ display: "flex", gap: 6 }}>
          <NumberInput value={s.dcaAmount} onChange={v => updateScenario(s.id, { dcaAmount: v })} />
          <select
            value={s.dcaFrequency}
            onChange={e => updateScenario(s.id, { dcaFrequency: e.target.value as DCAFreq })}
            style={{ background: "#F1F5F9", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 8px", color: "#19181E", fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none", flexShrink: 0 }}
          >
            <option value="weekly">Wkly</option>
            <option value="bi-weekly">Bi-wk</option>
            <option value="monthly">Mo</option>
            <option value="annually">Yr</option>
          </select>
        </div>
      </FieldRow>

      <FieldRow label={`Horizon: ${s.years} yrs`}>
        <input type="range" min={5} max={40} step={1} value={s.years}
          onChange={e => updateScenario(s.id, { years: Number(e.target.value) })}
          style={{ width: "100%", accentColor: s.color }} />
      </FieldRow>

      <button
        onClick={() => updateScenario(s.id, { glideEnabled: !s.glideEnabled })}
        style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: `1.5px solid ${s.glideEnabled ? s.color : "#E2E8F0"}`, background: s.glideEnabled ? s.color + "18" : "#F1F5F9", color: s.glideEnabled ? s.color : "#64748B", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
      >
        {s.glideEnabled ? "✓ " : ""}Age Glide
      </button>

      {s.glideEnabled && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#94A3B8", fontStyle: "italic" }}>Shifts stock/bond from today → retirement. Overrides holdings.</div>
          <FieldRow label="Current Age"><NumberInput value={s.glideCurrentAge} onChange={v => updateScenario(s.id, { glideCurrentAge: v })} /></FieldRow>
          <FieldRow label="Retirement Age"><NumberInput value={s.glideRetirementAge} onChange={v => updateScenario(s.id, { glideRetirementAge: v })} /></FieldRow>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Stocks today: {s.glideStartStock}%</div>
          <input type="range" min={0} max={100} value={s.glideStartStock} onChange={e => updateScenario(s.id, { glideStartStock: +e.target.value })} style={{ width: "100%", accentColor: s.color }} />
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Stocks at retirement: {s.glideEndStock}%</div>
          <input type="range" min={0} max={100} value={s.glideEndStock} onChange={e => updateScenario(s.id, { glideEndStock: +e.target.value })} style={{ width: "100%", accentColor: s.color }} />
          <div style={{ fontSize: 10, color: "#94A3B8", fontStyle: "italic" }}>Stocks @ 10.7%/yr · Bonds @ 1.7%/yr</div>
        </div>
      )}

      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Holdings</div>

        <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
          {s.holdings.filter(h => h.ticker).map((h, i) => (
            <div key={h.ticker} style={{ width: `${h.weight}%`, background: HOLDING_PALETTE[i % HOLDING_PALETTE.length], transition: "width 0.2s" }} />
          ))}
        </div>

        {s.holdings.filter(h => h.ticker).map((h, i) => (
          <div key={h.ticker} style={{ display: "flex", flexDirection: "column", gap: 5, paddingBottom: 8, borderBottom: "1px solid #F8FAFC" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: HOLDING_PALETTE[i % HOLDING_PALETTE.length], color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 800, fontFamily: "DM Mono, monospace", flexShrink: 0 }}>{h.ticker}</span>
              <span style={{ fontSize: 11, color: "#64748B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
              {!h.custom && ETF_DATA[h.ticker] && (
                <>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", flexShrink: 0 }}>{(h.cagr * 100).toFixed(1)}%</span>
                  <span style={{ fontSize: 9, color: "#94A3B8", flexShrink: 0 }}>±{(ETF_DATA[h.ticker].stddev * 100).toFixed(0)}%</span>
                </>
              )}
              <button onClick={() => removeHolding(h.ticker)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
            {h.custom && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#94A3B8" }}>Return %:</span>
                <input type="number" min={0} max={100} step={0.1} value={(h.cagr * 100).toFixed(1)}
                  onChange={e => updateCagr(h.ticker, Number(e.target.value) / 100)}
                  style={{ width: 52, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 5, padding: "2px 5px", fontSize: 11, color: "#19181E", fontFamily: "inherit" }} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="range" min={0} max={100} step={1} value={h.weight}
                onChange={e => updateWeight(h.ticker, Number(e.target.value))}
                style={{ flex: 1, accentColor: HOLDING_PALETTE[i % HOLDING_PALETTE.length] }} />
              <input type="number" min={0} max={100} value={h.weight}
                onChange={e => updateWeight(h.ticker, Number(e.target.value))}
                style={{ width: 40, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 5, padding: "2px 5px", fontSize: 11, color: "#19181E", fontFamily: "inherit", textAlign: "right" }} />
              <span style={{ fontSize: 11, color: "#94A3B8" }}>%</span>
            </div>
          </div>
        ))}

        <div style={{ position: "relative", marginTop: 6 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <input type="text" value={tickerInput} placeholder="Add ticker…"
              onChange={e => { setTickerInput(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              onKeyDown={e => { if (e.key === "Enter") addHolding(tickerInput); }}
              style={{ flex: 1, background: "#F1F5F9", border: "1.5px solid #E2E8F0", borderRadius: 7, padding: "6px 8px", fontSize: 12, color: "#19181E", fontFamily: "DM Mono, monospace", outline: "none" }} />
            <button onClick={() => addHolding(tickerInput)} style={{ background: s.color, border: "none", borderRadius: 7, padding: "6px 12px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+</button>
          </div>
          {showDropdown && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, marginTop: 3, overflow: "hidden" }}>
              {suggestions.map(([ticker, info]) => (
                <button key={ticker} onMouseDown={() => addHolding(ticker)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid #F8FAFC" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontWeight: 800, fontSize: 11, color: "#19181E", minWidth: 40 }}>{ticker}</span>
                  <span style={{ fontSize: 11, color: "#64748B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>{(info.cagr * 100).toFixed(1)}%</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 10, color: "#CBD5E1", fontStyle: "italic" }}>
          Based on 10-yr historical CAGR. Past returns don&apos;t guarantee future results.
        </p>
      </div>
    </div>
  );
}

function InvestSimTab({ onBack }: { onBack: () => void }) {
  const PLAN_DEFAULTS = {
    initialAmount: 10000, dcaAmount: 500, dcaFrequency: "monthly" as DCAFreq,
    years: 20, glideEnabled: false,
    glideCurrentAge: 30, glideRetirementAge: 60, glideStartStock: 80, glideEndStock: 40,
  };

  const [inflation, setInflation] = useState(false);

  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: "A", label: "Plan A", color: "#059669", ...PLAN_DEFAULTS, holdings: [
      { ticker: "VOO", name: "Vanguard S&P 500 ETF",      cagr: 0.107, weight: 60 },
      { ticker: "BND", name: "Vanguard Total Bond Market", cagr: 0.017, weight: 20 },
      { ticker: "VT",  name: "Vanguard Total World Stock", cagr: 0.092, weight: 20 },
    ]},
    { id: "B", label: "Plan B", color: "#818cf8", ...PLAN_DEFAULTS, holdings: [
      { ticker: "QQQ", name: "Invesco Nasdaq-100 ETF",     cagr: 0.183, weight: 80 },
      { ticker: "BND", name: "Vanguard Total Bond Market", cagr: 0.017, weight: 20 },
    ]},
    { id: "C", label: "Plan C", color: "#f97316", ...PLAN_DEFAULTS, holdings: [
      { ticker: "VT",  name: "Vanguard Total World Stock", cagr: 0.092, weight: 100 },
    ]},
  ]);

  function updateScenario(id: "A" | "B" | "C", patch: Partial<Omit<Scenario, "id">>) {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function updateHoldings(id: "A" | "B" | "C", updater: (h: Holding[]) => Holding[]) {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, holdings: updater(s.holdings) } : s));
  }

  const scenarioRisks = useMemo(
    () => scenarios.map(s => ({ id: s.id, ...calcPortfolioRisk(s.holdings) })),
    [scenarios]
  );

  const { chartData, scenarioFinals } = useMemo(() => {
    const projections = scenarios.map(s =>
      calcDCAProjection({
        initialAmount: s.initialAmount, dcaAmount: s.dcaAmount,
        dcaFrequency: s.dcaFrequency, years: s.years,
        holdings: s.holdings, includeInflation: inflation,
        glideEnabled: s.glideEnabled, currentAge: s.glideCurrentAge,
        retirementAge: s.glideRetirementAge, startStockPct: s.glideStartStock,
        endStockPct: s.glideEndStock,
      })
    );
    const maxYears = Math.max(...scenarios.map(s => s.years));
    const data = Array.from({ length: maxYears + 1 }, (_, i) => {
      const point: Record<string, number> = { year: i };
      scenarios.forEach((s, si) => {
        const rows = projections[si];
        point[s.id] = rows[Math.min(i, rows.length - 1)].portfolio;
      });
      return point;
    });
    const finals = scenarios.map((s, si) => {
      const last = projections[si].at(-1)!;
      return { id: s.id, final: last.portfolio, contributed: last.contributions };
    });
    return { chartData: data, scenarioFinals: finals };
  }, [scenarios, inflation]);

  const fmtK = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
        ← Back to Calculator
      </button>
      <div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 700, color: "#19181E", margin: "0 0 4px" }}>Investment Simulations</h2>
        <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>Each plan has its own contribution settings and holdings. Compare strategies side-by-side.</p>
      </div>

      {/* 3 Plan Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {scenarios.map(s => <PlanCard key={s.id} s={s} updateScenario={updateScenario} updateHoldings={updateHoldings} />)}
      </div>

      {/* Chart */}
      <div className="uf-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 15 }}>Portfolio Growth Comparison</div>
          <button
            onClick={() => setInflation(v => !v)}
            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: `1.5px solid ${inflation ? "#059669" : "#E2E8F0"}`, background: inflation ? "#05966915" : "#F1F5F9", color: inflation ? "#059669" : "#64748B", cursor: "pointer", fontFamily: "inherit" }}
          >
            {inflation ? "✓ " : ""}Inflation-adjusted (3%)
          </button>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="year" tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} label={{ value: "Year", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94A3B8" }} />
            <YAxis tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={v => fmtK(v as number)} width={60} />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [`$${(value as number).toLocaleString()}`, String(name ?? "")]}
              labelFormatter={l => `Year ${l}`}
              contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="A" name="Plan A" stroke="#059669" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="B" name="Plan B" stroke="#818cf8" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="C" name="Plan C" stroke="#f97316" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards — per-plan final value at their own horizon */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {scenarioFinals.map((sf, i) => {
          const s = scenarios[i];
          return (
            <div key={sf.id} className="uf-card" style={{ textAlign: "center", padding: "16px 12px" }}>
              <div style={{ fontSize: 11, color: s.color, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "Manrope, sans-serif" }}>{fmtK(sf.final)}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>after {s.years} yrs</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Contributed: {fmtK(sf.contributed)}</div>
            </div>
          );
        })}
      </div>

      {/* Risk & Return Comparison */}
      <div className="uf-card" style={{ padding: "16px 20px" }}>
        <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Risk &amp; Return Comparison</div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>
          Volatility estimated from historical data (assumes full correlation between holdings — conservative upper bound).
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "140px repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
          <div />
          {scenarios.map(s => (
            <div key={s.id} style={{ fontSize: 12, fontWeight: 700, color: s.color, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {s.label}
            </div>
          ))}
        </div>

        {([
          {
            label: "Annual Return",
            values: scenarios.map(s => `${(s.holdings.reduce((a: number, h: Holding) => a + (h.weight / 100) * h.cagr, 0) * 100).toFixed(1)}%`),
            bestFn: (vals: string[]) => vals.indexOf(vals.reduce((a, b) => parseFloat(a) > parseFloat(b) ? a : b)),
          },
          {
            label: "Volatility (est.)",
            values: scenarioRisks.map(r => `${(r.volatility * 100).toFixed(1)}%`),
            bestFn: (vals: string[]) => vals.indexOf(vals.reduce((a, b) => parseFloat(a) < parseFloat(b) ? a : b)),
          },
          {
            label: "Sharpe Ratio",
            values: scenarioRisks.map(r => r.sharpe.toFixed(2)),
            bestFn: (vals: string[]) => vals.indexOf(vals.reduce((a, b) => parseFloat(a) > parseFloat(b) ? a : b)),
          },
          {
            label: "Max Drawdown (est.)",
            values: scenarioRisks.map(r => `-${(r.maxDrawdown * 100).toFixed(0)}%`),
            bestFn: (vals: string[]) => { const nums = vals.map(v => Math.abs(parseFloat(v))); return nums.indexOf(Math.min(...nums)); },
          },
          {
            label: "Asset Classes",
            values: scenarioRisks.map(r => { const d = diversificationLabel(r.assetClasses); return `${r.assetClasses.length} · ${d.label}`; }),
            bestFn: (vals: string[]) => { const counts = vals.map(v => parseInt(v)); return counts.indexOf(Math.max(...counts)); },
          },
        ] as { label: string; values: string[]; bestFn: (v: string[]) => number }[]).map(({ label, values, bestFn }) => {
          const bestIdx = bestFn(values);
          return (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "140px repeat(3, 1fr)", gap: 8, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, display: "flex", alignItems: "center" }}>{label}</div>
              {values.map((v, i) => (
                <div key={i} style={{ fontSize: 13, fontWeight: bestIdx === i ? 800 : 600, color: bestIdx === i ? scenarios[i].color : "#475569", textAlign: "center", background: bestIdx === i ? scenarios[i].color + "12" : "transparent", borderRadius: 6, padding: "3px 6px" }}>
                  {v}{bestIdx === i && <span style={{ marginLeft: 4, fontSize: 10 }}>★</span>}
                </div>
              ))}
            </div>
          );
        })}

        <div style={{ display: "grid", gridTemplateColumns: "140px repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, display: "flex", alignItems: "center" }}>Risk Profile</div>
          {scenarioRisks.map(r => {
            const rp = riskProfileLabel(r.volatility);
            return (
              <div key={r.id} style={{ textAlign: "center" }}>
                <span style={{ background: rp.color + "18", color: rp.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{rp.label}</span>
              </div>
            );
          })}
        </div>

        {(() => {
          const bestSharpeIdx = scenarioRisks.reduce((bi, r, i) => r.sharpe > scenarioRisks[bi].sharpe ? i : bi, 0);
          const lowestVolIdx = scenarioRisks.reduce((bi, r, i) => r.volatility < scenarioRisks[bi].volatility ? i : bi, 0);
          const bestRetIdx = scenarios.reduce((bi, s, i) => {
            const r = s.holdings.reduce((a: number, h: Holding) => a + (h.weight / 100) * h.cagr, 0);
            const rb = scenarios[bi].holdings.reduce((a: number, h: Holding) => a + (h.weight / 100) * h.cagr, 0);
            return r > rb ? i : bi;
          }, 0);
          return (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#475569" }}>
                <span style={{ color: scenarios[bestSharpeIdx].color, fontWeight: 700 }}>🏆 Best risk-adjusted return:</span>{" "}
                {scenarios[bestSharpeIdx].label} (Sharpe {scenarioRisks[bestSharpeIdx].sharpe.toFixed(2)}) — highest return per unit of risk
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                <span style={{ color: scenarios[lowestVolIdx].color, fontWeight: 700 }}>🛡️ Lowest volatility:</span>{" "}
                {scenarios[lowestVolIdx].label} ({(scenarioRisks[lowestVolIdx].volatility * 100).toFixed(1)}% est. annual vol)
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                <span style={{ color: scenarios[bestRetIdx].color, fontWeight: 700 }}>📈 Highest raw return:</span>{" "}
                {scenarios[bestRetIdx].label} ({(scenarios[bestRetIdx].holdings.reduce((a: number, h: Holding) => a + (h.weight / 100) * h.cagr, 0) * 100).toFixed(1)}%/yr) — highest return but with more risk
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── FIRE Calculator Menu Tab ────────────────────────────────────────────────
function FireCalcMenuTab({
  fireAge,
  onOpenProfile,
  onOpenSimulation,
  onOpenInvestSim,
}: {
  fireAge: number;
  onOpenProfile: () => void;
  onOpenSimulation: () => void;
  onOpenInvestSim: () => void;
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
      title: "Profile Assumptions",
      desc: "Keep your age, target city, lifestyle, and FIRE type in Profile so every freedom-date calculation uses the same source of truth.",
      meta: `Current age: ${fireAge}`,
      label: "Edit in Profile →",
      onClick: onOpenProfile,
    },
    {
      icon: "🎲",
      title: "Confidence Check",
      desc: "Run 10,000 randomised market scenarios to see how resilient your freedom date is by your target age.",
      meta: "Stress-test your plan",
      label: "Check Confidence →",
      onClick: onOpenSimulation,
    },
    {
      icon: "📈",
      title: "Advanced Investing Simulator",
      desc: "Optional advanced tool: model DCA contributions with custom allocation and inflation assumptions.",
      meta: "Advanced / optional",
      label: "Open Advanced →",
      onClick: onOpenInvestSim,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "#19181E", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
          Freedom Date
        </h2>
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
          Start with your core freedom-date view. Assumptions live in Profile; advanced checks stay here when you need them.
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

// ─── Sidebar items ────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS: { key: TabKey; label: string; mobileLabel?: string; svg: string; activeTabs?: TabKey[] }[] = [
  {
    key: "overview",
    label: "Home",
    svg: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  },
  {
    key: "cashflow",
    label: "Money",
    activeTabs: ["cashflow", "assets", "liabilities", "reports"],
    svg: '<path d="M4 20h16"/><path d="M6 16l4-4 3 3 5-7"/><path d="M14 8h4v4"/>',
  },
  {
    key: "fire-calculator",
    label: "Freedom",
    activeTabs: ["fire-calculator", "goals", "learning-hub"],
    svg: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  },
];

type MobilePrimaryKey = "home" | "money" | "freedom" | "profile";

const MOBILE_PRIMARY_ITEMS: { key: MobilePrimaryKey; label: string; svg: string }[] = [
  {
    key: "home",
    label: "Home",
    svg: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  },
  {
    key: "money",
    label: "Money",
    svg: '<path d="M4 20h16"/><path d="M6 16l4-4 3 3 5-7"/><path d="M14 8h4v4"/>',
  },
  {
    key: "freedom",
    label: "Freedom",
    svg: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
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
  const [fireCalcSubTab, setFireCalcSubTab] = useState<"menu" | "goals" | "simulation" | "invest-sim">("menu");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeSource, setUpgradeSource] = useState("dashboard_upgrade_modal");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [upgradedBanner, setUpgradedBanner] = useState(false);
  const wasUpgradedRef = useRef(false);
  const [subscription, setSubscription] = useState<{ plan: "free" | "pro" } | null>(null);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [plaidHoldings, setPlaidHoldings] = useState<PlaidHolding[]>([]);
  const [plaidSecurities, setPlaidSecurities] = useState<Record<string, PlaidSecurity>>({});
  const [holdingsNeedsReconnect, setHoldingsNeedsReconnect] = useState<string[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

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
      wasUpgradedRef.current = true;
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

  // Refresh Plaid account balances whenever the user navigates to assets/liabilities (60s TTL)
  useEffect(() => {
    if (tab === "assets" || tab === "liabilities") {
      const now = Date.now();
      if (now - plaidFetchedAt.current > 60_000) {
        plaidFetchedAt.current = now;
        refreshPlaidAccounts();
      }
    }
    if (tab === "assets") {
      refreshPlaidHoldings();
    }
  }, [tab]);

  // Budget state
  const [income,   setIncome]   = useState(0);
  const [expenses, setExpenses] = useState<Expenses>({ housing: 0, food: 0, transport: 0, subscriptions: 0, healthcare: 0, entertainment: 0, other: 0 });
  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + ((v as number) || 0), 0);

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
  const [cityName,            setCityName]            = useState("");
  const [retirementCityName,  setRetirementCityName]  = useState("");
  const [retirementCityCol,   setRetirementCityCol]   = useState(0);
  const [lifestyleMultiplier, setLifestyleMultiplier] = useState(1.0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nwSnapshots, setNwSnapshots] = useState<{ portfolio_value: number; captured_at: string }[]>([]);
  const lastSnapshotRef = useRef<number | null>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [preferredCurrencies, setPreferredCurrencies] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription({ plan: (data?.plan as "free" | "pro") ?? "free" });
      });
  }, [userId]);

  useEffect(() => {
    if (!upgradedBanner || !userId) return;
    setSubscription({ plan: "pro" });
  }, [upgradedBanner, userId]);

  async function handleManageBilling() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

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
  const plaidFetchedAt = useRef<number>(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [surveyOpen,     setSurveyOpen]     = useState(false);
  const [tourOpen,       setTourOpen]       = useState(false);
  function closeTour() {
    setTourOpen(false);
    try { localStorage.setItem('uf_tour_done', '1') } catch {}
  }

  const openDashboardTab = (nextTab: TabKey) => {
    setTab(nextTab);
    if (nextTab !== "fire-calculator") setFireCalcSubTab("menu");
    setMobileMenuOpen(false);
  };

  const openMobilePrimary = (key: MobilePrimaryKey) => {
    if (key === "home") openDashboardTab("overview");
    if (key === "money") { setCashflowSubTab("cashflow"); openDashboardTab("cashflow"); }
    if (key === "freedom") { setFireCalcSubTab("menu"); openDashboardTab("fire-calculator"); }
    if (key === "profile") openDashboardTab("profile");
  };

  const isMobilePrimaryActive = (key: MobilePrimaryKey) => {
    if (key === "home") return tab === "overview";
    if (key === "money") return tab === "cashflow" || tab === "assets" || tab === "liabilities" || tab === "reports";
    if (key === "freedom") return tab === "fire-calculator";
    return tab === "profile" || tab === "goals";
  };

  const mobileDrawerItems = [
    { label: "Cashflow & Budget", tab: "cashflow" as TabKey, helper: "Income, spending, savings rate" },
    { label: "Accounts / Net Worth", tab: "assets" as TabKey, helper: "Assets, debts, connected accounts" },
    { label: "Insights", tab: "reports" as TabKey, helper: "Monthly spending patterns" },
    { label: "Freedom Date", tab: "fire-calculator" as TabKey, helper: "Result, levers, confidence check" },
    { label: "Profile & Assumptions", tab: "profile" as TabKey, helper: "Age, target, FIRE type, settings" },
    { label: "Learning Hub", tab: "learning-hub" as TabKey, helper: "Guides and explainers" },
  ];

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
        .select("default_currency, preferred_currencies")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile?.default_currency) setDefaultCurrency(profile.default_currency);
          if (profile?.preferred_currencies) setPreferredCurrencies(profile.preferred_currencies as string[]);
          if (!profile?.default_currency) {
            try {
              const raw = localStorage.getItem("uf_calc_prefill");
              if (raw) {
                const prefill = JSON.parse(raw) as { defaultCurrency?: string };
                if (prefill.defaultCurrency) {
                  setDefaultCurrency(prefill.defaultCurrency);
                  setPreferredCurrencies([prefill.defaultCurrency]);
                  void supabase.from("profiles").upsert(
                    {
                      user_id: session.user.id,
                      default_currency: prefill.defaultCurrency,
                      preferred_currencies: [prefill.defaultCurrency],
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" },
                  );
                }
              }
            } catch {}
          }
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
        let hadPrefill = false;
        try {
          const raw = localStorage.getItem("uf_calc_prefill");
          if (raw) { hadPrefill = true; prefill = JSON.parse(raw); localStorage.removeItem("uf_calc_prefill"); }
        } catch {}
        const prefillIncome = prefill.monthlyIncome ?? prefill.income;
        if (prefill.defaultCurrency) {
          setDefaultCurrency(prefill.defaultCurrency);
          setPreferredCurrencies((prev) => (prev.length > 0 ? prev : [prefill.defaultCurrency!]));
        }

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
          setRetirementCityName(fp.retirementCityName || "");
          setRetirementCityCol(fp.retirementCityCol || 0);
          setLifestyleMultiplier(fp.lifestyleMultiplier || 1.0);
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
        trackDashboardFirstView({ hadCalculatorPrefill: hadPrefill, viaUpgrade: wasUpgradedRef.current });
      });
      // Load net worth snapshot history for the "actual progress" chart line
      supabase.from("net_worth_snapshots")
        .select("portfolio_value, captured_at")
        .order("captured_at", { ascending: true })
        .limit(120)
        .then(({ data: snaps }) => { if (snaps) setNwSnapshots(snaps); });
    });
  }, []);

  // Show onboarding modal for new users (income=0, never dismissed)
  useEffect(() => {
    if (!profileLoading && income === 0 && !localStorage.getItem('uf_onboarding_dismissed')) {
      setOnboardingOpen(true);
    }
  }, [profileLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep startup calm: do not auto-open the survey.
  // The feedback widget remains available when users choose to send feedback.

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
      const fireProfile = { k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, cityName, retirementCityName, retirementCityCol, lifestyleMultiplier };
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
        // Capture net worth snapshot when portfolio value changes
        const currentInvestable = k401 + rothIRA + taxable + cashSavings;
        if (currentInvestable !== lastSnapshotRef.current) {
          lastSnapshotRef.current = currentInvestable;
          supabase.from("net_worth_snapshots").insert({
            user_id: session.user.id,
            portfolio_value: currentInvestable,
          }).then(({ error }) => {
            if (!error) setNwSnapshots(prev => {
              const today = new Date().toISOString().slice(0, 10);
              const filtered = prev.filter(s => s.captured_at.slice(0, 10) !== today);
              return [...filtered, { portfolio_value: currentInvestable, captured_at: new Date().toISOString() }];
            });
          });
        }
      }
    }, 1000);
  }, [income, expenses, fireAge, k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, cityName, retirementCityName, retirementCityCol, lifestyleMultiplier]);

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

  async function refreshPlaidHoldings() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setHoldingsLoading(true);
    try {
      const r = await fetch("/api/plaid/holdings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json().catch(() => null);
      if (d?.holdings) setPlaidHoldings(d.holdings);
      if (d?.securities) setPlaidSecurities(d.securities);
      if (d?.needs_reconnect) setHoldingsNeedsReconnect(d.needs_reconnect);
    } finally {
      setHoldingsLoading(false);
    }
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
        .uf-content { padding: 32px 36px 60px; }

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
        .uf-nav-label-mobile { display: none; }
        .uf-mobile-topbar, .uf-mobile-bottom-nav, .uf-mobile-drawer-backdrop, .uf-mobile-drawer { display: none; }
        .uf-section-switch { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 22px; }
        .uf-section-button { border: 1px solid #E2E8F0; background: #fff; color: #475569; border-radius: 999px; padding: 9px 13px; font-size: 12px; font-weight: 800; white-space: nowrap; font-family: 'Manrope', sans-serif; cursor: pointer; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
        .uf-section-button.active { border-color: #047857; background: #ECFDF5; color: #047857; }
        .uf-holdings-grid { display: grid; grid-template-columns: 80px minmax(0, 1fr) 80px 90px 100px; gap: 8px; min-width: 0; }
        .uf-holdings-grid > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        @media(max-width: 900px) {
          .uf-shell { flex-direction: column; min-height: 100dvh; }
          .uf-sidebar { display: none; }
          .uf-mobile-topbar { display: flex; position: fixed; top: 0; left: 0; right: 0; z-index: 120; height: calc(56px + env(safe-area-inset-top, 0px)); padding: calc(8px + env(safe-area-inset-top, 0px)) 16px 8px; background: rgba(255,255,255,0.96); border-bottom: 1px solid #E2E8F0; backdrop-filter: blur(14px); align-items: center; gap: 12px; }
          .uf-mobile-menu-button { width: 40px; height: 40px; border: 1px solid #E2E8F0; background: #fff; color: #0F172A; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
          .uf-mobile-top-title { display: flex; flex-direction: column; min-width: 0; }
          .uf-mobile-top-title strong { font-size: 15px; font-weight: 800; color: #064E3B; letter-spacing: -0.02em; }
          .uf-mobile-top-title span { font-size: 11px; color: #64748B; font-weight: 600; }
          .uf-mobile-bottom-nav { display: grid; grid-template-columns: repeat(4, 1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: 120; background: rgba(255,255,255,0.98); border-top: 1px solid #E2E8F0; padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -10px 28px rgba(15,23,42,0.08); }
          .uf-mobile-bottom-item { border: none; background: transparent; color: #64748B; border-radius: 14px; min-width: 0; padding: 7px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800; cursor: pointer; }
          .uf-mobile-bottom-item.active { background: #ECFDF5; color: #047857; }
          .uf-mobile-bottom-icon { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
          .uf-mobile-drawer-backdrop { display: block; position: fixed; inset: 0; z-index: 130; background: rgba(15,23,42,0.45); opacity: 0; pointer-events: none; transition: opacity 180ms ease; }
          .uf-mobile-drawer-backdrop.open { opacity: 1; pointer-events: auto; }
          .uf-mobile-drawer { display: flex; position: fixed; top: 0; bottom: 0; left: 0; z-index: 140; width: min(86vw, 340px); transform: translateX(-102%); transition: transform 220ms cubic-bezier(0.2,0,0,1); background: #fff; box-shadow: 20px 0 42px rgba(15,23,42,0.2); flex-direction: column; padding: calc(18px + env(safe-area-inset-top, 0px)) 16px calc(18px + env(safe-area-inset-bottom, 0px)); }
          .uf-mobile-drawer.open { transform: translateX(0); }
          .uf-mobile-drawer-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0; margin-bottom: 10px; }
          .uf-mobile-drawer-close { border: none; background: #F1F5F9; color: #64748B; width: 36px; height: 36px; border-radius: 999px; cursor: pointer; font-size: 18px; }
          .uf-mobile-drawer-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; padding: 4px 0; }
          .uf-mobile-drawer-item { border: 1px solid transparent; background: transparent; color: #334155; text-align: left; border-radius: 12px; padding: 12px 12px; cursor: pointer; font-family: 'Manrope', sans-serif; display: flex; flex-direction: column; gap: 3px; }
          .uf-mobile-drawer-item strong { font-size: 14px; }
          .uf-mobile-drawer-item span { font-size: 12px; color: #64748B; line-height: 1.4; }
          .uf-mobile-drawer-item.active { background: #ECFDF5; border-color: #BBF7D0; color: #047857; }
          .uf-mobile-drawer-actions { margin-top: auto; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 8px; }
          .uf-mobile-drawer-link { color: #334155; text-decoration: none; font-size: 13px; font-weight: 800; padding: 10px 12px; border-radius: 10px; background: #F8FAFC; }
          .uf-section-switch { display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex-wrap: nowrap; margin: -2px -16px 18px; padding: 0 16px 2px; }
          .uf-section-switch::-webkit-scrollbar { display: none; }
          .uf-section-button { border: 1px solid #E2E8F0; background: #fff; color: #475569; border-radius: 999px; padding: 9px 13px; font-size: 12px; font-weight: 800; white-space: nowrap; font-family: 'Manrope', sans-serif; cursor: pointer; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
          .uf-section-button.active { border-color: #047857; background: #ECFDF5; color: #047857; }
          .uf-main { overflow-y: unset; overflow-x: hidden; }
          .uf-content { padding: calc(72px + env(safe-area-inset-top, 0px)) 16px calc(112px + env(safe-area-inset-bottom, 0px)); }
          .uf-hero-split { flex-direction: column; min-height: unset; }
          .uf-hero-left { flex: none !important; padding: 20px 18px !important; }
          .uf-hero-right { flex: none !important; padding: 20px 18px !important; }
          .cf-mobile-bar { bottom: calc(82px + env(safe-area-inset-bottom, 0px)) !important; }
          .uf-nav-label-full { display: none; }
          .uf-nav-label-mobile { display: block; white-space: nowrap; overflow: hidden; max-width: 100%; }
          .uf-kpi-grid { display: flex !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; scroll-snap-type: x mandatory; grid-template-columns: none !important; }
          .uf-kpi-grid::-webkit-scrollbar { display: none; }
          .uf-kpi-grid > * { flex-shrink: 0 !important; min-width: 130px !important; scroll-snap-align: start; }
          .uf-holdings-grid { grid-template-columns: minmax(56px, 0.9fr) minmax(58px, 0.9fr) minmax(66px, 1fr) minmax(72px, 1fr); gap: 6px; }
          .uf-holdings-security { display: none; }
        }
        @media(max-width: 420px) {
          .uf-card { padding-left: 18px; padding-right: 18px; }
        }
      `}</style>

      {surveyOpen && (
        <SurveyModal
          onSubmit={async (responses) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            await fetch("/api/survey", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify(responses),
            });
            localStorage.setItem('uf_survey_done', '1');
            setSurveyOpen(false);
          }}
          onDismiss={() => {
            localStorage.setItem('uf_survey_done', '1');
            setSurveyOpen(false);
          }}
        />
      )}
      {onboardingOpen && (
        <OnboardingModal
          defaultCurrency={defaultCurrency}
          onComplete={(inc, spend, save) => {
            setIncome(inc);
            setExpenses(prev => ({ ...prev, other: spend }));
            setTaxable(save);
            localStorage.setItem('uf_onboarding_dismissed', '1');
            setOnboardingOpen(false);
          }}
          onDismiss={() => {
            localStorage.setItem('uf_onboarding_dismissed', '1');
            setOnboardingOpen(false);
          }}
        />
      )}
      {tourOpen && !onboardingOpen && !surveyOpen && (
        <TourModal onClose={closeTour} />
      )}

      <header className="uf-mobile-topbar" aria-label="Mobile dashboard header">
        <button
          className="uf-mobile-menu-button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="uf-mobile-top-title">
          <strong>UntilFire</strong>
          <span>{tab === "overview" ? "Home" : tab === "fire-calculator" || tab === "goals" ? "Freedom Date" : tab === "profile" ? "Profile" : "Portfolio"}</span>
        </div>
      </header>

      <div
        className={`uf-mobile-drawer-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />
      <aside className={`uf-mobile-drawer ${mobileMenuOpen ? "open" : ""}`} aria-label="Mobile menu" aria-hidden={!mobileMenuOpen}>
        <div className="uf-mobile-drawer-header">
          <div className="uf-mobile-top-title">
            <strong>UntilFire</strong>
            <span>Menu</span>
          </div>
          <button className="uf-mobile-drawer-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">×</button>
        </div>
        <nav className="uf-mobile-drawer-list">
          {mobileDrawerItems.map(item => (
            <button
              key={item.tab}
              className={`uf-mobile-drawer-item ${tab === item.tab ? "active" : ""}`}
              onClick={() => openDashboardTab(item.tab)}
            >
              <strong>{item.label}</strong>
              <span>{item.helper}</span>
            </button>
          ))}
        </nav>
        <div className="uf-mobile-drawer-actions">
          <a className="uf-mobile-drawer-link" href="/fire-type?source=dashboard-mobile-menu">FIRE Type quiz →</a>
          <button className="uf-mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); setTourOpen(true); }}>
            <strong>Take a tour</strong>
            <span>Quick walkthrough of the dashboard</span>
          </button>
        </div>
      </aside>

      <nav className="uf-mobile-bottom-nav" aria-label="Primary mobile navigation">
        {MOBILE_PRIMARY_ITEMS.map(item => {
          const active = isMobilePrimaryActive(item.key);
          return (
            <button
              key={item.key}
              className={`uf-mobile-bottom-item ${active ? "active" : ""}`}
              onClick={() => openMobilePrimary(item.key)}
            >
              <span className="uf-mobile-bottom-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: item.svg }} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="uf-shell">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="uf-sidebar">
          <Link href="/" className="uf-sidebar-logo"><Logo variant="light" size={26} /></Link>

          <nav className="uf-sidebar-nav">
            {SIDEBAR_ITEMS.map(item => (
              <button
                key={item.key}
                data-tour-item={item.key}
                className={`uf-sidebar-item ${(tab === item.key || item.activeTabs?.includes(tab)) ? "active" : ""}`}
                onClick={() => openDashboardTab(item.key)}
              >
                <span className="uf-sidebar-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: item.svg }} />
                </span>
                <span className="uf-nav-label-full">{item.label}</span>
                <span className="uf-nav-label-mobile">{item.mobileLabel ?? item.label}</span>
              </button>
            ))}
          </nav>

          <div className="uf-sidebar-bottom">
            {saveStatus === "saving" && <span style={{ color: "#64748B", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Saving…</span>}
            {saveStatus === "saved"  && <span style={{ color: "#059669", fontSize: 12, fontFamily: "Inter, sans-serif" }}>✓ Saved</span>}
            {saveStatus === "error"  && <span style={{ color: "#dc2626", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Save failed</span>}
            <div data-tour-item="profile">
              <UserNav onProfileClick={() => setTab("profile")} isProfileActive={tab === "profile"} />
            </div>
            <button
              onClick={() => setTourOpen(true)}
              style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "2px 0", textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}
            >
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #CBD5E1", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>?</span>
              Take a tour
            </button>
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
            {(tab === "cashflow" || tab === "assets" || tab === "liabilities" || tab === "reports") && (
              <nav className="uf-section-switch" aria-label="Money sections">
                {([
                  { label: "Cashflow", active: tab === "cashflow", onClick: () => { setCashflowSubTab("cashflow"); openDashboardTab("cashflow"); } },
                  { label: "Net Worth", active: tab === "assets", onClick: () => openDashboardTab("assets") },
                  { label: "Debts", active: tab === "liabilities", onClick: () => openDashboardTab("liabilities") },
                  { label: "Insights", active: tab === "reports", onClick: () => openDashboardTab("reports") },
                ]).map(item => (
                  <button
                    key={item.label}
                    className={`uf-section-button ${item.active ? "active" : ""}`}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
            {(tab === "fire-calculator" || tab === "goals" || tab === "learning-hub") && (
              <nav className="uf-section-switch" aria-label="Freedom sections">
                {([
                  { label: "Freedom Date", active: tab === "fire-calculator" && fireCalcSubTab === "menu", onClick: () => { openDashboardTab("fire-calculator"); setFireCalcSubTab("menu"); } },
                  { label: "Confidence", active: tab === "fire-calculator" && fireCalcSubTab === "simulation", onClick: () => { openDashboardTab("fire-calculator"); setFireCalcSubTab("simulation"); } },
                  { label: "Advanced", active: tab === "fire-calculator" && fireCalcSubTab === "invest-sim", onClick: () => { openDashboardTab("fire-calculator"); setFireCalcSubTab("invest-sim"); } },
                  { label: "Lifestyle", active: tab === "goals", onClick: () => openDashboardTab("goals") },
                  { label: "Learn", active: tab === "learning-hub", onClick: () => openDashboardTab("learning-hub") },
                ]).map(item => (
                  <button
                    key={item.label}
                    className={`uf-section-button ${item.active ? "active" : ""}`}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
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
                plaidAccounts={plaidAccounts}
                retirementCityName={retirementCityName}
                retirementCityCol={retirementCityCol}
                lifestyleMultiplier={lifestyleMultiplier}
                fireAge={fireAge}
                nwSnapshots={nwSnapshots}
                onTabChange={setTab}
                onOpenOnboarding={() => setOnboardingOpen(true)}
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
                {cashflowSubTab === "cashflow" && <TransactionsTab defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} preferredCurrencies={preferredCurrencies} />}
                {cashflowSubTab === "categories" && <CategoriesTab key={categoriesKey} displayCurrency={defaultCurrency} displayRates={rates} />}
                {cashflowSubTab === "recurring" && <RecurringTab defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} preferredCurrencies={preferredCurrencies} />}
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
                  onUpgradeClick={() => { setUpgradeSource("plaid_limit"); setUpgradeOpen(true); }}
                  monthlyExpenses={monthlyExpenses}
                  plaidHoldings={plaidHoldings}
                  plaidSecurities={plaidSecurities}
                  holdingsNeedsReconnect={holdingsNeedsReconnect}
                  holdingsLoading={holdingsLoading}
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
                    onOpenProfile={() => setTab("profile")}
                    onOpenSimulation={() => setFireCalcSubTab("simulation")}
                    onOpenInvestSim={() => setFireCalcSubTab("invest-sim")}
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
                    onOpenBudgets={() => { setTab("cashflow"); setCashflowSubTab("budgets"); }}
                    onOpenProfile={() => setTab("profile")}
                  />
                )}
                {fireCalcSubTab === "invest-sim" && (
                  <InvestSimTab onBack={() => setFireCalcSubTab("menu")} />
                )}
              </div>
            )}
            {tab === "goals" && (
              <GoalsPageTab
                retirementCityName={retirementCityName}
                retirementCityCol={retirementCityCol}
                lifestyleMultiplier={lifestyleMultiplier}
                withdrawalRate={withdrawalRate}
                displayCurrency={defaultCurrency}
                displayRates={rates}
                onCityChange={(name, col) => { setRetirementCityName(name); setRetirementCityCol(col); }}
                onLifestyleChange={setLifestyleMultiplier}
              />
            )}
            {tab === "reports" && <ReportsTab displayCurrency={defaultCurrency} displayRates={rates} />}
            {tab === "learning-hub" && <LearningHubTab recommendedStageId={suggestedLearnStage} />}
            {tab === "profile" && userId && (
              <ProfileTab
                userId={userId}
                userEmail={userEmail}
                defaultCurrency={defaultCurrency}
                onDefaultCurrencyChange={setDefaultCurrency}
                onPreferredCurrenciesChange={setPreferredCurrencies}
                onTabChange={(t) => setTab(t as TabKey)}
                subscription={subscription}
                onUpgradeClick={() => { setUpgradeSource("profile"); setUpgradeOpen(true); }}
                onManageBilling={handleManageBilling}
                fireAge={fireAge}
                onFireAgeChange={setFireAge}
                retirementCityName={retirementCityName}
                retirementCityCol={retirementCityCol}
                lifestyleMultiplier={lifestyleMultiplier}
                onRetirementCityChange={(name, col) => { setCityName(name); setRetirementCityName(name); setRetirementCityCol(col); }}
                onLifestyleChange={setLifestyleMultiplier}
              />
            )}
          </div>
        </main>
      </div>
      <FeedbackWidget />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} source={upgradeSource} />
    </>
  );
}
