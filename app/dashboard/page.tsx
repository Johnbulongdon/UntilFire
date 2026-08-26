"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
const GeoArbitrageGlobe = dynamic(() => import("@/app/components/GeoArbitrageGlobe"), { ssr: false });
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine, ReferenceDot,
  ComposedChart, Area,
} from "recharts";
import TransactionsTab from "./TransactionsTab";
import PlaidConnect from "./PlaidConnect";
import UpgradeModal from "./UpgradeModal";
import TourModal from "./TourModal";
import CategoriesTab from "./CategoriesTab";
import RecurringTab from "./RecurringTab";
import ExpectedPaymentsTab from "./ExpectedPaymentsTab";
import BudgetSetupModal from "./BudgetSetupModal";
import ReportsTab from "./ReportsTab";
import ProfileTab from "./ProfileTab";
import PurchaseImpactPanel from "./PurchaseImpactPanel";
import Logo from "@/app/components/Logo";
import FeedbackWidget from "./FeedbackWidget";
import { calcFIRE } from "@/lib/fire";
import { FALLBACK_RATES, convertUSDAmount, formatUSDInCurrency, getCurrencySymbol } from "@/lib/currency";
import { CITIES, STATE_TAX, TAX_COUNTRIES, TAX_US_STATES, TAX_CA_PROVINCES } from "@/lib/fire-data";
import { CITY_COORDS } from "@/lib/city-coords";
import { trackDashboardFirstView } from "@/lib/analytics";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { useCustomCategories } from "@/lib/useCustomCategories";

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
  | "expat-fire"
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
const EMERGENCY_FUND_TARGET_MONTHS = 6;
const EMERGENCY_FUND_BUDGET_NEED_KEYS = ["housing", "food", "transport", "healthcare"] as const;
const EMERGENCY_FUND_MONTH_MARKS = Array.from({ length: EMERGENCY_FUND_TARGET_MONTHS }, (_, index) => index + 1);

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

function getEmergencyFundStateColor(state: EmergencyFundState) {
  return state === "healthy" ? "#059669" : state === "fragile" ? "#F59E0B" : state === "rebuilding" ? "#0EA5E9" : "#DC2626";
}

