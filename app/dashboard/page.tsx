"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
  ComposedChart, Area,
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

type EmergencyFundState = "missing" | "fragile" | "rebuilding" | "healthy";
type EmergencyFundPriorityMode = "protect" | "balance" | "grow";

const EMERGENCY_FUND_HISTORY_KEY = "uf_emergency_fund_healthy_once_v1";
const EMERGENCY_FUND_FLOOR_MONTHS = 1.5;
const EMERGENCY_FUND_TARGET_MONTHS = 4;

function useEmergencyFundHistory(isHealthyNow: boolean) {
  const [hasEverHealthy, setHasEverHealthy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setHasEverHealthy(window.localStorage.getItem(EMERGENCY_FUND_HISTORY_KEY) === "1");
    } catch {
      // ignore localStorage failures
    }
  }, []);

  useEffect(() => {
    if (!isHealthyNow || hasEverHealthy || typeof window === "undefined") return;
    setHasEverHealthy(true);
    try {
      window.localStorage.setItem(EMERGENCY_FUND_HISTORY_KEY, "1");
    } catch {
      // ignore localStorage failures
    }
  }, [isHealthyNow, hasEverHealthy]);

  return hasEverHealthy || isHealthyNow;
}

function getEmergencyFundPlan(balance: number, monthlyExpenses: number, hasEverHealthy: boolean) {
  const floorAmount = Math.max(monthlyExpenses * EMERGENCY_FUND_FLOOR_MONTHS, 0);
  const targetAmount = Math.max(monthlyExpenses * EMERGENCY_FUND_TARGET_MONTHS, 0);
  const coverageMonths = monthlyExpenses > 0 ? balance / monthlyExpenses : 0;
  const isHealthyNow = monthlyExpenses > 0 && coverageMonths >= EMERGENCY_FUND_TARGET_MONTHS;

  let state: EmergencyFundState = "missing";
  let priorityMode: EmergencyFundPriorityMode = "protect";
  let stateLabel = "Missing";
  let headline = "Protect your plan first";
  let guidance = "Build your safety buffer before taking more risk elsewhere.";

  if (isHealthyNow) {
    state = "healthy";
    priorityMode = "grow";
    stateLabel = "Healthy";
    headline = "Your safety buffer is in place";
    guidance = "Keep it maintained, then let extra cash work harder on growth.";
  } else if (coverageMonths >= EMERGENCY_FUND_FLOOR_MONTHS) {
    priorityMode = "balance";
    if (hasEverHealthy) {
      state = "rebuilding";
      stateLabel = "Rebuilding";
      headline = "Rebuild your safety buffer";
      guidance = "Your reserve did its job. Top it back up while keeping some momentum elsewhere.";
    } else {
      state = "fragile";
      stateLabel = "Fragile";
      headline = "Strengthen your safety buffer";
      guidance = "You have a base now. Keep building it while staying in motion elsewhere.";
    }
  } else if (hasEverHealthy) {
    state = "rebuilding";
    priorityMode = "protect";
    stateLabel = "Rebuilding";
    headline = "Refill your emergency fund first";
    guidance = "You used your buffer for real life. Get back above your floor before pushing harder on growth.";
  }

  return {
    floorAmount,
    targetAmount,
    coverageMonths,
    isHealthyNow,
    state,
    stateLabel,
    priorityMode,
    headline,
    guidance,
    gapToFloor: Math.max(floorAmount - balance, 0),
    gapToTarget: Math.max(targetAmount - balance, 0),
    progressToTargetPct: targetAmount > 0 ? Math.min(100, (balance / targetAmount) * 100) : 0,
  };
}

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

const normalizePlaidSubtype = (subtype: string | null | undefined) =>
  (subtype ?? "").toLowerCase().replace(/[_-]/g, " ").trim();

const isRetirementInvestmentAccount = (account: PlaidAccount) => {
  if (account.type !== "investment") return false;
  const subtype = normalizePlaidSubtype(account.subtype);
  return [
    "401",
    "403",
    "457",
    "ira",
    "roth",
    "retirement",
    "pension",
    "annuity",
    "sep",
    "simple",
    "keogh",
  ].some((token) => subtype.includes(token));
};