function EmergencyFundProgressBar({ progressPct, state, height = 8 }: { progressPct: number; state: EmergencyFundState; height?: number }) {
  const barColor = getEmergencyFundStateColor(state);

  return (
    <div style={{ position: "relative", paddingBottom: 20 }}>
      <div style={{ position: "relative", height, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          borderRadius: 99,
          width: `${Math.min(100, Math.max(0, progressPct))}%`,
          background: barColor,
          transition: "width 0.4s ease",
        }} />
        {EMERGENCY_FUND_MONTH_MARKS.map(month => (
          <span
            key={`tick-${month}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${(month / EMERGENCY_FUND_TARGET_MONTHS) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(15,23,42,0.22)",
              transform: "translateX(-50%)",
            }}
          />
        ))}
      </div>
      {EMERGENCY_FUND_MONTH_MARKS.map(month => (
        <span
          key={`label-${month}`}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${(month / EMERGENCY_FUND_TARGET_MONTHS) * 100}%`,
            top: height + 4,
            transform: month === EMERGENCY_FUND_TARGET_MONTHS ? "translateX(-100%)" : "translateX(-50%)",
            fontSize: 10,
            lineHeight: 1,
            color: "#64748B",
            fontWeight: 700,
            fontFamily: "Manrope, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {month}mo
        </span>
      ))}
    </div>
  );
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

const netAmt = (t: { amount: number; refund_amount?: number | null }) =>
  Math.max(0, t.amount - (t.refund_amount || 0));

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
  taxEnabled = false, retirementTaxRate = 0, rothPct = 0,
}: {
  annualIncome: number; monthlyExpenses: number; k401: number;
  rothIRA: number; taxable: number; cashSavings?: number; totalDebt: number;
  mortgageBalance: number; mortgageMonthly: number;
  growthRate?: number; withdrawalRate?: number; years?: number;
  targetMonthlyExpenses?: number;
  taxEnabled?: boolean; retirementTaxRate?: number; rothPct?: number;
}) {
  const annualExpenses       = monthlyExpenses * 12;
  const targetAnnualExpenses = targetMonthlyExpenses != null ? targetMonthlyExpenses * 12 : annualExpenses;
  const annualMortgage = mortgageMonthly * 12;
  const annualSavings  = annualIncome - annualExpenses - annualMortgage;
  // When tax is enabled, gross up the withdrawal needed to cover retirement taxes.
  // Roth / tax-free portion needs no grossing; traditional portion does.
  const taxGrossup = (taxEnabled && retirementTaxRate > 0)
    ? ((1 - rothPct / 100) / (1 - Math.min(retirementTaxRate, 0.6)) + rothPct / 100)
    : 1;
  const fireTarget     = targetAnnualExpenses * taxGrossup / withdrawalRate;

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
      background: "var(--uf-surface, #F1F5F9)", borderRadius: 8, padding: "9px 12px",
      border: `1.5px solid ${focused ? "#047857" : "var(--uf-border, #E2E8F0)"}`,
      boxShadow: focused ? "0 0 0 3px rgba(6,78,59,0.10)" : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      <span style={{ color: "var(--uf-text-3, #94A3B8)", fontSize: 13, fontFamily: "Manrope, sans-serif" }}>{prefix}</span>
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
        style={{ background: "none", border: "none", outline: "none", color: "var(--uf-text, #19181E)", fontSize: 14, width: "100%", fontFamily: "Manrope, sans-serif" }}
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

// ─── Dashboard Overview Tab ───────────────────────────────────────────────────
function DashTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, actuals: _actuals = {}, actualIncome = 0, actualExpenses = 0, cityName = "", prevIncome = 0, prevExpenses = 0, userName = "", displayCurrency, displayRates, plaidAccounts = [], retirementCityCol = 0, lifestyleMultiplier = 1.0, fireAge = 0, nwSnapshots = [], recentTransactions = [], plaidHoldings = [], budgetMode = "manual", histMonthsCount = 0, userJoinedAt = "", monthlyNeedsExpenses, monthlyWorkCosts, taxEnabled = false, retirementTaxRate = 0, rothPct = 0, onTabChange, onOpenOnboarding, onFreedomDateChange }: {
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
  recentTransactions?: { date: string; amount: number; refund_amount?: number; currency: string; transaction_type?: string; tags?: string[] }[];
  plaidHoldings?: PlaidHolding[];
  budgetMode?: "manual" | "history";
  histMonthsCount?: number;
  userJoinedAt?: string;
  monthlyNeedsExpenses?: number;
  monthlyWorkCosts?: number;
  taxEnabled?: boolean;
  retirementTaxRate?: number;
  rothPct?: number;
  onTabChange?: (tab: TabKey) => void;
  onOpenOnboarding?: () => void;
  onFreedomDateChange?: (date: Date | null) => void;
}) {
  const [chartPeriod, setChartPeriod] = useState<"5Y" | "15Y" | "All">("5Y");
  const [showBreakdown, setShowBreakdown] = useState(true);
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);
  const chartMonthTickFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }), []);
  const chartMonthTooltipFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }), []);

  // Current unrealized gain from Plaid investment holdings (institution_value - cost_basis)
  const holdingsUnrealizedGain = useMemo(() => {
    const withBasis = plaidHoldings.filter(h => h.cost_basis !== null && h.cost_basis > 0 && h.institution_value !== null);
    if (withBasis.length === 0) return null;
    const gain = withBasis.reduce((s, h) => s + (h.institution_value ?? 0) - (h.cost_basis ?? 0), 0);
    return gain > 0 ? Math.round(gain) : null;
  }, [plaidHoldings]);

  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  // Emergency fund covers needs only (essentials that remain during an emergency).
  // Falls back to total expenses when the user hasn't tagged any needs yet.
  const efMonthlyBase = monthlyNeedsExpenses ?? monthlyExpenses;

  // Work costs disappear at retirement → FIRE target uses adjusted spend.
  const retirementMonthlyExpenses = monthlyWorkCosts
    ? Math.max(0, monthlyExpenses - monthlyWorkCosts)
    : monthlyExpenses;

  const targetMonthlyExpenses = retirementCityCol > 0
    ? (retirementCityCol * lifestyleMultiplier) / 12
    : monthlyWorkCosts ? retirementMonthlyExpenses : undefined;

  const plaidAssets = plaidAccounts
    .filter(a => a.type === "depository" || a.type === "investment")
    .reduce((s, a) => s + (a.balance_current ?? 0), 0);
  const totalCash = cashSavings + plaidAssets;

  const { data, fireYear, fireTarget, annualSavings } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, cashSavings: totalCash, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate, targetMonthlyExpenses,
    taxEnabled, retirementTaxRate, rothPct,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, totalCash, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses, taxEnabled, retirementTaxRate, rothPct]);

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

  const milestones = useMemo(() => {
    if (fireTarget <= 0) return [] as Array<{ key: string; label: string; value: number; achieved: boolean }>;
    const fixed = [
      { key: "start", label: "Journey Started", value: 1 },
      { key: "10k",   label: "First $10k",       value: 10_000 },
      { key: "100k",  label: "Six Figures",       value: 100_000 },
    ];
    const pct = [
      { key: "quarter",  label: "Foundation Built", value: fireTarget * 0.25 },
      { key: "half",     label: "Halfway Free",      value: fireTarget * 0.5  },
      { key: "approach", label: "On the Approach",   value: fireTarget * 0.75 },
      { key: "fi",       label: "Work is Optional",  value: fireTarget        },
    ].filter(m => m.value > 100_000);
    // Include $1M "2 Comma Club" unless it overlaps closely with a %-based milestone
    const oneMil = { key: "1m", label: "2 Comma Club", value: 1_000_000 };
    const tooClose = pct.some(m => Math.abs(m.value - 1_000_000) / 1_000_000 < 0.12);
    return [...fixed, ...(!tooClose ? [oneMil] : []), ...pct]
      .sort((a, b) => a.value - b.value)
      .map(m => ({ ...m, achieved: investable >= m.value }));
  }, [investable, fireTarget]);
  // Memoized so its reference is stable across renders. Downstream memos depend
  // on it (chartData, exactFreedomDate); a fresh array every render made
  // exactFreedomDate recompute a new Date() each render, which the freedom-date
  // effect pushed to the parent via setState → infinite re-render loop.
  const rawChartData = useMemo(
    () => data.slice(0, Math.min(data.length, (fireYear ?? 30) + 6)),
    [data, fireYear],
  );
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
      if (tx.transaction_type === "transfer") continue;
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

    // Compute unrealized gain from Plaid holdings cost_basis.
    // Unrealized gain = institution_value - cost_basis within investment holdings only.
    // These are set below and used for todayEntry
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
          const snapVal = snapByMonth.get(monthKey);
          const portfolioVal = snapVal !== undefined
            ? Math.max(0, Math.round(snapVal))
            : Math.max(0, Math.round(point.value));
          return {
            key: `history-${index}`,
            label: chartMonthTooltipFormatter.format(point.date),
            shortLabel: monthTick(point.date),
            actual: portfolioVal,
            projected: null,
            yearsOut: null,
            phase: "history" as const,
            Contributions: null as number | null,
            "Market Growth": null as number | null,
          };
        })
      );

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
          actual: Math.max(0, Math.round(snap.value)),
          projected: null,
          yearsOut: null,
          phase: "history" as const,
          Contributions: null as number | null,
          "Market Growth": null as number | null,
        }))
      );
    }

    // Use exact unrealized gain for today's split when cost_basis data is available
    if (holdingsUnrealizedGain !== null && holdingsUnrealizedGain > 0) {
      todayMarketGain = Math.min(investable, holdingsUnrealizedGain);
      todayContributions = Math.max(0, investable - todayMarketGain);
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
  }, [rawChartData, investable, holdingsUnrealizedGain, nwSnapshots, chartMonthTickFormatter, chartMonthTooltipFormatter, recentTransactions, displayCurrency, displayRates]);
  const retireYear  = fireYear ? new Date().getFullYear() + fireYear : null;

  // Exact freedom date: interpolate between the yearly projection points that
  // bracket the FIRE-target crossing, same technique the chart already uses
  // for its monthly points. This is a smoothed estimate over a yearly-step
  // projection, not a day-by-day simulation.
  const exactFreedomDate = useMemo(() => {
    if (fireYear === null || fireYear <= 0) return null;
    const prevPoint = rawChartData[fireYear - 1];
    const curPoint = rawChartData[fireYear];
    if (!prevPoint || !curPoint) return null;
    const prevVal = prevPoint["Investable"] ?? 0;
    const curVal = curPoint["Investable"] ?? 0;
    const span = curVal - prevVal;
    const fraction = span > 0 ? Math.min(1, Math.max(0, (fireTarget - prevVal) / span)) : 0;
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + (fireYear - 1 + fraction) * msPerYear);
  }, [fireYear, rawChartData, fireTarget]);

  useEffect(() => {
    onFreedomDateChange?.(exactFreedomDate);
  }, [exactFreedomDate, onFreedomDateChange]);

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

  // Milestone bubble markers — first point in periodData where portfolio value crosses each milestone
  const milestoneDots = useMemo(() => {
    if (!periodData.length || !milestones.length) return [] as Array<{ shortLabel: string; chartValue: number; label: string; achieved: boolean }>;
    return milestones
      .filter(m => m.key !== "start")
      .flatMap(m => {
        for (let i = 0; i < periodData.length; i++) {
          const entry = periodData[i];
          const val = entry.actual ?? entry.projected ?? 0;
          if (val >= m.value) {
            return [{ shortLabel: entry.shortLabel, chartValue: val, label: m.label, achieved: m.achieved }];
          }
        }
        return [];
      });
  }, [periodData, milestones]);

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
  const emergencyFundHealthyNow = efMonthlyBase > 0 && (availableCash / efMonthlyBase) >= EMERGENCY_FUND_TARGET_MONTHS;
  const hasEverHealthyEmergencyFund = useEmergencyFundHistory(emergencyFundHealthyNow);
  const emergencyFundPlan = getEmergencyFundPlan(availableCash, efMonthlyBase, hasEverHealthyEmergencyFund);
  const efUsingNeedsOnly = monthlyNeedsExpenses != null && monthlyNeedsExpenses > 0;
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
      if (tx.transaction_type === "transfer") continue;
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

    if (efMonthlyBase > 0 && emergencyFundPlan.priorityMode === "protect") {
      const refillAmount = emergencyFundPlan.gapToFloor > 0 ? emergencyFundPlan.gapToFloor : Math.min(emergencyFundPlan.gapToTarget, Math.max(efMonthlyBase * 0.75, 0));
      const coverageLabel = efUsingNeedsOnly ? "months of essential needs covered" : "months covered";
      addTask(
        `Rebuild your emergency fund by about ${fmtMoney(refillAmount, true)}`,
        `${emergencyFundPlan.coverageMonths.toFixed(1)} ${coverageLabel} now. Get back above your ${EMERGENCY_FUND_FLOOR_MONTHS}-month floor before pushing harder on growth.`,
        0,
        100,
        {
          progressPct: emergencyFundPlan.floorAmount > 0 ? (availableCash / emergencyFundPlan.floorAmount) * 100 : 0,
          progressText: `${emergencyFundPlan.coverageMonths.toFixed(1)} / ${EMERGENCY_FUND_FLOOR_MONTHS.toFixed(1)} mo`,
          progressAria: `Emergency fund progress: ${emergencyFundPlan.coverageMonths.toFixed(1)} of ${EMERGENCY_FUND_FLOOR_MONTHS.toFixed(1)} months of ${efUsingNeedsOnly ? "needs" : "expenses"} covered`,
        },
      );
    }

    if (efMonthlyBase > 0 && emergencyFundPlan.priorityMode === "balance") {
      const coverageLabel = efUsingNeedsOnly ? "months of essential needs covered" : "months covered";
      addTask(
        `Keep rebuilding your emergency fund toward ${EMERGENCY_FUND_TARGET_MONTHS} months`,
        `${emergencyFundPlan.coverageMonths.toFixed(1)} ${coverageLabel} now. Keep some money moving into safety while continuing steady investing.`,
        0,
        70,
        {
          progressPct: emergencyFundPlan.targetAmount > 0 ? (availableCash / emergencyFundPlan.targetAmount) * 100 : 0,
          progressText: `${emergencyFundPlan.coverageMonths.toFixed(1)} / ${EMERGENCY_FUND_TARGET_MONTHS.toFixed(1)} mo`,
          progressAria: `Emergency fund progress: ${emergencyFundPlan.coverageMonths.toFixed(1)} of ${EMERGENCY_FUND_TARGET_MONTHS.toFixed(1)} months of ${efUsingNeedsOnly ? "needs" : "expenses"} covered`,
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

      {/* ── Setup checklist (hidden once all 4 steps done) ─────────────── */}
      <SetupChecklist
        income={income}
        expenses={expenses}
        k401={k401}
        rothIRA={rothIRA}
        taxable={taxable}
        cashSavings={cashSavings}
        cityName={cityName}
        plaidAccounts={plaidAccounts}
        onTabChange={onTabChange}
        onOpenOnboarding={onOpenOnboarding}
      />

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

          <div className="uf-progress-metrics" style={{ display: "grid", gridTemplateColumns: holdingsUnrealizedGain !== null ? "repeat(4, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14, position: "relative" }}>
            {[
              { label: "Net worth", value: fmtMoney(currentNetWorth, true), tone: "#FFFFFF" },
              { label: "This month", value: hasActuals ? fmtMoney(actualOrPlannedSavings, true) : fmtMoney(goalContribution, true), tone: actualOrPlannedSavings >= 0 ? "#62FAE3" : "#FCA5A5" },
              ...(holdingsUnrealizedGain !== null ? [{ label: "Investment gains", value: fmtMoney(holdingsUnrealizedGain, true), tone: "#62FAE3" }] : []),
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
              {milestoneDots.map((dot) => (
                <ReferenceDot
                  key={dot.label}
                  x={dot.shortLabel}
                  y={dot.chartValue}
                  r={0}
                  shape={({ cx, cy }: { cx?: number; cy?: number }) => {
                    const x = cx ?? 0;
                    const y = cy ?? 0;
                    const w = Math.max(dot.label.length * 5.8 + 12, 40);
                    return (
                      <g>
                        <rect x={x - w / 2} y={y - 30} width={w} height={16} rx={4} fill="rgba(8,8,14,0.82)" stroke="rgba(34,211,165,0.55)" strokeWidth={0.8} />
                        <text x={x} y={y - 18} textAnchor="middle" fill="#22d3a5" fontSize={9} fontWeight={700} fontFamily="Manrope, sans-serif">{dot.label}</text>
                        <line x1={x} y1={y - 14} x2={x} y2={y - 5} stroke="rgba(34,211,165,0.65)" strokeWidth={1} />
                        <circle cx={x} cy={y} r={4} fill={dot.achieved ? "rgba(34,211,165,0.25)" : "#22d3a5"} stroke="#22d3a5" strokeWidth={1.5} />
                      </g>
                    );
                  }}
                />
              ))}
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
      {efMonthlyBase > 0 && (
        <div className="uf-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Safety runway
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "5px 10px",
                borderRadius: 999,
                background: emergencyFundPlan.state === "healthy" ? "#DCFCE7" : emergencyFundPlan.state === "fragile" ? "#FEF3C7" : emergencyFundPlan.state === "rebuilding" ? "#E0F2FE" : "#FEE2E2",
                color: emergencyFundPlan.state === "healthy" ? "#166534" : emergencyFundPlan.state === "fragile" ? "#92400E" : emergencyFundPlan.state === "rebuilding" ? "#075985" : "#991B1B",
                fontFamily: "Manrope, sans-serif",
              }}>
                {emergencyFundPlan.stateLabel}
              </span>
            </div>
            <div style={{ fontSize: "clamp(30px, 5vw, 42px)", fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {emergencyFundPlan.coverageMonths.toFixed(1)} months
            </div>
            <div style={{ fontSize: 14, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginTop: 8, lineHeight: 1.55 }}>
              Months of essential expenses covered. Excludes wants and work costs so job-loss planning stays realistic.
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, fontSize: 12, color: "var(--uf-text-2)", fontWeight: 700 }}>
              <span>{fmtMoney(availableCash, true)} reserve</span>
              <span>{EMERGENCY_FUND_TARGET_MONTHS}mo target</span>
            </div>
            <EmergencyFundProgressBar progressPct={emergencyFundPlan.progressToTargetPct} state={emergencyFundPlan.state} />
            <button
              onClick={() => onTabChange?.("assets")}
              style={{ border: "1px solid var(--uf-border)", background: "var(--uf-surface)", color: "var(--uf-text)", borderRadius: 10, padding: "9px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "Manrope, sans-serif", width: "100%" }}
            >
              Review reserve
            </button>
          </div>
        </div>
      )}

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
              {efMonthlyBase > 0 && (
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
              {efMonthlyBase > 0 ? emergencyFundPlan.headline : "Top 3 tasks right now"}
            </div>
            <div style={{ fontSize: 14, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginTop: 8, lineHeight: 1.6 }}>
              {efMonthlyBase > 0 ? emergencyFundPlan.guidance : "Focus on the next few actions most likely to protect or improve your freedom date."}
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
          {monthlyWorkCosts != null && monthlyWorkCosts > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#6366f1", fontWeight: 700, fontFamily: "Manrope, sans-serif" }}>
              <span>💼</span>
              <span>{fmtMoney(monthlyWorkCosts, true)}/mo in work costs drops at FIRE → retirement target: {fmtMoney(retirementMonthlyExpenses * 12 / withdrawalRate, true)}</span>
            </div>
          )}
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
function BudgetTab({ income, setIncome, expenses, setExpenses, actuals, displayCurrency, displayRates, recentTransactions = [], freedomDateMonthYearLabel, onOpenTransactions }: {
  income: number; setIncome: (v: number) => void;
  expenses: Expenses; setExpenses: (e: Expenses) => void;
  actuals: Record<string, number>;
  displayCurrency: string; displayRates: Record<string, number>;
  recentTransactions?: { date: string; amount: number; refund_amount: number; currency: string; transaction_type?: string; category?: string; tags?: string[] }[];
  freedomDateMonthYearLabel?: string | null;
  onOpenTransactions?: () => void;
}) {
  const fmtMoney = (n: number) => fmt(n, displayCurrency, displayRates);
  const currencyPrefix = getCurrencySymbol(displayCurrency);

  // Single shared category source (defaults + any user-defined ones), same list used everywhere else
  const { customCats } = useCustomCategories();
  const allExpenseCats = useMemo(() => [...EXPENSE_CATEGORIES, ...customCats], [customCats]);
  const activeCats = useMemo(
    () => allExpenseCats.filter(c => (expenses[c.key] || 0) > 0 || (actuals[c.key] || 0) > 0),
    [allExpenseCats, expenses, actuals],
  );

  const totalExp = activeCats.reduce((s, c) => s + (expenses[c.key] || 0), 0);
  const savings  = income - totalExp;
  const rate     = income > 0 ? (savings / income) * 100 : 0;
  const [budgetSetupOpen, setBudgetSetupOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [onTrackOpen, setOnTrackOpen] = useState(false);
  const isEmpty = totalExp === 0;

  const donutStops = useMemo(() => {
    let acc = 0;
    return activeCats.map(cat => {
      const amt = expenses[cat.key] || 0;
      const pct = totalExp > 0 ? (amt / totalExp) * 100 : 0;
      const start = acc;
      acc += pct;
      return { ...cat, amt, pct, start, end: acc };
    });
  }, [activeCats, expenses, totalExp]);
  const donutGradient = totalExp > 0
    ? donutStops.map(s => `${s.color} ${s.start}% ${s.end}%`).join(", ")
    : "var(--uf-border) 0% 100%";

  const overBudgetCats = activeCats
    .filter(cat => {
      const budget = expenses[cat.key] || 0;
      const spent = actuals[cat.key] || 0;
      return budget > 0 && spent > budget;
    })
    .sort((a, b) => ((actuals[b.key] || 0) - (expenses[b.key] || 0)) - ((actuals[a.key] || 0) - (expenses[a.key] || 0)));
  const onTrackCats = activeCats.filter(c => !overBudgetCats.includes(c));
  const onTrackBudgetTotal = onTrackCats.reduce((s, c) => s + (expenses[c.key] || 0), 0);

  function suggestSlackCategories(excludeKey: string) {
    return activeCats
      .filter(c => c.key !== excludeKey)
      .map(c => ({ label: c.label, slack: (expenses[c.key] || 0) - (actuals[c.key] || 0) }))
      .filter(c => c.slack > 0.5)
      .sort((a, b) => b.slack - a.slack)
      .slice(0, 2)
      .map(c => c.label);
  }

  // Needs vs Wants — current month, from the same transaction feed the rest of the dashboard uses
  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTxns = recentTransactions.filter(t => t.date.startsWith(curMonth));
  const expenseTxns = monthTxns.filter(t => (t.transaction_type ?? "expense") === "expense");
  const taggedTxns = expenseTxns.filter(t => t.tags?.includes("need") || t.tags?.includes("want"));
  const needsTotal = taggedTxns.filter(t => t.tags?.includes("need")).reduce((s, t) => s + toUSD(netAmt(t), t.currency, displayRates), 0);
  const wantsTotal = taggedTxns.filter(t => t.tags?.includes("want")).reduce((s, t) => s + toUSD(netAmt(t), t.currency, displayRates), 0);
  const classifiedTotal = needsTotal + wantsTotal;
  const untaggedCount = expenseTxns.length - taggedTxns.length;

  const guidedSetupModal = budgetSetupOpen && (
    <BudgetSetupModal
      transactions={recentTransactions.map(t => ({
        ...t,
        category: t.category ?? "other",
        transaction_type: (t.transaction_type === "income" || t.transaction_type === "transfer" ? t.transaction_type : "expense") as "expense" | "income" | "transfer",
      }))}
      expenseCategories={allExpenseCats}
      budgetExpenses={expenses}
      rates={displayRates}
      formatAmount={fmtMoney}
      onClose={() => setBudgetSetupOpen(false)}
      onSave={(values) => setExpenses({ ...expenses, ...values })}
    />
  );

  if (isEmpty) {
    return (
      <div className="uf-budget-grid">
        <div className="uf-card" style={{ padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
          <div style={{ fontSize: 32 }}>🧭</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>You haven&apos;t set a budget yet</div>
          <div style={{ color: "var(--uf-text-2)", fontSize: 13, maxWidth: "34ch", lineHeight: 1.5 }}>
            Takes about a minute — we&apos;ll suggest a starting number for each category from your spending history where we have it.
          </div>
          <button
            onClick={() => setBudgetSetupOpen(true)}
            style={{ marginTop: 6, background: "#22d3a5", color: "#062018", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 13, fontWeight: 800, fontFamily: "Manrope, sans-serif", cursor: "pointer" }}
          >
            ✎ Set up my budget
          </button>
        </div>

        <div className="uf-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, padding: "8px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: "6px solid var(--uf-border)" }} />
            <div style={{ fontSize: 11, color: "var(--uf-text-3)", lineHeight: 1.5 }}>Your allocation chart shows up here once you set a budget</div>
          </div>
          <div style={{ height: 1, background: "var(--uf-border)" }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 4 }}>Income</div>
            {editingKey === "income" ? (
              <NumberInput
                value={income}
                onChange={setIncome}
                placeholder="5000"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            ) : (
              <div onClick={() => setEditingKey("income")} style={{ fontSize: 22, fontWeight: 800, cursor: "pointer" }}>
                {income > 0 ? fmtMoney(income) : <span style={{ color: "var(--uf-text-3)", fontWeight: 600, fontSize: 13 }}>Add income</span>}
              </div>
            )}
          </div>
        </div>
        {guidedSetupModal}
      </div>
    );
  }

  function renderRow(cat: typeof activeCats[number], over: boolean) {
    const budget = expenses[cat.key] || 0;
    const spent = actuals[cat.key] || 0;
    const barPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
    const isEditing = editingKey === cat.key;
    const suggestions = over ? suggestSlackCategories(cat.key) : [];
    return (
      <div key={cat.key}>
        <div className="uf-budget-row" onClick={() => !isEditing && setEditingKey(cat.key)}>
          <span style={{ fontSize: 15, width: 20, flexShrink: 0 }}>{cat.emoji}</span>
          <span style={{ flex: "0 0 110px", fontSize: 13, color: "var(--uf-text-2)" }}>{cat.label}</span>
          {isEditing ? (
            <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <NumberInput
                value={budget}
                onChange={v => setExpenses({ ...expenses, [cat.key]: v })}
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </div>
          ) : (
            <>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", flexShrink: 0, minWidth: 40, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(budget)}</span>
              <span className="uf-budget-pencil" style={{ fontSize: 11, color: "var(--uf-text-3)", flexShrink: 0 }}>✎</span>
            </>
          )}
          <div style={{ height: 4, flex: 1, background: "var(--uf-border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${barPct}%`, background: over ? "#DC2626" : "#22d3a5", borderRadius: 4, transition: "width 0.4s" }} />
          </div>
          <span style={{ fontSize: 11, width: 90, textAlign: "right", flexShrink: 0, fontWeight: over ? 700 : 400, color: over ? "#DC2626" : "var(--uf-text-3)" }}>
            {over ? `over ${fmtMoney(spent - budget)}` : spent > 0 ? `${fmtMoney(spent)} spent` : "—"}
          </span>
        </div>
        {over && suggestions.length > 0 && (
          <div style={{ fontSize: 11, color: "#f97316", padding: "0 18px 10px", marginTop: -4 }}>
            ↳ Cut {fmtMoney(spent - budget)} from {suggestions.join(" or ")} to stay on pace
          </div>
        )}
        {isEditing && (
          <div style={{ fontSize: 11, color: "var(--uf-text-3)", padding: "0 18px 10px", marginTop: -4 }}>
            <button onClick={() => setEditingKey(null)} style={{ background: "none", border: "none", color: "var(--uf-text-3)", textDecoration: "underline", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "Manrope, sans-serif" }}>Done</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="uf-budget-grid">
      <div className="uf-card" style={{ padding: "6px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", margin: "0 -18px", borderBottom: "1px solid var(--uf-border)" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Monthly Budget</span>
          <button
            onClick={() => setBudgetSetupOpen(true)}
            style={{ background: "transparent", border: "1px solid var(--uf-border)", borderRadius: 6, padding: "4px 11px", fontSize: 11, fontWeight: 600, color: "var(--uf-text-2)", cursor: "pointer" }}
          >
            ✎ Guided setup
          </button>
        </div>

        {(classifiedTotal > 0 || untaggedCount > 0) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", margin: "0 -18px", borderBottom: "1px solid var(--uf-border)", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--uf-text-2)" }}>
              <span>Needs/Wants</span>
              {classifiedTotal > 0 && (
                <>
                  <div style={{ width: 110, height: 6, borderRadius: 4, overflow: "hidden", display: "flex", background: "var(--uf-border)" }}>
                    <div style={{ width: `${(needsTotal / classifiedTotal) * 100}%`, background: "#22d3a5" }} />
                    <div style={{ width: `${(wantsTotal / classifiedTotal) * 100}%`, background: "#f97316" }} />
                  </div>
                  <span>{Math.round((needsTotal / classifiedTotal) * 100)}% / {Math.round((wantsTotal / classifiedTotal) * 100)}%</span>
                </>
              )}
              {untaggedCount > 0 && <span>{untaggedCount} unclassified</span>}
            </div>
            {untaggedCount > 0 && (
              <button
                onClick={onOpenTransactions}
                style={{ background: "transparent", border: "1px solid var(--uf-border)", borderRadius: 6, padding: "4px 11px", fontSize: 11, fontWeight: 600, color: "var(--uf-text-2)", cursor: "pointer" }}
              >
                Tag in Transactions →
              </button>
            )}
          </div>
        )}

        {overBudgetCats.length > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px 6px", margin: "0 -18px", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", color: "#DC2626" }}>
              Over budget <span style={{ background: "#DC2626", color: "#fff", fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "1px 8px" }}>{overBudgetCats.length}</span>
            </div>
            {overBudgetCats.map(cat => renderRow(cat, true))}
            <div style={{ height: 1, background: "var(--uf-border)", margin: "0 -18px" }} />
          </>
        ) : (
          <div style={{ padding: "12px 18px", margin: "0 -18px", fontSize: 12, color: "#22d3a5", fontWeight: 600 }}>✓ Nothing over budget this month</div>
        )}

        {onTrackCats.length > 0 && (
          <>
            <button
              onClick={() => setOnTrackOpen(v => !v)}
              style={{ width: "calc(100% + 36px)", margin: "0 -18px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", fontSize: 12, fontWeight: 600, color: "var(--uf-text-2)", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <span>{onTrackCats.length} {overBudgetCats.length > 0 ? "more " : ""}on track — {fmtMoney(onTrackBudgetTotal)} budgeted</span>
              <span style={{ color: "var(--uf-text-3)", transform: onTrackOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
            </button>
            {onTrackOpen && onTrackCats.map(cat => renderRow(cat, false))}
          </>
        )}
      </div>

      <div className="uf-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0, borderRadius: "50%", background: `conic-gradient(${donutGradient})` }}>
            <div style={{ position: "absolute", inset: 13, borderRadius: "50%", background: "var(--uf-card)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--uf-text)" }}>{fmtMoney(totalExp)}</div>
              <div style={{ fontSize: 7, color: "var(--uf-text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>budgeted</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10.5, minWidth: 0 }}>
            {[...donutStops].sort((a, b) => b.amt - a.amt).slice(0, 6).map(s => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ color: "var(--uf-text-2)" }}>{s.label}</span>
                <span style={{ marginLeft: "auto", color: "var(--uf-text-3)" }}>{Math.round(s.pct)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "var(--uf-border)" }} />

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 4 }}>Income</div>
          {editingKey === "income" ? (
            <div onClick={e => e.stopPropagation()}>
              <NumberInput
                value={income}
                onChange={setIncome}
                placeholder="5000"
                prefix={currencyPrefix}
                currency={displayCurrency}
                rates={displayRates}
              />
            </div>
          ) : (
            <div onClick={() => setEditingKey("income")} style={{ fontSize: 22, fontWeight: 800, cursor: "pointer" }}>{fmtMoney(income)}</div>
          )}
        </div>

        <div style={{ height: 1, background: "var(--uf-border)" }} />

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 4 }}>Monthly savings</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: savings >= 0 ? "#22d3a5" : "#DC2626" }}>{fmtMoney(Math.max(0, savings))}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 4 }}>Savings rate</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)" }}>{rate.toFixed(1)}%</div>
        </div>

        <div style={{ height: 1, background: "var(--uf-border)" }} />

        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--uf-text-2)" }}>
          {rate >= 50 ? "🔥 " : ""}Saving {fmtMoney(Math.max(0, savings))}/mo ({rate.toFixed(1)}% rate)
          {freedomDateMonthYearLabel
            ? <> — projected freedom date <span style={{ color: "var(--uf-text)", fontWeight: 700 }}>{freedomDateMonthYearLabel}</span>.</>
            : "."}
          {overBudgetCats.length > 0 && (
            <> {overBudgetCats.map(c => c.label).join(", ")} {overBudgetCats.length === 1 ? "is" : "are"} over budget this month.</>
          )}
        </div>
      </div>

      {guidedSetupModal}
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
  onComplete: (income: number, spending: number, savings: number, taxKey: string) => void;
  onDismiss: () => void;
}) {
  const [incomeMode, setIncomeMode] = useState<"monthly" | "annual">("monthly");
  const [inc, setInc] = useState("");
  const [spend, setSpend] = useState("");
  const [save, setSave] = useState("");
  const [taxCountry, setTaxCountry] = useState("");
  const [taxSub, setTaxSub] = useState("");

  const toNum = (s: string) => parseFloat(s.replace(/,/g, "")) || 0;
  const fmtNum = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? s : n.toLocaleString();
  };

  const monthlyIncome = incomeMode === "annual" ? Math.round(toNum(inc) / 12) : toNum(inc);

  // Resolve STATE_TAX key from country + sub-picker
  const resolvedTaxKey = taxCountry === "us" ? taxSub
    : taxCountry === "ca" ? (taxSub || "ca_on")
    : taxCountry || "";

  const handleSubmit = () => {
    onComplete(monthlyIncome, toNum(spend), toNum(save), resolvedTaxKey);
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", border: "1.5px solid #E5E7EB", borderRadius: 10,
    fontSize: 14, fontWeight: 600, fontFamily: "Manrope, sans-serif", color: "#111827",
    background: "#fff", outline: "none", cursor: "pointer", appearance: "auto",
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
          onBlur={e => onChange(fmtNum(e.target.value))}
          placeholder="0"
          style={{ width: "100%", paddingLeft: 52, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 16, fontWeight: 600, fontFamily: "Manrope, sans-serif", outline: "none", boxSizing: "border-box", color: "#111827" }}
          onFocus={e => { e.target.style.borderColor = "#064E3B"; }}
        />
      </div>
      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Manrope, sans-serif" }}>{hint}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px 28px", maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 24, margin: "auto" }}>
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

        {/* Financial fields */}
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

        {/* Tax identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4, borderTop: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: "Manrope, sans-serif", letterSpacing: "0.02em" }}>
              Where do you pay taxes?
            </div>
            <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Manrope, sans-serif" }}>optional</span>
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Manrope, sans-serif", marginTop: -4, lineHeight: 1.5 }}>
            Helps us estimate your real FIRE number — taxes change what you actually need to save.
          </div>
          <select
            value={taxCountry}
            onChange={e => { setTaxCountry(e.target.value); setTaxSub(""); }}
            style={selectStyle}
          >
            <option value="">Select country / region…</option>
            {TAX_COUNTRIES.map(c => (
              <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
            ))}
          </select>
          {taxCountry === "us" && (
            <select value={taxSub} onChange={e => setTaxSub(e.target.value)} style={selectStyle}>
              <option value="">Select state…</option>
              {TAX_US_STATES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}
          {taxCountry === "ca" && (
            <select value={taxSub} onChange={e => setTaxSub(e.target.value)} style={selectStyle}>
              <option value="">Select province…</option>
              {TAX_CA_PROVINCES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          )}
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
    <div style={{ background: "var(--uf-card)", border: "1px solid rgba(34,211,165,0.2)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>Get started</div>
          <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", marginTop: 2 }}>{completedCount} of 4 complete</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#22d3a5", fontFamily: "Manrope, sans-serif" }}>{Math.round(pct)}%</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "var(--uf-border)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#22d3a5", borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map(step => (
          <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: step.done ? "#22d3a5" : "transparent", border: step.done ? "none" : "1.5px solid var(--uf-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {step.done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#08080e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ flex: 1, fontSize: 13, color: step.done ? "var(--uf-text-2)" : "var(--uf-text)", fontFamily: "Manrope, sans-serif", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</span>
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

type Goal = {
  id: string;
  name: string;
  emoji: string;
  target_amount: number;
  current_saved: number;
  target_date: string | null;
  sort_order: number;
};

type GoalDraft = {
  name: string;
  emoji: string;
  target_amount: string;
  current_saved: string;
  target_date: string;
};

const QUICK_GOAL_PRESETS = [
  { emoji: "🚗", name: "Car" },
  { emoji: "🏠", name: "House" },
  { emoji: "👶", name: "Baby Fund" },
  { emoji: "⛵", name: "Boat" },
  { emoji: "✈️", name: "Travel" },
  { emoji: "📚", name: "Education" },
  { emoji: "💍", name: "Wedding" },
  { emoji: "🛠️", name: "Home Reno" },
  { emoji: "✈️", name: "Private Plane" },
  { emoji: "💻", name: "Business" },
];

const EMOJI_PICKER = ["🚗","🏠","👶","⛵","✈️","📚","💍","🛠️","💻","🎯","🏋️","🐶","🌴","🎸","🏕️","💎","🛻","🏡","🎓","🚀","🎁","🌏","🏖️","🍕","🛳️"];

function GoalsPageTab({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [draft, setDraft] = useState<GoalDraft>({ name: "", emoji: "🎯", target_amount: "", current_saved: "", target_date: "" });
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("goals").select("*").eq("user_id", userId).order("sort_order").then(({ data }) => {
      setGoals((data as Goal[]) ?? []);
      setLoading(false);
    });
  }, [userId]);

  function openAdd(preset?: { emoji: string; name: string }) {
    setEditingGoal(null);
    setDraft({ name: preset?.name ?? "", emoji: preset?.emoji ?? "🎯", target_amount: "", current_saved: "", target_date: "" });
    setShowEmojiPicker(false);
    setModalOpen(true);
  }

  function openEdit(g: Goal) {
    setEditingGoal(g);
    setDraft({
      name: g.name,
      emoji: g.emoji,
      target_amount: String(g.target_amount),
      current_saved: String(g.current_saved),
      target_date: g.target_date ?? "",
    });
    setShowEmojiPicker(false);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!draft.name.trim() || !draft.target_amount) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      name: draft.name.trim(),
      emoji: draft.emoji,
      target_amount: parseFloat(draft.target_amount) || 0,
      current_saved: parseFloat(draft.current_saved) || 0,
      target_date: draft.target_date || null,
      sort_order: editingGoal ? editingGoal.sort_order : goals.length,
    };
    if (editingGoal) {
      const { data } = await supabase.from("goals").update(payload).eq("id", editingGoal.id).select().single();
      if (data) setGoals(prev => prev.map(g => g.id === editingGoal.id ? data as Goal : g));
    } else {
      const { data } = await supabase.from("goals").insert(payload).select().single();
      if (data) setGoals(prev => [...prev, data as Goal]);
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("goals").delete().eq("id", id);
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  function fmtAmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
    return `$${Math.round(n)}`;
  }

  function goalStatus(g: Goal): { label: string; color: string; bg: string } {
    const pct = g.target_amount > 0 ? g.current_saved / g.target_amount : 0;
    if (pct >= 1) return { label: "Achieved! 🎉", color: "#059669", bg: "rgba(5,150,105,0.1)" };
    if (!g.target_date) return { label: `${Math.round(pct * 100)}%`, color: "#22d3a5", bg: "transparent" };
    const monthsLeft = Math.max(0, (new Date(g.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
    const needed = (g.target_amount - g.current_saved) / Math.max(monthsLeft, 1);
    if (monthsLeft <= 0) return { label: "Overdue", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    return { label: `$${Math.round(needed).toLocaleString()}/mo needed`, color: "#f97316", bg: "transparent" };
  }

  if (loading) return <div style={{ padding: 40, color: "var(--uf-text-muted)", textAlign: "center" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Syne, sans-serif", letterSpacing: "-0.4px" }}>Goals</div>
          <div style={{ fontSize: 13, color: "var(--uf-text-muted)", marginTop: 2 }}>Save toward the things that matter</div>
        </div>
        <button
          onClick={() => openAdd()}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "#22d3a5", color: "#003527",
            border: "none", borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Goal
        </button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          padding: "48px 20px", background: "var(--uf-card)", border: "1px dashed var(--uf-border)",
          borderRadius: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 40 }}>🎯</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--uf-text)", marginBottom: 6 }}>No goals yet</div>
            <div style={{ fontSize: 13, color: "var(--uf-text-muted)" }}>Pick something to save toward and track your progress.</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 420 }}>
            {QUICK_GOAL_PRESETS.slice(0, 8).map(p => (
              <button
                key={p.name}
                onClick={() => openAdd(p)}
                style={{
                  background: "var(--uf-surface)", border: "1px solid var(--uf-border)",
                  borderRadius: 99, padding: "6px 14px", fontSize: 13, fontWeight: 600,
                  color: "var(--uf-text)", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goals grid */}
      {goals.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {goals.map(g => {
            const pct = g.target_amount > 0 ? Math.min(1, g.current_saved / g.target_amount) : 0;
            const status = goalStatus(g);
            const achieved = pct >= 1;
            return (
              <div
                key={g.id}
                style={{
                  background: "var(--uf-card)", border: "1px solid var(--uf-border)",
                  borderRadius: 16, padding: "20px 20px 16px",
                  display: "flex", flexDirection: "column", gap: 14,
                  position: "relative",
                }}
              >
                {/* Edit/delete actions */}
                <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6 }}>
                  <button
                    onClick={() => openEdit(g)}
                    style={{ background: "none", border: "none", color: "var(--uf-text-muted)", cursor: "pointer", fontSize: 16, padding: 2 }}
                    title="Edit"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    style={{ background: "none", border: "none", color: "var(--uf-text-muted)", cursor: "pointer", fontSize: 16, padding: 2 }}
                    title="Delete"
                  >🗑️</button>
                </div>

                {/* Emoji + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 56 }}>
                  <div style={{
                    fontSize: 28, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--uf-surface)", borderRadius: 12, flexShrink: 0,
                  }}>{g.emoji}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--uf-text)", lineHeight: 1.3 }}>{g.name}</div>
                    {g.target_date && (
                      <div style={{ fontSize: 11, color: "var(--uf-text-muted)", marginTop: 2 }}>
                        🗓 {new Date(g.target_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{
                    height: 6, background: "var(--uf-surface)", borderRadius: 99, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${pct * 100}%`,
                      background: achieved ? "#059669" : "#22d3a5",
                      borderRadius: 99, transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>

                {/* Amounts + status */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--uf-text)", letterSpacing: "-0.03em" }}>
                      {fmtAmt(g.current_saved)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--uf-text-muted)", marginTop: 1 }}>
                      of {fmtAmt(g.target_amount)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: status.color,
                    background: status.bg, borderRadius: 99, padding: "3px 10px",
                  }}>
                    {status.label}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add another card */}
          <button
            onClick={() => openAdd()}
            style={{
              background: "transparent", border: "1.5px dashed var(--uf-border)",
              borderRadius: 16, padding: "20px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, color: "var(--uf-text-muted)", minHeight: 160, fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 24 }}>+</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Add goal</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{
            background: "var(--uf-card)", border: "1px solid var(--uf-border)",
            borderRadius: 18, padding: "24px 24px 20px", width: "100%", maxWidth: 420,
            display: "flex", flexDirection: "column", gap: 18,
          }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Syne, sans-serif" }}>
              {editingGoal ? "Edit Goal" : "New Goal"}
            </div>

            {/* Emoji + Name row */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowEmojiPicker(v => !v)}
                  style={{
                    width: 52, height: 52, fontSize: 26, background: "var(--uf-surface)",
                    border: "1.5px solid var(--uf-border)", borderRadius: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >{draft.emoji}</button>
                {showEmojiPicker && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 10,
                    background: "var(--uf-card)", border: "1px solid var(--uf-border)",
                    borderRadius: 12, padding: 10,
                    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, width: 200,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}>
                    {EMOJI_PICKER.map(em => (
                      <button
                        key={em}
                        onClick={() => { setDraft(d => ({ ...d, emoji: em })); setShowEmojiPicker(false); }}
                        style={{
                          fontSize: 20, background: "none", border: "none", cursor: "pointer",
                          borderRadius: 8, padding: 4,
                        }}
                      >{em}</button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Goal name (e.g. New Car)"
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                style={{
                  flex: 1, height: 52, padding: "0 14px",
                  background: "var(--uf-surface)", border: "1.5px solid var(--uf-border)",
                  borderRadius: 12, fontSize: 14, color: "var(--uf-text)", fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            {/* Target amount */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Target Amount</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--uf-text-muted)", fontSize: 14 }}>$</span>
                <input
                  type="number"
                  placeholder="50,000"
                  value={draft.target_amount}
                  onChange={e => setDraft(d => ({ ...d, target_amount: e.target.value }))}
                  style={{
                    width: "100%", padding: "11px 14px 11px 26px",
                    background: "var(--uf-surface)", border: "1.5px solid var(--uf-border)",
                    borderRadius: 10, fontSize: 14, color: "var(--uf-text)", fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Already saved */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Already Saved</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--uf-text-muted)", fontSize: 14 }}>$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={draft.current_saved}
                  onChange={e => setDraft(d => ({ ...d, current_saved: e.target.value }))}
                  style={{
                    width: "100%", padding: "11px 14px 11px 26px",
                    background: "var(--uf-surface)", border: "1.5px solid var(--uf-border)",
                    borderRadius: 10, fontSize: 14, color: "var(--uf-text)", fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Target date */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Target Date (optional)</label>
              <input
                type="date"
                value={draft.target_date}
                onChange={e => setDraft(d => ({ ...d, target_date: e.target.value }))}
                style={{
                  padding: "11px 14px",
                  background: "var(--uf-surface)", border: "1.5px solid var(--uf-border)",
                  borderRadius: 10, fontSize: 14, color: "var(--uf-text)", fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  flex: 1, padding: "11px", background: "var(--uf-surface)",
                  border: "1px solid var(--uf-border)", borderRadius: 10,
                  fontSize: 13, fontWeight: 600, color: "var(--uf-text-muted)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim() || !draft.target_amount}
                style={{
                  flex: 2, padding: "11px", background: "#22d3a5",
                  border: "none", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, color: "#003527",
                  cursor: saving ? "default" : "pointer", fontFamily: "inherit",
                  opacity: saving || !draft.name.trim() || !draft.target_amount ? 0.6 : 1,
                }}
              >{saving ? "Saving…" : editingGoal ? "Save Changes" : "Add Goal"}</button>
            </div>
          </div>
        </div>
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
function PortfolioOverviewTab({ income, expenses, k401, rothIRA, taxable, cashSavings = 0, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, displayCurrency, displayRates, plaidAccounts = [], retirementCityCol = 0, lifestyleMultiplier = 1.0 }: {
  income: number; expenses: Expenses; k401: number; rothIRA: number;
  taxable: number; cashSavings?: number; totalDebt: number; mortgageBalance: number;
  mortgageMonthly: number; growthRate: number; withdrawalRate: number;
  displayCurrency: string; displayRates: Record<string, number>;
  retirementCityCol?: number; lifestyleMultiplier?: number;
  plaidAccounts?: PlaidAccount[];
}) {
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);
  const monthlyExpenses = Object.entries(expenses)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const targetMonthlyExpenses = retirementCityCol > 0 ? (retirementCityCol * lifestyleMultiplier) / 12 : undefined;

  const { fireYear, fireTarget } = useMemo(() => calcProjection({
    annualIncome: income * 12, monthlyExpenses,
    k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly,
    growthRate, withdrawalRate, targetMonthlyExpenses,
  }), [income, monthlyExpenses, k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, targetMonthlyExpenses]);

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
function AssetsTab({ k401, setK401, rothIRA, setRothIRA, taxable, setTaxable, cashSavings, setCashSavings, growthRate: _growthRate, setGrowthRate: _setGrowthRate, withdrawalRate: _withdrawalRate, setWithdrawalRate: _setWithdrawalRate, actualNetCashflow = 0, displayCurrency, displayRates, plaidAccounts = [], onRefreshAccounts, onUpgradeClick, emergencyFundMonthlyBase = 0, plaidHoldings = [], plaidSecurities = {}, holdingsNeedsReconnect = [], holdingsLoading = false }: {
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
  emergencyFundMonthlyBase?: number;
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
  const emergencyFundHealthyNow = emergencyFundMonthlyBase > 0 && (emergencyFundBalance / emergencyFundMonthlyBase) >= EMERGENCY_FUND_TARGET_MONTHS;
  const hasEverHealthyEmergencyFund = useEmergencyFundHistory(emergencyFundHealthyNow);
  const emergencyFundPlan = getEmergencyFundPlan(emergencyFundBalance, emergencyFundMonthlyBase, hasEverHealthyEmergencyFund);
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
      {emergencyFundMonthlyBase > 0 && (
        <div className="uf-card" style={{
          background: emergencyFundPlan.state === "healthy" ? "rgba(5,150,105,0.04)" : emergencyFundPlan.state === "fragile" ? "rgba(245,158,11,0.04)" : emergencyFundPlan.state === "rebuilding" ? "rgba(14,165,233,0.05)" : "rgba(220,38,38,0.04)",
          border: `1px solid ${emergencyFundPlan.state === "healthy" ? "rgba(5,150,105,0.2)" : emergencyFundPlan.state === "fragile" ? "rgba(245,158,11,0.25)" : emergencyFundPlan.state === "rebuilding" ? "rgba(14,165,233,0.22)" : "rgba(220,38,38,0.2)"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#064E3B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Emergency Fund</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748B", fontWeight: 500 }}>{EMERGENCY_FUND_FLOOR_MONTHS} month floor · {EMERGENCY_FUND_TARGET_MONTHS} month needs target</span>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 8 }}>
            {[
              { label: "Current Reserve", value: fmtMoney(emergencyFundBalance), color: emergencyFundPlan.state === "healthy" ? "#059669" : emergencyFundPlan.state === "rebuilding" ? "#0369A1" : "#19181E" },
              { label: "Essential monthly needs", value: fmtMoney(emergencyFundMonthlyBase) },
              { label: `Floor · ${EMERGENCY_FUND_FLOOR_MONTHS} months`, value: fmtMoney(efFloor) },
              { label: `Target · ${EMERGENCY_FUND_TARGET_MONTHS} months`, value: fmtMoney(efTarget) },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color ?? "#19181E", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.45, marginBottom: 14 }}>
            Need-tagged transactions if available; otherwise core budget needs. Wants and work costs are excluded.
          </div>

          <EmergencyFundProgressBar progressPct={efPct} state={emergencyFundPlan.state} height={6} />

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

// ─── Investment Simulations Tab ──────────────────────────────────────────────
type SimHolding = { ticker: string; name: string; pct: number; ret: number; color: string };
type GeoMix = { na: number; eu: number; ap: number; em: number };
type GeoRegion = keyof GeoMix;
type SimScenario = {
  name: string;
  risk: string;
  geo: GeoMix;
  stats: { vol: string; sharpe: string; dd: string; beta: string };
  holdings: SimHolding[];
};

const SIM_TICKER_COLORS = ["#16A06A", "#14B8A6", "#6366F1", "#F59E0B", "#0EA5E9", "#8B5CF6", "#334155", "#EC4899", "#10B981", "#F43F5E"];

// Ticker picker for the edit-holdings modal. `ret` is an illustrative modeled
// 1-year return (historical CAGR), not advice. Keep tickers uppercase.
const SIM_TICKER_LIBRARY: Record<string, { name: string; ret: number; color: string }> = {
  VOO:   { name: "Vanguard S&P 500 ETF",            ret: 24.2, color: "#16A06A" },
  VTI:   { name: "Vanguard Total Stock Market ETF",  ret: 23.8, color: "#15A05F" },
  SPY:   { name: "SPDR S&P 500 ETF",                ret: 24.1, color: "#22C55E" },
  IVV:   { name: "iShares Core S&P 500 ETF",        ret: 24.2, color: "#16A06A" },
  SCHB:  { name: "Schwab US Broad Market ETF",       ret: 23.7, color: "#15A05F" },
  QQQ:   { name: "Invesco Nasdaq-100 ETF",           ret: 31.5, color: "#14B8A6" },
  XLK:   { name: "Technology Select Sector SPDR",    ret: 29.0, color: "#0D9488" },
  SOXX:  { name: "iShares Semiconductor ETF",        ret: 35.0, color: "#0EA5E9" },
  ARKK:  { name: "ARK Innovation ETF",               ret: 18.0, color: "#38BDF8" },
  VT:    { name: "Vanguard Total World Stock ETF",   ret: 18.9, color: "#6366F1" },
  VXUS:  { name: "Vanguard Total Intl Stock ETF",    ret: 12.1, color: "#F59E0B" },
  VEA:   { name: "Vanguard Developed Markets ETF",   ret: 11.2, color: "#FB923C" },
  VWO:   { name: "Vanguard Emerging Markets ETF",    ret: 10.4, color: "#FBBF24" },
  EFA:   { name: "iShares MSCI EAFE ETF",            ret: 11.0, color: "#FB923C" },
  BND:   { name: "Vanguard Total Bond Market ETF",   ret: 2.1,  color: "#334155" },
  AGG:   { name: "iShares Core US Aggregate Bond",   ret: 2.0,  color: "#475569" },
  BNDX:  { name: "Vanguard Total Intl Bond ETF",     ret: 3.2,  color: "#64748B" },
  SCHD:  { name: "Schwab US Dividend Equity ETF",    ret: 9.8,  color: "#0EA5E9" },
  VIG:   { name: "Vanguard Dividend Appreciation",   ret: 16.5, color: "#0284C7" },
  VYM:   { name: "Vanguard High Dividend Yield ETF", ret: 8.4,  color: "#8B5CF6" },
  VNQ:   { name: "Vanguard Real Estate ETF",         ret: 11.8, color: "#A855F7" },
  GLD:   { name: "SPDR Gold Trust",                  ret: 26.3, color: "#EAB308" },
  IWM:   { name: "iShares Russell 2000 ETF",         ret: 11.5, color: "#EC4899" },
  AVUV:  { name: "Avantis US Small Value ETF",       ret: 14.0, color: "#DB2777" },
  AAPL:  { name: "Apple Inc.",                       ret: 20.0, color: "#6366F1" },
  MSFT:  { name: "Microsoft Corp.",                  ret: 14.0, color: "#4F46E5" },
  NVDA:  { name: "NVIDIA Corp.",                     ret: 70.0, color: "#16A06A" },
  GOOGL: { name: "Alphabet Inc.",                    ret: 35.0, color: "#EF4444" },
  AMZN:  { name: "Amazon.com Inc.",                  ret: 30.0, color: "#F97316" },
  TSLA:  { name: "Tesla Inc.",                       ret: 40.0, color: "#E11D48" },
};

const SIM_INITIAL_SCENARIOS: SimScenario[] = [
  { name: "Current Plan", risk: "Balanced 70/30", geo: { na: 62, eu: 16, ap: 14, em: 8 }, stats: { vol: "13.1%", sharpe: "0.71", dd: "-18.2%", beta: "0.88" },
    holdings: [
      { ticker: "VOO", name: "Vanguard S&P 500 ETF", pct: 60, ret: 24.2, color: "#16A06A" },
      { ticker: "BND", name: "Vanguard Total Bond",  pct: 20, ret: 2.1,  color: "#334155" },
      { ticker: "VT",  name: "Vanguard Total World", pct: 20, ret: 18.9, color: "#6366F1" },
    ] },
  { name: "Aggressive Growth", risk: "High Growth 90/10", geo: { na: 78, eu: 9, ap: 9, em: 4 }, stats: { vol: "19.8%", sharpe: "0.68", dd: "-31.4%", beta: "1.18" },
    holdings: [
      { ticker: "QQQ", name: "Invesco Nasdaq-100 ETF", pct: 80, ret: 31.5, color: "#14B8A6" },
      { ticker: "VT",  name: "Vanguard Total World",   pct: 20, ret: 18.9, color: "#6366F1" },
    ] },
  { name: "Conservative Income", risk: "Capital Preservation", geo: { na: 74, eu: 14, ap: 8, em: 4 }, stats: { vol: "8.4%", sharpe: "0.79", dd: "-9.8%", beta: "0.61" },
    holdings: [
      { ticker: "BND",  name: "Vanguard Total Bond",  pct: 50, ret: 2.1,  color: "#334155" },
      { ticker: "VOO",  name: "Vanguard S&P 500 ETF", pct: 30, ret: 24.2, color: "#16A06A" },
      { ticker: "SCHD", name: "Schwab US Dividend",   pct: 20, ret: 9.8,  color: "#0EA5E9" },
    ] },
  { name: "Dividend Focus", risk: "Income Tilt", geo: { na: 58, eu: 20, ap: 14, em: 8 }, stats: { vol: "10.2%", sharpe: "0.83", dd: "-12.1%", beta: "0.74" },
    holdings: [
      { ticker: "SCHD", name: "Schwab US Dividend",      pct: 50, ret: 9.8,  color: "#0EA5E9" },
      { ticker: "VYM",  name: "Vanguard High Div Yield", pct: 30, ret: 8.4,  color: "#8B5CF6" },
      { ticker: "VXUS", name: "Vanguard Total Intl",     pct: 20, ret: 12.1, color: "#F59E0B" },
    ] },
];

// Dot-grid world map — ellipse "blobs" tagged by region, sampled on a 64×32 grid.
const SIM_GEO_MAP: { x: number; y: number; region: GeoRegion }[] = (() => {
  const E: [number, number, number, number, GeoRegion][] = [
    [13, 9, 6, 5, "na"], [7, 7, 2.6, 1.7, "na"], [16, 14.5, 2.4, 1.9, "na"],
    [19, 19, 2.4, 3, "em"], [21, 24, 1.9, 2.7, "em"],
    [33, 9, 3.3, 2.1, "eu"],
    [35, 17, 4, 5, "em"], [37, 21, 2.2, 2, "em"], [39, 13, 2, 1.6, "em"],
    [46, 6, 12, 2, "ap"], [48, 11, 7, 3.2, "ap"], [44, 14.5, 2, 2, "em"], [51, 16.5, 2.4, 1.5, "em"], [49.5, 12.5, 2.4, 1.8, "em"],
    [55, 23, 3, 2, "ap"],
  ];
  const dots: { x: number; y: number; region: GeoRegion }[] = [];
  for (let gx = 0; gx < 64; gx++) {
    for (let gy = 0; gy < 32; gy++) {
      let reg: GeoRegion | null = null;
      for (const e of E) { const dx = (gx - e[0]) / e[2], dy = (gy - e[1]) / e[3]; if (dx * dx + dy * dy <= 1) { reg = e[4]; break; } }
      if (reg) dots.push({ x: gx, y: gy, region: reg });
    }
  }
  return dots;
})();

function simDonut(holdings: { pct: number; color: string }[], r: number) {
  const tot = holdings.reduce((a, h) => a + (h.pct || 0), 0) || 1;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  return holdings.map(h => {
    const frac = (h.pct || 0) / tot;
    const d = frac * circ;
    const seg = { c: h.color, dash: `${d.toFixed(2)} ${(circ - d).toFixed(2)}`, offset: (-cum).toFixed(2), barW: `${(frac * 100).toFixed(2)}%` };
    cum += d;
    return seg;
  });
}
function simWeightedRet(h: { pct: number; ret: number }[]) {
  const tot = h.reduce((a, x) => a + (x.pct || 0), 0) || 1;
  return h.reduce((a, x) => a + (x.pct || 0) * x.ret, 0) / tot;
}
function simFmtPct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`; }
function simSeries(seed: number, target: number, n: number) {
  let v = 0, r = seed % 233280;
  const out = [0];
  for (let i = 1; i < n; i++) { r = (r * 9301 + 49297) % 233280; const rnd = r / 233280; v += 0.8 + (rnd - 0.4) * 3.4; out.push(v); }
  const last = out[out.length - 1] || 1;
  return out.map(x => +(x * (target / last)).toFixed(2));
}
function simPts(s: number[], w: number, h: number, mx: number) {
  return s.map((val, i) => { const x = (i / (s.length - 1)) * w; const y = h - (Math.max(val, -10) / mx) * (h - 16) - 8; return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
}
function simArea(p: string, w: number, h: number) { return `M0,${h} L${p.split(" ").join(" L")} L${w},${h} Z`; }
function simEndpt(s: number[], w: number, h: number, mx: number) { const val = s[s.length - 1]; return { x: w, y: h - (Math.max(val, -10) / mx) * (h - 16) - 8 }; }
function simGeoColor(w: number) { if (w >= 40) return "#0E7A4E"; if (w >= 13) return "#36A877"; if (w >= 6) return "#82CDA6"; if (w >= 2) return "#B7E2CB"; return "#DCEFE4"; }

const SIM_GROWTH_RANGES = [
  { key: "1Y", years: 1, title: "1 Year", labels: ["Jul", "Sep", "Nov", "Jan", "Mar", "Jun"] },
  { key: "5Y", years: 5, title: "5 Years", labels: ["Y1", "Y2", "Y3", "Y4", "Y5", "Now"] },
  { key: "Max", years: 10, title: "10 Years", labels: ["Y1", "Y3", "Y5", "Y7", "Y9", "Now"] },
] as const;
function simCompound(ret1y: number, years: number) { return (Math.pow(1 + ret1y / 100, years) - 1) * 100; }

function InvestSimTab({ onBack }: { onBack: () => void }) {
  const GREEN = "#16A06A", GREEN_TEXT = "#15A05F", RED = "#DC2626";

  const [scenarios, setScenarios] = useState<SimScenario[]>(
    () => SIM_INITIAL_SCENARIOS.map(s => ({ ...s, geo: { ...s.geo }, stats: { ...s.stats }, holdings: s.holdings.map(h => ({ ...h })) }))
  );
  const [selected, setSelected] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<SimHolding[]>([]);
  const [newTicker, setNewTicker] = useState("");
  const [growthRange, setGrowthRange] = useState<"1Y" | "5Y" | "Max">("1Y");

  const base = scenarios[0];
  const sel = scenarios[selected] ?? base;
  const bench = "S&P 500";

  function openEdit(i: number) {
    setSelected(i); setEditingIdx(i); setDraft(scenarios[i].holdings.map(h => ({ ...h }))); setNewTicker(""); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); }
  function updatePct(k: number, val: number) {
    setDraft(d => d.map((h, i) => i === k ? { ...h, pct: Math.max(0, Math.min(100, Math.round(val || 0))) } : h));
  }
  function removeRow(k: number) { setDraft(d => d.filter((_, i) => i !== k)); }
  function addRow() {
    const t = ((newTicker || "").trim().toUpperCase() || "NEW").slice(0, 5);
    const known = SIM_TICKER_LIBRARY[t];
    const used = new Set(draft.map(h => h.color));
    let color = known?.color ?? SIM_TICKER_COLORS[draft.length % SIM_TICKER_COLORS.length];
    if (used.has(color)) color = SIM_TICKER_COLORS.find(c => !used.has(c)) ?? color;
    setDraft(d => d.concat([{ ticker: t, name: known?.name ?? "New holding", pct: 0, ret: known?.ret ?? 10.0, color }]));
    setNewTicker("");
  }
  function save() {
    if (editingIdx == null) return;
    const idx = editingIdx;
    setScenarios(prev => prev.map((s, i) => i === idx ? { ...s, holdings: draft.map(h => ({ ...h })) } : s));
    setModalOpen(false);
  }
  function newScenario() {
    const n = scenarios.length;
    const sc: SimScenario = {
      name: `New Scenario ${n}`, risk: "Custom mix", geo: { ...base.geo },
      stats: { vol: "—", sharpe: "—", dd: "—", beta: "—" }, holdings: base.holdings.map(h => ({ ...h })),
    };
    setScenarios(prev => prev.concat([sc]));
    setSelected(n); setEditingIdx(n); setDraft(sc.holdings.map(h => ({ ...h }))); setNewTicker(""); setModalOpen(true);
  }
  function removeScenario(i: number) {
    if (scenarios.length <= 1) return;
    const newLen = scenarios.length - 1;
    setScenarios(prev => prev.filter((_, idx) => idx !== i));
    setSelected(prevSel => {
      const s = i < prevSel ? prevSel - 1 : (i === prevSel ? Math.min(prevSel, newLen - 1) : prevSel);
      return Math.max(0, Math.min(s, newLen - 1));
    });
    if (editingIdx === i) { setModalOpen(false); setEditingIdx(null); }
  }

  const railTot = (s: SimScenario) => s.holdings.reduce((a, h) => a + (h.pct || 0), 0) || 1;

  const mapDots = SIM_GEO_MAP.map(d => ({ cx: d.x, cy: d.y, color: simGeoColor(sel.geo[d.region]) }));
  const mapLegend = ([
    { label: "North America", pct: sel.geo.na },
    { label: "Europe", pct: sel.geo.eu },
    { label: "Asia-Pacific", pct: sel.geo.ap },
    { label: "Emerging Mkts", pct: sel.geo.em },
  ]).map(r => ({ label: r.label, pct: `${r.pct}%`, c: simGeoColor(r.pct) }));

  const range = SIM_GROWTH_RANGES.find(r => r.key === growthRange) ?? SIM_GROWTH_RANGES[0];
  const baseRet = simCompound(simWeightedRet(base.holdings), range.years);
  const selRet = simCompound(simWeightedRet(sel.holdings), range.years);
  const benchRet = simCompound(24.2, range.years);
  const N = 40;
  const mx = Math.max(32, Math.max(Math.abs(baseRet), Math.abs(selRet), Math.abs(benchRet)) * 1.25);
  const GW = 840, GH = 196;
  const gBase = simPts(simSeries(11, baseRet, N), GW, GH, mx);
  const sSel = simSeries(selected * 7 + 5, selRet, N);
  const gSel = simPts(sSel, GW, GH, mx);
  const gSelArea = simArea(gSel, GW, GH);
  const gSp = simPts(simSeries(23, benchRet, N), GW, GH, mx);
  const gSelEnd = simEndpt(sSel, GW, GH, mx);

  const draftScn = editingIdx != null ? scenarios[editingIdx] : null;
  const draftName = draftScn ? draftScn.name : "";
  const draftTotal = draft.reduce((a, h) => a + (h.pct || 0), 0);
  const draftRet = draft.length ? simWeightedRet(draft) : 0;
  const draftDonut = simDonut(draft, 1);

  const uppercaseLabel: React.CSSProperties = { fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: "var(--uf-text-3)" };

  return (
    <>
      <style>{`
        .uf-scn-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 22px; }
        .uf-scn-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
        .uf-scn-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .uf-scn-modal-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 900px) {
          .uf-scn-head { flex-direction: column; align-items: stretch; }
          .uf-scn-grid { grid-template-columns: 1fr; }
          .uf-scn-cols { grid-template-columns: 1fr; }
        }
      `}</style>

      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--uf-text-3)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit", marginBottom: 10 }}>
        ← Back to Calculator
      </button>

      <div className="uf-scn-head">
        <div>
          <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 27, fontWeight: 800, color: "var(--uf-text)", letterSpacing: "-0.5px" }}>Investment Simulations</div>
          <div style={{ fontSize: 15, color: "var(--uf-text-2)", marginTop: 4 }}>Compare strategies side-by-side. Click a scenario to adjust its holdings.</div>
        </div>
        <button onClick={newScenario} style={{ flexShrink: 0, background: GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: "Manrope, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 2px rgba(22,160,106,0.3)" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Scenario
        </button>
      </div>

      <div className="uf-scn-grid">
        {/* rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...uppercaseLabel, paddingLeft: 2 }}>Your Scenarios</div>
          {scenarios.map((s, i) => {
            const ret = simWeightedRet(s.holdings);
            const tot = railTot(s);
            const isSel = i === selected;
            const border = isSel ? `2px solid ${GREEN}` : (i === 0 ? "1px solid #BFE6D2" : "1px solid var(--uf-border)");
            const tag = i === 0 ? "YOUR PLAN" : (isSel ? "COMPARING" : "");
            return (
              <div key={i} onClick={() => setSelected(i)} style={{ background: "var(--uf-card)", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all .15s", border, boxShadow: isSel ? "0 4px 14px rgba(22,160,106,0.14)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--uf-text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {tag && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.5px", color: GREEN_TEXT, background: "#E7F6EE", padding: "3px 8px", borderRadius: 9999 }}>{tag}</div>}
                    {scenarios.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); removeScenario(i); }} title="Remove scenario" aria-label={`Remove ${s.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--uf-text-3)", fontSize: 16, lineHeight: 1, padding: 0, width: 16, textAlign: "center" }}>×</button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--uf-text-3)", marginTop: 2 }}>{s.risk}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 12 }}>
                  <div style={{ fontSize: 21, fontWeight: 800, color: ret >= 0 ? GREEN_TEXT : RED, letterSpacing: "-0.4px" }}>{simFmtPct(ret)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--uf-text-3)" }}>1Y return</div>
                </div>
                <div style={{ display: "flex", height: 7, borderRadius: 9999, overflow: "hidden", marginTop: 12, gap: 2 }}>
                  {s.holdings.map((h, j) => <div key={j} style={{ width: `${(h.pct || 0) / tot * 100}%`, background: h.color }} />)}
                </div>
                <button onClick={e => { e.stopPropagation(); openEdit(i); }} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, fontWeight: 700, color: GREEN, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", width: "fit-content" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2"><path d="M4 14l6-6 1.5 1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 6h4v4" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 6l-6 6" strokeLinecap="round" /></svg>
                  Edit holdings
                </button>
              </div>
            );
          })}
        </div>

        {/* comparison panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <div className="uf-scn-cols">
            {[{ s: base, who: "YOUR PLAN", whoColor: "var(--uf-text-3)", idx: 0 }, { s: sel, who: selected === 0 ? "YOUR PLAN" : "COMPARING", whoColor: GREEN, idx: selected }].map((col, ci) => {
              const ret = simWeightedRet(col.s.holdings);
              const tot = railTot(col.s);
              const donut = simDonut(col.s.holdings, 44);
              const stats = [{ l: "1Y Return", v: simFmtPct(ret) }, { l: "Volatility", v: col.s.stats.vol }, { l: "Sharpe", v: col.s.stats.sharpe }, { l: "Max DD", v: col.s.stats.dd }];
              return (
                <div key={ci} style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "20px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ ...uppercaseLabel, color: col.whoColor }}>{col.who}</div>
                    <div onClick={() => openEdit(col.idx)} style={{ fontSize: 11, fontWeight: 700, color: GREEN, cursor: "pointer" }}>Edit</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--uf-text)", marginTop: 4 }}>{col.s.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
                    <svg width="118" height="118" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
                      <g transform="rotate(-90 60 60)">
                        {donut.map((seg, k) => <circle key={k} cx="60" cy="60" r="44" fill="none" stroke={seg.c} strokeWidth="18" strokeDasharray={seg.dash} strokeDashoffset={seg.offset} />)}
                      </g>
                      <text x="60" y="57" textAnchor="middle" style={{ fontFamily: "Manrope, sans-serif", fontSize: 11, fontWeight: 800, fill: "var(--uf-text)" }}>1Y</text>
                      <text x="60" y="70" textAnchor="middle" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 800, fill: ret >= 0 ? GREEN_TEXT : RED }}>{simFmtPct(ret)}</text>
                    </svg>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {col.s.holdings.map((h, k) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 9, height: 9, borderRadius: 3, background: h.color, flexShrink: 0 }} />
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text)", flex: 1 }}>{h.ticker}</div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)" }}>{`${((h.pct || 0) / tot * 100).toFixed(0)}%`}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--uf-border)", border: "1px solid var(--uf-border)", borderRadius: 9, overflow: "hidden", marginTop: 16 }}>
                    {stats.map((st, k) => (
                      <div key={k} style={{ background: "var(--uf-card)", padding: "11px 14px" }}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "var(--uf-text-3)", marginBottom: 3 }}>{st.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--uf-text)" }}>{st.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* world map */}
          <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={uppercaseLabel}>Geographic Diversification</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--uf-text)", marginTop: 3 }}>Where {sel.name} is invested</div>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {mapLegend.map((r, k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 11, height: 11, borderRadius: 3, background: r.c }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text)" }}>{r.label}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 800, color: "var(--uf-text)" }}>{r.pct}</span>
                  </div>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 64 32" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "auto", display: "block" }}>
              {mapDots.map((d, k) => <circle key={k} cx={d.cx} cy={d.cy} r="0.36" fill={d.color} />)}
            </svg>
          </div>

          {/* growth */}
          <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
              <div style={uppercaseLabel}>Modeled Growth · {range.title}</div>
              <div style={{ display: "flex", gap: 4, background: "var(--uf-surface-2)", borderRadius: 9999, padding: 3 }}>
                {SIM_GROWTH_RANGES.map(r => (
                  <div key={r.key} onClick={() => setGrowthRange(r.key)} style={{ padding: "5px 14px", borderRadius: 9999, background: growthRange === r.key ? GREEN : "transparent", color: growthRange === r.key ? "#fff" : "var(--uf-text-2)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{r.key}</div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 18, height: 3, borderRadius: 2, background: "#64748B" }} /><span style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)" }}>Your Plan</span><span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)" }}>{simFmtPct(baseRet)}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 18, height: 3, borderRadius: 2, background: GREEN }} /><span style={{ fontSize: 12, fontWeight: 700, color: GREEN_TEXT }}>{sel.name}</span><span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: GREEN_TEXT }}>{simFmtPct(selRet)}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 18, height: 3, borderRadius: 2, background: "#CBD5E1" }} /><span style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-3)" }}>{bench}</span><span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--uf-text-3)" }}>{simFmtPct(benchRet)}</span></div>
            </div>
            <svg width="100%" viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="none" style={{ display: "block", height: 196 }}>
              <line x1="0" y1="52" x2={GW} y2="52" stroke="var(--uf-border)" />
              <line x1="0" y1="100" x2={GW} y2="100" stroke="var(--uf-border)" />
              <line x1="0" y1="148" x2={GW} y2="148" stroke="var(--uf-border)" />
              <path d={gSelArea} fill="rgba(22,160,106,0.07)" />
              <polyline points={gSp} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 4" />
              <polyline points={gBase} fill="none" stroke="#64748B" strokeWidth="2" />
              <polyline points={gSel} fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={gSelEnd.x} cy={gSelEnd.y} r="4" fill={GREEN} />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {range.labels.map((l, k) => <span key={k} style={{ fontSize: 11, color: "var(--uf-text-3)" }}>{l}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* edit modal */}
      {modalOpen && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(15,23,20,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--uf-card)", borderRadius: 16, width: 580, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }}>
            <div style={{ position: "sticky", top: 0, background: "var(--uf-card)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 26px 16px", borderBottom: "1px solid var(--uf-border)" }}>
              <div>
                <div style={uppercaseLabel}>Edit Holdings</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)", marginTop: 3 }}>{draftName}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={uppercaseLabel}>Projected 1Y</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: GREEN_TEXT, letterSpacing: "-0.4px" }}>{simFmtPct(draftRet)}</div>
              </div>
            </div>
            <div style={{ padding: "18px 26px 6px" }}>
              <div className="uf-scn-modal-2" style={{ marginBottom: 18 }}>
                <div>
                  <div style={{ ...uppercaseLabel, letterSpacing: "0.7px", marginBottom: 6 }}>Starting Amount</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--uf-surface-2)", border: "1px solid var(--uf-border)", borderRadius: 9, padding: "11px 14px" }}>
                    <span style={{ color: "var(--uf-text-3)", fontWeight: 700 }}>$</span><span style={{ fontSize: 15, fontWeight: 700, color: "var(--uf-text)" }}>10,000</span>
                  </div>
                </div>
                <div>
                  <div style={{ ...uppercaseLabel, letterSpacing: "0.7px", marginBottom: 6 }}>Monthly Contribution</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--uf-surface-2)", border: "1px solid var(--uf-border)", borderRadius: 9, padding: "11px 14px" }}>
                    <span style={{ color: "var(--uf-text-3)", fontWeight: 700 }}>$</span><span style={{ fontSize: 15, fontWeight: 700, color: "var(--uf-text)" }}>500</span><span style={{ marginLeft: "auto", fontSize: 12, color: "var(--uf-text-3)", fontWeight: 600 }}>/mo</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={uppercaseLabel}>Holdings</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 800, color: draftTotal === 100 ? GREEN_TEXT : "#E0902B" }}>Total {draftTotal}%</div>
              </div>
              <div style={{ height: 7, borderRadius: 9999, background: "var(--uf-surface-2)", overflow: "hidden", display: "flex", marginBottom: 6 }}>
                {draftDonut.map((g, k) => <div key={k} style={{ width: g.barW, background: g.c }} />)}
              </div>

              {draft.map((h, k) => (
                <div key={k} style={{ padding: "13px 0", borderBottom: "1px solid var(--uf-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: h.color, color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 800, padding: "4px 7px", borderRadius: 5, letterSpacing: "0.3px", minWidth: 42, textAlign: "center" }}>{h.ticker}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--uf-text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: h.ret >= 0 ? GREEN_TEXT : RED }}>{simFmtPct(h.ret)}</span>
                    <div onClick={() => removeRow(k)} style={{ cursor: "pointer", color: "var(--uf-text-3)", fontSize: 18, lineHeight: 1, width: 18, textAlign: "center" }}>×</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
                    <input type="range" min={0} max={100} value={h.pct} onChange={e => updatePct(k, Number(e.target.value))} style={{ flex: 1, accentColor: GREEN, height: 4, cursor: "pointer" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <input type="number" min={0} max={100} value={h.pct} onChange={e => updatePct(k, Number(e.target.value))} style={{ width: 56, border: "1px solid var(--uf-border)", borderRadius: 8, padding: "7px 9px", fontSize: 14, fontWeight: 700, color: "var(--uf-text)", textAlign: "right", outline: "none", background: "var(--uf-card)" }} />
                      <span style={{ fontSize: 13, color: "var(--uf-text-3)", fontWeight: 600 }}>%</span>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <input type="text" list="sim-ticker-list" value={newTicker} onChange={e => setNewTicker(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addRow(); }} placeholder="Add ticker (e.g. VTI)…" autoComplete="off" style={{ flex: 1, border: "1px solid var(--uf-border)", borderRadius: 9, padding: "11px 14px", fontSize: 14, color: "var(--uf-text)", outline: "none", background: "var(--uf-card)" }} />
                <datalist id="sim-ticker-list">
                  {Object.entries(SIM_TICKER_LIBRARY).map(([t, info]) => <option key={t} value={t}>{info.name}</option>)}
                </datalist>
                <button onClick={addRow} style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 9, width: 46, fontSize: 22, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--uf-text-3)", marginTop: 12, fontStyle: "italic" }}>Returns model 1-year historical CAGR. Past performance doesn&apos;t guarantee future results.</div>
            </div>
            <div style={{ position: "sticky", bottom: 0, background: "var(--uf-card)", display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 26px", borderTop: "1px solid var(--uf-border)" }}>
              <button onClick={closeModal} style={{ background: "var(--uf-card)", color: "var(--uf-text-2)", border: "1px solid var(--uf-border)", borderRadius: 9, padding: "11px 20px", fontFamily: "Manrope, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={save} style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 9, padding: "11px 22px", fontFamily: "Manrope, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tax Profile Card ─────────────────────────────────────────────────────────
function TaxProfileCard({
  cityName, income, monthlyExpenses, withdrawalRate,
  taxEnabled, setTaxEnabled,
  retirementTaxRate, setRetirementTaxRate,
  rothPct, setRothPct,
  displayCurrency, displayRates,
}: {
  cityName: string; income: number; monthlyExpenses: number; withdrawalRate: number;
  taxEnabled: boolean; setTaxEnabled: (v: boolean) => void;
  retirementTaxRate: number; setRetirementTaxRate: (v: number) => void;
  rothPct: number; setRothPct: (v: number) => void;
  displayCurrency: string; displayRates: Record<string, number>;
}) {
  const fmtMoney = (n: number, compact = false) => fmt(n, displayCurrency, displayRates, compact);

  const city = CITIES.find(c => c.name === cityName);
  const taxInfo = city ? STATE_TAX[city.state] : null;
  const isUS = city?.flag === "🇺🇸";
  const stateRate = taxInfo?.rate ?? 0;
  const ficaRate = isUS ? 0.0765 : 0;
  const suggestedRetirementRate = taxInfo
    ? (isUS ? Math.max(0.05, Math.min(stateRate + 0.12, 0.35)) : Math.max(0.05, Math.min(stateRate * 0.75, 0.40)))
    : 0.15;
  const jurisdictionLabel = taxInfo
    ? taxInfo.label.split("—")[0].trim()
    : cityName ? "Set in Profile" : "No location set";

  function handleToggle() {
    const next = !taxEnabled;
    setTaxEnabled(next);
    if (next && retirementTaxRate === 0.15) {
      setRetirementTaxRate(suggestedRetirementRate);
    }
  }

  const baseFireTarget = monthlyExpenses > 0 && withdrawalRate > 0
    ? monthlyExpenses * 12 / withdrawalRate
    : 0;
  const taxGrossup = taxEnabled && retirementTaxRate > 0
    ? ((1 - rothPct / 100) / (1 - Math.min(retirementTaxRate, 0.6)) + rothPct / 100)
    : 1;
  const adjFireTarget = baseFireTarget * taxGrossup;
  const delta = adjFireTarget - baseFireTarget;

  return (
    <div className="uf-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Manrope, sans-serif" }}>
            Tax Profile
          </div>
          <div style={{ fontSize: 14, color: "var(--uf-text-2)", marginTop: 2, fontFamily: "Manrope, sans-serif" }}>
            {city?.flag ?? "🌍"} {jurisdictionLabel}
          </div>
        </div>
        <button
          onClick={handleToggle}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>
            Include taxes
          </span>
          <div style={{
            width: 40, height: 22, borderRadius: 11,
            background: taxEnabled ? "#059669" : "var(--uf-border)",
            position: "relative", transition: "background 0.2s",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: "#fff",
              position: "absolute", top: 2, left: taxEnabled ? 20 : 2,
              transition: "left 0.2s",
            }} />
          </div>
        </button>
      </div>

      {/* Off state */}
      {!taxEnabled && (
        <div style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.6, fontFamily: "Manrope, sans-serif" }}>
          {taxInfo
            ? `Jurisdiction detected: ${taxInfo.label}. Enable to see how taxes shift your FIRE number.`
            : "Set your city in Profile so we can auto-detect your jurisdiction and tax rates."}
        </div>
      )}

      {/* Enabled state */}
      {taxEnabled && (
        <>
          {/* Key facts grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "State / local income tax", value: `${(stateRate * 100).toFixed(1)}%` },
              { label: isUS ? "Payroll (FICA) → 0% at FIRE" : "Payroll tax → check locally", value: ficaRate > 0 ? `${(ficaRate * 100).toFixed(1)}%` : "N/A" },
              { label: isUS ? "Federal income tax" : "Income tax", value: isUS ? "10–37% (brackets)" : "Varies by bracket" },
              { label: isUS ? "Long-term capital gains" : "Capital gains", value: isUS ? "0–20% (LTCG)" : "Verify locally" },
            ].map(row => (
              <div key={row.label} style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "var(--uf-text-2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Manrope, sans-serif" }}>
                  {row.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>

          {/* Editable rates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-text)", marginBottom: 6, fontFamily: "Manrope, sans-serif" }}>
                Retirement effective rate
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number" min={0} max={60} step={1}
                  value={Math.round(retirementTaxRate * 100)}
                  onChange={e => setRetirementTaxRate(Math.min(0.6, Math.max(0, Number(e.target.value) / 100)))}
                  style={{
                    width: 64, padding: "8px 10px", borderRadius: 8,
                    border: "1px solid var(--uf-border)", background: "var(--uf-surface)",
                    color: "var(--uf-text)", fontSize: 15, fontWeight: 700, fontFamily: "Manrope, sans-serif",
                  }}
                />
                <span style={{ color: "var(--uf-text)", fontWeight: 700 }}>%</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--uf-text-2)", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
                On withdrawals in retirement (no payroll taxes)
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-text)", marginBottom: 6, fontFamily: "Manrope, sans-serif" }}>
                Roth / tax-free %
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number" min={0} max={100} step={5}
                  value={Math.round(rothPct)}
                  onChange={e => setRothPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                  style={{
                    width: 64, padding: "8px 10px", borderRadius: 8,
                    border: "1px solid var(--uf-border)", background: "var(--uf-surface)",
                    color: "var(--uf-text)", fontSize: 15, fontWeight: 700, fontFamily: "Manrope, sans-serif",
                  }}
                />
                <span style={{ color: "var(--uf-text)", fontWeight: 700 }}>%</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--uf-text-2)", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
                Roth IRA, Roth 401k, ISA, tax-free accounts
              </div>
            </div>
          </div>

          {/* Impact summary */}
          {baseFireTarget > 0 && (
            <div style={{
              background: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.18)",
              borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#059669", fontFamily: "Manrope, sans-serif" }}>
                FIRE Number Impact
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>Without tax adjustment</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(baseFireTarget, true)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>Tax-adjusted FIRE target</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#059669", fontFamily: "Manrope, sans-serif" }}>{fmtMoney(adjFireTarget, true)}</span>
              </div>
              {delta > 500 && (
                <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif" }}>
                  +{fmtMoney(delta, true)} extra needed to cover taxes on retirement withdrawals
                </div>
              )}
              {ficaRate > 0 && income > 0 && (
                <div style={{ fontSize: 12, color: "#059669", marginTop: 2, fontFamily: "Manrope, sans-serif" }}>
                  Payroll taxes (FICA) drop at FIRE → saves ~{fmtMoney(income * ficaRate, true)}/yr
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── FIRE Calculator Menu Tab ────────────────────────────────────────────────
function FireCalcMenuTab({
  fireAge,
  onOpenProfile,
  onOpenInvestSim,
}: {
  fireAge: number;
  onOpenProfile: () => void;
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

      {/* Link to public calculators hub */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
        <span style={{ fontSize: 13, color: "var(--uf-text-3)" }}>More tools:</span>
        <a
          href="/calculators"
          style={{ fontSize: 13, fontWeight: 700, color: "#059669", textDecoration: "none" }}
        >
          Browse all calculators →
        </a>
        <a
          href="/calculators/purchase-impact"
          style={{ fontSize: 13, fontWeight: 700, color: "#f97316", textDecoration: "none" }}
        >
          Purchase impact →
        </a>
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
    label: "Cashflow",
    activeTabs: ["cashflow", "reports"],
    svg: '<path d="M4 20h16"/><path d="M6 16l4-4 3 3 5-7"/><path d="M14 8h4v4"/>',
  },
  {
    key: "fire-calculator",
    label: "Plan",
    activeTabs: ["fire-calculator", "expat-fire", "goals", "learning-hub", "assets", "liabilities"],
    svg: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  },
];

type CashflowSubTab = "cashflow" | "categories" | "recurring" | "expected" | "budgets";

// Single source of truth for the Cashflow sub-nav — the sidebar sub-sub-nav and
// the horizontal switcher both render from this. They used to be two hand-kept
// arrays, which is how Categories and Recurring ended up rendered but unreachable.
const CASHFLOW_SUB_TABS: { key: CashflowSubTab; label: string }[] = [
  { key: "cashflow",   label: "Transactions" },
  { key: "recurring",  label: "Recurring"    },
  { key: "expected",   label: "Expected"     },
  { key: "categories", label: "Categories"   },
  { key: "budgets",    label: "Budget"       },
];

type MobilePrimaryKey = "home" | "cashflow" | "plan" | "profile";

const MOBILE_PRIMARY_ITEMS: { key: MobilePrimaryKey; label: string; svg: string }[] = [
  {
    key: "home",
    label: "Home",
    svg: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  },
  {
    key: "cashflow",
    label: "Cashflow",
    svg: '<path d="M4 20h16"/><path d="M6 16l4-4 3 3 5-7"/><path d="M14 8h4v4"/>',
  },
  {
    key: "plan",
    label: "Plan",
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
  const [cashflowSubTab, setCashflowSubTab] = useState<CashflowSubTab>("cashflow");
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [fireCalcSubTab, setFireCalcSubTab] = useState<"menu" | "goals" | "invest-sim">("menu");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeSource, setUpgradeSource] = useState("dashboard_upgrade_modal");
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
      "fire-calculator", "expat-fire", "goals", "reports", "learning-hub", "profile",
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
  const [taxEnabled,        setTaxEnabled]        = useState(false);
  const [retirementTaxRate, setRetirementTaxRate] = useState(0.15);
  const [rothPct,           setRothPct]           = useState(0);
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
  const [userJoinedAt, setUserJoinedAt] = useState("");
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
    const targetMonthlyExpenses = retirementCityCol > 0 ? (retirementCityCol * lifestyleMultiplier) / 12 : undefined;
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
      targetMonthlyExpenses,
    });
    const progress = fireTarget > 0 ? (investable / fireTarget) * 100 : 0;

    if (progress >= 85 || (fireYear !== null && fireYear <= 5)) return "living-in-fire";
    if (progress >= 45 || (fireYear !== null && fireYear <= 12)) return "approaching-fire";
    if (investable > 0 || income > 0) return "building-momentum";
    return "starting-out";
  }, [cashSavings, expenses, growthRate, income, k401, lifestyleMultiplier, mortgageBalance, mortgageMonthly, retirementCityCol, rothIRA, taxable, totalDebt, withdrawalRate]);
  const [rawActuals, setRawActuals] = useState<{ category: string; amount: number; refund_amount: number; currency: string; transaction_type?: string }[]>([]);
  const [rawPrevActuals, setRawPrevActuals] = useState<{ category: string; amount: number; refund_amount: number; currency: string; transaction_type?: string }[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<{ date: string; amount: number; refund_amount: number; currency: string; transaction_type?: string; tags?: string[]; category?: string }[]>([]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [freedomDate, setFreedomDate] = useState<Date | null>(null);
  const freedomDateLabel = freedomDate
    ? freedomDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const freedomDateCompactLabel = freedomDate
    ? freedomDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const freedomDateMonthYearLabel = freedomDate
    ? freedomDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
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
      .forEach(t => { const m = t.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + toUSD(netAmt(t), t.currency, rates); });
    const vals = Object.values(byMonth);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }, [recentTransactions, rates]);
  const histNeedsAvg = useMemo(() => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const byMonth: Record<string, number> = {};
    recentTransactions.filter(t => t.transaction_type === "expense" && !t.date.startsWith(curMonth) && (t.tags || []).includes("need"))
      .forEach(t => { const m = t.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + toUSD(netAmt(t), t.currency, rates); });
    const vals = Object.values(byMonth);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }, [recentTransactions, rates]);
  const histWorkAvg = useMemo(() => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const byMonth: Record<string, number> = {};
    recentTransactions.filter(t => t.transaction_type === "expense" && !t.date.startsWith(curMonth) && (t.tags || []).includes("work"))
      .forEach(t => { const m = t.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + toUSD(netAmt(t), t.currency, rates); });
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
  const manualEmergencyNeeds = useMemo(
    () => EMERGENCY_FUND_BUDGET_NEED_KEYS.reduce((sum, key) => sum + (effectiveExpenses[key] || 0), 0),
    [effectiveExpenses],
  );
  const emergencyFundMonthlyBase = histNeedsAvg > 0 ? histNeedsAvg : manualEmergencyNeeds;
  const actuals = useMemo(() => {
    const agg: Record<string, number> = {};
    rawActuals
      .filter(e => e.transaction_type === "expense")
      .forEach(e => { agg[e.category] = (agg[e.category] || 0) + toUSD(netAmt(e), e.currency, rates); });
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
      .reduce((s, e) => s + toUSD(netAmt(e), e.currency, rates), 0),
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
      .reduce((s, e) => s + toUSD(netAmt(e), e.currency, rates), 0),
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
  };

  const openMobilePrimary = (key: MobilePrimaryKey) => {
    if (key === "home") openDashboardTab("overview");
    if (key === "cashflow") { setCashflowSubTab("cashflow"); openDashboardTab("cashflow"); }
    if (key === "plan") { setFireCalcSubTab("menu"); openDashboardTab("fire-calculator"); }
    if (key === "profile") openDashboardTab("profile");
  };

  const isMobilePrimaryActive = (key: MobilePrimaryKey) => {
    if (key === "home") return tab === "overview";
    if (key === "cashflow") return tab === "cashflow" || tab === "reports";
    if (key === "plan") return tab === "fire-calculator" || tab === "expat-fire" || tab === "goals" || tab === "learning-hub" || tab === "assets" || tab === "liabilities";
    return tab === "profile";
  };


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
      setUserJoinedAt(session.user.created_at ?? "");

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

      supabase.from("expenses").select("category, amount, refund_amount, currency, transaction_type")
        .eq("user_id", session.user.id)
        .gte("date", thisStart)
        .lt("date", thisEnd)
        .then(({ data: expData }) => {
          if (expData) {
            setRawActuals(expData.map(e => ({ category: e.category, amount: e.amount, refund_amount: e.refund_amount || 0, currency: e.currency ?? "USD", transaction_type: e.transaction_type ?? "expense" })));
          }
        });

      supabase.from("expenses").select("category, amount, refund_amount, currency, transaction_type")
        .eq("user_id", session.user.id)
        .gte("date", prevStart)
        .lt("date", thisStart)
        .then(({ data: prevData }) => {
          if (prevData) {
            setRawPrevActuals(prevData.map(e => ({ category: e.category, amount: e.amount, refund_amount: e.refund_amount || 0, currency: e.currency ?? "USD", transaction_type: e.transaction_type ?? "expense" })));
          }
        });

      const historyStartDate = new Date(nowD.getFullYear(), nowD.getMonth() - 36, nowD.getDate());
      const historyStart = `${historyStartDate.getFullYear()}-${String(historyStartDate.getMonth() + 1).padStart(2, '0')}-${String(historyStartDate.getDate()).padStart(2, '0')}`;
      supabase.from("expenses").select("date, amount, refund_amount, currency, transaction_type, tags, category")
        .eq("user_id", session.user.id)
        .gte("date", historyStart)
        .order("date", { ascending: true })
        .then(({ data: txData }) => {
          if (txData) {
            setRecentTransactions(txData.map(tx => ({
              date: tx.date,
              amount: tx.amount,
              refund_amount: tx.refund_amount || 0,
              currency: tx.currency ?? "USD",
              transaction_type: tx.transaction_type ?? "expense",
              tags: tx.tags || [],
              category: tx.category ?? "other",
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
          const { _fire_profile: _, _custom_cats: _cc, _custom_subcats: _cs, ...budgetExpenses } = raw;
          const mergedExpenses = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.key, 0])) as Record<string, number>;
          Object.assign(mergedExpenses, budgetExpenses);
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
          setTaxEnabled(fp.taxEnabled ?? false);
          setRetirementTaxRate(fp.retirementTaxRate ?? 0.15);
          setRothPct(fp.rothPct ?? 0);
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
      const fireProfile = { k401, rothIRA, taxable, cashSavings, totalDebt, mortgageBalance, mortgageMonthly, growthRate, withdrawalRate, cityName, retirementCityName, retirementCityCol, lifestyleMultiplier, taxEnabled, retirementTaxRate, rothPct };
      // Read first so this write can't clobber _custom_cats/_custom_subcats written
      // independently (and asynchronously) by useCustomCategories().
      const { data: existingRow } = await supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle();
      const existingExpenses = (existingRow?.expenses as Record<string, unknown>) || {};
      const preserved: Record<string, unknown> = {};
      if (existingExpenses._custom_cats !== undefined) preserved._custom_cats = existingExpenses._custom_cats;
      if (existingExpenses._custom_subcats !== undefined) preserved._custom_subcats = existingExpenses._custom_subcats;
      const { error: saveError } = await supabase.from("user_budget").upsert({
        user_id:     session.user.id,
        income,
        expenses:    { ...expenses, ...preserved, _fire_profile: fireProfile },
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
        .uf-sidebar-freedom { padding: 14px 20px; border-bottom: 1px solid var(--uf-border); display: flex; flex-direction: column; gap: 2px; }
        .uf-sidebar-freedom-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--uf-text-3); }
        .uf-sidebar-freedom-value { font-size: 15px; font-weight: 800; color: var(--uf-text); font-family: 'Manrope', sans-serif; }
        .uf-budget-grid { display: grid; grid-template-columns: 1fr 260px; gap: 16px; align-items: start; }
        @media (max-width: 720px) { .uf-budget-grid { grid-template-columns: 1fr; } }
        .uf-budget-row { display: flex; align-items: center; gap: 12px; padding: 10px 18px; margin: 0 -18px; border-bottom: 1px solid var(--uf-border); border-radius: 8px; transition: background 0.12s; cursor: pointer; }
        .uf-budget-row:last-child { border-bottom: none; }
        .uf-budget-row:hover { background: rgba(255,255,255,0.03); }
        .uf-budget-pencil { opacity: 0; transition: opacity 0.12s; }
        .uf-budget-row:hover .uf-budget-pencil { opacity: 1; }
        .uf-sidebar-nav { padding: 16px 10px 4px; display: flex; flex-direction: column; gap: 2px; }
        .uf-sidebar-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 8px; font-size: 14px; font-weight: 700; color: var(--uf-text-2); cursor: pointer; border: 1px solid transparent; transition: all 0.15s; background: transparent; width: 100%; text-align: left; font-family: 'Manrope', sans-serif; }
        .uf-sidebar-item:hover { background: rgba(226,232,240,0.5); color: #1E3A2F; }
        .uf-sidebar-item.active { background: rgba(209,250,229,0.5); border-color: #047857; color: #065F46; }
        .uf-sidebar-icon { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: inherit; }
        .uf-sidebar-bottom { margin-top: auto; padding: 14px 16px; border-top: 1px solid var(--uf-border); display: flex; flex-direction: column; gap: 8px; }

        .uf-sidebar-sub-nav { display: flex; flex-direction: column; gap: 1px; margin: 2px 0 4px; padding: 0 10px 0 28px; }
        .uf-sidebar-sub-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; font-size: 13px; font-weight: 700; color: var(--uf-text-2); cursor: pointer; border: none; background: transparent; width: 100%; text-align: left; font-family: 'Manrope', sans-serif; transition: all 0.13s; position: relative; }
        .uf-sidebar-sub-item::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 4px; border-radius: 50%; background: var(--uf-border); transition: all 0.13s; }
        .uf-sidebar-sub-item:hover { background: rgba(226,232,240,0.5); color: #1E3A2F; }
        .uf-sidebar-sub-item:hover::before { background: #047857; }
        .uf-sidebar-sub-item.active { color: #065F46; font-weight: 800; }
        .uf-sidebar-sub-item.active::before { background: #047857; width: 6px; height: 6px; }
        .dark .uf-sidebar-sub-item:hover { background: rgba(255,255,255,0.05); color: var(--uf-text); }
        .dark .uf-sidebar-sub-item.active { color: #22d3a5; }
        .dark .uf-sidebar-sub-item.active::before { background: #22d3a5; }
        @media(min-width: 901px) { .uf-money-section-switch { display: none !important; } }
        @media(min-width: 901px) { .uf-cashflow-subtab-switch { display: none !important; } }
        @media(min-width: 901px) { .uf-freedom-section-switch { display: none !important; } }

        .expat-globe-wrap { position: relative; margin: 12px -36px -60px; height: calc(100svh - 48px); min-height: 480px; overflow: hidden; border-radius: 0; background: radial-gradient(ellipse at 50% 55%, #ffffff 0%, #eef2f7 75%); }
        .dark .expat-globe-wrap { background: radial-gradient(ellipse at 50% 60%, #0d0e1a 0%, #08080e 70%); }
        @media(max-width: 900px) { .expat-globe-wrap { margin: 12px -16px calc(-112px - env(safe-area-inset-bottom, 0px)); height: calc(100svh - 180px); min-height: 360px; } }

        .uf-sidebar-sub-sub-nav { display: flex; flex-direction: column; gap: 1px; margin: 2px 0 2px; padding: 0 0 0 16px; }
        .uf-sidebar-sub-sub-item { display: flex; align-items: center; padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; color: var(--uf-text-2); cursor: pointer; border: none; background: transparent; width: 100%; text-align: left; font-family: 'Manrope', sans-serif; transition: all 0.13s; position: relative; }
        .uf-sidebar-sub-sub-item::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 3px; border-radius: 50%; background: var(--uf-border); transition: all 0.13s; }
        .uf-sidebar-sub-sub-item:hover { background: rgba(226,232,240,0.5); color: #1E3A2F; }
        .uf-sidebar-sub-sub-item:hover::before { background: #047857; }
        .uf-sidebar-sub-sub-item.active { color: #065F46; font-weight: 700; }
        .uf-sidebar-sub-sub-item.active::before { background: #047857; width: 5px; height: 5px; }
        .dark .uf-sidebar-sub-sub-item:hover { background: rgba(255,255,255,0.05); color: var(--uf-text); }
        .dark .uf-sidebar-sub-sub-item.active { color: #22d3a5; }
        .dark .uf-sidebar-sub-sub-item.active::before { background: #22d3a5; }

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
          onComplete={(inc, spend, save, taxKey) => {
            setIncome(inc);
            setExpenses(prev => ({ ...prev, other: spend }));
            setTaxable(save);
            if (taxKey) {
              // Find a representative city for this tax jurisdiction and set it as the current city
              const repCity = CITIES.find(c => c.state === taxKey);
              if (repCity) setCityName(repCity.name);
              // Pre-seed retirement tax rate from jurisdiction (user can override in Plan tab)
              const taxInfo = STATE_TAX[taxKey];
              if (taxInfo) {
                const isUS = taxKey.length <= 5 && !taxKey.startsWith("ca_");
                const stateRate = taxInfo.rate;
                const suggested = isUS
                  ? Math.max(0.05, Math.min(stateRate + 0.12, 0.35))
                  : Math.max(0.05, Math.min(stateRate * 0.75, 0.40));
                setRetirementTaxRate(suggested);
              }
            }
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
        <Link href="/" className="uf-sidebar-logo" style={{ padding: "0 4px" }}><Logo variant="light" size={22} /></Link>
        <div className="uf-mobile-top-title">
          <strong>UntilFire</strong>
          <span>{freedomDateCompactLabel ? `Free · ${freedomDateCompactLabel}` : tab === "overview" ? "Home" : tab === "fire-calculator" ? "Freedom Date" : tab === "expat-fire" ? "Expat FIRE" : tab === "goals" ? "Goals" : tab === "learning-hub" ? "Learn" : tab === "profile" ? "Profile" : "Portfolio"}</span>
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

          {freedomDateLabel && (
            <div className="uf-sidebar-freedom">
              <span className="uf-sidebar-freedom-label">Freedom date</span>
              <span className="uf-sidebar-freedom-value">{freedomDateLabel}</span>
            </div>
          )}

          <nav className="uf-sidebar-nav">
            {SIDEBAR_ITEMS.map(item => {
              const isActive = tab === item.key || (item.activeTabs?.includes(tab) ?? false);
              return (
                <div key={item.key}>
                  <button
                    data-tour-item={item.key}
                    className={`uf-sidebar-item ${isActive ? "active" : ""}`}
                    onClick={() => openDashboardTab(item.key)}
                  >
                    <span className="uf-sidebar-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: item.svg }} />
                    </span>
                    <span className="uf-nav-label-full">{item.label}</span>
                    <span className="uf-nav-label-mobile">{item.mobileLabel ?? item.label}</span>
                  </button>
                  {isActive && item.key === "cashflow" && (
                    <div className="uf-sidebar-sub-nav">
                      {([
                        { key: "cashflow",    label: "Cashflow"  },
                        { key: "reports",     label: "Insights"  },
                      ] as { key: TabKey; label: string }[]).map(sub => (
                        <div key={sub.key}>
                          <button
                            className={`uf-sidebar-sub-item ${tab === sub.key ? "active" : ""}`}
                            onClick={() => {
                              openDashboardTab(sub.key);
                              if (sub.key === "cashflow") setCashflowSubTab("cashflow");
                            }}
                          >
                            {sub.label}
                          </button>
                          {sub.key === "cashflow" && tab === "cashflow" && (
                            <div className="uf-sidebar-sub-sub-nav">
                              {CASHFLOW_SUB_TABS.map(ss => (
                                <button
                                  key={ss.key}
                                  className={`uf-sidebar-sub-sub-item ${cashflowSubTab === ss.key ? "active" : ""}`}
                                  onClick={() => {
                                    setCashflowSubTab(ss.key);
                                  }}
                                >
                                  {ss.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {isActive && item.key === "fire-calculator" && (
                    <div className="uf-sidebar-sub-nav">
                      {([
                        { label: "Freedom Date", isActive: tab === "fire-calculator" && fireCalcSubTab === "menu",       onClick: () => { openDashboardTab("fire-calculator"); setFireCalcSubTab("menu"); } },
                        { label: "Scenarios",    isActive: tab === "fire-calculator" && fireCalcSubTab === "invest-sim", onClick: () => { openDashboardTab("fire-calculator"); setFireCalcSubTab("invest-sim"); } },
                        { label: "Goals",        isActive: tab === "goals",                                              onClick: () => openDashboardTab("goals") },
                        { label: "Learn",        isActive: tab === "learning-hub",                                       onClick: () => openDashboardTab("learning-hub") },
                        { label: "Expat FIRE",   isActive: tab === "expat-fire",                                         onClick: () => openDashboardTab("expat-fire") },
                        { label: "Net Worth",    isActive: tab === "assets",                                             onClick: () => openDashboardTab("assets") },
                        { label: "Debts",        isActive: tab === "liabilities",                                        onClick: () => openDashboardTab("liabilities") },
                      ]).map(sub => (
                        <button
                          key={sub.label}
                          className={`uf-sidebar-sub-item ${sub.isActive ? "active" : ""}`}
                          onClick={sub.onClick}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
            {(tab === "cashflow" || tab === "reports") && (
              <nav className="uf-section-switch uf-cashflow-section-switch" aria-label="Cashflow sections">
                {([
                  { label: "Cashflow", active: tab === "cashflow", onClick: () => { setCashflowSubTab("cashflow"); openDashboardTab("cashflow"); } },
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
            {(tab === "fire-calculator" || tab === "goals" || tab === "learning-hub" || tab === "expat-fire" || tab === "assets" || tab === "liabilities") && (
              <nav className="uf-section-switch uf-plan-section-switch" aria-label="Plan sections">
                {([
                  { label: "Freedom Date", active: tab === "fire-calculator" && fireCalcSubTab === "menu", onClick: () => { openDashboardTab("fire-calculator"); setFireCalcSubTab("menu"); } },
                  { label: "Scenarios", active: tab === "fire-calculator" && fireCalcSubTab === "invest-sim", onClick: () => { openDashboardTab("fire-calculator"); setFireCalcSubTab("invest-sim"); } },
                  { label: "Goals", active: tab === "goals", onClick: () => openDashboardTab("goals") },
                  { label: "Learn", active: tab === "learning-hub", onClick: () => openDashboardTab("learning-hub") },
                  { label: "Expat FIRE", active: tab === "expat-fire", onClick: () => openDashboardTab("expat-fire") },
                  { label: "Net Worth", active: tab === "assets", onClick: () => openDashboardTab("assets") },
                  { label: "Debts", active: tab === "liabilities", onClick: () => openDashboardTab("liabilities") },
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
                userJoinedAt={userJoinedAt}
                monthlyNeedsExpenses={emergencyFundMonthlyBase > 0 ? emergencyFundMonthlyBase : undefined}
                monthlyWorkCosts={histWorkAvg > 0 ? histWorkAvg : undefined}
                taxEnabled={taxEnabled}
                retirementTaxRate={retirementTaxRate}
                rothPct={rothPct}
                onTabChange={setTab}
                onOpenOnboarding={() => setOnboardingOpen(true)}
                onFreedomDateChange={setFreedomDate}
              />
            )}
            {tab === "cashflow" && (
              <div>
                {/* Cashflow sub-tab nav */}
                <div
                  className="uf-cashflow-subtab-switch"
                  style={{ display: "flex", gap: 28, borderBottom: "1px solid #E2E8F0", marginBottom: 28, overflowX: "auto", scrollbarWidth: "none" }}
                >
                  {CASHFLOW_SUB_TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => { setCashflowSubTab(t.key); }}
                      style={{
                        background: "none", border: "none", padding: "0 0 14px",
                        fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        letterSpacing: "-0.3px", marginBottom: -1, whiteSpace: "nowrap",
                        color: cashflowSubTab === t.key ? "#047857" : "#64748B",
                        borderBottom: `2px solid ${cashflowSubTab === t.key ? "#047857" : "transparent"}`,
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {cashflowSubTab === "cashflow" && <TransactionsTab defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} preferredCurrencies={preferredCurrencies} isPro={subscription?.plan === "pro"} onUpgradeClick={() => { setUpgradeSource("cashflow_plaid_limit"); setUpgradeOpen(true); }} />}
                {cashflowSubTab === "categories" && <CategoriesTab key={categoriesKey} displayCurrency={defaultCurrency} displayRates={rates} />}
                {cashflowSubTab === "recurring" && <RecurringTab defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} preferredCurrencies={preferredCurrencies} />}
                {cashflowSubTab === "expected" && <ExpectedPaymentsTab userId={userId} defaultCurrency={defaultCurrency} displayCurrency={defaultCurrency} displayRates={rates} preferredCurrencies={preferredCurrencies} />}
                {cashflowSubTab === "budgets" && (
                  <BudgetTab income={income} setIncome={setIncome} expenses={expenses} setExpenses={setExpenses} actuals={actuals} displayCurrency={defaultCurrency} displayRates={rates} recentTransactions={recentTransactions} freedomDateMonthYearLabel={freedomDateMonthYearLabel} onOpenTransactions={() => setCashflowSubTab("cashflow")} />
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
                  retirementCityCol={retirementCityCol}
                  lifestyleMultiplier={lifestyleMultiplier}
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
                  emergencyFundMonthlyBase={emergencyFundMonthlyBase}
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
                  <>
                    <FireCalcMenuTab
                      fireAge={fireAge}
                      onOpenProfile={() => setTab("profile")}
                      onOpenInvestSim={() => setFireCalcSubTab("invest-sim")}
                    />
                    <TaxProfileCard
                      cityName={cityName}
                      income={income}
                      monthlyExpenses={monthlyExpenses}
                      withdrawalRate={withdrawalRate}
                      taxEnabled={taxEnabled}
                      setTaxEnabled={setTaxEnabled}
                      retirementTaxRate={retirementTaxRate}
                      setRetirementTaxRate={setRetirementTaxRate}
                      rothPct={rothPct}
                      setRothPct={setRothPct}
                      displayCurrency={defaultCurrency}
                      displayRates={rates}
                    />
                    <PurchaseImpactPanel
                      currentSavings={k401 + rothIRA + taxable + cashSavings}
                      monthlyContribution={Math.max(income * 12 - monthlyExpenses * 12, 0) / 12}
                      fireTarget={monthlyExpenses * 12 / withdrawalRate}
                      annualReturn={growthRate}
                    />
                  </>
                )}
                {fireCalcSubTab === "goals" && (
                  <GoalsTab
                    fireAge={fireAge} setFireAge={setFireAge}
                    onBack={() => setFireCalcSubTab("menu")}
                  />
                )}
                {fireCalcSubTab === "invest-sim" && (
                  <InvestSimTab onBack={() => setFireCalcSubTab("menu")} />
                )}
              </div>
            )}
            {tab === "goals" && (
              <GoalsPageTab userId={userId} />
            )}
            {tab === "reports" && <ReportsTab displayCurrency={defaultCurrency} displayRates={rates} />}
            {tab === "learning-hub" && <LearningHubTab recommendedStageId={suggestedLearnStage} />}
            {tab === "expat-fire" && (
              <ExpatFireDashTab
                portfolioBalance={k401 + rothIRA + taxable + cashSavings + plaidAccounts.filter(a => a.type === "depository" || a.type === "investment").reduce((s, a) => s + (a.balance_current ?? 0), 0)}
                monthlySavings={Math.max(0, income * 12 - Object.entries(expenses).reduce((s, [, v]) => s + (v || 0), 0) * 12) / 12}
                age={fireAge}
                cityName={cityName}
                isDark={isDark}
                onOpenProfile={() => openDashboardTab("profile")}
              />
            )}
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
                taxKey={CITIES.find(c => c.name === cityName)?.state ?? ""}
                onTaxKeyChange={(key) => {
                  const repCity = CITIES.find(c => c.state === key);
                  if (repCity) setCityName(repCity.name);
                  const taxInfo = STATE_TAX[key];
                  if (taxInfo) {
                    const isUSKey = !key.startsWith("ca_");
                    const stateRate = taxInfo.rate;
                    const suggested = isUSKey
                      ? Math.max(0.05, Math.min(stateRate + 0.12, 0.35))
                      : Math.max(0.05, Math.min(stateRate * 0.75, 0.40));
                    setRetirementTaxRate(suggested);
                  }
                }}
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

// ─── Expat FIRE dashboard tab ─────────────────────────────────────────────────

function ExpatFireDashTab({
  portfolioBalance,
  monthlySavings,
  age,
  cityName,
  isDark,
  onOpenProfile,
}: {
  portfolioBalance: number;
  monthlySavings: number;
  age: number;
  cityName: string;
  isDark: boolean;
  onOpenProfile: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(null);

  // Overlay chrome adapts to theme: on white space it must read dark, on dark
  // space it reads light. The globe itself stays a dark-ocean / white-continent
  // "night earth" in both modes.
  const ui = isDark
    ? {
        title: "#fff",
        titleShadow: "0 2px 16px rgba(0,0,0,0.6)",
        panelBg: "rgba(8,8,14,0.58)",
        panelBorder: "rgba(255,255,255,0.09)",
        chipBg: "rgba(255,255,255,0.055)",
        chipBorder: "rgba(255,255,255,0.08)",
        chipLabel: "rgba(255,255,255,0.42)",
        chipValue: "#fff",
        toggleBg: "rgba(8,8,14,0.52)",
        toggleBorder: "rgba(255,255,255,0.14)",
        toggleText: "rgba(255,255,255,0.82)",
      }
    : {
        title: "#0f172a",
        titleShadow: "0 1px 10px rgba(255,255,255,0.7)",
        panelBg: "rgba(255,255,255,0.72)",
        panelBorder: "rgba(15,23,42,0.08)",
        chipBg: "rgba(15,23,42,0.04)",
        chipBorder: "rgba(15,23,42,0.06)",
        chipLabel: "rgba(15,23,42,0.45)",
        chipValue: "#0f172a",
        toggleBg: "rgba(255,255,255,0.72)",
        toggleBorder: "rgba(15,23,42,0.1)",
        toggleText: "rgba(15,23,42,0.7)",
      };

  const currentCityKey = useMemo(() => {
    const match = CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    return match?.key ?? "nyc";
  }, [cityName]);

  // ── Freedom timeline: fast-forward the projected portfolio and watch cities unlock ──
  const [timelineYears, setTimelineYears] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);

  // Per-city unlock schedule, computed with the same engine as the rest of the
  // page so a city's "turns green" year matches its years-to-FIRE exactly.
  const cityUnlocks = useMemo(() => {
    return CITIES
      .filter(c => CITY_COORDS[c.key])
      .map(c => {
        const r = calcFIRE(monthlySavings, c.col, age || undefined, portfolioBalance);
        return { key: c.key, name: c.name, flag: c.flag, col: c.col, years: r.years, age: r.age, year: r.retireYear };
      })
      .sort((a, b) => a.years - b.years || a.col - b.col);
  }, [monthlySavings, portfolioBalance, age]);

  // Run the bar from today to roughly when the bulk of cities have unlocked.
  const sliderMax = useMemo(() => {
    const ys = cityUnlocks.map(c => c.years).filter(y => y < 60).sort((a, b) => a - b);
    if (!ys.length) return 5;
    const p95 = ys[Math.floor(0.95 * (ys.length - 1))];
    return Math.min(50, Math.max(5, Math.ceil(p95)));
  }, [cityUnlocks]);

  useEffect(() => {
    if (timelineYears > sliderMax) setTimelineYears(sliderMax);
  }, [sliderMax, timelineYears]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTimelineYears(y => {
        if (y >= sliderMax) { setPlaying(false); return sliderMax; }
        return y + 1;
      });
    }, 600);
    return () => clearInterval(id);
  }, [playing, sliderMax]);

  const tlYears = Math.min(timelineYears, sliderMax);
  const tlAnnual = Math.max(0, monthlySavings) * 12;
  const projectedPortfolio = (portfolioBalance + tlAnnual / 0.10) * Math.pow(1.10, tlYears) - tlAnnual / 0.10;
  const readyCount = cityUnlocks.filter(c => c.years <= tlYears + 1e-9).length;
  const projAge = age ? age + tlYears : undefined;
  const tlThisYear = new Date().getFullYear();

  function handleCitySelect(key: string) {
    setSelectedCityKey(key);
  }

  function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    return `$${Math.round(n).toLocaleString()}`;
  }

  if (selectedCityKey) {
    return (
      <ExpatCityDetail
        cityKey={selectedCityKey}
        portfolioBalance={portfolioBalance}
        monthlySavings={monthlySavings}
        age={age}
        currentCityName={cityName || "Your city"}
        currentCityKey={currentCityKey}
        isDark={isDark}
        onBack={() => setSelectedCityKey(null)}
      />
    );
  }

  return (
    <div className="expat-globe-wrap">
      {/* Full-bleed globe */}
      <GeoArbitrageGlobe
        fillContainer
        monthlySavings={monthlySavings}
        portfolioBalance={Math.round(projectedPortfolio)}
        currentAge={age}
        currentCityKey={currentCityKey}
        onCitySelect={handleCitySelect}
      />

      {/* Title overlay — top left */}
      <div style={{ position: "absolute", top: 20, left: 24, zIndex: 10, pointerEvents: "none" }}>
        <div style={{ fontSize: 10, color: "#22d3a5", fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 5 }}>
          Expat FIRE
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: ui.title, letterSpacing: "-0.03em", textShadow: ui.titleShadow, lineHeight: 1.15 }}>
          Where else could<br />you retire?
        </div>
      </div>

      {/* Panel toggle button */}
      <button
        onClick={() => setPanelOpen(v => !v)}
        style={{
          position: "absolute", top: 20,
          right: panelOpen ? 244 : 16,
          zIndex: 25, transition: "right 0.32s cubic-bezier(0.4,0,0.2,1)",
          background: ui.toggleBg, backdropFilter: "blur(12px)",
          border: `1px solid ${ui.toggleBorder}`, borderRadius: 999,
          padding: "6px 14px", color: ui.toggleText, fontSize: 11,
          fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          letterSpacing: "0.03em",
        }}
      >
        {panelOpen ? "‹ Hide" : "Stats ›"}
      </button>

      {/* Collapsible stats panel */}
      <div style={{
        position: "absolute", top: 16,
        right: panelOpen ? 16 : -232,
        zIndex: 20, width: 220,
        transition: "right 0.32s cubic-bezier(0.4,0,0.2,1)",
        background: ui.panelBg, backdropFilter: "blur(20px)",
        border: `1px solid ${ui.panelBorder}`, borderRadius: 16,
        padding: "16px 14px", display: "flex", flexDirection: "column", gap: 9,
      }}>
        <div style={{ fontSize: 9, color: "#22d3a5", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 2 }}>
          Your snapshot
        </div>
        {([
          { label: "Portfolio", value: fmt(portfolioBalance) },
          { label: "Age", value: String(age) },
        ] as const).map(({ label, value }) => (
          <div key={label} style={{
            background: ui.chipBg,
            border: `1px solid ${ui.chipBorder}`,
            borderRadius: 10, padding: "9px 12px",
          }}>
            <div style={{ fontSize: 9, color: ui.chipLabel, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: ui.chipValue, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
        <button
          onClick={onOpenProfile}
          style={{
            background: "rgba(34,211,165,0.11)", border: "1px solid rgba(34,211,165,0.22)",
            borderRadius: 9, padding: "9px 0", color: "#22d3a5",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", marginTop: 3, letterSpacing: "0.01em",
          }}
        >
          Edit in Profile →
        </button>
      </div>

      {/* Freedom timeline — scrub forward to watch cities turn green */}
      <div style={{
        position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)",
        zIndex: 22, width: "min(640px, calc(100% - 24px))",
        background: ui.panelBg, backdropFilter: "blur(20px)",
        border: `1px solid ${ui.panelBorder}`, borderRadius: 16,
        padding: timelineOpen ? "12px 14px 14px" : "9px 14px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 9, color: "#22d3a5", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
            Freedom timeline
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#22d3a5" }}>
            🟢 {readyCount}/{cityUnlocks.length}
          </span>
          <div style={{ flex: 1 }} />
          {timelineOpen && (
            <button
              onClick={() => setPlaying(p => !p)}
              style={{ background: "rgba(34,211,165,0.12)", border: "1px solid rgba(34,211,165,0.28)", borderRadius: 999, padding: "4px 12px", color: "#22d3a5", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
          )}
          <button
            onClick={() => setTimelineOpen(v => !v)}
            aria-label={timelineOpen ? "Collapse timeline" : "Expand timeline"}
            style={{ background: ui.toggleBg, border: `1px solid ${ui.toggleBorder}`, borderRadius: 999, padding: "4px 11px", color: ui.toggleText, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 }}
          >
            {timelineOpen ? "⌄" : "⌃"}
          </button>
        </div>

        {timelineOpen && (
          <>
            {/* Scrubber */}
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={1}
              value={tlYears}
              onChange={e => { setPlaying(false); setTimelineYears(Number(e.target.value)); }}
              aria-label="Years from today"
              style={{ width: "100%", accentColor: "#22d3a5", marginTop: 12, cursor: "pointer" }}
            />

            {/* Readout */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: ui.chipValue, letterSpacing: "-0.02em" }}>
                {tlYears === 0 ? "Today" : projAge ? `Age ${projAge}` : `In ${tlYears} ${tlYears === 1 ? "year" : "years"}`}
              </span>
              {tlYears > 0 && (
                <span style={{ fontSize: 12, color: ui.chipLabel, fontWeight: 600 }}>· {tlThisYear + tlYears}</span>
              )}
              <span style={{ marginLeft: "auto", fontSize: 12, color: ui.chipLabel, fontWeight: 600 }}>
                ~{fmt(projectedPortfolio)}
              </span>
            </div>

            {/* Ordered milestone strip — which cities turn green first */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginTop: 10 }}>
              {cityUnlocks.slice(0, 16).map(c => {
                const unlocked = c.years <= tlYears + 1e-9;
                const badge = c.years < 0.5 ? "now" : projAge ? `age ${c.age}` : `${c.year}`;
                return (
                  <div key={c.key} style={{
                    flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    padding: "6px 10px", borderRadius: 10, minWidth: 72,
                    background: unlocked ? "rgba(34,211,165,0.14)" : ui.chipBg,
                    border: `1px solid ${unlocked ? "rgba(34,211,165,0.30)" : ui.chipBorder}`,
                  }}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>{c.flag}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: unlocked ? "#22d3a5" : ui.chipValue, whiteSpace: "nowrap" }}>
                      {c.name.split(",")[0]}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: unlocked ? "#22d3a5" : ui.chipLabel, whiteSpace: "nowrap" }}>
                      {unlocked ? "🟢 " : ""}{badge}
                    </span>
                  </div>
                );
              })}
              {cityUnlocks.length > 16 && (
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 11, color: ui.chipLabel, fontWeight: 600 }}>
                  +{cityUnlocks.length - 16}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Expat city detail (inline, within dashboard shell) ───────────────────────

function ExpatCityDetail({
  cityKey,
  portfolioBalance,
  monthlySavings,
  age,
  currentCityName,
  currentCityKey,
  isDark,
  onBack,
}: {
  cityKey: string;
  portfolioBalance: number;
  monthlySavings: number;
  age: number;
  currentCityName: string;
  currentCityKey: string;
  isDark: boolean;
  onBack: () => void;
}) {
  const targetCity = CITIES.find(c => c.key === cityKey);
  const currentCity = CITIES.find(c => c.key === currentCityKey);

  const bg = isDark ? "#08080e" : "#f8fafc";
  const cardBg = isDark ? "#111118" : "#ffffff";
  const border = isDark ? "#23232d" : "#E2E8F0";
  const textPrimary = isDark ? "#ffffff" : "#0F172A";
  const textSecondary = isDark ? "rgba(255,255,255,0.45)" : "#6B7280";

  if (!targetCity) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: textSecondary }}>
        <p>City not found.</p>
        <button onClick={onBack} style={{ marginTop: 16, background: "none", border: "none", color: "#22d3a5", cursor: "pointer", fontSize: 14 }}>
          ← Back to Globe
        </button>
      </div>
    );
  }

  const currentCol = currentCity?.col ?? 60000;
  const targetCol = targetCity.col;

  const currentFire = calcFIRE(monthlySavings, currentCol, age || undefined, portfolioBalance);
  const targetFire = calcFIRE(monthlySavings, targetCol, age || undefined, portfolioBalance);

  const currentYears = currentFire.years;
  const targetYears = targetFire.years;
  const yearDiff = Math.abs(currentYears - targetYears);
  const isFireNow = portfolioBalance >= targetCol * 25;
  const monthlyDiff = Math.round((currentCol - targetCol) / 12);

  function fmtUSD(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
    return `$${Math.round(n)}`;
  }

  function readinessBadge() {
    if (portfolioBalance >= targetCol * 25) return { label: "FIRE ready", color: "#003527", bg: "#A7F3D0" };
    if (portfolioBalance >= targetCol * 12.5) return { label: "Barista FIRE", color: "#78350F", bg: "#FEF3C7" };
    return { label: "Not yet", color: "#991B1B", bg: "#FEE2E2" };
  }

  const badge = readinessBadge();

  function row(label: string, cur: string, tgt: string) {
    return (
      <div key={label} style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
        padding: "12px 0", borderBottom: `1px solid ${border}`,
        fontSize: 13, alignItems: "center",
      }}>
        <div style={{ color: textSecondary, fontWeight: 500 }}>{label}</div>
        <div style={{ color: textPrimary, fontWeight: 700, textAlign: "center" }}>{cur}</div>
        <div style={{ color: textPrimary, fontWeight: 700, textAlign: "center" }}>{tgt}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: bg, minHeight: "100%", fontFamily: "DM Sans, sans-serif",
      overflowY: "auto",
    }}>
      {/* Back header */}
      <div style={{
        background: cardBg, borderBottom: `1px solid ${border}`,
        padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 600, color: "#22d3a5",
            display: "flex", alignItems: "center", gap: 6, padding: 0,
            fontFamily: "inherit",
          }}
        >
          ← Back to Globe
        </button>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Title */}
        <h1 style={{
          fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800,
          color: textPrimary, margin: "0 0 8px",
        }}>
          {targetCity.flag} {targetCity.name}
        </h1>
        <div style={{ marginBottom: 24 }}>
          <span style={{
            display: "inline-block", padding: "3px 12px", borderRadius: 99,
            fontSize: 12, fontWeight: 700, color: badge.color, background: badge.bg,
          }}>
            {badge.label}
          </span>
        </div>

        {/* Hero stat */}
        {isFireNow ? (
          <div style={{
            textAlign: "center", background: isDark ? "rgba(5,150,105,0.1)" : "#F0FDF4",
            border: "1px solid #A7F3D0", borderRadius: 16, padding: "24px 20px", marginBottom: 24,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#059669", fontFamily: "Syne, sans-serif" }}>
              You could FIRE here NOW
            </div>
            <div style={{ fontSize: 14, color: isDark ? "#6ee7b7" : "#065F46", marginTop: 8 }}>
              Your portfolio covers {targetCity.name} expenses at the 4% rule.
            </div>
          </div>
        ) : targetYears < currentYears ? (
          <div style={{
            textAlign: "center", background: isDark ? "rgba(34,211,165,0.08)" : "#F0FDF4",
            border: isDark ? "1px solid rgba(34,211,165,0.25)" : "1px solid #A7F3D0",
            borderRadius: 16, padding: "24px 20px", marginBottom: 24,
          }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#22d3a5", fontFamily: "Syne, sans-serif", lineHeight: 1 }}>
              {yearDiff.toFixed(1)} years sooner
            </div>
            <div style={{ fontSize: 14, color: textSecondary, marginTop: 8 }}>
              by moving to {targetCity.name}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: "center", background: isDark ? "rgba(239,68,68,0.08)" : "#FFF5F5",
            border: isDark ? "1px solid rgba(239,68,68,0.25)" : "1px solid #FECACA",
            borderRadius: 16, padding: "24px 20px", marginBottom: 24,
          }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#ef4444", fontFamily: "Syne, sans-serif", lineHeight: 1 }}>
              {yearDiff.toFixed(1)} years later
            </div>
            <div style={{ fontSize: 14, color: textSecondary, marginTop: 8 }}>
              {targetCity.name} has a higher cost of living than your current city
            </div>
          </div>
        )}

        {/* Comparison table */}
        <div style={{
          background: cardBg, borderRadius: 16, border: `1px solid ${border}`,
          padding: "0 20px", marginBottom: 20,
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            padding: "14px 0 10px", borderBottom: `2px solid ${border}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: textSecondary }}>Metric</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: textSecondary, textAlign: "center" }}>Current</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#22d3a5", textAlign: "center" }}>{targetCity.flag} Target</div>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            padding: "12px 0", borderBottom: `1px solid ${border}`,
            fontSize: 13, alignItems: "center",
          }}>
            <div style={{ color: textSecondary, fontWeight: 500 }}>City</div>
            <div style={{ color: textPrimary, fontWeight: 700, textAlign: "center", fontSize: 12 }}>{currentCityName}</div>
            <div style={{ color: textPrimary, fontWeight: 700, textAlign: "center", fontSize: 12 }}>{targetCity.name}</div>
          </div>
          {row("Annual cost of living", `${fmtUSD(currentCol)}/yr`, `${fmtUSD(targetCol)}/yr`)}
          {row("FIRE number", fmtUSD(currentFire.fireTarget), fmtUSD(targetFire.fireTarget))}
          {row("Years to FIRE", `${currentYears.toFixed(1)} yrs`, `${targetYears.toFixed(1)} yrs`)}
          {row("Freedom year", String(currentFire.retireYear ?? "—"), String(targetFire.retireYear ?? "—"))}
        </div>

        {/* Monthly impact */}
        <div style={{
          background: cardBg, borderRadius: 14, border: `1px solid ${border}`,
          padding: "16px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: textSecondary, marginBottom: 4 }}>
              Monthly cost impact
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: monthlyDiff >= 0 ? "#059669" : "#ef4444" }}>
              {monthlyDiff >= 0
                ? `Moving saves $${Math.abs(monthlyDiff).toLocaleString()}/mo`
                : `Moving costs $${Math.abs(monthlyDiff).toLocaleString()}/mo more`}
            </div>
          </div>
          <div style={{ fontSize: 28 }}>{targetCity.flag}</div>
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            width: "100%", background: "#22d3a5", border: "none",
            borderRadius: 10, padding: "14px 20px",
            fontSize: 14, fontWeight: 700, color: "#003527",
            cursor: "pointer", fontFamily: "inherit", textAlign: "center",
          }}
        >
          ← Back to Globe
        </button>
      </div>
    </div>
  );
}