const isBrokerageInvestmentAccount = (account: PlaidAccount) => (
  account.type === "investment" && !isRetirementInvestmentAccount(account)
);

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
      <span style={{ color: "#94A3B8", fontSize: 13, fontFamily: "Manrope, sans-serif" }}>{prefix}</span>
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
        style={{ background: "none", border: "none", outline: "none", color: "#19181E", fontSize: 14, width: "100%", fontFamily: "Manrope, sans-serif" }}
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
                <span style={{ fontSize: 12, fontWeight: 700, color: row.color, background: `${row.color}18`, borderRadius: 20, padding: "3px 10px", fontFamily: "Manrope, sans-serif" }}>
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
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: "Manrope, sans-serif" }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {result.histogram.map(h => (
              <div key={h.bucket} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Manrope, sans-serif", width: 36, flexShrink: 0, textAlign: "right" }}>{h.bucket}</span>
                <div style={{ flex: 1, height: 14, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(h.count / maxCount) * 100}%`, background: h.within40 ? "#059669" : "#D97706", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
                <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Manrope, sans-serif", width: 26, flexShrink: 0, textAlign: "right" }}>
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
                <span style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", color: m.color, textDecoration: "underline dotted" }}>{m.label}</span>
                <span style={{ fontSize: 10, fontFamily: "Manrope, sans-serif", color: "#94A3B8", marginLeft: 2 }}>{pctYr(m.val)}</span>
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
        <span style={{ fontSize: 13, fontFamily: "Manrope, sans-serif", color: "#19181E", flexShrink: 0, minWidth: 90 }}>
          +{fmtMoney(extraSavings)}/mo
        </span>
        {yearDelta > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "#ECFDF5", borderRadius: 20, padding: "4px 12px", fontFamily: "Manrope, sans-serif", flexShrink: 0 }}>
            −{yearDelta} yr
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "Manrope, sans-serif", flexShrink: 0 }}>drag to simulate</span>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Overview Tab ───────────────────────────────────────────────────
function DashTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, actuals: _actuals = {}, actualIncome = 0, actualExpenses = 0, cityName = "", prevIncome = 0, prevExpenses = 0, userName = "", displayCurrency, displayRates, plaidAccounts = [], retirementCityCol = 0, lifestyleMultiplier = 1.0, fireAge = 0, nwSnapshots = [], recentTransactions = [], plaidHoldings = [], budgetMode = "manual", histMonthsCount = 0, onTabChange, onOpenOnboarding }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
  actuals?: Record<string, number>; actualIncome?: number; actualExpenses?: number; cityName?: string;
  prevIncome?: number; prevExpenses?: number; userName?: string;
  displayCurrency: string; displayRates: Record<string, number>;
  plaidAccounts?: PlaidAccount[];
  retirementCityCol?: number; lifestyleMultiplier?: number;
  fireAge?: number;
  nwSnapshots?: { portfolio_value: number; captured_at: string }[];
  recentTransactions?: { date: string; amount: number; currency: string; transaction_type?: string }[];
  plaidHoldings?: PlaidHolding[];
  budgetMode?: "manual" | "history";
  histMonthsCount?: number;
  onTabChange?: (tab: TabKey) => void;
  onOpenOnboarding?: () => void;
}) {
  const [chartPeriod, setChartPeriod] = useState<"5Y" | "15Y" | "All">("5Y");
  const [showBreakdown, setShowBreakdown] = useState(true);
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);
  const chartMonthTickFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }), []);
  const chartMonthTooltipFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }), []);

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
  const chartData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxHistoryStart = new Date(currentMonth);
    maxHistoryStart.setMonth(maxHistoryStart.getMonth() - 36);
    const earliestTx = recentTransactions.length > 0
      ? new Date(recentTransactions[0].date)
      : null;
    const historyStart = earliestTx && earliestTx > maxHistoryStart
      ? new Date(earliestTx.getFullYear(), earliestTx.getMonth(), 1)
      : maxHistoryStart;

    const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthTick = (date: Date) => chartMonthTickFormatter.format(date).replace(" ", " '");

    const flowByDay = new Map<string, number>();
    for (const tx of recentTransactions) {
      const txDate = new Date(tx.date);
      if (Number.isNaN(txDate.getTime())) continue;
      const day = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      if (day < historyStart || day > today) continue;
      const key = day.toISOString().slice(0, 10);
      const signedAmount = tx.transaction_type === "income"
        ? toUSD(tx.amount, tx.currency ?? displayCurrency, displayRates)
        : -toUSD(tx.amount, tx.currency ?? displayCurrency, displayRates);
      flowByDay.set(key, (flowByDay.get(key) ?? 0) + signedAmount);
    }

    // These are set inside the flowByDay branch and used for todayEntry below
    let todayContributions: number | null = null;
    let todayMarketGain: number | null = null;

    const historyEntries: Array<{
      key: string;
      label: string;
      shortLabel: string;
      actual: number | null;
      projected: number | null;
      yearsOut: number | null;
      phase: "history" | "today" | "projection";
      Contributions?: number | null;
      "Market Growth"?: number | null;
    }> = [];

    if (flowByDay.size > 0) {
      let runningBalance = investable;
      const points: { date: Date; value: number }[] = [{ date: today, value: investable }];
      const cursor = new Date(today);
      while (cursor > historyStart) {
        const dayKey = cursor.toISOString().slice(0, 10);
        runningBalance -= flowByDay.get(dayKey) ?? 0;
        cursor.setDate(cursor.getDate() - 1);
        points.push({ date: new Date(cursor), value: runningBalance });
      }
      points.reverse();

      // Compute cumulative net contributions forward from historyStart
      // so we can split each month's portfolio value into contributed vs market-gained
      const startValue = points[0]?.value ?? investable;
      const cumFlowByMonth = new Map<string, number>();
      let cumFlow = 0;
      const fwdCursor = new Date(historyStart);
      while (fwdCursor <= today) {
        const dayKey = fwdCursor.toISOString().slice(0, 10);
        cumFlow += flowByDay.get(dayKey) ?? 0;
        cumFlowByMonth.set(toMonthKey(fwdCursor), cumFlow);
        fwdCursor.setDate(fwdCursor.getDate() + 1);
      }

      // Build a map of actual portfolio values from nwSnapshots (includes unrealized gains).
      // For each month keep the last snapshot — most up-to-date reading for that period.
      // Skip snapshots with portfolio_value = 0 (captured before Plaid accounts loaded).
      const snapByMonth = new Map<string, number>();
      for (const snap of [...nwSnapshots].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime())) {
        const d = new Date(snap.captured_at);
        if (!Number.isNaN(d.getTime()) && snap.portfolio_value > 0) snapByMonth.set(toMonthKey(d), snap.portfolio_value);
      }

      const monthEndPoints = new Map<string, { date: Date; value: number }>();
      for (const point of points) {
        if (point.date.getFullYear() === today.getFullYear() && point.date.getMonth() === today.getMonth()) continue;
        monthEndPoints.set(toMonthKey(point.date), point);
      }

      historyEntries.push(
        ...Array.from(monthEndPoints.values()).map((point, index) => {
          const monthKey = toMonthKey(point.date);
          // Prefer actual snapshot value (captures unrealized market gains) over
          // reconstructed balance (which only reflects cash flows, not market appreciation)
          const snapVal = snapByMonth.get(monthKey);
          const portfolioVal = snapVal !== undefined
            ? Math.max(0, Math.round(snapVal))
            : Math.max(0, Math.round(point.value));
          const monthCumFlow = cumFlowByMonth.get(monthKey) ?? 0;
          // If portfolioVal is suspiciously near 0 (bad data), skip the breakdown
          const contributed = portfolioVal > 0 ? Math.min(portfolioVal, Math.round(startValue + monthCumFlow)) : null;
          const marketGain = contributed !== null ? Math.max(0, portfolioVal - contributed) : null;
          return {
            key: `history-${index}`,
            label: chartMonthTooltipFormatter.format(point.date),
            shortLabel: monthTick(point.date),
            actual: portfolioVal,
            projected: null,
            yearsOut: null,
            phase: "history" as const,
            Contributions: contributed,
            "Market Growth": marketGain,
          };
        })
      );

      // Compute today's split using the same formula so the stacked area
      // connects smoothly at the history/today boundary
      const todayCumFlow = cumFlowByMonth.get(toMonthKey(today)) ?? 0;
      todayContributions = Math.min(investable, Math.round(startValue + todayCumFlow));
      todayMarketGain = Math.max(0, investable - todayContributions);
    } else {
      const monthEndSnapshots = new Map<string, { date: Date; value: number }>();
      for (const snap of [...nwSnapshots].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime())) {
        const capturedAt = new Date(snap.captured_at);
        if (Number.isNaN(capturedAt.getTime()) || capturedAt < historyStart) continue;
        if (capturedAt.getFullYear() === today.getFullYear() && capturedAt.getMonth() === today.getMonth()) continue;
        monthEndSnapshots.set(toMonthKey(capturedAt), { date: capturedAt, value: snap.portfolio_value });
      }

      historyEntries.push(
        ...Array.from(monthEndSnapshots.values()).map((snap, index) => ({
          key: `history-${index}`,
          label: chartMonthTooltipFormatter.format(snap.date),
          shortLabel: monthTick(snap.date),
          actual: snap.value,
          projected: null,
          yearsOut: null,
          phase: "history" as const,
          Contributions: null as number | null,
          "Market Growth": null as number | null,
        }))
      );
    }

    // If Plaid holdings include cost_basis, use it for the today split.
    // cost_basis = total amount spent buying stocks (all time, not just 3 months),
    // so investable - cost_basis = actual unrealized gain including appreciation.
    const holdingsWithBasis = plaidHoldings.filter(
      h => h.cost_basis !== null && h.cost_basis > 0 && h.institution_value !== null
    );
    if (holdingsWithBasis.length > 0) {
      const totalCostBasis = holdingsWithBasis.reduce((s, h) => s + (h.cost_basis ?? 0), 0);
      todayContributions = Math.min(investable, Math.round(totalCostBasis));
      todayMarketGain = Math.max(0, investable - todayContributions);
    }

    const todayEntry = {
      key: "today",
      label: "Today",
      shortLabel: monthTick(today),
      actual: investable,
      projected: investable,
      yearsOut: 0,
      phase: "today" as const,
      Contributions: todayContributions ?? rawChartData[0]?.["Contributions"] ?? 0,
      "Market Growth": todayMarketGain ?? rawChartData[0]?.["Market Growth"] ?? 0,
    };

    const futureEntries = Array.from({ length: Math.max(0, (rawChartData.length - 1) * 12) }, (_, index) => {
      const monthOffset = index + 1;
      const yearsOut = monthOffset / 12;
      const lowerYear = Math.floor(yearsOut);
      const upperYear = Math.min(rawChartData.length - 1, Math.ceil(yearsOut));
      const lowerPoint = rawChartData[lowerYear] ?? rawChartData[0];
      const upperPoint = rawChartData[upperYear] ?? rawChartData[rawChartData.length - 1];
      const fraction = yearsOut - lowerYear;
      const interpolate = (key: "Investable" | "Contributions" | "Market Growth") => {
        const start = lowerPoint?.[key] ?? 0;
        const end = upperPoint?.[key] ?? start;
        return Math.round(start + (end - start) * fraction);
      };
      const pointDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      return {
        key: `future-${monthOffset}`,
        label: chartMonthTooltipFormatter.format(pointDate),
        shortLabel: monthTick(pointDate),
        actual: null,
        projected: interpolate("Investable"),
        yearsOut,
        phase: "projection" as const,
        Contributions: interpolate("Contributions"),
        "Market Growth": interpolate("Market Growth"),
      };
    });

    return [...historyEntries, todayEntry, ...futureEntries];
  }, [rawChartData, investable, nwSnapshots, chartMonthTickFormatter, chartMonthTooltipFormatter, recentTransactions, displayCurrency, displayRates, plaidHoldings]);
  const retireYear  = fireYear ? new Date().getFullYear() + fireYear : null;

  // Greeting
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = (userName.split(" ")[0] || "").trim();
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const formattedDate = `${DAY_NAMES[now.getDay()]} · ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  // Chart period filter
  const periodData = useMemo(() => {
    const limit = chartPeriod === "5Y" ? 5 : chartPeriod === "15Y" ? 15 : Number.POSITIVE_INFINITY;
    return chartData.filter(entry => entry.phase !== "projection" || ((entry.yearsOut ?? 0) <= limit));
  }, [chartData, chartPeriod]);

  // KPI trends — cashflow transactions only
  const hasActuals       = actualIncome > 0 || actualExpenses > 0;

  // Status pill
  const statusLabel = savingsRate >= 50 ? "Ahead of schedule" : savingsRate >= 25 ? "On track" : income > 0 ? "Needs attention" : "No data yet";
  const statusColor = savingsRate >= 50 ? "#059669" : savingsRate >= 25 ? "#20D4BF" : income > 0 ? "#F59E0B" : "#94A3B8";

  const bestMove = nextMoveScenarios?.[0] ?? null;
  const actualOrPlannedIncome = hasActuals ? actualIncome : income;
  const actualOrPlannedExpenses = hasActuals ? actualExpenses : monthlyExpenses;
  const actualOrPlannedSavings = actualOrPlannedIncome - actualOrPlannedExpenses;
  const goalContribution = Math.max(annualSavings / 12, 0);
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedFraction = Math.min(1, Math.max(now.getDate() / monthDays, 0.05));
  const expectedSpendToDate = monthlyExpenses * elapsedFraction;
  const spendingDeltaToDate = hasActuals ? actualExpenses - expectedSpendToDate : 0;
  const projectedMonthSpend = hasActuals && elapsedFraction > 0 ? actualExpenses / elapsedFraction : monthlyExpenses;
  const projectedSpendStatus = hasActuals
    ? spendingDeltaToDate > monthlyExpenses * 0.05
      ? "Running above plan"
      : spendingDeltaToDate < -monthlyExpenses * 0.05
        ? "Running below plan"
        : "Close to plan"
    : "Add transactions to compare against plan";
  const overspendProjection = useMemo(() => {
    if (!hasActuals || income <= 0 || fireYear === null) return null;
    return calcProjection({
      annualIncome: income * 12,
      monthlyExpenses: Math.max(projectedMonthSpend, 0),
      k401,
      rothIRA,
      taxable,
      cashSavings: totalCash,
      totalDebt,
      mortgageBalance,
      mortgageMonthly,
      growthRate,
      withdrawalRate,
      targetMonthlyExpenses,
    });
  }, [hasActuals, income, fireYear, projectedMonthSpend, k401, rothIRA, taxable, totalCash, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses]);
  const spendingImpactYears = overspendProjection && fireYear !== null && overspendProjection.fireYear !== null
    ? overspendProjection.fireYear - fireYear
    : 0;
  const spendingImpactLabel = spendingImpactYears > 0.15
    ? `Could push freedom back about ${spendingImpactYears >= 1.5 ? `${spendingImpactYears.toFixed(1)} years` : `${Math.round(spendingImpactYears * 12)} months`}`
    : spendingImpactYears < -0.15
      ? `Could bring freedom forward about ${Math.abs(spendingImpactYears) >= 1.5 ? `${Math.abs(spendingImpactYears).toFixed(1)} years` : `${Math.round(Math.abs(spendingImpactYears) * 12)} months`}`
      : "No meaningful change to your freedom date yet";
  const manualRetirementTotal = k401 + rothIRA;
  const connectedRetirementTotal = plaidAccounts
    .filter(isRetirementInvestmentAccount)
    .reduce((sum, account) => sum + (account.balance_current ?? 0), 0);
  const connectedBrokerageTotal = plaidAccounts
    .filter(isBrokerageInvestmentAccount)
    .reduce((sum, account) => sum + (account.balance_current ?? 0), 0);
  const connectedCashTotal = plaidAccounts
    .filter((account) => account.type === "depository")
    .reduce((sum, account) => sum + (account.balance_current ?? 0), 0);
  const retirementAccounts = connectedRetirementTotal > 0 ? connectedRetirementTotal : manualRetirementTotal;
  const brokerageAssets = connectedBrokerageTotal > 0 ? connectedBrokerageTotal : taxable;
  const displayCashAssets = connectedCashTotal > 0 ? connectedCashTotal : cashSavings;
  const positiveMoneyTotal = Math.max(retirementAccounts, 0) + Math.max(brokerageAssets, 0) + Math.max(displayCashAssets, 0);
  const retirementPct = positiveMoneyTotal > 0 ? (Math.max(retirementAccounts, 0) / positiveMoneyTotal) * 100 : 0;
  const brokeragePct = positiveMoneyTotal > 0 ? (Math.max(brokerageAssets, 0) / positiveMoneyTotal) * 100 : 0;
  const cashPct = positiveMoneyTotal > 0 ? (Math.max(displayCashAssets, 0) / positiveMoneyTotal) * 100 : 0;
  const moneyMixGradient = positiveMoneyTotal > 0
    ? `conic-gradient(#064E3B 0% ${retirementPct}%, #10B981 ${retirementPct}% ${retirementPct + brokeragePct}%, #CFFAEF ${retirementPct + brokeragePct}% 100%)`
    : "conic-gradient(#E2E8F0 0% 100%)";
  const moneyMixSourceLabel = plaidAccounts.some((account) => account.type === "depository" || account.type === "investment")
    ? "Connected balances shown where available"
    : "Using manual balances";
  const currentNetWorth = investable - totalDebt - mortgageBalance;
  const growthSummary = retireYear
    ? statusLabel === "Ahead of schedule"
      ? `At this pace, you’re tracking a little ahead of ${retireYear}.`
      : statusLabel === "On track"
        ? `Your current path still points to ${retireYear}.`
        : `Your current path needs a nudge to protect ${retireYear}.`
    : "Finish your setup to see your projected freedom date.";
  const spendingStatusColor = projectedSpendStatus === "Running above plan" ? "#DC2626" : projectedSpendStatus === "Running below plan" ? "#059669" : "#64748B";
  const spendingBarColor = projectedSpendStatus === "Running above plan" ? "#DC2626" : projectedSpendStatus === "Running below plan" ? "#059669" : "#0F766E";
  const spendingProgressPct = monthlyExpenses > 0 ? Math.min((actualOrPlannedExpenses / monthlyExpenses) * 100, 100) : 0;
  const spendingExpectedPct = hasActuals ? Math.min(elapsedFraction * 100, 100) : 0;
  const spendingBarTrackColor = hasActuals ? "#E2E8F0" : "#F1F5F9";
  const investedBalance = Math.max(retirementAccounts, 0) + Math.max(brokerageAssets, 0);
  const availableCash = Math.max(displayCashAssets, 0);
  const emergencyFundHealthyNow = monthlyExpenses > 0 && (availableCash / monthlyExpenses) >= EMERGENCY_FUND_TARGET_MONTHS;
  const hasEverHealthyEmergencyFund = useEmergencyFundHistory(emergencyFundHealthyNow);
  const emergencyFundPlan = getEmergencyFundPlan(availableCash, monthlyExpenses, hasEverHealthyEmergencyFund);
  const hasInvestmentAccounts = plaidAccounts.some((account) => account.type === "investment") || manualRetirementTotal > 0 || taxable > 0;
  const plannedContributionGap = Math.max(goalContribution - Math.max(actualOrPlannedSavings, 0), 0);
  const investingHeadline = goalContribution > 0
    ? `Aim to add ${fmtMoney(goalContribution)} this month. Current invested balance is ${fmtMoney(investedBalance, true)}.`
    : investedBalance > 0
      ? `You have ${fmtMoney(investedBalance, true)} invested right now.`
      : "Add your first investment account to start tracking this here.";
  const investingNote = "Using your current balances for now. Exact monthly contribution and return tracking comes next.";
  const consistencyMonths = (() => {
    const months: Array<{ key: string; date: Date; income: number; expenses: number }> = [];
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    for (let i = 0; i < 6; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, date, income: 0, expenses: 0 });
    }

    const byKey = new Map(months.map((month) => [month.key, month]));
    for (const tx of recentTransactions) {
      const txDate = new Date(tx.date);
      if (Number.isNaN(txDate.getTime())) continue;
      const monthDate = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
      if (monthDate < start || monthDate > new Date(now.getFullYear(), now.getMonth(), 1)) continue;
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      const amount = toUSD(tx.amount, tx.currency ?? displayCurrency, displayRates);
      if (tx.transaction_type === "income") bucket.income += amount;
      else bucket.expenses += amount;
    }

    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const currentBucket = byKey.get(currentKey);
    if (currentBucket && hasActuals) {
      currentBucket.income = actualIncome;
      currentBucket.expenses = actualExpenses;
    }
    const prevBucket = byKey.get(prevKey);
    if (prevBucket && (prevIncome > 0 || prevExpenses > 0)) {
      prevBucket.income = prevIncome;
      prevBucket.expenses = prevExpenses;
    }

    return months
      .filter((month) => month.income > 0 || month.expenses > 0)
      .map((month) => {
        const savings = month.income - month.expenses;
        const metSavingsGoal = goalContribution > 0 ? savings >= goalContribution * 0.85 : savings >= 0;
        const stayedNearPlan = monthlyExpenses > 0 ? month.expenses <= monthlyExpenses * 1.08 : true;
        return {
          ...month,
          savings,
          onTrack: metSavingsGoal && stayedNearPlan,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  })();
  const consistencyRun = (() => {
    let run = 0;
    for (const month of consistencyMonths) {
      if (!month.onTrack) break;
      run += 1;
    }
    return run;
  })();
  const onTrackMonths = consistencyMonths.filter((month) => month.onTrack).length;
  const trackedMonths = consistencyMonths.length;
  const consistencyLabel = trackedMonths === 0
    ? "Not enough history yet"
    : consistencyRun >= 2
      ? `${consistencyRun}-month run`
      : consistencyMonths[0]?.onTrack
        ? "On track this month"
        : "Needs a reset";
  const consistencyDetail = trackedMonths === 0
    ? "Track a few months to see how steady your plan is here."
    : `${onTrackMonths} of the last ${trackedMonths} tracked months were on plan.`;
  const consistencySupport = consistencyMonths[0]
    ? `${fmtMoney(Math.abs(consistencyMonths[0].savings))} ${consistencyMonths[0].savings >= 0 ? "saved" : "net short"} in ${consistencyMonths[0].date.toLocaleString("en-US", { month: "short" })}`
    : "We’ll start tracking this once your monthly history fills in.";
  const topTasks = (() => {
    const tasks: Array<{
      label: string;
      detail: string;
      impactYears: number;
      priority: number;
      progressPct?: number;
      progressText?: string;
      progressAria?: string;
    }> = [];
    const seen = new Set<string>();
    const addTask = (
      label: string,
      detail: string,
      impactYears = 0,
      priority = 0,
      progress?: { progressPct: number; progressText: string; progressAria: string },
    ) => {
      if (seen.has(label)) return;
      seen.add(label);
      tasks.push({
        label,
        detail,
        impactYears: Math.max(0, impactYears),
        priority,
        progressPct: progress ? Math.max(0, Math.min(progress.progressPct, 100)) : undefined,
        progressText: progress?.progressText,
        progressAria: progress?.progressAria,
      });
    };

    if (monthlyExpenses > 0 && emergencyFundPlan.priorityMode === "protect") {
      const refillAmount = emergencyFundPlan.gapToFloor > 0 ? emergencyFundPlan.gapToFloor : Math.min(emergencyFundPlan.gapToTarget, Math.max(monthlyExpenses * 0.75, 0));
      addTask(
        `Rebuild your emergency fund by about ${fmtMoney(refillAmount, true)}`,
        `${emergencyFundPlan.coverageMonths.toFixed(1)} months covered now. Get back above your ${EMERGENCY_FUND_FLOOR_MONTHS}-month floor before pushing harder on growth.`,
        0,
        100,
        {
          progressPct: emergencyFundPlan.floorAmount > 0 ? (availableCash / emergencyFundPlan.floorAmount) * 100 : 0,
          progressText: `${emergencyFundPlan.coverageMonths.toFixed(1)} / ${EMERGENCY_FUND_FLOOR_MONTHS.toFixed(1)} mo`,
          progressAria: `Emergency fund progress: ${emergencyFundPlan.coverageMonths.toFixed(1)} of ${EMERGENCY_FUND_FLOOR_MONTHS.toFixed(1)} months covered`,
        },
      );
    }

    if (monthlyExpenses > 0 && emergencyFundPlan.priorityMode === "balance") {
      addTask(
        `Keep rebuilding your emergency fund toward ${EMERGENCY_FUND_TARGET_MONTHS} months`,
        `${emergencyFundPlan.coverageMonths.toFixed(1)} months covered now. Keep some money moving into safety while continuing steady investing.`,
        0,
        70,
        {
          progressPct: emergencyFundPlan.targetAmount > 0 ? (availableCash / emergencyFundPlan.targetAmount) * 100 : 0,
          progressText: `${emergencyFundPlan.coverageMonths.toFixed(1)} / ${EMERGENCY_FUND_TARGET_MONTHS.toFixed(1)} mo`,
          progressAria: `Emergency fund progress: ${emergencyFundPlan.coverageMonths.toFixed(1)} of ${EMERGENCY_FUND_TARGET_MONTHS.toFixed(1)} months covered`,
        },
      );
    }

    if (hasActuals && spendingDeltaToDate > monthlyExpenses * 0.05) {
      const correction = Math.max(spendingDeltaToDate / Math.max(elapsedFraction, 0.05), 0);
      addTask(
        `Reduce spending by about ${fmtMoney(correction, true)} this month`,
        "Your spending pace is currently above plan.",
        spendingImpactYears > 0 ? spendingImpactYears : 0,
        0,
        {
          progressPct: spendingProgressPct > 0 ? (Math.min(spendingExpectedPct, 100) / Math.max(spendingProgressPct, spendingExpectedPct, 1)) * 100 : 0,
          progressText: `${Math.round(Math.min(spendingExpectedPct, 100))}% pace`,
          progressAria: `Spending pace progress: currently ${Math.round((Math.min(spendingExpectedPct, 100) / Math.max(spendingProgressPct, spendingExpectedPct, 1)) * 100)} percent on pace for the month`,
        },
      );
    }

    if (targetMonthlyExpenses && monthlyExpenses > targetMonthlyExpenses * 1.05 && fireYear !== null) {
      const cityAverageResult = calcProjection({
        annualIncome: income * 12,
        monthlyExpenses: targetMonthlyExpenses,
        k401,
        rothIRA,
        taxable,
        cashSavings: totalCash,
        totalDebt,
        mortgageBalance,
        mortgageMonthly,
        growthRate,
        withdrawalRate,
        targetMonthlyExpenses,
      });
      const deltaYears = cityAverageResult.fireYear !== null ? Math.max(0, fireYear - cityAverageResult.fireYear) : 0;
      addTask(
        `Reduce spending toward ${cityName || "your city"} average by ${fmtMoney(monthlyExpenses - targetMonthlyExpenses, true)}`,
        "A lower target lifestyle cost moves your freedom date faster.",
        deltaYears,
      );
    }

    if (plannedContributionGap > Math.max(goalContribution * 0.15, 100) && fireYear !== null) {
      const contributionGapResult = calcProjection({
        annualIncome: income * 12,
        monthlyExpenses: Math.max(0, monthlyExpenses - plannedContributionGap),
        k401,
        rothIRA,
        taxable,
        cashSavings: totalCash,
        totalDebt,
        mortgageBalance,
        mortgageMonthly,
        growthRate,
        withdrawalRate,
        targetMonthlyExpenses,
      });
      const deltaYears = contributionGapResult.fireYear !== null ? Math.max(0, fireYear - contributionGapResult.fireYear) : 0;
      addTask(
        `Add about ${fmtMoney(plannedContributionGap, true)} to stay on this month's target`,
        "Closing the gap keeps your savings plan on pace.",
        deltaYears,
        0,
        {
          progressPct: goalContribution > 0 ? (Math.max(actualOrPlannedSavings, 0) / goalContribution) * 100 : 0,
          progressText: `${fmtMoney(Math.max(actualOrPlannedSavings, 0), true)} / ${fmtMoney(goalContribution, true)}`,
          progressAria: `Monthly savings progress: ${fmtMoney(Math.max(actualOrPlannedSavings, 0), true)} saved toward ${fmtMoney(goalContribution, true)}`,
        },
      );
    }

    if (goalContribution > 0 && !hasInvestmentAccounts && emergencyFundPlan.priorityMode !== "protect") {
      addTask(
        "Fund your first investment account this month",
        "Start with a retirement or brokerage account so your savings can compound.",
        bestMove?.deltaYears ?? 0,
      );
    } else if (goalContribution > 0 && connectedRetirementTotal <= 0 && rothIRA <= 0 && emergencyFundPlan.priorityMode !== "protect") {
      addTask(
        "Add this month’s Roth IRA contribution",
        "Retirement contributions give your plan a steady long-term base.",
        bestMove?.deltaYears ?? 0,
      );
    }

    if (!hasActuals) {
      addTask(
        "Connect accounts or log transactions",
        "That turns these cards from plan-only estimates into live monthly tracking.",
        0,
      );
    }

    if (availableCash > Math.max(monthlyExpenses, goalContribution) * 1.5 && hasInvestmentAccounts && emergencyFundPlan.priorityMode === "grow") {
      const moveAmount = Math.min(availableCash - Math.max(monthlyExpenses, 0), Math.max(goalContribution, 0));
      if (moveAmount > 100) {
        addTask(
          `Move about ${fmtMoney(moveAmount, true)} of idle cash into investments`,
          "You already have cash available to put to work.",
          0,
        );
      }
    }

    if (!tasks.length && bestMove) {
      addTask(bestMove.label, bestMove.detail, bestMove.deltaYears);
    }

    return tasks
      .sort((a, b) => (b.priority - a.priority) || (b.impactYears - a.impactYears))
      .slice(0, 3);
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Greeting header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px" }}>
            Good {timeOfDay}{firstName ? `, ${firstName}` : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--uf-text-2)", marginTop: 3, fontFamily: "Manrope, sans-serif" }}>
            {formattedDate}{cityName ? ` · ${cityName}` : ""}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 99, background: `${statusColor}18`, color: statusColor, fontFamily: "Manrope, sans-serif", border: `1px solid ${statusColor}35` }}>
          {statusLabel}
        </span>
      </div>

      {/* ── Hero: chart-led progress card ───────────────────────────────── */}
      <div className="uf-card" style={{ padding: 0, overflow: "hidden", background: "linear-gradient(180deg, #064E3B 0%, #022C22 100%)", borderColor: "transparent" }}>
        <div style={{ padding: "22px 22px 0", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(98,250,227,0.14), transparent 38%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#A7F3D0", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                Your progress
              </div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.78)", fontFamily: "Manrope, sans-serif", lineHeight: 1.5 }}>
                Recent history and projected path to freedom.
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["5Y", "15Y", "All"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: chartPeriod === period ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.14)",
                    background: chartPeriod === period ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "Manrope, sans-serif",
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="uf-progress-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14, position: "relative" }}>
            {[
              { label: "Net worth", value: fmtMoney(currentNetWorth, true), tone: "#FFFFFF" },
              { label: "This month", value: hasActuals ? fmtMoney(actualOrPlannedSavings, true) : fmtMoney(goalContribution, true), tone: actualOrPlannedSavings >= 0 ? "#62FAE3" : "#FCA5A5" },
              { label: "Status", value: statusLabel, tone: "#A7F3D0" },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.58)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: item.label === "Status" ? 16 : 22, fontWeight: 800, color: item.tone, fontFamily: "Manrope, sans-serif", letterSpacing: "-0.03em", lineHeight: 1.1 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes uf-chart-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div key={chartPeriod} style={{ animation: "uf-chart-enter 0.4s ease-out both", padding: "0 10px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={periodData} margin={{ top: 4, right: 14, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#62FAE3" stopOpacity={0.48} />
                  <stop offset="55%" stopColor="#62FAE3" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#62FAE3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#62FAE3" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#62FAE3" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: "rgba(255,255,255,0.68)", fontSize: 11, fontFamily: "Manrope" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={18}
              />
              <YAxis
                tickFormatter={(value) => fmtMoney(value, true)}
                tick={{ fill: "rgba(255,255,255,0.68)", fontSize: 10, fontFamily: "Manrope" }}
                axisLine={false}
                tickLine={false}
                width={58}
              />
              <Tooltip
                animationDuration={150}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const entry = payload[0]?.payload as any;
                  const actual = entry?.actual as number | undefined;
                  const projected = entry?.projected as number | undefined;
                  const contrib = entry?.Contributions as number | undefined;
                  const gains = entry?.["Market Growth"] as number | undefined;
                  return (
                    <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: "10px 12px", fontSize: 12, fontFamily: "Manrope, sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
                      <div style={{ fontWeight: 800, marginBottom: 6, color: "#F8FAFC" }}>{entry?.label ?? ""}</div>
                      {actual !== undefined && actual !== null && <div style={{ color: "rgba(255,255,255,0.86)", marginBottom: 4 }}>{entry?.phase === "today" ? "Current" : "History"}: {fmtMoney(actual, true)}</div>}
                      {projected !== undefined && projected !== null && !showBreakdown && <div style={{ color: "#62FAE3", marginBottom: 4 }}>{entry?.phase === "today" ? "Starting point" : "Projection"}: {fmtMoney(projected, true)}</div>}
                      {showBreakdown && contrib !== undefined && <div style={{ color: "#4ADE80", marginBottom: 2 }}>Contributions: {fmtMoney(contrib, true)}</div>}
                      {showBreakdown && gains !== undefined && <div style={{ color: "#62FAE3", marginBottom: 4 }}>Market returns: {fmtMoney(gains, true)}</div>}
                      <div style={{ color: "rgba(255,255,255,0.6)" }}>Target: {fmtMoney(fireTarget, true)}</div>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={fireTarget} stroke="rgba(167,243,208,0.95)" strokeDasharray="5 4" strokeWidth={1.3} />
              <ReferenceLine x={periodData.find((entry) => entry.phase === "today")?.shortLabel} stroke="rgba(255,255,255,0.26)" strokeDasharray="4 4" strokeWidth={1.2} />
              <Line type="monotone" dataKey="actual" stroke="rgba(255,255,255,0.88)" strokeWidth={2} connectNulls={false} dot={false} activeDot={{ r: 5, fill: "#FFFFFF" }} isAnimationActive animationBegin={0} animationDuration={900} animationEasing="ease-out" />
              {!showBreakdown && (
                <Area type="monotone" dataKey="projected" stroke="#62FAE3" strokeWidth={2.5} fill="url(#portfolioGrad)" dot={false} activeDot={{ r: 5, fill: "#62FAE3" }} isAnimationActive animationBegin={200} animationDuration={1300} animationEasing="ease-out" />
              )}
              {showBreakdown && (
                <>
                  <Area type="monotone" dataKey="Contributions" stroke="#059669" strokeWidth={1.5} fill="url(#contribGrad)" dot={false} stackId="bd" isAnimationActive animationDuration={800} />
                  <Area type="monotone" dataKey="Market Growth" stroke="#62FAE3" strokeWidth={1.5} fill="url(#growthGrad)" dot={false} stackId="bd" isAnimationActive animationDuration={800} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{ padding: "0 22px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Static items */}
            {[
              { color: "rgba(255,255,255,0.88)", label: "History", dashed: false },
              { color: "rgba(167,243,208,0.95)", label: "FIRE target", dashed: true },
            ].map(({ color, label, dashed }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Manrope, sans-serif" }}>
                <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} /></svg>
                {label}
              </span>
            ))}
            {/* Projection / Breakdown toggle */}
            <button
              onClick={() => setShowBreakdown(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: "Manrope, sans-serif", background: "none", border: "none", cursor: "pointer", padding: "2px 0", color: showBreakdown ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.72)", textDecoration: "none" }}
              title="Toggle contributions vs market returns breakdown"
            >
              {showBreakdown ? (
                <>
                  <span style={{ display: "flex", gap: 2 }}>
                    <span style={{ width: 9, height: 8, borderRadius: 1, background: "#059669", opacity: 0.8, display: "inline-block" }} />
                    <span style={{ width: 9, height: 8, borderRadius: 1, background: "#62FAE3", opacity: 0.6, display: "inline-block" }} />
                  </span>
                  <span>Contributions · Returns</span>
                </>
              ) : (
                <>
                  <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#62FAE3" strokeWidth="2" /></svg>
                  Projection
                </>
              )}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", fontFamily: "Manrope, sans-serif", maxWidth: 300 }}>
            {growthSummary}
          </div>
        </div>
      </div>

      {/* ── Freedom date + best move ─────────────────────────────────────── */}
      <div className="uf-overview-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
        <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Your freedom date
              </div>
              {budgetMode === "history" && histMonthsCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(5,150,105,0.12)", color: "#059669", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {histMonthsCount}mo avg
                </span>
              )}
            </div>
            {retireYear ? (
              <>
                <div style={{ fontSize: "clamp(32px, 6vw, 44px)", fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.04em", lineHeight: 1 }}>{retireYear}</div>
                <div style={{ fontSize: 14, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginTop: 6 }}>
                  {fireYear ? `${fireYear} years away` : "Projected from your current plan"}
                  {fireAge > 0 && fireYear ? ` · around age ${fireAge + fireYear}` : ""}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 16, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>Finish your setup to unlock your freedom date.</div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--uf-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>Progress</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: progress >= 50 ? "#059669" : "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>{progress.toFixed(0)}%</div>
            </div>
            <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--uf-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>Target</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(fireTarget, true)}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", lineHeight: 1.6 }}>
            Your date moves most with your savings pace, spending, and invested growth.
          </div>
        </div>

        <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Best way to move your date
              </div>
              {monthlyExpenses > 0 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: emergencyFundPlan.state === "healthy" ? "#DCFCE7" : emergencyFundPlan.state === "fragile" ? "#FEF3C7" : emergencyFundPlan.state === "rebuilding" ? "#E0F2FE" : "#FEE2E2",
                  color: emergencyFundPlan.state === "healthy" ? "#166534" : emergencyFundPlan.state === "fragile" ? "#92400E" : emergencyFundPlan.state === "rebuilding" ? "#075985" : "#991B1B",
                  fontFamily: "Manrope, sans-serif",
                }}>
                  Safety: {emergencyFundPlan.stateLabel}
                </span>
              )}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              {monthlyExpenses > 0 ? emergencyFundPlan.headline : "Top 3 tasks right now"}
            </div>
            <div style={{ fontSize: 14, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginTop: 8, lineHeight: 1.6 }}>
              {monthlyExpenses > 0 ? emergencyFundPlan.guidance : "Focus on the next few actions most likely to protect or improve your freedom date."}
            </div>
          </div>
          {topTasks.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topTasks.map((task, index) => (
                <div key={task.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingTop: index === 0 ? 0 : 10, borderTop: index === 0 ? "none" : "1px solid var(--uf-border)" }}>
                  {index < 2 && typeof task.progressPct === "number" ? (
                    <div
                      aria-label={task.progressAria || `Task ${index + 1} progress`}
                      role="img"
                      style={{
                        width: 40,
                        height: 40,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {(() => {
                        const size = 40;
                        const stroke = 4;
                        const radius = (size - stroke) / 2;
                        const circumference = 2 * Math.PI * radius;
                        const dashOffset = circumference * (1 - task.progressPct / 100);
                        return (
                          <>
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
                              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#DCFCE7" strokeWidth={stroke} />
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke="#10B981"
                                strokeWidth={stroke}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                              />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#047857", fontFamily: "Manrope, sans-serif" }}>
                              {Math.round(task.progressPct)}%
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: 999, background: "#ECFDF5", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, fontFamily: "Manrope, sans-serif", flexShrink: 0 }}>
                      {index + 1}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", lineHeight: 1.4 }}>
                        {task.label}
                      </div>
                      {task.impactYears > 0 && (
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#047857", background: "#ECFDF5", borderRadius: 999, padding: "4px 10px", fontFamily: "Manrope, sans-serif", whiteSpace: "nowrap" }}>
                          {task.impactYears >= 1.5 ? `${task.impactYears.toFixed(1)} years` : `${Math.round(task.impactYears * 12)} months`}
                        </div>
                      )}
                    </div>
                    {index < 2 && task.progressText && (
                      <div style={{ fontSize: 12, color: "#047857", fontFamily: "Manrope, sans-serif", fontWeight: 700, marginTop: 4 }}>
                        Progress: {task.progressText}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", lineHeight: 1.5, marginTop: 4 }}>
                      {task.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>Finish your setup to generate your next best tasks.</div>
          )}
        </div>
      </div>

      {/* ── Monthly operating row ────────────────────────────────────────── */}
      <div className="uf-overview-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>This month&apos;s investing</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.03em" }}>{fmtMoney(goalContribution)}</div>
          <div style={{ fontSize: 14, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", lineHeight: 1.6 }}>{investingHeadline}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--uf-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>Invested now</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(investedBalance, true)}</div>
            </div>
            <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--uf-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>Cash ready</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: availableCash > 0 ? "var(--uf-text)" : "var(--uf-text-3)", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(availableCash, true)}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", lineHeight: 1.6 }}>{investingNote}</div>
        </div>

        <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>This month&apos;s spending</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginBottom: 4 }}>Planned</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(monthlyExpenses)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginBottom: 4 }}>{hasActuals ? "So far" : "Current"}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: hasActuals ? "var(--uf-text)" : "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(actualOrPlannedExpenses)}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontFamily: "Manrope, sans-serif", fontSize: 12, color: "var(--uf-text-2)" }}>
            <span>{hasActuals ? `${Math.round(spendingProgressPct)}% of plan used` : "Budget watch"}</span>
            {hasActuals && <span>Day {now.getDate()} of {monthDays}</span>}
          </div>
          <div style={{ position: "relative", height: 12, borderRadius: 999, background: spendingBarTrackColor, overflow: "hidden" }} aria-label="Monthly spending progress">
            <div style={{ width: `${spendingProgressPct}%`, height: "100%", background: spendingBarColor, borderRadius: 999, transition: "width 240ms ease" }} />
            {hasActuals && (
              <div
                style={{
                  position: "absolute",
                  left: `calc(${spendingExpectedPct}% - 1px)`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "rgba(15,23,42,0.32)",
                }}
              />
            )}
          </div>
          {hasActuals && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, color: "var(--uf-text-3)", fontFamily: "Manrope, sans-serif" }}>
              <span>Expected pace by today: {fmtMoney(expectedSpendToDate, true)}</span>
              <span>{fmtMoney(Math.max(monthlyExpenses - actualExpenses, 0), true)} left</span>
            </div>
          )}
          <div style={{ fontSize: 14, color: spendingStatusColor, fontWeight: 700, fontFamily: "Manrope, sans-serif" }}>{projectedSpendStatus}</div>
          <div style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", lineHeight: 1.6 }}>{spendingImpactLabel}</div>
          <button onClick={() => onTabChange?.("cashflow")} style={{ alignSelf: "flex-start", background: "transparent", color: "#047857", border: "none", padding: 0, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}>View categories →</button>
        </div>

        <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Consistency</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: consistencyRun >= 2 || consistencyMonths[0]?.onTrack ? "#059669" : "#F59E0B", fontFamily: "Manrope, sans-serif", lineHeight: 1 }}>
                {consistencyLabel}
              </div>
              <div style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginTop: 6, lineHeight: 1.6 }}>
                {consistencyDetail}
              </div>
            </div>
            {trackedMonths > 0 && (
              <div style={{ minWidth: 72, borderRadius: 12, background: "var(--uf-surface)", border: "1px solid var(--uf-border)", padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--uf-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 4 }}>On plan</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>{onTrackMonths}/{trackedMonths}</div>
              </div>
            )}
          </div>
          <div style={{ height: 8, background: "var(--uf-border)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${trackedMonths > 0 ? (onTrackMonths / trackedMonths) * 100 : 0}%`, height: "100%", background: consistencyRun >= 2 || consistencyMonths[0]?.onTrack ? "linear-gradient(90deg, #059669, #34D399)" : "linear-gradient(90deg, #F59E0B, #FBBF24)", borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", lineHeight: 1.6 }}>{consistencySupport}</div>
        </div>
      </div>

      {/* ── Lower support row ────────────────────────────────────────────── */}
      <div>
        <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Where your money is</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ width: 140, height: 140, borderRadius: "50%", background: moneyMixGradient, position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "var(--uf-card)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--uf-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>Total</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", lineHeight: 1.1 }}>{fmtMoney(positiveMoneyTotal, true)}</div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Retirement accounts", value: retirementAccounts, color: "#064E3B", pct: retirementPct },
                { label: "Brokerage", value: brokerageAssets, color: "#10B981", pct: brokeragePct },
                { label: "Cash", value: displayCashAssets, color: "#CFFAEF", pct: cashPct, text: "#065F46" },
              ].map((row) => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 5, fontSize: 13, fontFamily: "Manrope, sans-serif" }}>
                    <span style={{ color: "var(--uf-text-2)" }}>{row.label}</span>
                    <span style={{ color: row.text ?? "var(--uf-text)", fontWeight: 800 }}>{fmtMoney(row.value, true)}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--uf-surface-2)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${row.pct}%`, height: "100%", background: row.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>{moneyMixSourceLabel}</div>
              {(totalDebt + mortgageBalance) > 0 && (
                <div style={{ paddingTop: 4, borderTop: "1px solid var(--uf-border)", fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>
                  Debt: <span style={{ color: "#DC2626", fontWeight: 800 }}>{fmtMoney(totalDebt + mortgageBalance, true)}</span>
                </div>
              )}
            </div>
          </div>
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
      <p style={{ color: "#64748B", fontSize: 12, fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 }}>
        All tools
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {CALCULATORS.map(c => (
          <Link key={c.href} href={c.href} target="_blank" style={{ textDecoration: "none" }}>
            <div
              style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "24px 20px", height: "100%", display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = c.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--uf-border)")}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: c.color, letterSpacing: "-1px" }}>
                {c.label}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: c.color, letterSpacing: "1.5px", textTransform: "uppercase", margin: 0 }}>{c.tag}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--uf-text)", margin: 0, letterSpacing: "-0.3px" }}>{c.title}</p>
              <p style={{ fontSize: 13, color: "var(--uf-text-2)", margin: 0, lineHeight: 1.6, flexGrow: 1 }}>{c.description}</p>
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
                    <span style={{ fontSize: 11, fontFamily: "Manrope, sans-serif", color: over ? "#DC2626" : "#64748B" }}>
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
                <div style={{ color: "#64748B", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: "Manrope, sans-serif" }}>{k.label}</div>
                <div style={{ color: k.color, fontSize: 22, fontWeight: 700, fontFamily: "Manrope, sans-serif" }}>{k.val}</div>
              </div>
            ))}
          </div>
          {/* Rate bar */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 6, fontFamily: "Manrope, sans-serif" }}>
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
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 8, fontFamily: "Manrope, sans-serif", lineHeight: 1.5 }}>Your feedback shapes what we build next.</div>
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
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>A few optional questions · skip anytime</div>
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
            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "Manrope, sans-serif" }}>
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
                <button key={f} onClick={() => toggleFeature(f)} style={{ padding: "7px 12px", borderRadius: 99, border: `1.5px solid ${active ? "#059669" : "#E2E8F0"}`, background: active ? "#F0FDF4" : "#F8FAFC", color: active ? "#064E3B" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}>
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
                <button key={m} onClick={() => setMissing(active ? null : m)} style={{ padding: "7px 12px", borderRadius: 99, border: `1.5px solid ${active ? "#F97316" : "#E2E8F0"}`, background: active ? "#FFF7ED" : "#F8FAFC", color: active ? "#C2410C" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}>
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
              style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "Manrope, sans-serif", outline: "none", color: "#0F172A" }}
            />
          )}
        </div>

        {/* Q4 — Recommend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>4. Would you recommend UntilFire to a friend?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {([["yes", "👍 Yes", "#059669", "#F0FDF4"], ["maybe", "🤔 Maybe", "#6366F1", "#EEF2FF"], ["no", "👎 No", "#DC2626", "#FEF2F2"]] as const).map(([val, label, activeColor, activeBg]) => (
              <button key={val} onClick={() => setRecommend(recommend === val ? null : val)} style={{ flex: 1, padding: "9px 8px", borderRadius: 9, border: `1.5px solid ${recommend === val ? activeColor : "#E2E8F0"}`, background: recommend === val ? activeBg : "#F8FAFC", color: recommend === val ? activeColor : "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}>
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
            style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "Manrope, sans-serif", outline: "none", resize: "none", color: "#0F172A" }}
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
          <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontFamily: "Manrope, sans-serif", padding: "4px 0" }}>
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
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 600, color: "#6B7280", fontFamily: "Manrope, sans-serif" }}>{defaultCurrency}</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          onBlur={e => onChange(fmt(e.target.value))}
          placeholder="0"
          style={{ width: "100%", paddingLeft: 52, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 16, fontWeight: 600, fontFamily: "Manrope, sans-serif", outline: "none", boxSizing: "border-box", color: "#111827" }}
          onFocus={e => { e.target.style.borderColor = "#064E3B"; }}
        />
      </div>
      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Manrope, sans-serif" }}>{hint}</span>
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
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, fontFamily: "Manrope, sans-serif", lineHeight: 1.5 }}>
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
          <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontFamily: "Manrope, sans-serif", padding: "4px 0" }}>
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
    <div style={{ background: "#111118", border: "1px solid rgba(34,211,165,0.2)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", fontFamily: "Manrope, sans-serif" }}>Get started</div>
          <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "Manrope, sans-serif", marginTop: 2 }}>{completedCount} of 4 complete</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#22d3a5", fontFamily: "Manrope, sans-serif" }}>{Math.round(pct)}%</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "#23232d", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#22d3a5", borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map(step => (
          <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: step.done ? "#22d3a5" : "transparent", border: step.done ? "none" : "1.5px solid #374151", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {step.done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#08080e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ flex: 1, fontSize: 13, color: step.done ? "#6b7280" : "#e2e8f0", fontFamily: "Manrope, sans-serif", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</span>
            {!step.done && (
              <button onClick={step.action} style={{ background: "transparent", border: "none", color: "#22d3a5", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Manrope, sans-serif", padding: 0, whiteSpace: "nowrap" }}>
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
    <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>🎯 Retirement Target</div>

      {/* City search */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--uf-border)", borderRadius: 9, padding: "9px 12px", background: "var(--uf-surface)" }}>
          <span style={{ fontSize: 15 }}>📍</span>
          <input
            type="text"
            value={citySearch}
            placeholder="Where do you want to retire?"
            onChange={e => { setCitySearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}
          />
          {retirementCityName && (
            <button onClick={handleClear} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
        {open && filtered.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50, overflow: "hidden" }}>
            {filtered.map(c => (
              <button
                key={c.key}
                onClick={() => handleSelect(c.name, c.col)}
                style={{ width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", display: "flex", gap: 8, alignItems: "center" }}
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
                    borderRadius: 9, background: active ? "#F0FDF4" : "var(--uf-surface)",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{tier.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#059669" : "#64748B", fontFamily: "Manrope, sans-serif" }}>{tier.label}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(monthlySpend, true)}/mo</span>
                </button>
              );
            })}
          </div>

          {/* Result row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF4", borderRadius: 9, padding: "10px 14px" }}>
            <span style={{ fontSize: 12, color: "#064E3B", fontFamily: "Manrope, sans-serif" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8, fontFamily: "Manrope, sans-serif" }}>
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
                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "Manrope, sans-serif", fontSize: 14, color: row.color, fontWeight: row.bold ? 700 : 400 }}>
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
  const emergencyFundHealthyNow = monthlyExpenses > 0 && (emergencyFundBalance / monthlyExpenses) >= EMERGENCY_FUND_TARGET_MONTHS;
  const hasEverHealthyEmergencyFund = useEmergencyFundHistory(emergencyFundHealthyNow);
  const emergencyFundPlan = getEmergencyFundPlan(emergencyFundBalance, monthlyExpenses, hasEverHealthyEmergencyFund);
  const efFloor = emergencyFundPlan.floorAmount;
  const efTarget = emergencyFundPlan.targetAmount;
  const efPct = emergencyFundPlan.progressToTargetPct;
  const monthsCovered = emergencyFundPlan.coverageMonths;
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
                <div key={a.id} style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.emoji}</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{a.name}</div>
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
          background: emergencyFundPlan.state === "healthy" ? "rgba(5,150,105,0.04)" : emergencyFundPlan.state === "fragile" ? "rgba(245,158,11,0.04)" : emergencyFundPlan.state === "rebuilding" ? "rgba(14,165,233,0.05)" : "rgba(220,38,38,0.04)",
          border: `1px solid ${emergencyFundPlan.state === "healthy" ? "rgba(5,150,105,0.2)" : emergencyFundPlan.state === "fragile" ? "rgba(245,158,11,0.25)" : emergencyFundPlan.state === "rebuilding" ? "rgba(14,165,233,0.22)" : "rgba(220,38,38,0.2)"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#064E3B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Emergency Fund</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748B", fontWeight: 500 }}>{EMERGENCY_FUND_FLOOR_MONTHS} month floor · {EMERGENCY_FUND_TARGET_MONTHS} month target</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                {emergencyFundPlan.headline}
              </div>
              <span style={{
                background: emergencyFundPlan.state === "healthy" ? "#DCFCE7" : emergencyFundPlan.state === "fragile" ? "#FEF3C7" : emergencyFundPlan.state === "rebuilding" ? "#E0F2FE" : "#FEE2E2",
                color: emergencyFundPlan.state === "healthy" ? "#166534" : emergencyFundPlan.state === "fragile" ? "#92400E" : emergencyFundPlan.state === "rebuilding" ? "#075985" : "#991B1B",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 800,
                fontFamily: "Manrope, sans-serif",
              }}>
                {emergencyFundPlan.stateLabel}
              </span>
            </div>
            <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, fontFamily: "Manrope, sans-serif" }}>
              {emergencyFundPlan.guidance}
            </div>
          </div>

          {/* Three-stat row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
            {[
              { label: "Current Reserve", value: fmtMoney(emergencyFundBalance), color: emergencyFundPlan.state === "healthy" ? "#059669" : emergencyFundPlan.state === "rebuilding" ? "#0369A1" : "#19181E" },
              { label: `Floor · ${EMERGENCY_FUND_FLOOR_MONTHS} months`, value: fmtMoney(efFloor) },
              { label: `Target · ${EMERGENCY_FUND_TARGET_MONTHS} months`, value: fmtMoney(efTarget) },
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
              background: emergencyFundPlan.state === "healthy" ? "#059669" : emergencyFundPlan.state === "fragile" ? "#F59E0B" : emergencyFundPlan.state === "rebuilding" ? "#0EA5E9" : "#DC2626",
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hasHysa ? 0 : 12 }}>
            {emergencyFundPlan.state === "healthy" && <span style={{ background: "#DCFCE7", color: "#059669", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>✅ Healthy ({monthsCovered.toFixed(1)} months covered)</span>}
            {emergencyFundPlan.state === "fragile" && <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>⚠️ Fragile ({monthsCovered.toFixed(1)} months covered)</span>}
            {emergencyFundPlan.state === "rebuilding" && <span style={{ background: "#E0F2FE", color: "#075985", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>↺ Rebuilding ({monthsCovered.toFixed(1)} months covered)</span>}
            {emergencyFundPlan.state === "missing" && <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>❌ Missing ({monthsCovered.toFixed(1)} months covered)</span>}
            {hasHysa && avgApy > 0 && (
              <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>· earning ~{fmtMoney(Math.round(emergencyFundBalance * avgApy / 100 / 12))}/mo interest</span>
            )}
            {brokerageCashExcluded && (
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                · excludes {fmtMoney(connectedBreakdown.brokerageCash)} in connected brokerage / investment accounts
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: hasHysa ? 0 : 12 }}>
            <div style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, marginBottom: 4 }}>Next threshold</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif" }}>
                {emergencyFundPlan.priorityMode === "protect" ? fmtMoney(emergencyFundPlan.gapToFloor) : emergencyFundPlan.priorityMode === "balance" ? fmtMoney(emergencyFundPlan.gapToTarget) : fmtMoney(0)}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginTop: 4 }}>
                {emergencyFundPlan.priorityMode === "protect"
                  ? `Needed to get back above your ${EMERGENCY_FUND_FLOOR_MONTHS}-month floor.`
                  : emergencyFundPlan.priorityMode === "balance"
                    ? `Needed to reach your ${EMERGENCY_FUND_TARGET_MONTHS}-month target.`
                    : "Your safety target is covered right now."}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, marginBottom: 4 }}>App posture now</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", textTransform: "capitalize" }}>
                {emergencyFundPlan.priorityMode === "protect" ? "Protect" : emergencyFundPlan.priorityMode === "balance" ? "Balance" : "Grow"}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginTop: 4 }}>
                {emergencyFundPlan.priorityMode === "protect"
                  ? "Emergency fund refill should outrank extra investing for now."
                  : emergencyFundPlan.priorityMode === "balance"
                    ? "Split new surplus between reserve refill and steady investing."
                    : "Emergency cash can step back while growth takes the lead."}
              </div>
            </div>
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
                <div style={{ fontSize: 20, fontWeight: 700, color: a.color, fontFamily: "Manrope, sans-serif" }}>{a.val}</div>
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
              <div key={a.id} style={{ background: "var(--uf-card)", border: "1px solid #FCA5A5", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--uf-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
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
                <div style={{ fontSize: 20, fontWeight: 700, color: l.color, fontFamily: "Manrope, sans-serif" }}>{l.val}</div>
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
              style={{ flex: 1, background: "var(--uf-surface-2)", border: "1.5px solid var(--uf-border)", borderRadius: 7, padding: "6px 8px", fontSize: 12, color: "var(--uf-text)", fontFamily: "DM Mono, monospace", outline: "none" }} />
            <button onClick={() => addHolding(tickerInput)} style={{ background: s.color, border: "none", borderRadius: 7, padding: "6px 12px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+</button>
          </div>
          {showDropdown && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50, marginTop: 3, overflow: "hidden" }}>
              {suggestions.map(([ticker, info]) => (
                <button key={ticker} onMouseDown={() => addHolding(ticker)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--uf-border)" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontWeight: 800, fontSize: 11, color: "var(--uf-text)", minWidth: 40 }}>{ticker}</span>
                  <span style={{ fontSize: 11, color: "var(--uf-text-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.name}</span>
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
              background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16,
              padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <div style={{ fontSize: 48, lineHeight: 1 }}>{tool.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", marginBottom: 8 }}>
                {tool.title}
              </div>
              <div style={{ fontSize: 14, color: "var(--uf-text-2)", lineHeight: 1.7 }}>
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
        <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>🧭</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", marginBottom: 8 }}>
              {fireTypeResult ? "Your FIRE Type" : "FIRE Type Quiz"}
            </div>
            <div style={{ fontSize: 14, color: "var(--uf-text-2)", lineHeight: 1.7 }}>
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
        <p style={{ fontSize: 15, color: "var(--uf-text-2)", margin: 0 }}>Start with the stage that fits your progress, then switch anytime if you want broader reading.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {LEARNING_STAGES.map(stage => (
            <Link
              key={stage.id}
              href={`/learn/stages/${stage.id}`}
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 999,
                border: stage.id === recommendedStageId ? "1px solid #047857" : "1px solid var(--uf-border)",
                background: stage.id === recommendedStageId ? "rgba(209,250,229,0.45)" : "var(--uf-card)",
                color: stage.id === recommendedStageId ? "#065F46" : "var(--uf-text-2)",
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
  const [isDark, setIsDark] = useState(false);

  useLayoutEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  function toggleDark() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('uf-theme', next ? 'dark' : 'light'); } catch {}
    setIsDark(next);
  }

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
  const [recentTransactions, setRecentTransactions] = useState<{ date: string; amount: number; currency: string; transaction_type?: string }[]>([]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [budgetMode, setBudgetMode] = useState<"manual" | "history">(() => {
    try { return (localStorage.getItem("uf_budget_mode") as "manual" | "history") || "manual"; } catch { return "manual"; }
  });
  const histIncomeAvg = useMemo(() => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const byMonth: Record<string, number> = {};
    recentTransactions.filter(t => t.transaction_type === "income" && !t.date.startsWith(curMonth))
      .forEach(t => { const m = t.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + toUSD(t.amount, t.currency, rates); });
    const vals = Object.values(byMonth);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }, [recentTransactions, rates]);
  const histExpensesAvg = useMemo(() => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const byMonth: Record<string, number> = {};
    recentTransactions.filter(t => t.transaction_type === "expense" && !t.date.startsWith(curMonth))
      .forEach(t => { const m = t.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + toUSD(t.amount, t.currency, rates); });
    const vals = Object.values(byMonth);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }, [recentTransactions, rates]);
  const histMonthsCount = useMemo(() => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return new Set(recentTransactions.filter(t => t.transaction_type === "expense" && !t.date.startsWith(curMonth)).map(t => t.date.slice(0, 7))).size;
  }, [recentTransactions]);
  const effectiveIncome = budgetMode === "history" && histIncomeAvg > 0 ? histIncomeAvg : income;
  const effectiveExpenses = useMemo((): Expenses => {
    if (budgetMode !== "history" || histExpensesAvg <= 0) return expenses;
    const numericEntries = Object.entries(expenses).filter(([k, v]) => !k.startsWith("_") && typeof v === "number");
    const currentTotal = numericEntries.reduce((s, [, v]) => s + (v as number), 0);
    if (currentTotal <= 0) return { ...expenses, other: histExpensesAvg };
    const scale = histExpensesAvg / currentTotal;
    return { ...expenses, ...Object.fromEntries(numericEntries.map(([k, v]) => [k, Math.round((v as number) * scale)])) };
  }, [budgetMode, histExpensesAvg, expenses]);
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

      const historyStartDate = new Date(nowD.getFullYear(), nowD.getMonth() - 36, nowD.getDate());
      const historyStart = `${historyStartDate.getFullYear()}-${String(historyStartDate.getMonth() + 1).padStart(2, '0')}-${String(historyStartDate.getDate()).padStart(2, '0')}`;
      supabase.from("expenses").select("date, amount, currency, transaction_type")
        .eq("user_id", session.user.id)
        .gte("date", historyStart)
        .order("date", { ascending: true })
        .then(({ data: txData }) => {
          if (txData) {
            setRecentTransactions(txData.map(tx => ({
              date: tx.date,
              amount: tx.amount,
              currency: tx.currency ?? "USD",
              transaction_type: tx.transaction_type ?? "expense",
            })));
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
        if (!sessionStorage.getItem('uf_dv')) {
          sessionStorage.setItem('uf_dv', '1');
          trackDashboardFirstView({ hadCalculatorPrefill: hadPrefill, viaUpgrade: wasUpgradedRef.current });
        }
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
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

        :root {
          --uf-bg: #F7F9FB;
          --uf-card: #ffffff;
          --uf-border: #E2E8F0;
          --uf-text: #0F172A;
          --uf-text-2: #64748B;
          --uf-text-3: #94A3B8;
          --uf-surface: #F8FAFC;
          --uf-surface-2: #F1F5F9;
          --uf-topbar-glass: rgba(255,255,255,0.96);
          --uf-drawer-bg: #ffffff;
        }
        .dark {
          --uf-bg: #08080e;
          --uf-card: #111118;
          --uf-border: #23232d;
          --uf-text: #F1F5F9;
          --uf-text-2: #9CA3AF;
          --uf-text-3: #6B7280;
          --uf-surface: #0d1117;
          --uf-surface-2: #111118;
          --uf-topbar-glass: rgba(8,8,14,0.96);
          --uf-drawer-bg: #0d1117;
        }

        *, *::before, *::after { box-sizing: border-box; }
        body { background: var(--uf-bg); color: var(--uf-text); font-family: 'Manrope', sans-serif; margin: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: #E2E8F0; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #064E3B; border: 3px solid #F7F9FB; cursor: pointer; box-shadow: 0 0 0 2px #064E3B; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--uf-border); border-radius: 4px; }

        .uf-card { background: var(--uf-card); border: 1px solid var(--uf-border); border-radius: 16px; padding: 20px 24px; }
        .uf-card-glow { box-shadow: 0 0 0 1px rgba(6,78,59,0.3), 0 0 24px rgba(6,78,59,0.08); border-color: rgba(6,78,59,0.35) !important; }
        .uf-tag { font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

        .uf-shell { display: flex; min-height: 100vh; }
        .uf-sidebar { width: 248px; min-height: 100vh; position: sticky; top: 0; height: 100vh; overflow-y: auto; background: var(--uf-surface); border-right: 1px solid var(--uf-border); display: flex; flex-direction: column; flex-shrink: 0; }
        .uf-main { flex: 1; overflow-y: auto; min-width: 0; }
        .uf-content { padding: 32px 36px 60px; }

        .uf-sidebar-logo { padding: 22px 20px 20px; font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 800; color: #064E3B; letter-spacing: -0.04em; text-decoration: none; display: block; border-bottom: 1px solid var(--uf-border); }
        .uf-sidebar-logo span { color: #20D4BF; }
        .uf-sidebar-nav { padding: 16px 10px 4px; display: flex; flex-direction: column; gap: 2px; }
        .uf-sidebar-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 8px; font-size: 14px; font-weight: 700; color: var(--uf-text-2); cursor: pointer; border: 1px solid transparent; transition: all 0.15s; background: transparent; width: 100%; text-align: left; font-family: 'Manrope', sans-serif; }
        .uf-sidebar-item:hover { background: rgba(226,232,240,0.5); color: #1E3A2F; }
        .uf-sidebar-item.active { background: rgba(209,250,229,0.5); border-color: #047857; color: #065F46; }
        .uf-sidebar-icon { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: inherit; }
        .uf-sidebar-bottom { margin-top: auto; padding: 14px 16px; border-top: 1px solid var(--uf-border); display: flex; flex-direction: column; gap: 8px; }

        select option { background: var(--uf-card); color: var(--uf-text); }

        .dark .uf-sidebar-item:hover { background: rgba(255,255,255,0.05); color: var(--uf-text); }
        .dark .uf-sidebar-item.active { background: rgba(34,211,165,0.1); border-color: rgba(34,211,165,0.35); color: #22d3a5; }
        .dark .uf-sidebar-logo { color: #22d3a5; }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        .uf-nav-label-mobile { display: none; }
        .uf-mobile-topbar, .uf-mobile-bottom-nav, .uf-mobile-drawer-backdrop, .uf-mobile-drawer { display: none; }
        .uf-section-switch { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 22px; }
        .uf-section-button { border: 1px solid var(--uf-border); background: var(--uf-card); color: var(--uf-text-2); border-radius: 999px; padding: 9px 13px; font-size: 12px; font-weight: 800; white-space: nowrap; font-family: 'Manrope', sans-serif; cursor: pointer; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
        .uf-section-button.active { border-color: #047857; background: #ECFDF5; color: #047857; }
        .uf-holdings-grid { display: grid; grid-template-columns: 80px minmax(0, 1fr) 80px 90px 100px; gap: 8px; min-width: 0; }
        .uf-holdings-grid > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        @media(max-width: 900px) {
          .uf-shell { flex-direction: column; min-height: 100dvh; }
          .uf-sidebar { display: none; }
          .uf-mobile-topbar { display: flex; position: fixed; top: 0; left: 0; right: 0; z-index: 120; height: calc(56px + env(safe-area-inset-top, 0px)); padding: calc(8px + env(safe-area-inset-top, 0px)) 16px 8px; background: var(--uf-topbar-glass); border-bottom: 1px solid var(--uf-border); backdrop-filter: blur(14px); align-items: center; gap: 12px; }
          .uf-mobile-menu-button { width: 40px; height: 40px; border: 1px solid var(--uf-border); background: var(--uf-card); color: var(--uf-text); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
          .uf-mobile-top-title { display: flex; flex-direction: column; min-width: 0; }
          .uf-mobile-top-title strong { font-size: 15px; font-weight: 800; color: #064E3B; letter-spacing: -0.02em; }
          .uf-mobile-top-title span { font-size: 11px; color: var(--uf-text-2); font-weight: 600; }
          .uf-mobile-bottom-nav { display: grid; grid-template-columns: repeat(4, 1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: 120; background: var(--uf-topbar-glass); border-top: 1px solid var(--uf-border); padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -10px 28px rgba(15,23,42,0.08); }
          .uf-mobile-bottom-item { border: none; background: transparent; color: var(--uf-text-2); border-radius: 14px; min-width: 0; padding: 7px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800; cursor: pointer; }
          .uf-mobile-bottom-item.active { background: rgba(34,211,165,0.08); color: #22d3a5; }
          .uf-mobile-bottom-icon { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
          .uf-mobile-drawer-backdrop { display: block; position: fixed; inset: 0; z-index: 130; background: rgba(15,23,42,0.45); opacity: 0; pointer-events: none; transition: opacity 180ms ease; }
          .uf-mobile-drawer-backdrop.open { opacity: 1; pointer-events: auto; }
          .uf-mobile-drawer { display: flex; position: fixed; top: 0; bottom: 0; left: 0; z-index: 140; width: min(86vw, 340px); transform: translateX(-102%); transition: transform 220ms cubic-bezier(0.2,0,0,1); background: var(--uf-drawer-bg); box-shadow: 20px 0 42px rgba(15,23,42,0.2); flex-direction: column; padding: calc(18px + env(safe-area-inset-top, 0px)) 16px calc(18px + env(safe-area-inset-bottom, 0px)); }
          .uf-mobile-drawer.open { transform: translateX(0); }
          .uf-mobile-drawer-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--uf-border); margin-bottom: 10px; }
          .uf-mobile-drawer-close { border: none; background: var(--uf-surface-2); color: var(--uf-text-2); width: 36px; height: 36px; border-radius: 999px; cursor: pointer; font-size: 18px; }
          .uf-mobile-drawer-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; padding: 4px 0; }
          .uf-mobile-drawer-item { border: 1px solid transparent; background: transparent; color: var(--uf-text); text-align: left; border-radius: 12px; padding: 12px 12px; cursor: pointer; font-family: 'Manrope', sans-serif; display: flex; flex-direction: column; gap: 3px; }
          .uf-mobile-drawer-item strong { font-size: 14px; }
          .uf-mobile-drawer-item span { font-size: 12px; color: var(--uf-text-2); line-height: 1.4; }
          .uf-mobile-drawer-item.active { background: rgba(34,211,165,0.08); border-color: rgba(34,211,165,0.3); color: #22d3a5; }
          .uf-mobile-drawer-actions { margin-top: auto; padding-top: 14px; border-top: 1px solid var(--uf-border); display: flex; flex-direction: column; gap: 8px; }
          .uf-mobile-drawer-link { color: var(--uf-text); text-decoration: none; font-size: 13px; font-weight: 800; padding: 10px 12px; border-radius: 10px; background: var(--uf-surface-2); }
          .uf-section-switch { display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex-wrap: nowrap; margin: -2px -16px 18px; padding: 0 16px 2px; }
          .uf-section-switch::-webkit-scrollbar { display: none; }
          .uf-section-button { border: 1px solid var(--uf-border); background: var(--uf-card); color: var(--uf-text-2); border-radius: 999px; padding: 9px 13px; font-size: 12px; font-weight: 800; white-space: nowrap; font-family: 'Manrope', sans-serif; cursor: pointer; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
          .uf-section-button.active { border-color: #047857; background: #ECFDF5; color: #047857; }
          .uf-main { overflow-y: unset; overflow-x: hidden; }
          .uf-content { padding: calc(72px + env(safe-area-inset-top, 0px)) 16px calc(112px + env(safe-area-inset-bottom, 0px)); }
          .uf-overview-grid-2,
          .uf-overview-grid-3,
          .uf-progress-metrics { grid-template-columns: 1fr !important; }
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
        <button
          onClick={toggleDark}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="uf-mobile-menu-button"
        >
          {isDark
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
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
            <button
              onClick={toggleDark}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "none", border: `1px solid var(--uf-border)`,
                borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                color: "var(--uf-text-2)", fontSize: 12, fontWeight: 700,
                fontFamily: "Manrope, sans-serif", width: "100%",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 14 }}>{isDark ? "☀️" : "🌙"}</span>
              {isDark ? "Light mode" : "Dark mode"}
            </button>
            {saveStatus === "saving" && <span style={{ color: "#64748B", fontSize: 12, fontFamily: "Manrope, sans-serif" }}>Saving…</span>}
            {saveStatus === "saved"  && <span style={{ color: "#059669", fontSize: 12, fontFamily: "Manrope, sans-serif" }}>✓ Saved</span>}
            {saveStatus === "error"  && <span style={{ color: "#dc2626", fontSize: 12, fontFamily: "Manrope, sans-serif" }}>Save failed</span>}
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
            {tab === "overview" && histMonthsCount >= 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <div style={{ display: "flex", background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 999, padding: 3, gap: 2 }}>
                  {(["manual", "history"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => { setBudgetMode(mode); try { localStorage.setItem("uf_budget_mode", mode); } catch {} }}
                      style={{
                        background: budgetMode === mode ? "#047857" : "transparent",
                        color: budgetMode === mode ? "#fff" : "var(--uf-text-2)",
                        border: "none", borderRadius: 999, padding: "5px 14px",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                        fontFamily: "inherit",
                      }}
                    >
                      {mode === "manual" ? "Manual budget" : `${histMonthsCount}mo history`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === "overview" && (
              <DashTab
                income={effectiveIncome} expenses={effectiveExpenses}
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
                retirementCityCol={retirementCityCol}
                lifestyleMultiplier={lifestyleMultiplier}
                fireAge={fireAge}
                nwSnapshots={nwSnapshots}
                recentTransactions={recentTransactions}
                plaidHoldings={plaidHoldings}
                budgetMode={budgetMode}
                histMonthsCount={histMonthsCount}
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
                {cashflowSubTab === "cashflow" && <TransactionsTab defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} preferredCurrencies={preferredCurrencies} isPro={subscription?.plan === "pro"} />}
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
