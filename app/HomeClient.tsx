"use client";

import { useState, useEffect, useRef } from "react";
import Logo from "@/app/components/Logo";
import { useRouter } from "next/navigation";
import RevealFlow from "@/app/components/RevealFlow";
import type { ExpatCity } from "@/app/components/ExpatFireGlobe";
import { CITY_COORDS } from "@/lib/city-coords";
import { supabase } from "@/lib/supabase";
import { saveCalculatorPrefill } from "@/lib/journey";
import { calcFIRE, calcTakeHome, REAL_RETURN } from "@/lib/fire";
import {
  trackLandingViewed,
  trackCalculatorStepViewed,
  trackCalculatorRevealed,
} from "@/lib/analytics";
import type { CalculatorStepId } from "@/lib/analytics-events";
import {
  getAcquisitionSource,
  normaliseAcquisitionSource,
  setAcquisitionSource,
} from "@/lib/acquisition";
import Nav from "@/app/components/landing/Nav";
import LandingPage from "@/app/components/landing/LandingPage";
import CityScreen, { type CityState } from "@/app/components/landing/CityScreen";
import { CITIES } from "@/lib/fire-data";
import { FireTypeAvatar } from "@/app/fire-type/FireTypeAvatar";
import { getTypeMeta, isValidFireTypeCode } from "@/app/fire-type/quiz-data";
import {
  CURRENCY_NAMES,
  FALLBACK_RATES,
  SUPPORTED_CURRENCIES,
  getCurrencySymbol,
  type SupportedCurrency,
} from "@/lib/currency";

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function fmtUSD(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

type IncomeMode = "annual" | "monthly" | "biweekly" | "hourly" | "takehome";
type ShareCardKind = "identity" | "benchmark" | "year";

type FireIdentity = {
  name: string;
  headline: string;
  description: string;
};

type FireTypeResult = {
  code: string;
  name: string;
  tagline: string;
  emoji: string;
  quote: string;
  archetype: string;
  scene: string;
};

type SavingsBenchmark = {
  headline: string;
  detail: string;
  source: string;
  savingsRate: number;
  baselineRate: number;
};

// Public baseline placeholder: U.S. personal saving rate is published by BEA/FRED.
// City-level savings-rate data is not reliably public, so we use this as a conservative
// finance-awareness benchmark and keep the copy framed as a "benchmark", not a census claim.
const PUBLIC_SAVINGS_RATE_BASELINE = 5;

function deriveFireIdentity(savingsRate: number, portfolioBalance: number, yearsToFire?: number): FireIdentity {
  if (yearsToFire === 0) {
    return {
      name: "FIRE Achieved",
      headline: "Your portfolio already covers your cost of living.",
      description: "The accumulation phase is done. The work ahead is protecting what you've built and designing the life you want.",
    };
  }
  if (yearsToFire !== undefined && yearsToFire <= 5) {
    return {
      name: "Final Stretch",
      headline: "You're in the home stretch — protect your momentum.",
      description: "At this stage the biggest risk is behavioural: don't chase returns or take on unnecessary risk. Consistency wins.",
    };
  }
  if (portfolioBalance > 100000) {
    return {
      name: "Coast Candidate",
      headline: "Your investments are already doing part of the work.",
      description: "Your existing portfolio gives compounding a head start. The next unlock is protecting that momentum.",
    };
  }

  if (savingsRate >= 30) {
    return {
      name: "Freedom Builder",
      headline: "Your path is powered by savings rate + consistency.",
      description: "You are turning income into optionality. Keeping lifestyle growth below income growth is your edge.",
    };
  }

  if (savingsRate >= 15) {
    return {
      name: "Acceleration Seeker",
      headline: "You have the engine — now widen the gap.",
      description: "Your biggest lever is increasing the spread between monthly income and lifestyle costs.",
    };
  }

  return {
    name: "Reset Starter",
    headline: "Your first win is building a repeatable savings rhythm.",
    description: "Small automatic moves matter most at this stage because every month creates a stronger baseline.",
  };
}

function getSavingsBenchmark(cityName: string, savings: number, monthlyTakeHome: number): SavingsBenchmark {
  const savingsRate = monthlyTakeHome > 0 ? Math.round((savings / monthlyTakeHome) * 100) : 0;
  const city = cityName.split(",")[0] || cityName;
  const beatsBaseline = savingsRate > PUBLIC_SAVINGS_RATE_BASELINE;

  return {
    headline: beatsBaseline
      ? `You’re ahead of the pack in ${city}.`
      : `You’ve got a clear starting line in ${city}.`,
    detail: beatsBaseline
      ? `Your ${savingsRate}% savings rate beats the public U.S. personal-saving-rate benchmark we use until city-level data is available.`
      : `Your ${savingsRate}% savings rate is below the public U.S. personal-saving-rate benchmark — a small monthly gap can change the timeline fast.`,
    source: `Benchmark: public U.S. personal saving rate baseline, rounded to ${PUBLIC_SAVINGS_RATE_BASELINE}%. City-specific benchmarks can replace this later.`,
    savingsRate,
    baselineRate: PUBLIC_SAVINGS_RATE_BASELINE,
  };
}

function readStoredFireType(): FireTypeResult | null {
  try {
    const raw = window.localStorage.getItem("uf_fire_type_result");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string };
    const code = typeof parsed?.code === "string" ? parsed.code.toUpperCase() : "";
    if (!isValidFireTypeCode(code)) return null;
    return { code, ...getTypeMeta(code) };
  } catch {
    return null;
  }
}

const INCOME_MODES: { key: IncomeMode; label: string; unit: string; hint: string }[] = [
  { key: "takehome", label: "Monthly take-home", unit: "/mo", hint: "Use the amount that lands in your bank each month. An estimate is fine." },
  { key: "annual", label: "Annual gross", unit: "/yr", hint: "Before-tax yearly salary or compensation." },
  { key: "monthly", label: "Monthly gross", unit: "/mo", hint: "Gross monthly income before taxes." },
  { key: "biweekly", label: "Bi-weekly", unit: "/check", hint: "Amount per paycheck if paid every 2 weeks." },
  { key: "hourly", label: "Hourly", unit: "/hr", hint: "Hourly gross wage (assuming 40h/week)." },
];

function toAnnualGross(value: number, mode: IncomeMode): number {
  switch (mode) {
    case "annual":
      return value;
    case "monthly":
      return value * 12;
    case "biweekly":
      return value * 26;
    case "hourly":
      return value * 2080;
    case "takehome":
      return 0;
    default:
      return value;
  }
}

function stateToCurrency(stateKey?: string | null): SupportedCurrency {
  if (!stateKey) return "USD";
  if (stateKey.startsWith("ca_")) return "CAD";
  const map: Record<string, SupportedCurrency> = {
    jp: "JPY", cn: "CNY", kr: "KRW", tw: "TWD", hk: "HKD",
    sg: "SGD", th: "THB", my: "MYR", vn: "VND", id_idn: "IDR",
    ph: "PHP", in_ind: "INR", il_isr: "ILS", tr: "TRY",
    ae: "AED", sa: "SAR", ng: "NGN", za: "ZAR",
    uk: "GBP",
    au: "AUD", nz: "NZD",
    ch: "CHF", se: "SEK", dk: "DKK", no: "NOK",
    mx: "MXN", br: "BRL",
    fr: "EUR", de: "EUR", nl: "EUR", es: "EUR", pt: "EUR",
    ie: "EUR", fi: "EUR", at: "EUR", be: "EUR", it: "EUR",
    gr: "EUR", hr: "EUR", si: "EUR", ee: "EUR", lv: "EUR", lt: "EUR",
    cz: "CZK", pl: "PLN", hu: "HUF",
  };
  return map[stateKey] ?? "USD";
}

function IncomeScreen({ stateKey, currency = "USD", onCurrencyChange, onNext, onBack }: {
  stateKey: string;
  currency?: SupportedCurrency;
  onCurrencyChange?: (c: SupportedCurrency) => void;
  onNext: (income: number) => void;
  onBack: () => void;
}) {
  const isNonUSD = currency !== "USD";
  const isCustomJurisdiction = stateKey === "custom";
  const canEstimateTax = !isNonUSD && !isCustomJurisdiction;
  const [mode, setMode] = useState<IncomeMode>("takehome");
  const [rawValue, setRawValue] = useState<string>("");
  const [takeHomeRaw, setTakeHomeRaw] = useState<string>("");
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;

  const numVal = parseFloat(rawValue) || 0;
  const annualGross = mode === "takehome" ? 0 : toAnnualGross(numVal, mode);
  const monthlyTakeHome = mode === "takehome" ? parseFloat(takeHomeRaw) || 0 : 0;
  const annualTakeHome = monthlyTakeHome * 12;
  const tax = mode !== "takehome" && canEstimateTax ? calcTakeHome(annualGross, stateKey) : null;

  const displayGross = mode === "takehome" ? null : annualGross;
  const displayTakeHome = mode === "takehome" ? annualTakeHome : (tax?.takeHome ?? annualGross);
  const displayMonthly = displayTakeHome / 12;
  const displayHourly = displayTakeHome / 2080;
  const displayEffRate = tax?.effectiveRate ?? null;

  const takeHomeForPlanner = mode === "takehome" ? annualTakeHome : (tax?.takeHome ?? annualGross);
  const incomeForFIRE = isNonUSD ? Math.round(takeHomeForPlanner / fxRate) : takeHomeForPlanner;
  const canContinue = mode === "takehome" ? monthlyTakeHome > 0 : annualGross > 0;
  const localMoney = (n: number) => `${currencySymbol}${Math.round(n).toLocaleString()}`;

  return (
    <div className="uf-screen">
      <p className="uf-step-label">Step 2 of 4</p>
      {onCurrencyChange && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Currency:</span>
          <select
            value={currency}
            onChange={e => onCurrencyChange(e.target.value as SupportedCurrency)}
            style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", background: "var(--accent-dim)", border: "1.5px solid var(--accent)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", appearance: "none", WebkitAppearance: "none" }}
          >
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c} value={c}>{c} — {CURRENCY_NAMES[c] ?? c}</option>
            ))}
          </select>
        </div>
      )}
      <div className="uf-eyebrow">Income</div>
      <h2 className="uf-h2">What do you <span className="uf-accent">earn?</span></h2>
      <p className="uf-body" style={{ marginBottom: 24 }}>
        Start with the monthly amount that lands in your bank. If gross annual is easier, use that — we’ll keep it rough and you can refine later.
      </p>

      <div className="uf-mode-pills">
          {INCOME_MODES.map((m) => (
            <button
              key={m.key}
              className={`uf-mode-pill ${mode === m.key ? "active" : ""}`}
              onClick={() => {
                setMode(m.key);
                setRawValue("");
                setTakeHomeRaw("");
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      <p className="uf-hint" style={{ marginBottom: 16 }}>
        {mode === "takehome"
          ? `Enter your monthly take-home in ${currency}. We'll convert it automatically if needed.`
          : canEstimateTax
            ? INCOME_MODES.find((m) => m.key === mode)?.hint
            : `Enter gross income in ${currency}. Tax is not estimated for this location yet, so this stays a rough starting point.`}
      </p>

      {mode !== "takehome" ? (
        <>
          <label className="uf-label">Gross income</label>
          <div className="uf-big-input-wrap">
            <span className="uf-input-prefix uf-big-prefix">{currencySymbol}</span>
            <input
              key={mode}
              type="number"
              className="uf-input uf-input-mono uf-input-big"
              style={{ paddingLeft: 28 }}
              placeholder="e.g. 90,000"
              value={rawValue}
              min={0}
              onChange={(e) => setRawValue(e.target.value)}
              autoFocus
            />
            <span className="uf-unit">{INCOME_MODES.find((m) => m.key === mode)?.unit}</span>
          </div>
        </>
      ) : (
        <>
          <label className="uf-label">Monthly take-home pay ({currency})</label>
          <div className="uf-big-input-wrap">
            <span className="uf-input-prefix uf-big-prefix">{currencySymbol}</span>
            <input
              type="number"
              className="uf-input uf-input-mono uf-input-big"
              style={{ paddingLeft: 28 }}
              placeholder="e.g. 5,000"
              value={takeHomeRaw}
              min={0}
              onChange={(e) => setTakeHomeRaw(e.target.value)}
              autoFocus
            />
            <span className="uf-unit">/month</span>
          </div>
          {isNonUSD && <p className="uf-hint">1 {currency} ≈ {(1 / fxRate).toFixed(4)} USD (indicative rate)</p>}
        </>
      )}

      {canContinue && (
        <div className="uf-stats-grid" style={{ marginTop: 16 }}>
          {displayGross !== null ? (
            <div className="uf-card">
              <div className="uf-card-sub">Annual gross</div>
              <div className="uf-card-main">{isNonUSD ? localMoney(displayGross) : fmtUSD(displayGross)}</div>
            </div>
          ) : null}
          <div className="uf-card">
            <div className="uf-card-sub">Annual take-home</div>
            <div className="uf-card-main">
              {isNonUSD ? localMoney(displayTakeHome) : fmtUSD(displayTakeHome)}
            </div>
          </div>
          <div className="uf-card">
            <div className="uf-card-sub">Monthly take-home</div>
            <div className="uf-card-main">
              {isNonUSD ? localMoney(displayMonthly) : fmtUSD(displayMonthly)}
            </div>
          </div>
          {displayEffRate !== null ? (
            <div className="uf-card">
              <div className="uf-card-sub">Effective tax rate</div>
              <div className="uf-card-main">{displayEffRate.toFixed(1)}%</div>
            </div>
          ) : mode !== "takehome" ? (
            <div className="uf-card">
              <div className="uf-card-sub">Tax estimate</div>
              <div className="uf-card-main">Not applied</div>
            </div>
          ) : null}
          {!isNonUSD && (
            <div className="uf-card uf-card-accent">
              <div className="uf-card-sub">Hourly take-home</div>
              <div className="uf-hourly">{displayHourly.toFixed(2)}/hr</div>
              <div className="uf-card-hint">Based on 2,080 working hours/yr</div>
            </div>
          )}
        </div>
      )}

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} disabled={!canContinue} onClick={() => onNext(incomeForFIRE)}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SCREEN 3 -SAVINGS
// -----------------------------------------------------------------------------

// income is now annual planner income from IncomeScreen
type SavingsInputMode = "savings" | "spending";
type SavingsPeriod = "monthly" | "yearly";

function SavingsScreen({ income, currency = "USD", onNext, onBack }: {
  income: number;
  currency?: SupportedCurrency;
  onNext: (savings: number, monthlyExpenses: number) => void;
  onBack: () => void;
}) {
  const isNonUSD = currency !== "USD";
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const monthly = income / 12;
  const monthlyLocal = isNonUSD ? monthly * fxRate : monthly;
  const defaultSavings = isNonUSD ? Math.round(1500 * fxRate) : 1500;
  const [mode, setMode] = useState<SavingsInputMode>("savings");
  const [period, setPeriod] = useState<SavingsPeriod>("monthly");
  const [amount, setAmount] = useState(defaultSavings);
  const monthlyAmount = period === "yearly" ? amount / 12 : amount;
  const savingsLocal = mode === "savings" ? monthlyAmount : Math.max(0, monthlyLocal - monthlyAmount);
  const expensesLocal = mode === "spending" ? monthlyAmount : Math.max(0, monthlyLocal - savingsLocal);
  const rate = monthlyLocal > 0 ? Math.round((savingsLocal / monthlyLocal) * 100) : 0;
  const sliderMax = Math.max(isNonUSD ? Math.round(10000 * fxRate) : 10000, Math.ceil(monthlyLocal / 100) * 100);
  const sliderStep = isNonUSD ? Math.max(1, Math.round(100 * fxRate)) : 100;
  const inputMax = period === "yearly" ? sliderMax * 12 : sliderMax;
  const inputStep = period === "yearly" ? sliderStep * 12 : sliderStep;

  const handlePeriodChange = (nextPeriod: SavingsPeriod) => {
    if (nextPeriod === period) return;
    setAmount(nextPeriod === "yearly" ? Math.round(amount * 12) : Math.round(amount / 12));
    setPeriod(nextPeriod);
  };

  const rateColor = rate < 15 ? "var(--danger)" : rate < 30 ? "var(--accent)" : "var(--teal)";
  const rateLabel = rate < 10 ? "Very low" : rate < 20 ? "Below average" : rate < 30 ? "Average"
    : rate < 40 ? "Good" : rate < 50 ? "Strong" : "FIRE pace!";
  const periodLabel = period === "yearly" ? "Yearly" : "Monthly";
  const periodUnit = period === "yearly" ? "/year" : "/month";
  const inputLabel = `${periodLabel} ${mode === "savings" ? "savings" : "spending"} amount`;

  const spendSliderMax = isNonUSD ? Math.round(15000 * fxRate) : 15000;

  return (
    <div className="uf-screen">
      <p className="uf-step-label">Step 3 of 4</p>
      <div className="uf-eyebrow">Finances</div>
      <h2 className="uf-h2">How much do you <span className="uf-accent">save or spend?</span></h2>
      <p className="uf-body" style={{ marginBottom: 24 }}>
        Use whichever number you know: monthly or yearly savings or spending. We only need one to estimate your gap.
      </p>

      <div className="uf-mode-pills" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`uf-mode-pill ${mode === "savings" ? "active" : ""}`}
          onClick={() => setMode("savings")}
        >
          I know my savings
        </button>
        <button
          type="button"
          className={`uf-mode-pill ${mode === "spending" ? "active" : ""}`}
          onClick={() => setMode("spending")}
        >
          I know my spending
        </button>
      </div>

      <div className="uf-mode-pills" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`uf-mode-pill ${period === "monthly" ? "active" : ""}`}
          onClick={() => handlePeriodChange("monthly")}
        >
          Monthly
        </button>
        <button
          type="button"
          className={`uf-mode-pill ${period === "yearly" ? "active" : ""}`}
          onClick={() => handlePeriodChange("yearly")}
        >
          Yearly
        </button>
      </div>

      <label className="uf-label">{inputLabel} ({currency})</label>
      <div className="uf-big-input-wrap">
        <span className="uf-input-prefix uf-big-prefix">{currencySymbol}</span>
        <input
          type="number"
          className="uf-input uf-input-mono uf-input-big"
          style={{ paddingLeft: 28 }}
          value={amount || ""}
          min={0}
          onChange={e => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
          autoFocus
        />
        <span className="uf-unit">{periodUnit}</span>
      </div>
      <p className="uf-hint">
        {mode === "spending"
          ? "We’ll estimate savings as income minus spending."
          : "We’ll estimate spending as income minus savings."}
      </p>

      <div className="uf-slider-wrap">
        <input
          type="range" min={0} max={inputMax} step={inputStep}
          value={Math.min(amount, inputMax)}
          className="uf-range"
          onChange={e => setAmount(parseInt(e.target.value))}
        />
        <div className="uf-range-labels">
          <span>{currencySymbol}0</span><span>{currencySymbol}{Math.round(inputMax / 2).toLocaleString()}</span><span>{currencySymbol}{inputMax.toLocaleString()}{periodUnit}</span>
        </div>
      </div>

      <div className="uf-stat-row">
        <div className="uf-stat-box">
          <div className="uf-stat-val uf-accent">{currencySymbol}{Math.round(savingsLocal).toLocaleString()}/mo</div>
          <div className="uf-stat-lab">Monthly savings</div>
        </div>
        <div className="uf-stat-box">
          <div className="uf-stat-val">{currencySymbol}{Math.round(expensesLocal).toLocaleString()}/mo</div>
          <div className="uf-stat-lab">Monthly spending</div>
        </div>
        <div className="uf-stat-box">
          <div className="uf-stat-val">{rate}%</div>
          <div className="uf-stat-lab">Of income saved</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="uf-rate-head">
          <span className="uf-tax-label">Savings rate benchmark</span>
          <span style={{ color: rateColor, fontSize: 13, fontWeight: 500 }}>{rateLabel}</span>
        </div>
        <div className="uf-progress-track">
          <div className="uf-progress-fill" style={{ width: `${Math.min(rate * 2, 100)}%`, background: rateColor }} />
        </div>
        <div className="uf-range-labels" style={{ marginTop: 4 }}>
          <span>0%</span><span>20% (Good)</span><span>50%+ (Fast track)</span>
        </div>
      </div>

      {savingsLocal === 0 && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.35)", borderRadius: 8, fontSize: 13, color: "var(--uf-warn-ink)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span>⚠️</span>
          <span>With <strong>$0 saved per month</strong> your freedom date will be very far out. Make sure this is intentional — you can always update it later.</span>
        </div>
      )}
      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button
          className="uf-btn uf-btn-primary"
          style={{ flex: 1 }}
          onClick={() => onNext(
            isNonUSD ? Math.round(savingsLocal / fxRate) : savingsLocal,
            isNonUSD ? Math.round(expensesLocal / fxRate) : expensesLocal,
          )}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PORTFOLIO BALANCE + AGE SCREEN
// -----------------------------------------------------------------------------

function PortfolioScreen({ currency = "USD", initialPortfolioBalance = 0, initialAge, onNext, onBack }: {
  currency?: SupportedCurrency;
  initialPortfolioBalance?: number;
  initialAge?: number;
  onNext: (portfolio: number, age?: number) => void;
  onBack: () => void;
}) {
  const isNonUSD = currency !== "USD";
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const initialPortfolioInput = initialPortfolioBalance > 0
    ? String(isNonUSD ? Math.round(initialPortfolioBalance * fxRate) : initialPortfolioBalance)
    : "";
  const [portfolioRaw, setPortfolioRaw] = useState<string>(initialPortfolioInput);
  const [ageRaw, setAgeRaw] = useState<string>(initialAge ? String(initialAge) : "");

  const portfolioInput = Math.max(0, parseInt(portfolioRaw.replace(/,/g, ""), 10) || 0);
  const portfolio = isNonUSD ? Math.round(portfolioInput / fxRate) : portfolioInput;
  const parsedAge = (() => {
    const n = parseInt(ageRaw, 10);
    return Number.isFinite(n) && n >= 16 && n <= 90 ? n : undefined;
  })();

  return (
    <div className="uf-screen">
      <p className="uf-step-label">Step 4 of 4</p>
      <div className="uf-eyebrow">Net worth</div>
      <h2 className="uf-h2">What is your <span className="uf-accent">net worth?</span></h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Enter your current net worth. Estimate is fine. Zero is fine too.
      </p>

      <label className="uf-label">Net worth ({currency})</label>
      <div className="uf-big-input-wrap">
        <span className="uf-input-prefix uf-big-prefix">{currencySymbol}</span>
        <input
          type="number"
          className="uf-input uf-input-mono uf-input-big"
          style={{ paddingLeft: 28 }}
          placeholder="0"
          value={portfolioRaw}
          min={0}
          onChange={e => setPortfolioRaw(e.target.value)}
          autoFocus
        />
      </div>
      <p className="uf-hint">Leave at 0 if you&apos;re starting fresh. This is the third core number that makes your freedom date useful.</p>

      <div style={{ marginTop: 24 }}>
        <label className="uf-label" htmlFor="uf-current-age">
          Your current age <span style={{ color: 'var(--teal)', fontWeight: 700 }}>(recommended)</span>
        </label>
        <input
          id="uf-current-age"
          type="number"
          className="uf-input uf-input-mono"
          placeholder="e.g. 32"
          min={16}
          max={90}
          value={ageRaw}
          onChange={e => setAgeRaw(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <p className="uf-hint">Highly recommended: age lets us show when freedom hits for you. You can still continue without it.</p>
      </div>

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} onClick={() => onNext(portfolio, parsedAge)}>
          Show my freedom date
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// WAITLIST INLINE -shown on reveal screen
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// SHARE MODAL
// -----------------------------------------------------------------------------

function ShareModal({
  cityName, fireIdentity, fireTypeResult, benchmark, retireYear, onClose,
}: {
  cityName: string;
  fireIdentity: FireIdentity;
  fireTypeResult: FireTypeResult | null;
  benchmark: SavingsBenchmark;
  retireYear?: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ShareCardKind>("year");
  const [nativeShareSupported, setNativeShareSupported] = useState(false);

  const cityShort = cityName.split(",")[0] || cityName;
  useEffect(() => {
    setNativeShareSupported(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const benchmarkShareBody = benchmark.savingsRate > benchmark.baselineRate
    ? `My savings rate beats the benchmark in ${cityShort}. Find your freedom date at UntilFire.`
    : `I found my FIRE starting point in ${cityShort}. Find your freedom date at UntilFire.`;
  const shareUrl = selectedCard === "identity"
    ? (fireTypeResult
      ? `https://www.untilfire.com/fire-type?source=share-identity&type=${encodeURIComponent(fireTypeResult.code)}`
      : "https://www.untilfire.com/fire-type?source=share-identity")
    : `https://www.untilfire.com/?source=share-${selectedCard}`;
  const shareCards: Record<ShareCardKind, { label: string; title: string; body: string; text: string }> = {
    year: {
      label: "Card A · Freedom Year",
      title: retireYear ? `My freedom year is ${retireYear} 🔥` : "I found my freedom date 🔥",
      body: `I just calculated when work becomes optional for me. Find your freedom date — free, no login required.`,
      text: retireYear
        ? `My freedom year is ${retireYear} 🔥\nI just calculated when work becomes optional. Find yours at UntilFire — free, no login needed.`
        : `I just found my freedom date 🔥\nFind yours at UntilFire — free, no login needed.`,
    },
    identity: {
      label: "Card B · FIRE Type",
      title: `I’m a ${fireIdentity.name} 🔥`,
      body: `${fireIdentity.headline} Find your FIRE Type at UntilFire.`,
      text: `I’m a ${fireIdentity.name} 🔥\n${fireIdentity.headline}\nFind your FIRE Type at UntilFire.`,
    },
    benchmark: {
      label: "Card C · Benchmark",
      title: benchmark.headline,
      body: benchmarkShareBody,
      text: `${benchmark.headline}\n${benchmarkShareBody}`,
    },
  };
  const activeShare = shareCards[selectedCard];
  const effectiveShareTitle = selectedCard === "identity" && fireTypeResult
    ? `${fireTypeResult.code} · ${fireTypeResult.name}`
    : activeShare.title;
  const effectiveShareBody = selectedCard === "identity" && fireTypeResult
    ? `${fireTypeResult.tagline} Find your FIRE Type at UntilFire.`
    : activeShare.body;
  const effectiveShareText = selectedCard === "identity" && fireTypeResult
    ? `${fireTypeResult.emoji} I'm ${fireTypeResult.code} — ${fireTypeResult.name}\n"${fireTypeResult.quote}"\nFind your FIRE Type at UntilFire.`
    : activeShare.text;
  const redditTitle = effectiveShareTitle;
  const sharePrivacy = selectedCard === "year"
    ? "Freedom year only · no income or exact number"
    : selectedCard === "identity" && fireTypeResult
      ? "Personality result only · no income or FIRE number"
      : selectedCard === "benchmark"
        ? "Savings-rate comparison only · no exact income or FIRE number"
        : "No exact income · no FIRE number · no freedom date";

  function copyToClipboard() {
    navigator.clipboard.writeText(`${effectiveShareText}\n${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function nativeShare() {
    if (!nativeShareSupported) return;
    try {
      await navigator.share({
        title: effectiveShareTitle,
        text: effectiveShareText,
        url: shareUrl,
      });
    } catch {
      // user cancelled
    }
  }

  function openShare(platform: "x" | "facebook" | "reddit" | "linkedin" | "whatsapp" | "email") {
    const encodedText = encodeURIComponent(effectiveShareText);
    const encodedUrl = encodeURIComponent(shareUrl);
    const urls = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(redditTitle)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${effectiveShareText}\n${shareUrl}`)}`,
      email: `mailto:?subject=${encodeURIComponent(effectiveShareTitle)}&body=${encodeURIComponent(`${effectiveShareText}\n\n${shareUrl}`)}`,
    };
    if (platform === "email") {
      window.location.href = urls.email;
      return;
    }
    window.open(urls[platform], "_blank", "noopener,noreferrer,width=620,height=520");
  }

  return (
    <div
      className="uf-share-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="uf-share-modal">
        <button className="uf-share-close" onClick={onClose} aria-label="Close">×</button>

        <div className="uf-share-heading">Choose what you want to share</div>
        <div className="uf-share-subheading">Pick a privacy-safe version. We won’t share your exact income, FIRE number, or freedom date by default.</div>

        <div className="uf-share-card-options" role="tablist" aria-label="Share card options">
          {(Object.keys(shareCards) as ShareCardKind[]).map((kind) => (
            <button
              key={kind}
              className={`uf-share-card-option ${selectedCard === kind ? "active" : ""}`}
              onClick={() => setSelectedCard(kind)}
              type="button"
            >
              {shareCards[kind].label}
            </button>
          ))}
        </div>

        {/* Preview card */}
        <div className={`uf-share-card uf-share-card-${selectedCard}`}>
          <div className="uf-share-card-brand">
            <Logo variant="dark" size={20} />
          </div>
          <div className="uf-share-card-label">{selectedCard === "year" ? "Freedom Year" : selectedCard === "identity" ? "FIRE Type" : "Benchmark"}</div>
          {selectedCard === "identity" && fireTypeResult ? (
            <div className="uf-share-card-identity">
              <div className="uf-share-card-avatar-shell">
                <div className="uf-share-card-avatar-stage">
                  <FireTypeAvatar code={fireTypeResult.code} size={176} />
                </div>
              </div>
              <div className="uf-share-card-code">{fireTypeResult.code}</div>
              <div className="uf-share-card-number">{fireTypeResult.name}</div>
              <div className="uf-share-card-meta">{fireTypeResult.tagline}</div>
              <div className="uf-share-card-quote">&ldquo;{fireTypeResult.quote}&rdquo;</div>
            </div>
          ) : (
            <>
              <div className="uf-share-card-number" style={{ fontSize: selectedCard === "year" && retireYear ? 42 : 28, lineHeight: 1.1, color: selectedCard === "year" ? "#62FAE3" : undefined }}>{effectiveShareTitle}</div>
              <div className="uf-share-card-meta" style={{ fontSize: 15, color: selectedCard === "year" ? "rgba(255,255,255,0.75)" : "#62FAE3", fontWeight: selectedCard === "year" ? 500 : 800, lineHeight: 1.35 }}>{effectiveShareBody}</div>
              {selectedCard === "benchmark" ? (
                <div className="uf-share-card-benchmark-stat">
                  <span>{benchmark.savingsRate}% saved</span>
                  <span>{benchmark.baselineRate}% baseline</span>
                </div>
              ) : null}
            </>
          )}
          <div className="uf-share-card-city">{sharePrivacy}</div>
          <div className="uf-share-card-divider" />
          <div className="uf-share-card-url">{selectedCard === "identity" ? "Find your FIRE Type -> untilfire.com/fire-type" : "Find your freedom date -> untilfire.com"}</div>
        </div>

        {/* Platform buttons */}
        <div className="uf-share-btns">
          <button className="uf-share-btn uf-share-x" onClick={() => openShare("x")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.254 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
            </svg>
            Post on X
          </button>
          <button className="uf-share-btn uf-share-facebook" onClick={() => openShare("facebook")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Share on Facebook
          </button>
          <button className="uf-share-btn uf-share-reddit" onClick={() => openShare("reddit")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
            Post on Reddit
          </button>
          <button className="uf-share-btn uf-share-linkedin" onClick={() => openShare("linkedin")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Share on LinkedIn
          </button>
          <button className="uf-share-btn uf-share-whatsapp" onClick={() => openShare("whatsapp")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .15 5.35.15 11.92c0 2.1.55 4.15 1.6 5.95L0 24l6.34-1.66a11.86 11.86 0 0 0 5.73 1.47h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.48-8.41Zm-8.45 18.3h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.76.98 1-3.67-.24-.38a9.88 9.88 0 0 1-1.52-5.2c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.46-4.44 9.9-9.87 9.9Zm5.42-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.94 1.17-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.39-1.46-.88-.78-1.48-1.74-1.65-2.03-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.52-.08-.15-.66-1.6-.9-2.2-.24-.57-.49-.5-.66-.5h-.56c-.2 0-.52.08-.8.38-.27.3-1.05 1.03-1.05 2.52 0 1.48 1.08 2.92 1.23 3.12.15.2 2.12 3.25 5.13 4.56.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.01-1.42.25-.69.25-1.29.17-1.42-.07-.13-.27-.2-.56-.35Z" />
            </svg>
            Share on WhatsApp
          </button>
          <button className="uf-share-btn uf-share-email" onClick={() => openShare("email")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.5 4.5h21a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 0 18V6a1.5 1.5 0 0 1 1.5-1.5Zm.6 2.25 9.9 7.26 9.9-7.26H2.1Zm19.65 10.5V8.04l-9.3 6.82a.75.75 0 0 1-.9 0l-9.3-6.82v9.21h19.5Z" />
            </svg>
            Share by Email
          </button>
          {nativeShareSupported ? (
            <button className="uf-share-btn uf-share-more" onClick={nativeShare}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 15 5a3 3 0 0 0 .04.49l-7 4.11a3 3 0 1 0 0 4.8l7.12 4.18c-.08.23-.12.47-.12.72a3 3 0 1 0 3-3Z" />
              </svg>
              More apps
            </button>
          ) : null}
          <button className="uf-share-btn uf-share-copy" onClick={copyToClipboard}>
            {copied ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy to clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SCREEN 4 -REVEAL
// -----------------------------------------------------------------------------


function FireGrowthChart({ data, extraSavings, baseRetireYear, boostedRetireYear, currentAge }: {
  data: { basePts: {t:number;value:number}[]; boostedPts: {t:number;value:number}[]; maxYears: number; fireTarget: number };
  extraSavings: number;
  baseRetireYear: number;
  boostedRetireYear: number;
  currentAge?: number;
}) {
  if (data.basePts.length < 2) return null;
  const W = 920, H = 340;
  const padL = 56, padR = 32, padT = 28, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const allValues = [...data.basePts, ...data.boostedPts, { t: 0, value: data.fireTarget }].map((p) => p.value);
  const yMax = Math.max(1, ...allValues) * 1.08;
  const xS = (t: number) => padL + (t / Math.max(data.maxYears, 0.1)) * innerW;
  const yS = (v: number) => padT + innerH - (Math.min(v, yMax) / yMax) * innerH;
  const toPathPts = (pts: {t:number;value:number}[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${xS(p.t).toFixed(2)},${yS(p.value).toFixed(2)}`).join(" ");
  const toAreaPts = (pts: {t:number;value:number}[]) => {
    const top = toPathPts(pts);
    const last = pts[pts.length - 1], first = pts[0];
    return `${top} L${xS(last.t).toFixed(2)},${yS(0).toFixed(2)} L${xS(first.t).toFixed(2)},${yS(0).toFixed(2)} Z`;
  };
  const yearStep = Math.max(1, Math.ceil(data.maxYears / 6));
  const xTicks = Array.from({ length: Math.floor(data.maxYears / yearStep) + 1 }, (_, i) => i * yearStep).filter(y => y <= data.maxYears + 0.5);
  const yTicks = [0, 0.5e6, 1e6, 1.5e6, 2e6].filter(v => v <= yMax * 0.98);
  const fireY = yS(data.fireTarget);
  const baseLast = data.basePts[data.basePts.length - 1];
  const boostedLast = data.boostedPts[data.boostedPts.length - 1];
  const fmtFire = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1000)}k`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="fg-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6B7280" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6B7280" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fg-new" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3A5" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#22D3A5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map(v => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={yS(v)} y2={yS(v)} stroke="#E2E8F0" strokeDasharray="3 4" />
          <text x={padL - 10} y={yS(v)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#6B7280" fontWeight="600">
            {v === 0 ? "$0" : `$${(v / 1e6).toFixed(1)}M`}
          </text>
        </g>
      ))}
      {xTicks.map(y => (
        <text key={y} x={xS(y)} y={H - padB + 18} textAnchor="middle" fontSize="10" fill="#6B7280" fontWeight="600">
          {currentAge ? `${currentAge + y}` : (y === 0 ? "Today" : `+${y}y`)}
        </text>
      ))}
      <line x1={padL} x2={W - padR} y1={fireY} y2={fireY} stroke="#059669" strokeWidth="1.2" strokeDasharray="2 4" />
      <text x={W - padR} y={fireY - 8} textAnchor="end" fontSize="10" fontWeight="700" fill="#059669">
        FIRE · {fmtFire(data.fireTarget)}
      </text>
      <path d={toAreaPts(data.basePts)} fill="url(#fg-base)" />
      <path d={toPathPts(data.basePts)} fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
      {extraSavings > 0 && (
        <>
          <path d={toAreaPts(data.boostedPts)} fill="url(#fg-new)" />
          <path d={toPathPts(data.boostedPts)} fill="none" stroke="#003527" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
      <circle cx={xS(baseLast.t)} cy={yS(baseLast.value)} r="5" fill="#fff" stroke="#6B7280" strokeWidth="2" />
      {extraSavings > 0 && (
        <circle cx={xS(boostedLast.t)} cy={yS(boostedLast.value)} r="6" fill="#003527" stroke="#fff" strokeWidth="2.5" />
      )}
      <text x={xS(baseLast.t) + 10} y={yS(baseLast.value) + 8} fontSize="10" fontWeight="700" fill="#6B7280">
        BASE · {baseRetireYear}
      </text>
      {extraSavings > 0 && (
        <text x={xS(boostedLast.t) - 8} y={yS(boostedLast.value) - 16} textAnchor="end" fontSize="11" fontWeight="700" fill="#003527">
          NEW · {boostedRetireYear}
        </text>
      )}
    </svg>
  );
}

function RevealScreen({ city, income, savings, stateKey, currency = "USD", currentAge, portfolioBalance = 0, landingSource, onAdjust }: {
  city: CityState; income: number; savings: number; stateKey: string;
  currency?: SupportedCurrency;
  currentAge?: number; portfolioBalance?: number;
  landingSource?: string;
  onAdjust: () => void;
}) {
  const router = useRouter();
  const planningAge = currentAge ?? 30;
  const ageWasAssumed = currentAge == null;
  const marketReturn = REAL_RETURN;

  const result = calcFIRE(savings, city.col, planningAge, portfolioBalance, marketReturn);
  const takeHome = income;
  const monthlyTakeHome = takeHome / 12;

  const [showShare, setShowShare] = useState(false);
  const [fireTypeResult, setFireTypeResult] = useState<FireTypeResult | null>(null);
  useEffect(() => { setFireTypeResult(readStoredFireType()); }, []);

  const savingsBenchmark = getSavingsBenchmark(city.name, savings, monthlyTakeHome);
  const savingsRatePct = savingsBenchmark.savingsRate;
  const fireIdentity = deriveFireIdentity(savingsRatePct, portfolioBalance, result.years ?? undefined);

  const isAlreadyFire = result.years === 0;
  const yearsToFire = result.years === null ? null : Math.round(result.years);
  const freedomAge = yearsToFire === null ? null : planningAge + yearsToFire;
  const pctThere = result.fireTarget > 0
    ? Math.max(0, Math.min(100, Math.round((portfolioBalance / result.fireTarget) * 100)))
    : 0;

  // Fire the reveal funnel event once per mount, tied to the user reaching a result.
  const revealEmitted = useRef(false);
  useEffect(() => {
    if (revealEmitted.current) return;
    revealEmitted.current = true;
    trackCalculatorRevealed({
      stateKey,
      isCustomCity: city.isCustom,
      fireTarget: result.fireTarget,
      yearsToFire: result.years,
      landingSource,
    });
  }, [stateKey, city.isCustom, result.fireTarget, result.years, landingSource]);

  // Expat-FIRE globe: iconic lower-cost destinations, each with a real
  // recomputed freedom age (via calcFIRE at that city's cost of living).
  const currentCityKey = CITIES.find((c) => c.name === city.name)?.key ?? "sf";
  const homeCoords = CITY_COORDS[currentCityKey] ?? { lat: 30.27, lng: -97.74 };
  const expatHome = { name: city.name.split(",")[0] || city.name, lat: homeCoords.lat, lng: homeCoords.lng };
  const EXPAT_KEYS = ["lisbon", "mexicocity", "chiangmai", "medellin", "bali", "porto", "valencia", "budapest", "bangkok", "kualalumpur"];
  const expatCities: ExpatCity[] = EXPAT_KEYS
    .map((k): ExpatCity | null => {
      const c = CITIES.find((x) => x.key === k);
      const co = CITY_COORDS[k];
      if (!c || !co || c.col >= city.col || freedomAge === null) return null;
      const projection = calcFIRE(savings, c.col, planningAge, portfolioBalance, marketReturn);
      if (projection.years === null) return null;
      const age = planningAge + Math.round(projection.years);
      return { key: k, name: c.name.split(",")[0], country: (c.name.split(", ")[1] ?? "").trim(), lat: co.lat, lng: co.lng, age, delta: freedomAge - age };
    })
    .filter((x): x is ExpatCity => x !== null && x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  const symbol = getCurrencySymbol(currency);
  const formatCompact = (n: number) => {
    const v = Math.max(0, n);
    if (v >= 1_000_000) return `${symbol}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${symbol}${Math.round(v / 1000)}k`;
    return `${symbol}${Math.round(v)}`;
  };

  const onSave = () => {
    saveCalculatorPrefill({ monthlyIncome: Math.round(takeHome / 12), monthlySavings: savings, monthlySpendEstimate: Math.max(0, Math.round(takeHome / 12 - savings)), cityName: city.name, stateKey, fireTarget: result.fireTarget, annualCost: city.col, retireYear: result.retireYear ?? undefined, generatedAt: new Date().toISOString(), currentAge: planningAge, portfolioBalance, landingSource, defaultCurrency: currency });
    router.push("/login");
  };

  return (
    <div className="uf-screen uf-reveal-screen">
      {showShare && result.retireYear !== null && (
        <ShareModal
          cityName={city.name}
          fireIdentity={fireIdentity}
          fireTypeResult={fireTypeResult}
          benchmark={savingsBenchmark}
          retireYear={result.retireYear}
          onClose={() => setShowShare(false)}
        />
      )}
      <RevealFlow
        freedomAge={freedomAge}
        freedomYear={result.retireYear}
        yearsToFire={yearsToFire}
        planningAge={planningAge}
        ageWasAssumed={ageWasAssumed}
        isAlreadyFire={isAlreadyFire}
        fireTarget={result.fireTarget}
        pctThere={pctThere}
        savingsRatePct={savingsRatePct}
        usBaselineRate={PUBLIC_SAVINGS_RATE_BASELINE}
        fireBenchmarkRate={25}
        expatHome={expatHome}
        expatBaseAge={freedomAge}
        expatCities={expatCities}
        formatCompact={formatCompact}
        onSave={onSave}
        onAdjust={onAdjust}
        onShare={() => setShowShare(true)}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// ROOT
// -----------------------------------------------------------------------------

type Screen = "hero" | "city" | "income" | "savings" | "portfolio" | "reveal";

export default function HomeClient() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("hero");

  // Wizard state
  const [cityState, setCityState]         = useState<CityState | null>(null);
  const [currency, setCurrency]           = useState<SupportedCurrency>("USD");
  const [income, setIncome]               = useState(90000);
  const [savings, setSavings]             = useState(1500);
  const [portfolioBalance, setPortfolioBalance] = useState(0);
  const [currentAge, setCurrentAge]       = useState<number | undefined>(undefined);
  const [landingSource, setLandingSourceState] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("uf-result-mode", screen === "reveal");
    return () => document.body.classList.remove("uf-result-mode");
  }, [screen]);

  useEffect(() => {
    const urlParams = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
    const sourceFromUrl = normaliseAcquisitionSource(urlParams?.get("source") ?? null);
    const nextSource = sourceFromUrl ?? getAcquisitionSource();
    if (sourceFromUrl) {
      setAcquisitionSource(sourceFromUrl);
    }
    setLandingSourceState(nextSource);
    if (process.env.NODE_ENV === "development" && urlParams?.get("previewReveal") === "1") {
      const previewCity = CITIES.find((c) => c.key === (urlParams.get("city") ?? "austin")) ?? CITIES[0];
      const previewIncome = Number(urlParams.get("income") ?? 140000);
      const previewSavings = Number(urlParams.get("savings") ?? 3500);
      const previewAge = Number(urlParams.get("age") ?? 28);
      const previewPortfolio = Number(urlParams.get("portfolio") ?? 30000);
      setCityState({
        name: previewCity.name,
        col: previewCity.col,
        stateKey: previewCity.state,
        isCustom: false,
      });
      setCurrency("USD");
      setIncome(previewIncome);
      setSavings(previewSavings);
      setCurrentAge(previewAge);
      setPortfolioBalance(previewPortfolio);
      setScreen("reveal");
      return;
    }
    if (urlParams?.get("start") === "onboarding") {
      setScreen("city");
    }
  }, []);

  // Auth redirect -keep existing behaviour
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/dashboard");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) router.push("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Funnel instrumentation: emit a single event per screen entry. The hero is
  // landing_viewed; the four wizard steps are calculator_step_viewed; reveal
  // fires its own event from inside RevealScreen so we know the calculation
  // actually completed.
  useEffect(() => {
    if (screen === "hero") {
      trackLandingViewed(landingSource);
      return;
    }
    const stepMap: Partial<Record<Screen, CalculatorStepId>> = {
      city: "city",
      income: "income",
      savings: "savings",
      portfolio: "portfolio",
    };
    const stepId = stepMap[screen];
    if (stepId) {
      trackCalculatorStepViewed(stepId, landingSource);
    }
  }, [screen, landingSource]);

  function signIn() {
    router.push('/login');
  }

  const STEP_MAP: Record<Screen, number> = { hero: 0, city: 1, income: 2, savings: 3, portfolio: 4, reveal: 5 };
  const totalDots = 6;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: var(--uf-ground);
          --bg-hero: #003527;
          --bg-card: var(--uf-card);
          --bg-elevated: var(--uf-surface);
          --border: var(--uf-border);
          --border-light: var(--uf-border-2);
          --text: var(--uf-ink);
          --text-muted: var(--uf-ink-2);
          --text-dim: var(--uf-ink-3);
          --accent: var(--uf-green);
          --accent-dim: var(--uf-green-50);
          --accent-glow: rgba(34,211,165,0.24);
          --teal: var(--uf-teal);
          --teal-bright: var(--uf-green-700);
          --teal-dim: var(--uf-teal-soft);
          --danger: var(--uf-neg);
          --purple: #a78bfa;
          --font-display: 'Manrope', sans-serif;
          --font-body: 'Manrope', sans-serif;
          --font-mono: 'Manrope', sans-serif;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }

        /* -- NAV -- */
        .uf-nav { position: fixed; top: 0; left: 0; right: 0; height: 56px; background: var(--uf-topbar-glass); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 100; backdrop-filter: blur(12px); }
        .uf-nav-logo { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; flex: 0 0 auto; min-width: 0; }
        .uf-nav-logo span { color: var(--teal); }
        .uf-nav-dots { display: flex; gap: 6px; align-items: center; flex: 0 1 auto; min-width: 0; }
        .uf-nav-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: all 0.3s; flex: 0 0 auto; }
        .uf-nav-dot.active { background: var(--accent); width: 24px; border-radius: 4px; }
        .uf-nav-dot.done { background: var(--teal); }
        .uf-nav-actions { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
        .uf-nav-restart { font-size: 13px; color: var(--text-muted); background: none; border: none; cursor: pointer; font-family: var(--font-body); transition: color 0.2s; }
        .uf-nav-restart:hover { color: var(--text); }
        .uf-nav-signin { font-size: 13px; font-weight: 600; color: var(--accent); background: none; border: 1.5px solid var(--border); border-radius: 8px; padding: 6px 14px; cursor: pointer; font-family: var(--font-body); transition: all 0.2s; }
        .uf-nav-signin:hover { border-color: var(--accent); background: var(--accent-dim); }
        .uf-hero-signin { display: block; width: 100%; margin-top: 10px; background: none; border: none; color: rgba(255,255,255,0.5); font-family: var(--font-body); font-size: 14px; cursor: pointer; padding: 8px; transition: color 0.2s; }
        .uf-hero-signin:hover { color: rgba(255,255,255,0.8); }

        /* -- SCREEN -- */
        .uf-page { padding-top: 56px; min-height: 100vh; display: flex; flex-direction: column; align-items: stretch; position: relative; background: var(--bg); }
        .uf-page.uf-page-flush { padding-top: 0; }
        .uf-page-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .uf-atm-orb { position: absolute; border-radius: 50%; filter: blur(120px); will-change: transform, opacity; }
        .uf-atm-orb-1 { width: 600px; height: 600px; top: -100px; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(6,78,59,0.07) 0%, transparent 70%); animation: orbDrift1 14s ease-in-out infinite alternate; }
        .uf-atm-orb-2 { width: 450px; height: 450px; top: 40vh; left: -120px; background: radial-gradient(circle, rgba(32,212,191,0.07) 0%, transparent 70%); animation: orbDrift2 18s ease-in-out 2s infinite alternate; }
        .uf-atm-orb-3 { width: 360px; height: 360px; top: 20vh; right: -100px; background: radial-gradient(circle, rgba(6,78,59,0.05) 0%, transparent 70%); animation: orbDrift3 22s ease-in-out 4s infinite alternate; }
        .uf-screen { width: 100%; max-width: 540px; margin: 0 auto; padding: 40px 24px 24px; position: relative; z-index: 1; }
        .uf-reveal-screen { max-width: 1100px; padding-left: 0; padding-right: 0; padding-top: 0; }
        .uf-section-sep { width: 240px; height: 1px; margin: 0 auto; background: linear-gradient(90deg, transparent, var(--border-light), transparent); position: relative; z-index: 1; }

        /* -- TYPOGRAPHY -- */
        .uf-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
        .uf-h1 { font-family: var(--font-display); font-size: clamp(32px,5vw,52px); font-weight: 800; line-height: 1.05; letter-spacing: -1px; color: var(--text); margin-bottom: 14px; }
        .uf-h2 { font-family: var(--font-display); font-size: clamp(24px,4vw,38px); font-weight: 700; line-height: 1.1; letter-spacing: -0.5px; color: var(--text); margin-bottom: 8px; }
        .uf-accent { color: var(--accent); }
        .uf-body { font-size: 16px; line-height: 1.6; color: var(--text-muted); }
        .uf-mono { font-family: var(--font-mono); }
        .uf-hint { font-size: 11px; color: var(--text-dim); margin-top: 8px; }
        .uf-step-label { font-size: 12px; color: var(--text-muted); margin-bottom: 32px; }

        @media (max-height: 700px) and (min-width: 901px) {
          .uf-screen { padding-top: 4px; z-index: 60; }
          .uf-step-label { margin-bottom: 4px; }
          .uf-h2 { font-size: 30px; }
          .uf-screen .uf-body { margin-bottom: 14px !important; }
          .uf-goals-grid { gap: 8px; margin-bottom: 8px; }
          .uf-goal-card { padding: 10px 12px; }
          .uf-goal-top { margin-bottom: 6px; }
          .uf-nav-row {
            position: fixed;
            left: 50%;
            bottom: 16px;
            transform: translateX(-50%);
            width: min(492px, calc(100vw - 48px));
            margin-top: 0;
            padding: 10px;
            border: 1px solid var(--uf-border);
            border-radius: 18px;
            background: var(--uf-topbar-glass);
            box-shadow: 0 14px 40px rgba(15, 23, 42, 0.14);
            backdrop-filter: blur(12px);
            z-index: 50;
          }
        }

        /* -- WIZARD PROGRESS -- */

        /* -- BUTTONS -- */
        .uf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 28px; border-radius: 8px; font-family: var(--font-body); font-size: 15px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; text-decoration: none; }
        .uf-btn-primary { background: var(--accent); color: #fff; }
        .uf-btn-primary:hover:not(:disabled) { background: var(--teal-bright); transform: translateY(-1px); box-shadow: 0 8px 24px var(--accent-glow); }
        .uf-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .uf-btn-ghost { background: transparent; color: var(--text-muted); border: 1.5px solid var(--border); }
        .uf-btn-ghost:hover { color: var(--text); background: var(--bg-elevated); border-color: var(--text-dim); }
        .uf-btn-teal { background: var(--teal-bright); color: #fff; font-weight: 700; }
        .uf-btn-teal:hover { background: var(--uf-green); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(98,250,227,0.35); }
        .uf-btn-full { width: 100%; }
        .uf-btn-lg { padding: 18px 36px; font-size: 17px; }
        .uf-btn-outline { height: 44px; padding: 0 16px; border-radius: 10px; cursor: pointer; background: var(--bg-card); border: 1px solid var(--border); color: var(--text); font-size: 13px; font-weight: 600; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s, border-color 0.15s; text-decoration: none; justify-content: center; }
        .uf-btn-outline:hover { background: var(--bg-elevated); border-color: var(--text-dim); }
        .uf-btn-dark { height: 44px; padding: 0 20px; border-radius: 10px; background: #003527; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s, transform 0.15s; }
        .uf-btn-dark:hover { background: #065F46; transform: translateY(-1px); }
        .uf-nav-row { margin-top: 32px; display: flex; gap: 12px; }

        /* -- INPUTS -- */
        .uf-label { font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; display: block; letter-spacing: 0.2px; }
        .uf-input { width: 100%; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 8px; padding: 13px 14px; font-family: var(--font-body); font-size: 16px; color: var(--text); outline: none; transition: border-color 0.2s; }
        .uf-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
        .uf-input-mono { font-family: var(--font-mono); font-size: 18px; font-weight: 500; }
        .uf-input-big { padding: 14px 16px; }
        .uf-big-input-wrap { position: relative; display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .uf-input-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 15px; pointer-events: none; }
        .uf-big-prefix { font-size: 18px; font-weight: 500; }
        .uf-search-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .uf-unit { font-size: 14px; color: var(--text-muted); white-space: nowrap; }

        /* -- MODE PILLS -- */
        .uf-mode-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .uf-mode-pill { padding: 7px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted); font-family: var(--font-body); transition: all 0.15s; }
        .uf-mode-pill:hover { border-color: var(--accent); color: var(--accent); }
        .uf-mode-pill.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); font-weight: 700; }

        /* -- RANGE SLIDER -- */
        .uf-slider-wrap { margin: 8px 0; }
        .uf-range { width: 100%; -webkit-appearance: none; height: 4px; border-radius: 2px; background: var(--border); outline: none; cursor: pointer; }
        .uf-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid var(--bg-card); box-shadow: 0 0 0 2px var(--accent); cursor: pointer; }
        .uf-range-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); margin-top: 6px; }

        /* -- DROPDOWN -- */
        .uf-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 6px); background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 12px; max-height: 280px; overflow-y: auto; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2); }
        .uf-dropdown-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: transparent; border: none; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; text-align: left; }
        .uf-dropdown-item:hover { background: var(--bg-elevated); }
        .uf-dropdown-flag { font-size: 18px; line-height: 1; flex-shrink: 0; }
        .uf-dropdown-name { font-size: 14px; color: var(--text); font-weight: 600; }
        .uf-dropdown-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .uf-dropdown-custom { width: 100%; display: flex; align-items: center; gap: 10px; padding: 13px 16px; background: var(--accent-dim); border: none; border-top: 1px solid var(--border); cursor: pointer; transition: background 0.15s; text-align: left; }
        .uf-dropdown-custom:hover { background: rgba(34,211,165,0.18); }
        .uf-dropdown-custom-title { font-size: 14px; color: var(--accent); font-weight: 700; }

        /* -- CUSTOM CITY -- */
        .uf-custom-city { background: var(--accent-dim); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-top: 14px; }
        .uf-custom-row { display: flex; gap: 10px; align-items: center; }

        /* -- CITY INFO -- */
        .uf-city-info { margin-top: 16px; }
        .uf-city-info-label { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
        .uf-info-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; display: flex; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .uf-info-col { flex: 1; padding: 14px 16px; }
        .uf-info-col:not(:last-child) { border-right: 1px solid var(--border); }
        .uf-info-val { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--accent); }
        .uf-info-lab { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-weight: 600; letter-spacing: 0.3px; }
        .uf-info-divider { width: 1px; background: var(--border); }

        /* -- STAT ROW -- */
        .uf-stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 20px; }
        .uf-stat-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
        .uf-stat-val { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text); }
        .uf-stat-lab { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-weight: 600; }

        /* -- CARD -- */
        .uf-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .uf-card-accent { background: var(--accent-dim); border-color: var(--border); }
        .uf-card-head { font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .uf-card-sub { font-size: 13px; color: var(--text-muted); }
        .uf-card-hint { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
        .uf-hourly { font-family: var(--font-mono); font-size: 24px; font-weight: 700; color: var(--accent); margin-top: 4px; }
        .uf-hourly::before { content: '$'; }

        /* -- TAX -- */
        .uf-tax-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 7px; }
        .uf-tax-label { color: var(--text-muted); }
        .uf-tax-divider { border-top: 1px solid var(--border); margin: 6px 0; }

        /* -- PROGRESS BAR -- */
        .uf-progress-track { background: var(--bg-elevated); border-radius: 4px; height: 8px; overflow: hidden; }
        .uf-progress-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .uf-rate-head { display: flex; justify-content: space-between; margin-bottom: 6px; }

        /* -- HERO SCREEN -- */
        .uf-hero {
          width: 100%;
          max-width: none;
          padding: 0;
          position: relative;
          background: #003527;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Two-column inner grid */
        .uf-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1240px;
          width: 100%;
          margin: 0 auto;
          padding: 80px 48px 72px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }

        .uf-hero-content { display: flex; flex-direction: column; gap: 0; }
        .uf-hero .uf-h1 { color: #FFFFFF; letter-spacing: -1.2px; text-align: left; margin-bottom: 16px; }
        .uf-hero .uf-body { color: rgba(255,255,255,0.65); text-align: left; margin-bottom: 28px; }

        /* Hero CTA row */
        .uf-hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
        .uf-btn-ghost-dark { background: transparent; color: rgba(255,255,255,0.65); border: 1.5px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 14px 24px; font-family: var(--font-body); font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .uf-btn-ghost-dark:hover { color: #fff; border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }

        /* Live counter */
        .uf-live-counter { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 11px; margin-bottom: 12px; }
        .uf-live-count { color: var(--teal-bright); font-weight: 700; }
        .uf-live-label { color: rgba(255,255,255,0.35); }

        /* Badge */
        .uf-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; background: rgba(98,250,227,0.12); color: var(--teal-bright); border-radius: 99px; font-size: 11px; font-weight: 700; margin-bottom: 20px; border: 1px solid rgba(98,250,227,0.3); letter-spacing: 0.8px; text-transform: uppercase; align-self: flex-start; }
        .uf-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal-bright); flex-shrink: 0; }

        /* Teal headline span */
        .uf-accent-flame { color: var(--teal-bright); display: inline; }

        /* Power CTA */
        .uf-btn-power { animation: ctaBreath 2.8s ease-in-out infinite; }
        @keyframes ctaBreath {
          0%, 100% { box-shadow: 0 6px 28px rgba(98,250,227,0.18); }
          50%       { box-shadow: 0 10px 48px rgba(98,250,227,0.40), 0 0 0 5px rgba(98,250,227,0.07); }
        }
        .uf-btn-power:hover { animation: none; box-shadow: 0 8px 40px rgba(98,250,227,0.5), 0 0 0 6px rgba(98,250,227,0.12) !important; }

        /* Dashboard preview card */
        .uf-hero-preview { position: relative; z-index: 1; }
        .uf-preview-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 24px; backdrop-filter: blur(4px); }

        /* Stats strip below hero */
        .uf-hero-strip { width: 100%; background: #064E3B; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-around; padding: 20px 48px; }
        .uf-hero-strip-item { text-align: center; }
        .uf-hero-strip-val { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.4px; }
        .uf-hero-strip-lab { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; }

        /* Entrance animations */
        @keyframes heroEnter { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        .uf-hero--mounted .uf-live-counter { animation: heroEnter 0.5s cubic-bezier(0.22,1,0.36,1) 0s both; }
        .uf-hero--mounted .uf-badge        { animation: heroEnter 0.65s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
        .uf-hero--mounted .uf-h1           { animation: heroEnter 0.65s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
        .uf-hero--mounted .uf-body         { animation: heroEnter 0.65s cubic-bezier(0.22,1,0.36,1) 0.32s both; }
        .uf-hero--mounted .uf-hero-ctas    { animation: heroEnter 0.65s cubic-bezier(0.22,1,0.36,1) 0.44s both; }
        .uf-hero--mounted .uf-social-proof { animation: heroEnter 0.55s cubic-bezier(0.22,1,0.36,1) 0.52s both; }
        .uf-hero--mounted .uf-hero-preview { animation: heroEnter 0.70s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
        .uf-hero--mounted .uf-hero-strip   { animation: heroEnter 0.50s cubic-bezier(0.22,1,0.36,1) 0.60s both; }

        /* Social proof */
        .uf-social-proof { display: flex; align-items: center; gap: 12px; }
        .uf-avatars { display: flex; }
        .uf-avatar { width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); margin-left: -6px; }
        .uf-avatar:first-child { margin-left: 0; }
        .uf-proof-text { font-size: 13px; color: rgba(255,255,255,0.5); }
        .uf-proof-text strong { color: rgba(255,255,255,0.8); }

        /* -- GOALS GRID -- */
        .uf-goals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .uf-goal-card { --gc: var(--accent); --gct: var(--accent-dim); display: flex; align-items: flex-start; gap: 12px; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; text-align: left; transition: border-color 0.15s, background 0.15s, transform 0.12s, box-shadow 0.15s; font-family: var(--font-body); }
        .uf-goal-card:hover { border-color: var(--border-hover, #2e2e3a); transform: translateY(-2px); }
        .uf-goal-card.active { border-color: var(--gc); background: var(--gct); box-shadow: 0 8px 26px -14px var(--gc); }
        .uf-goal-ic { width: 40px; height: 40px; flex: none; border-radius: 11px; display: grid; place-items: center; background: var(--gct); border: 1px solid var(--gc); color: var(--gc); transition: all 0.15s; }
        .uf-goal-ic svg { width: 22px; height: 22px; display: block; }
        .uf-goal-card.active .uf-goal-ic { background: var(--gc); border-color: var(--gc); color: #08110f; }
        .uf-goal-tx { flex: 1; min-width: 0; }
        .uf-goal-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .uf-goal-title { font-size: 14px; font-weight: 700; color: var(--text); }
        .uf-goal-desc { display: block; font-size: 12px; color: var(--text-muted); line-height: 1.45; margin-top: 4px; }
        .uf-goal-tick { width: 20px; height: 20px; flex: none; border-radius: 6px; border: 1.6px solid var(--border); display: grid; place-items: center; transition: all 0.15s; }
        .uf-goal-tick svg { width: 12px; height: 12px; color: #08110f; opacity: 0; transform: scale(0.5); transition: all 0.15s; }
        .uf-goal-card.active .uf-goal-tick { background: var(--gc); border-color: var(--gc); }
        .uf-goal-card.active .uf-goal-tick svg { opacity: 1; transform: none; }

        /* Mobile responsive for hero */
        @media(max-width: 900px) {
          .uf-nav { padding: 0 18px; gap: 14px; }
          .uf-nav-dots { margin-left: auto; }
          .uf-nav-actions { display: none; }
          .uf-hero-inner { grid-template-columns: 1fr; padding: 48px 24px 48px; gap: 32px; }
          .uf-hero .uf-h1 { font-size: 36px; }
          .uf-hero-strip { padding: 16px 24px; flex-wrap: wrap; gap: 16px; }
          .uf-goals-grid { grid-template-columns: 1fr; }
          .uf-stat-row { grid-template-columns: 1fr 1fr; }
        }

        @media(max-width: 480px) {
          .uf-nav { justify-content: flex-start; padding: 0 16px; }
          .uf-nav-dots { display: none; }
          .uf-screen { padding: 28px 16px 20px; }
          .uf-hero-inner { padding: 32px 16px 32px; }
          .uf-hero-ctas { display: grid; grid-template-columns: 1fr; width: 100%; gap: 10px; }
          .uf-hero-ctas .uf-btn { width: 100%; min-height: 52px; text-align: center; }
          .uf-mobile-primary-action { order: 0; }
          .uf-hero-strip { padding: 12px 16px; }
          .uf-stat-row { grid-template-columns: 1fr 1fr; }
          .uf-delta-grid { grid-template-columns: 1fr; }
          .uf-wl-inline-form { flex-direction: column; }
          .uf-btn-lg { padding: 16px 24px; min-height: 48px; }
          .uf-nav-row { gap: 8px; }
          .uf-fire-date { font-size: 13px; }
          .uf-cost-years { font-size: 32px; }
        }

        /* -- REVEAL -- */
        .uf-calc-phase { text-align: center; padding: 60px 0; }
        .uf-calc-label { font-size: 13px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
        .uf-calc-steps { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 32px; }
        .uf-calc-step { font-size: 13px; color: var(--text-muted); opacity: 0.3; transition: opacity 0.4s, color 0.4s, font-weight 0.4s; }
        .uf-calc-step.lit { opacity: 1; color: var(--accent); font-weight: 600; }
        .uf-calc-dot { margin: 0 6px; color: var(--border-light); }
        .uf-calc-bar-track { max-width: 320px; margin: 0 auto; background: var(--border); border-radius: 4px; height: 3px; overflow: hidden; }
        .uf-calc-bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.4s ease; }

        .uf-number-phase { animation: resultStageIn 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes resultStageIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

        @keyframes confettiFall {
          0%   { opacity: 0; transform: translate3d(0,-44px,0) rotate(0deg) scale(0.5); }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { opacity: 0; transform: translate3d(var(--x),340px,0) rotate(var(--r)) scale(1.1); }
        }
        @keyframes celebrationPop {
          0% { opacity: 0; transform: translateY(-8px) scale(0.9); }
          70% { opacity: 1; transform: translateY(0) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardLiftIn {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes softGlow {
          0%,100% { box-shadow: 0 14px 35px rgba(6,78,59,0.18), 0 0 0 rgba(159,232,112,0); }
          50% { box-shadow: 0 18px 42px rgba(6,78,59,0.24), 0 0 0 6px rgba(159,232,112,0.13); }
        }
        @keyframes ringDrift {
          0%,100% { opacity: var(--ring-lo, 0.06); transform: scale(1); }
          50%     { opacity: var(--ring-hi, 0.14); transform: scale(1.05); }
        }
        @keyframes chipPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,211,165,0); }
          50%     { box-shadow: 0 0 0 8px rgba(34,211,165,0.14); }
        }
        @keyframes sectionSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes automateShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fireGlow {
          0%   { text-shadow: 0 0 0px rgba(34,211,165,0); }
          40%  { text-shadow: 0 0 48px rgba(34,211,165,0.55), 0 0 80px rgba(34,211,165,0.25); }
          100% { text-shadow: 0 0 28px rgba(34,211,165,0.35); }
        }
        @keyframes revealSlam {
          0%   { opacity: 0; transform: scale(0.55); }
          60%  { opacity: 1; transform: scale(1.08); }
          80%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes pulseBorder {
          0%,100% { box-shadow: 0 0 0 0 rgba(6,78,59,0); }
          50%      { box-shadow: 0 0 0 8px rgba(6,78,59,0.08); }
        }
        .uf-fire-slam { animation: revealSlam 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards, fireGlow 2s ease 0.4s forwards; }
        @keyframes fireLandGlow {
          0%   { text-shadow: 0 0 0 rgba(34,211,165,0); }
          45%  { text-shadow: 0 0 26px rgba(34,211,165,0.6), 0 0 48px rgba(34,211,165,0.28); }
          100% { text-shadow: 0 0 18px rgba(34,211,165,0.38); }
        }
        .uf-fire-landed { animation: fireLandGlow 1.6s ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .uf-fire-landed { animation: none; text-shadow: 0 0 18px rgba(34,211,165,0.34); }
        }
        .uf-reveal-ring { animation: ringDrift var(--ring-dur,16s) ease-in-out var(--ring-delay,0s) infinite; }
        .uf-stage-chip-anim { animation: chipPulse 3s ease-in-out 1.4s infinite; }
        .uf-section-up { animation: sectionSlideUp 0.65s cubic-bezier(0.22,1,0.36,1) var(--su-delay,0s) both; }
        .uf-automate-btn {
          background: linear-gradient(90deg, #22D3A5 0%, #62FAE3 38%, #22D3A5 62%, #1ab896 100%);
          background-size: 200% auto;
          animation: automateShimmer 2.6s linear infinite;
          color: #003527 !important; border: none !important;
        }
        .uf-bridge-hero {
          position: relative;
          overflow: hidden;
          color: #fff;
          border-radius: 22px 22px 0 0;
          padding: clamp(24px, 4vw, 54px);
          background:
            radial-gradient(circle at 88% 0%, rgba(68,221,255,0.26), transparent 30%),
            radial-gradient(circle at 8% 100%, rgba(98,250,227,0.16), transparent 36%),
            linear-gradient(135deg, #071624 0%, #063d32 57%, #03110f 100%);
          isolation: isolate;
        }
        .uf-bridge-aurora {
          position: absolute;
          border-radius: 999px;
          filter: blur(8px);
          pointer-events: none;
          opacity: 0.7;
          z-index: 0;
          animation: bridgeAurora 8s ease-in-out infinite;
        }
        .uf-bridge-aurora-a {
          width: 320px;
          height: 320px;
          right: -110px;
          top: -120px;
          background: radial-gradient(circle, rgba(68,221,255,0.34), transparent 66%);
        }
        .uf-bridge-aurora-b {
          width: 360px;
          height: 360px;
          left: -140px;
          bottom: -180px;
          background: radial-gradient(circle, rgba(98,250,227,0.22), transparent 68%);
          animation-delay: -3s;
        }
        .uf-bridge-gridwash {
          position: absolute;
          inset: -30%;
          background:
            linear-gradient(115deg, transparent 0 44%, rgba(255,255,255,0.12) 47%, transparent 51%),
            repeating-linear-gradient(90deg, transparent 0 32px, rgba(255,255,255,0.045) 33px 34px);
          opacity: 0.45;
          transform: rotate(-8deg);
          pointer-events: none;
          z-index: 0;
          animation: bridgeGridDrift 12s ease-in-out infinite;
        }
        .uf-bridge-inner {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
        }
        .uf-bridge-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          margin-bottom: 24px;
          border: 1px solid rgba(98,250,227,0.28);
          border-radius: 999px;
          background: rgba(98,250,227,0.1);
          color: #62fae3;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .uf-bridge-chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #62fae3;
          box-shadow: 0 0 18px rgba(98,250,227,0.75);
        }
        .uf-bridge-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
          gap: clamp(20px, 3vw, 34px);
          align-items: stretch;
        }
        .uf-bridge-result {
          min-width: 0;
        }
        .uf-bridge-kicker {
          color: rgba(255,255,255,0.58);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .uf-bridge-age-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-top: 10px;
        }
        .uf-bridge-age {
          font-size: clamp(72px, 12vw, 148px);
          line-height: 0.82;
          font-weight: 950;
          letter-spacing: -0.09em;
          text-shadow: 0 24px 70px rgba(0,0,0,0.26);
        }
        .uf-bridge-age-label {
          margin-top: 10px;
          color: rgba(255,255,255,0.72);
          font-size: clamp(16px, 2vw, 21px);
          font-weight: 750;
          letter-spacing: -0.02em;
        }
        .uf-bridge-age-assumed {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 10px;
          padding: 0;
          background: none;
          border: none;
          color: rgba(98,250,227,0.85);
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: -0.01em;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .uf-bridge-age-assumed:hover {
          color: #62fae3;
        }
        .uf-bridge-age-delta {
          display: grid;
          gap: 4px;
          justify-items: end;
          border: 1px solid rgba(98,250,227,0.3);
          border-radius: 999px;
          padding: 10px 14px;
          background: rgba(98,250,227,0.1);
          color: #62fae3;
          font-weight: 900;
          white-space: nowrap;
        }
        .uf-bridge-age-delta small {
          color: rgba(255,255,255,0.55);
          font-size: 11px;
          font-weight: 700;
        }
        .uf-bridge-subline {
          max-width: 660px;
          margin-top: 18px;
          color: rgba(255,255,255,0.7);
          font-size: clamp(14px, 2vw, 18px);
          line-height: 1.5;
        }
        .uf-bridge-runway {
          position: relative;
          height: clamp(150px, 22vw, 250px);
          display: flex;
          align-items: end;
          gap: clamp(8px, 1.2vw, 14px);
          margin-top: clamp(24px, 4vw, 42px);
          padding: clamp(16px, 2vw, 24px) clamp(12px, 2vw, 20px) 14px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          background: rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 60px rgba(0,0,0,0.18);
          overflow: hidden;
        }
        .uf-bridge-scanline {
          position: absolute;
          left: 14px;
          right: 14px;
          top: 50%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(68,221,255,0.95), transparent);
          box-shadow: 0 0 24px rgba(68,221,255,0.65);
          opacity: 0.82;
          animation: bridgeScan 3.1s ease-in-out infinite;
        }
        .uf-bridge-bar {
          position: relative;
          flex: 1;
          min-width: 0;
          border-radius: 10px 10px 4px 4px;
          background: linear-gradient(180deg, #62fae3 0%, #22d3a5 42%, #057a56 100%);
          box-shadow: 0 0 24px rgba(34,211,165,0.32);
          transform-origin: bottom;
          animation: bridgeBarRise 0.72s cubic-bezier(0.22,1,0.36,1) var(--bar-delay,0s) both;
        }
        .uf-bridge-bar.future {
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: none;
        }
        .uf-bridge-runway-labels {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          color: rgba(255,255,255,0.62);
          font-size: 11px;
          font-weight: 750;
        }
        .uf-bridge-runway-labels .muted {
          color: rgba(255,255,255,0.32);
        }
        .uf-bridge-action {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .uf-bridge-target-card,
        .uf-bridge-move-card,
        .uf-bridge-control {
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 22px;
          background: rgba(255,255,255,0.09);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .uf-bridge-target-card {
          padding: 18px;
        }
        .uf-bridge-target-card > span,
        .uf-bridge-move-card > span {
          display: block;
          color: rgba(255,255,255,0.55);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .uf-bridge-target-num {
          margin-top: 8px;
          color: #fff;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.055em;
          font-variant-numeric: tabular-nums;
        }
        .uf-bridge-target-card small {
          display: block;
          margin-top: 9px;
          color: rgba(255,255,255,0.5);
          line-height: 1.4;
        }
        .uf-bridge-move-card {
          padding: 18px;
          background:
            radial-gradient(circle at 88% 12%, rgba(98,250,227,0.10), transparent 30%),
            rgba(255,255,255,0.09);
        }
        .uf-bridge-move-card strong {
          display: block;
          margin-top: 9px;
          color: #62fae3;
          font-size: clamp(22px, 2.6vw, 32px);
          line-height: 0.98;
          letter-spacing: -0.06em;
        }
        .uf-bridge-move-card p {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.68);
          font-size: 13px;
          line-height: 1.45;
        }
        .uf-bridge-control {
          padding: 15px;
          background: rgba(255,255,255,0.92);
          color: #0f172a;
        }
        .uf-bridge-control-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          font-weight: 850;
        }
        .uf-bridge-control-head strong {
          color: #059669;
          white-space: nowrap;
        }
        .uf-bridge-control input {
          width: 100%;
          margin-top: 12px;
          accent-color: #22d3a5;
        }
        .uf-bridge-save {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          border-radius: 16px;
          color: #003527;
          background: linear-gradient(90deg, #62fae3 0%, #62fae3 50%, #22d3a5 100%);
          background-size: 180% auto;
          box-shadow: 0 18px 38px rgba(34,211,165,0.24);
          font-size: 15px;
          font-weight: 950;
          text-decoration: none;
          animation: automateShimmer 3s linear infinite;
        }
        .uf-bridge-trust {
          color: rgba(255,255,255,0.5);
          font-size: 11px;
          font-weight: 700;
          text-align: center;
        }
        @keyframes bridgeBarRise {
          from { opacity: 0; transform: scaleY(0.28) translateY(12px); }
          to { opacity: 1; transform: scaleY(1) translateY(0); }
        }
        @keyframes bridgeScan {
          0%,100% { opacity: 0.35; transform: translateY(-34px); }
          50% { opacity: 1; transform: translateY(34px); }
        }
        @keyframes bridgeAurora {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: 0.55; }
          50% { transform: translate3d(-10px,8px,0) scale(1.08); opacity: 0.85; }
        }
        @keyframes bridgeGridDrift {
          0%,100% { transform: translate3d(-18px,-8px,0) rotate(-8deg); opacity: 0.34; }
          50% { transform: translate3d(18px,10px,0) rotate(-8deg); opacity: 0.5; }
        }
        @keyframes bridgeChartSweep {
          0% { opacity: 0; transform: translateX(-120%) skewX(-12deg); }
          18% { opacity: 0.55; }
          62% { opacity: 0.18; }
          100% { opacity: 0; transform: translateX(120%) skewX(-12deg); }
        }
        @keyframes bridgeMagicFlash {
          0% { filter: drop-shadow(0 0 0 rgba(98,250,227,0)); transform: translateY(0) scale(1); }
          32% { filter: drop-shadow(0 0 22px rgba(98,250,227,0.62)); transform: translateY(-1px) scale(1.025); }
          100% { filter: drop-shadow(0 0 10px rgba(34,211,165,0.22)); transform: translateY(0) scale(1); }
        }
        @keyframes bridgeSurfaceFloat {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-6px,0); }
        }
        .uf-bridge-hero {
          color: #102033;
          border: 1px solid #dbe7df;
          border-radius: 24px 24px 0 0;
          padding: clamp(18px, 3vw, 34px);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,252,249,0.98)),
            radial-gradient(circle at 88% 12%, rgba(34,211,165,0.14), transparent 26%);
          box-shadow: 0 24px 54px rgba(15, 23, 42, 0.08);
        }
        .uf-bridge-aurora,
        .uf-bridge-gridwash {
          display: none;
        }
        .uf-bridge-chip {
          margin-bottom: 18px;
          border-color: #bfe8d4;
          background: #effaf4;
          color: #047857;
          letter-spacing: 0.11em;
        }
        .uf-bridge-chip-dot {
          background: #059669;
          box-shadow: 0 0 0 4px rgba(5,150,105,0.12);
        }
        .uf-bridge-layout {
          grid-template-columns: minmax(260px, 0.8fr) minmax(360px, 1.15fr) minmax(280px, 0.8fr);
          gap: 16px;
          align-items: stretch;
        }
        .uf-bridge-layout::before {
          content: "";
          display: block;
          grid-column: 2;
          grid-row: 1;
          border: 1px solid #dbe7df;
          border-radius: 22px;
          background: linear-gradient(180deg, #ffffff, #f4fbf7);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .uf-bridge-result {
          display: grid;
          align-content: start;
          border: 1px solid #0b4b38;
          border-radius: 22px;
          padding: clamp(18px, 2.5vw, 28px);
          color: #fff;
          background:
            radial-gradient(circle at 90% 12%, rgba(34,211,165,0.18), transparent 32%),
            linear-gradient(145deg, #073f32 0%, #052b24 100%);
          box-shadow: 0 20px 42px rgba(5, 45, 35, 0.18);
        }
        .uf-bridge-kicker {
          color: rgba(255,255,255,0.58);
          font-size: 11px;
          letter-spacing: 0.16em;
        }
        .uf-bridge-age {
          font-size: clamp(64px, 9vw, 116px);
          font-weight: 900;
          text-shadow: none;
        }
        .uf-bridge-age-label {
          color: rgba(255,255,255,0.72);
          font-size: 16px;
          font-weight: 700;
        }
        .uf-bridge-age-delta {
          border-color: rgba(167,243,208,0.38);
          background: rgba(167,243,208,0.12);
          color: #a7f3d0;
        }
        .uf-bridge-subline {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
        }
        .uf-bridge-runway {
          grid-column: 2;
          grid-row: 1;
          align-self: stretch;
          height: auto;
          min-height: 100%;
          margin: 0;
          padding: 34px 24px 28px;
          border-color: transparent;
          background: transparent;
          box-shadow: none;
        }
        .uf-bridge-runway::before {
          content: "Compound runway";
          position: absolute;
          top: 18px;
          left: 24px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }
        .uf-bridge-scanline {
          display: none;
        }
        .uf-bridge-bar {
          border-radius: 9px 9px 3px 3px;
          background: linear-gradient(180deg, #22d3a5 0%, #059669 100%);
          box-shadow: 0 12px 26px rgba(5,150,105,0.2);
        }
        .uf-bridge-bar.future {
          background: #ffffff;
          border: 1px dashed #cbd5e1;
        }
        .uf-bridge-runway-labels {
          grid-column: 2;
          grid-row: 1;
          align-self: end;
          z-index: 2;
          padding: 0 24px 10px;
          margin: 0;
          color: #64748b;
        }
        .uf-bridge-action {
          gap: 10px;
        }
        .uf-bridge-target-card,
        .uf-bridge-move-card,
        .uf-bridge-control {
          border-color: #dbe7df;
          background: #fff;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }
        .uf-bridge-target-card > span,
        .uf-bridge-move-card > span {
          color: #64748b;
          font-size: 10px;
          letter-spacing: 0.13em;
        }
        .uf-bridge-target-num {
          color: #052e24;
          font-size: clamp(28px, 3vw, 38px);
        }
        .uf-bridge-target-card small {
          color: #64748b;
        }
        .uf-bridge-move-card {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .uf-bridge-move-card strong {
          color: #065f46;
          font-size: clamp(21px, 2.2vw, 28px);
          line-height: 1.05;
        }
        .uf-bridge-move-card p {
          color: #475569;
        }
        .uf-bridge-control {
          color: #102033;
        }
        .uf-bridge-save {
          min-height: 50px;
          border-radius: 14px;
          color: #fff;
          background: #052e24;
          box-shadow: 0 14px 28px rgba(5, 46, 36, 0.18);
          animation: none;
        }
        .uf-bridge-trust {
          color: #64748b;
        }
        .uf-bridge-layout {
          grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
          align-items: stretch;
        }
        .uf-bridge-layout::before {
          display: none;
        }
        .uf-bridge-result {
          display: block;
        }
        .uf-bridge-runway {
          height: 230px;
          min-height: 0;
          margin-top: 28px;
          padding: 34px 24px 26px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 20px;
          background: rgba(255,255,255,0.08);
        }
        .uf-bridge-runway::before {
          color: rgba(255,255,255,0.46);
        }
        .uf-bridge-runway-labels {
          display: flex;
          padding: 0;
          margin-top: 10px;
          color: rgba(255,255,255,0.62);
        }
        .uf-screen.uf-reveal-screen {
          width: 100%;
          max-width: none;
          padding: 0;
        }
        .uf-bridge-hero {
          min-height: calc(100svh - 58px);
          display: flex;
          align-items: center;
          border: 0;
          border-radius: 0;
          padding: clamp(34px, 5vw, 84px);
          color: #fff;
          background:
            linear-gradient(90deg, rgba(3,16,14,0.96) 0%, rgba(3,16,14,0.86) 42%, rgba(3,16,14,0.48) 100%),
            radial-gradient(circle at 74% 26%, rgba(34,211,165,0.22), transparent 28%),
            radial-gradient(circle at 86% 78%, rgba(98,250,227,0.10), transparent 34%),
            linear-gradient(135deg, #03100e 0%, #073f32 54%, #0b1b18 100%);
          box-shadow: none;
        }
        .uf-bridge-inner {
          width: min(1320px, 100%);
        }
        .uf-bridge-chip {
          border-color: rgba(167,243,208,0.28);
          background: rgba(167,243,208,0.08);
          color: #a7f3d0;
        }
        .uf-bridge-layout {
          grid-template-columns: minmax(0, 1.48fr) minmax(260px, 0.52fr);
          gap: clamp(28px, 5vw, 72px);
          align-items: center;
        }
        .uf-bridge-result {
          border: 0;
          padding: 0;
          background: transparent;
          box-shadow: none;
        }
        .uf-bridge-kicker {
          color: rgba(255,255,255,0.64);
        }
        .uf-bridge-age {
          font-size: clamp(88px, 13vw, 186px);
          letter-spacing: -0.1em;
        }
        .uf-bridge-age-label {
          font-size: clamp(18px, 2.2vw, 28px);
        }
        .uf-bridge-subline {
          max-width: 700px;
          color: rgba(255,255,255,0.72);
          font-size: clamp(15px, 1.6vw, 20px);
        }
        .uf-bridge-runway {
          display: block;
          height: clamp(250px, 26vw, 360px);
          margin-top: clamp(30px, 5vw, 56px);
          padding: clamp(20px, 2.4vw, 30px);
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045)),
            rgba(255,255,255,0.055);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 30px 80px rgba(0,0,0,0.24);
          backdrop-filter: blur(16px);
        }
        .uf-bridge-runway::before {
          content: none;
        }
        .uf-bridge-runway-copy {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: baseline;
          margin-bottom: 10px;
        }
        .uf-bridge-runway-copy span {
          color: rgba(255,255,255,0.56);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .uf-bridge-runway-copy strong {
          color: #62fae3;
          font-size: clamp(14px, 1.6vw, 18px);
          letter-spacing: -0.02em;
        }
        .uf-bridge-timeline {
          width: 100%;
          height: calc(100% - 54px);
          min-height: 170px;
          overflow: visible;
        }
        .uf-bridge-target-line {
          stroke: rgba(255,255,255,0.24);
          stroke-width: 1.2;
          stroke-dasharray: 3 4;
        }
        .uf-bridge-path-base,
        .uf-bridge-path-boost {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .uf-bridge-path-base {
          stroke: rgba(255,255,255,0.38);
          stroke-width: 2.4;
          stroke-dasharray: 5 5;
        }
        .uf-bridge-path-boost {
          stroke: #22d3a5;
          stroke-width: 4.2;
          filter: drop-shadow(0 0 5px rgba(34,211,165,0.55));
        }
        .uf-bridge-marker-base {
          stroke: rgba(255,255,255,0.24);
          stroke-width: 1;
          stroke-dasharray: 3 4;
        }
        .uf-bridge-marker-boost {
          stroke: rgba(34,211,165,0.72);
          stroke-width: 1.3;
        }
        .uf-bridge-axis-label,
        .uf-bridge-target-label {
          fill: rgba(255,255,255,0.54);
          font-size: 5px;
          font-weight: 800;
        }
        .uf-bridge-axis-label-boost {
          fill: #a7f3d0;
          text-anchor: middle;
        }
        .uf-bridge-axis-label-base {
          text-anchor: end;
        }
        .uf-bridge-runway-legend {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
          font-weight: 700;
        }
        .uf-bridge-runway-legend span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .uf-bridge-runway-legend i {
          display: inline-block;
          width: 22px;
          height: 0;
          border-top: 2px dashed rgba(255,255,255,0.42);
        }
        .uf-bridge-runway-legend i.boost {
          border-top: 3px solid #22d3a5;
        }
        .uf-bridge-action {
          gap: 14px;
        }
        .uf-bridge-target-card,
        .uf-bridge-move-card,
        .uf-bridge-control {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.10);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 60px rgba(0,0,0,0.20);
          backdrop-filter: blur(18px);
        }
        .uf-bridge-target-card > span,
        .uf-bridge-move-card > span {
          color: rgba(255,255,255,0.56);
        }
        .uf-bridge-target-num {
          color: #fff;
        }
        .uf-bridge-target-card small,
        .uf-bridge-move-card p {
          color: rgba(255,255,255,0.62);
        }
        .uf-bridge-move-card {
          background: rgba(5,150,105,0.18);
        }
        .uf-bridge-move-card strong {
          color: #62fae3;
        }
        .uf-bridge-control {
          color: #fff;
          background: rgba(255,255,255,0.12);
        }
        .uf-bridge-control-head strong {
          color: #a7f3d0;
        }
        .uf-bridge-save {
          color: #03221a;
          background: #62fae3;
          box-shadow: 0 18px 40px rgba(98,250,227,0.18);
        }
        .uf-bridge-trust {
          color: rgba(255,255,255,0.54);
        }
        .uf-bridge-timeline,
        .uf-bridge-runway-legend {
          display: none;
        }
        .uf-bridge-runway {
          height: clamp(440px, 42vw, 600px);
          padding: clamp(22px, 3vw, 40px);
        }
        .uf-bridge-big-chart {
          position: relative;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: clamp(22px, 3vw, 36px);
          height: 100%;
          min-height: 0;
        }
        .uf-bridge-chart-head {
          display: block;
        }
        .uf-bridge-runway-copy {
          display: grid;
          gap: 8px;
          align-items: start;
          margin-bottom: 0;
        }
        .uf-bridge-runway-copy strong {
          color: #62fae3;
          font-size: clamp(30px, 4vw, 58px);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }
        .uf-motion-magic {
          display: inline-block;
          background: linear-gradient(90deg, #62fae3 0%, #62fae3 48%, #B8FFE9 68%, #62fae3 100%);
          background-size: 220% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent !important;
          animation: bridgeMagicFlash 1.55s cubic-bezier(0.22,1,0.36,1) 1.05s both, automateShimmer 4.6s linear 1.7s infinite;
          transform-origin: left center;
        }
        .uf-bridge-chart-plot {
          position: relative;
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: clamp(20px, 2.4vw, 30px);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.095), rgba(255,255,255,0.025)),
            radial-gradient(circle at 50% 0%, rgba(98,250,227,0.13), transparent 34%),
            rgba(2, 21, 18, 0.34);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);
        }
        .uf-bridge-chart-sweep {
          position: absolute;
          z-index: 3;
          inset: 28px -28% 38px;
          background: linear-gradient(90deg, transparent 0%, rgba(98,250,227,0.02) 22%, rgba(98,250,227,0.22) 50%, rgba(98,250,227,0.02) 74%, transparent 100%);
          mix-blend-mode: screen;
          pointer-events: none;
          animation: bridgeChartSweep 4.2s cubic-bezier(0.22,1,0.36,1) 1.05s infinite;
        }
        .uf-bridge-chart-plot::before {
          content: "";
          position: absolute;
          inset: 18px 18px 34px;
          border-radius: 22px;
          background:
            linear-gradient(to top, rgba(255,255,255,0.045) 1px, transparent 1px) 0 0 / 100% 33.333%;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.54), rgba(0,0,0,0.12));
          pointer-events: none;
        }
        .uf-bridge-target-rail {
          position: absolute;
          top: 24px;
          left: 22px;
          right: 22px;
          z-index: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(98,250,227,0), rgba(98,250,227,0.5), rgba(98,250,227,0));
        }
        .uf-bridge-column-strip {
          position: absolute;
          inset: 44px 22px 34px;
          z-index: 2;
          display: flex;
          align-items: stretch;
          gap: clamp(2px, 0.42vw, 5px);
        }
        .uf-bridge-column {
          position: relative;
          flex: 1 1 0;
          min-width: 0;
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          gap: 10px;
        }
        .uf-bridge-column-bars {
          position: relative;
          min-height: 0;
          height: 100%;
          transform-origin: bottom center;
          will-change: transform, opacity;
        }
        .uf-bridge-base-column,
        .uf-bridge-plan-column {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          display: block;
          will-change: height;
        }
        .uf-bridge-base-column {
          width: 78%;
          border: 1px solid rgba(255,255,255,0.20);
          border-radius: 999px 999px 4px 4px;
          background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.055));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.13);
          opacity: 0.52;
        }
        .uf-bridge-plan-column {
          z-index: 2;
          width: 58%;
          border-radius: 999px 999px 4px 4px;
          background: linear-gradient(180deg, #62fae3 0%, #22d3a5 38%, #059669 100%);
          box-shadow: 0 18px 34px rgba(34,211,165,0.18), 0 0 22px rgba(98,250,227,0.12), inset 0 1px 0 rgba(255,255,255,0.28);
        }
        .uf-bridge-column.is-future .uf-bridge-base-column {
          opacity: 0.3;
        }
        .uf-bridge-column.is-plan-target .uf-bridge-plan-column,
        .uf-bridge-column.is-base-target .uf-bridge-base-column {
          height: 100% !important;
        }
        .uf-bridge-column.is-base-target .uf-bridge-base-column {
          border-color: rgba(255,255,255,0.34);
          opacity: 0.62;
        }
        .uf-bridge-plan-column::before,
        .uf-bridge-base-column::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(255,255,255,0.26), transparent 38%, rgba(255,255,255,0.08));
          opacity: 0.58;
          pointer-events: none;
        }
        .uf-bridge-chart-flag {
          position: absolute;
          left: 50%;
          top: -2px;
          z-index: 4;
          transform: translate(-50%, -100%);
          padding: 4px 7px;
          border: 0;
          border-radius: 999px;
          background: rgba(98,250,227,0.16);
          color: #62fae3;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: none;
        }
        .uf-bridge-chart-flag.is-base {
          background: rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.42);
        }
        .uf-bridge-age-tick {
          min-height: 11px;
          font-size: 9px;
          font-weight: 850;
          line-height: 1;
          color: rgba(255,255,255,0.36);
          text-align: center;
        }
        .uf-bridge-column.is-plan-target .uf-bridge-age-tick {
          color: #a7f3d0;
          font-weight: 950;
        }
        .uf-bridge-action {
          max-width: 330px;
          justify-self: end;
        }
        .uf-bridge-move-card {
          padding: 24px;
          background: rgba(255,255,255,0.085);
        }
        .uf-bridge-move-card strong {
          font-size: clamp(28px, 3vw, 42px);
          line-height: 0.95;
          letter-spacing: -0.07em;
        }
        .uf-bridge-move-card p {
          max-width: 22ch;
        }

        .uf-fire-hero {
          text-align: center;
          padding: 40px 24px;
          margin-bottom: 28px;
          border-radius: 16px;
          background: radial-gradient(circle at 50% 0%, rgba(98,250,227,0.16), transparent 34%), #003527;
          animation: pulseBorder 2.5s ease 0.8s infinite;
          width: 100%;
          overflow: hidden;
          position: relative;
          isolation: isolate;
        }
        .uf-fire-hero-celebrate { border: 1px solid rgba(159,232,112,0.34); }
        .uf-celebration-pill { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; margin-bottom: 14px; border-radius: 999px; background: rgba(159,232,112,0.14); border: 1px solid rgba(159,232,112,0.28); color: #62FAE3; font-size: 12px; font-weight: 800; letter-spacing: 0.01em; animation: celebrationPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
        .uf-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
        .uf-confetti span {
          position: absolute; top: 8px;
          width: var(--w,8px); height: var(--h,13px);
          border-radius: var(--br,3px);
          animation: confettiFall var(--dur,1.9s) ease-out var(--delay,0s) forwards;
        }
        .uf-confetti span:nth-child(1)  { left:3%;  background:#62FAE3; --x:-280px; --r:-210deg; --delay:.02s; --w:6px;  --h:11px; }
        .uf-confetti span:nth-child(2)  { left:9%;  background:#A7F3D0; --x:-200px; --r:170deg;  --delay:.30s; --br:50%; --w:10px; --h:10px; }
        .uf-confetti span:nth-child(3)  { left:15%; background:#A7F3D0; --x:-140px; --r:-150deg; --delay:.06s; }
        .uf-confetti span:nth-child(4)  { left:21%; background:#22D3A5; --x: -90px; --r:200deg;  --delay:.40s; --br:2px; --w:11px; --h:6px; }
        .uf-confetti span:nth-child(5)  { left:27%; background:#B8FFE9; --x: -44px; --r:-180deg; --delay:.10s; --br:50%; --w:9px;  --h:9px; }
        .uf-confetti span:nth-child(6)  { left:33%; background:#A7F3D0; --x:   8px; --r:160deg;  --delay:.48s; --w:7px;  --h:13px; }
        .uf-confetti span:nth-child(7)  { left:39%; background:#62FAE3; --x:  52px; --r:-200deg; --delay:.14s; --br:2px; --w:12px; --h:6px; }
        .uf-confetti span:nth-child(8)  { left:45%; background:#A7F3D0; --x:  86px; --r:230deg;  --delay:.52s; }
        .uf-confetti span:nth-child(9)  { left:51%; background:#fff;    --x: 108px; --r:-170deg; --delay:.04s; --br:50%; --w:7px;  --h:7px;  --dur:1.6s; }
        .uf-confetti span:nth-child(10) { left:57%; background:#B8FFE9; --x: 134px; --r:190deg;  --delay:.36s; }
        .uf-confetti span:nth-child(11) { left:63%; background:#22D3A5; --x: 164px; --r:-220deg; --delay:.08s; --br:2px; --w:9px;  --h:6px; }
        .uf-confetti span:nth-child(12) { left:69%; background:#A7F3D0; --x: 200px; --r:180deg;  --delay:.44s; --br:50%; --w:11px; --h:11px; }
        .uf-confetti span:nth-child(13) { left:75%; background:#A7F3D0; --x: 238px; --r:-160deg; --delay:.12s; }
        .uf-confetti span:nth-child(14) { left:81%; background:#62FAE3; --x: 268px; --r:200deg;  --delay:.56s; --br:2px; --w:13px; --h:5px; }
        .uf-confetti span:nth-child(15) { left:87%; background:#B8FFE9; --x: 298px; --r:-240deg; --delay:.16s; --br:50%; --w:8px;  --h:8px; }
        .uf-confetti span:nth-child(16) { left:93%; background:#A7F3D0; --x: 320px; --r:170deg;  --delay:.60s; }
        .uf-confetti span:nth-child(17) { left:6%;  background:#22D3A5; --x:-260px; --r:190deg;  --delay:.75s; --br:50%; --w:9px;  --h:9px; }
        .uf-confetti span:nth-child(18) { left:18%; background:#A7F3D0; --x:-160px; --r:-160deg; --delay:.82s; }
        .uf-confetti span:nth-child(19) { left:30%; background:#62FAE3; --x: -70px; --r:210deg;  --delay:.68s; --br:2px; --w:10px; --h:6px; }
        .uf-confetti span:nth-child(20) { left:42%; background:#B8FFE9; --x:  28px; --r:-200deg; --delay:.88s; --br:50%; --w:8px;  --h:8px; }
        .uf-confetti span:nth-child(21) { left:55%; background:#A7F3D0; --x: 118px; --r:170deg;  --delay:.74s; }
        .uf-confetti span:nth-child(22) { left:67%; background:#fff;    --x: 188px; --r:-220deg; --delay:.94s; --br:2px; --w:11px; --h:7px; }
        .uf-confetti span:nth-child(23) { left:79%; background:#22D3A5; --x: 256px; --r:190deg;  --delay:.80s; --br:50%; --w:9px;  --h:9px; }
        .uf-confetti span:nth-child(24) { left:91%; background:#A7F3D0; --x: 308px; --r:-170deg; --delay:1.0s; }
        .uf-fire-hero > *:not(.uf-confetti) { position: relative; z-index: 1; }
        .uf-fire-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--teal-bright); margin-bottom: 18px; }
        .uf-fire-num {
          font-family: var(--font-mono);
          font-size: clamp(32px, 7vw, 72px);
          font-weight: 800;
          letter-spacing: -1px;
          line-height: 1.1;
          color: #FFFFFF;
          width: 100%;
          text-align: center;
          word-break: break-all;
        }
        .uf-fire-date-row { margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 16px; }
        .uf-fire-date-line { height: 1px; flex: 1; max-width: 60px; background: rgba(255,255,255,0.15); }
        .uf-fire-date { font-family: var(--font-mono); font-size: 16px; color: var(--teal-bright); letter-spacing: 0.5px; font-weight: 700; }
        .uf-fire-city { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 8px; }

        .uf-result-milestones { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: -8px 0 16px; animation: cardLiftIn 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .uf-result-milestone { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 10px 12px; border-radius: 999px; background: #FFFFFF; border: 1px solid #E2E8F0; color: #475569; font-size: 12px; font-weight: 800; text-align: center; box-shadow: 0 1px 4px rgba(15,23,42,0.04); }
        .uf-result-milestone-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 999px; background: #ECFDF5; color: #047857; font-size: 12px; flex: 0 0 auto; }
        .uf-result-milestone.active { background: #F7FEE7; border-color: #BEF264; color: #365314; }
        .uf-result-milestone.active .uf-result-milestone-icon { background: #A7F3D0; color: #163300; }
        .uf-benchmark-card, .uf-identity-card { background: #FFFFFF; border: 1px solid #DDEFE3; border-radius: 18px; padding: 18px; margin-bottom: 14px; box-shadow: 0 10px 30px rgba(15,23,42,0.05); animation: cardLiftIn 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
        .uf-benchmark-card { background: linear-gradient(135deg, #F7FEE7 0%, #FFFFFF 72%); border-color: #BEF264; }
        .uf-identity-card { background: linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 72%); border-color: #99F6E4; }
        .uf-insight-kicker { font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.12em; color: #047857; margin-bottom: 8px; }
        .uf-insight-title { font-size: 22px; font-weight: 900; letter-spacing: -0.03em; color: #0F172A; line-height: 1.1; }
        .uf-insight-copy { font-size: 14px; color: #334155; line-height: 1.45; margin-top: 8px; }
        .uf-insight-source { font-size: 11px; color: #64748B; line-height: 1.45; margin-top: 10px; }
        .uf-identity-row { display: flex; align-items: center; gap: 12px; }
        .uf-identity-icon { width: 42px; height: 42px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: #064E3B; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); flex: 0 0 auto; }
        .uf-monthly-move-card { background: linear-gradient(135deg, #064E3B 0%, #047857 100%); border: 1px solid rgba(159,232,112,0.32); border-radius: 18px; padding: 18px 18px 16px; margin-bottom: 16px; color: white; box-shadow: 0 14px 35px rgba(6,78,59,0.18); animation: cardLiftIn 0.6s cubic-bezier(0.22,1,0.36,1) 0.12s both, softGlow 3.2s ease-in-out 0.9s infinite; }

        .uf-cost-card { background: #ECFDF5; border: 1px solid #D1FAE5; border-radius: 14px; padding: 20px 24px; text-align: center; margin-bottom: 20px; }
        .uf-cost-label { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
        .uf-cost-years { font-family: var(--font-display); font-size: 40px; font-weight: 800; color: var(--accent); line-height: 1; }
        .uf-cost-sub { font-size: 12px; color: var(--text-muted); margin-top: 6px; }

        .uf-delta-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-bottom: 20px; }
        .uf-delta-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .uf-delta-card.positive { border-color: #D1FAE5; background: #ECFDF5; }
        .uf-delta-card.negative { border-color: #FECACA; background: #FEF2F2; }
        .uf-delta-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600; }
        .uf-delta-val { font-family: var(--font-mono); font-size: 20px; font-weight: 700; }
        .uf-delta-val.pos { color: var(--accent); }
        .uf-delta-val.neg { color: var(--danger); }

        .uf-disclaimer { text-align: center; font-size: 11px; color: var(--text-dim); margin-top: 14px; }

        /* -- WAITLIST INLINE -- */
        .uf-wl-inline { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-top: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .uf-wl-inline-head { margin-bottom: 12px; }
        .uf-wl-inline-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .uf-wl-inline-sub { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
        .uf-wl-inline-form { display: flex; gap: 8px; }
        .uf-wl-done { display: flex; align-items: center; gap: 12px; background: #ECFDF5; border-color: #D1FAE5; }

/* -- SHARE TRIGGER -- */
        .uf-share-trigger { display: inline-flex; align-items: center; gap: 8px; margin: 18px auto 0; padding: 10px 22px; border-radius: 8px; background: #ECFDF5; border: 1px solid #D1FAE5; color: var(--accent); font-family: var(--font-body); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .uf-share-trigger:hover { background: #D1FAE5; border-color: #047857; transform: translateY(-1px); }

        /* -- SHARE MODAL -- */
        .uf-share-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .uf-share-modal { background: #fff; border: 1px solid var(--border); border-radius: 20px; padding: 32px; width: 100%; max-width: 460px; position: relative; animation: slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 24px 64px rgba(0,0,0,0.12); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .uf-share-close { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--text-muted); font-size: 16px; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s; }
        .uf-share-close:hover { background: var(--bg-elevated); color: var(--text); }
        .uf-share-heading { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 8px; letter-spacing: -0.3px; }
        .uf-share-subheading { font-size: 12px; line-height: 1.45; color: var(--text-muted); margin-bottom: 14px; }
        .uf-share-card-options { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; margin-bottom: 14px; }
        .uf-share-card-option { border: 1px solid var(--border); background: #fff; color: var(--text-muted); border-radius: 10px; padding: 10px 12px; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.18s; }
        .uf-share-card-option:hover { border-color: #047857; color: #047857; }
        .uf-share-card-option.active { background: #ECFDF5; border-color: #047857; color: #064E3B; box-shadow: 0 0 0 3px rgba(5,150,105,0.10); }

        /* Share preview card */
        .uf-share-card { background: #003527; border: none; border-radius: 16px; padding: 26px 24px 20px; margin-bottom: 20px; text-align: center; position: relative; overflow: hidden; }
        .uf-share-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(98,250,227,0.5), transparent); }
        .uf-share-card-brand { display: flex; align-items: center; justify-content: center; gap: 5px; margin-bottom: 18px; }
        .uf-share-card-logo { font-family: var(--font-display); font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: -0.3px; }
        .uf-share-card-logo span { color: var(--teal-bright); }
        .uf-share-card-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--teal-bright); margin-bottom: 10px; }
        .uf-share-card-number { font-family: var(--font-mono); font-size: clamp(30px, 7vw, 46px); font-weight: 800; color: #fff; margin-bottom: 10px; line-height: 1; }
        .uf-share-card-meta { font-family: var(--font-mono); font-size: 12px; color: var(--teal-bright); margin-bottom: 5px; letter-spacing: 0.3px; font-weight: 700; }
        .uf-share-card-city { font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 16px; }
        .uf-share-card-divider { height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 14px; }
        .uf-share-card-url { font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.8px; font-family: var(--font-mono); }
        .uf-share-card-identity { display: grid; gap: 10px; }
        .uf-share-card-avatar-shell { display: flex; justify-content: center; margin-bottom: 4px; }
        .uf-share-card-avatar-stage { width: 190px; max-width: 100%; min-height: 220px; border-radius: 18px; background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); display: flex; align-items: flex-end; justify-content: center; overflow: hidden; margin: 0 auto; }
        .uf-share-card-code { font-family: var(--font-mono); font-size: 26px; font-weight: 800; letter-spacing: 0.24em; color: #62FAE3; margin-left: 0.24em; }
        .uf-share-card-quote { color: rgba(255,255,255,0.82); font-size: 14px; line-height: 1.5; font-style: italic; margin-top: 2px; }
        .uf-share-card-benchmark-stat { display: inline-flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; color: #D1FAE5; font-size: 12px; font-weight: 700; }
        .uf-share-card-benchmark-stat span { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.08); }

        /* Platform share buttons */
        .uf-share-btns { display: flex; flex-direction: column; gap: 9px; }
        .uf-share-btn { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 12px 18px; border-radius: 8px; font-family: var(--font-body); font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.18s; }
        .uf-share-x { background: #0f0f0f; color: #fff; border: 1px solid #222; }
        .uf-share-x:hover { background: #1a1a1a; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
        .uf-share-facebook { background: #1877F2; color: #fff; }
        .uf-share-facebook:hover { background: #1565d8; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(24,119,242,0.35); }
        .uf-share-reddit { background: #FF4500; color: #fff; }
        .uf-share-reddit:hover { background: #e03d00; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,69,0,0.35); }
        .uf-share-linkedin { background: #0A66C2; color: #fff; }
        .uf-share-linkedin:hover { background: #0858ad; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(10,102,194,0.35); }
        .uf-share-whatsapp { background: #25D366; color: #073B1A; }
        .uf-share-whatsapp:hover { background: #1ebe5b; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(37,211,102,0.32); }
        .uf-share-email { background: #FFF7ED; color: #9A3412; border: 1px solid #FED7AA; }
        .uf-share-email:hover { background: #FFEDD5; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(251,146,60,0.22); }
        .uf-share-more { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .uf-share-more:hover { background: #D1FAE5; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(16,185,129,0.20); }
        .uf-share-copy { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }
        .uf-share-copy:hover { color: var(--text); background: #fff; border-color: var(--accent); }

        @media (max-width: 640px) {
          .uf-result-milestones { grid-template-columns: 1fr; gap: 8px; }
          .uf-result-milestone { justify-content: flex-start; border-radius: 14px; min-height: 42px; }
          .uf-celebration-pill { font-size: 11px; padding: 6px 10px; }
          .uf-monthly-move-card { padding: 16px; }
          .uf-share-card-options { grid-template-columns: 1fr; }
          .uf-benchmark-card, .uf-identity-card { padding: 16px; }
          .uf-insight-title { font-size: 20px; }
          .uf-confetti span { width: 6px; height: 10px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .uf-number-phase,
          .uf-fire-slam,
          .uf-fire-hero,
          .uf-celebration-pill,
          .uf-result-milestones,
          .uf-benchmark-card,
          .uf-identity-card,
          .uf-monthly-move-card,
          .uf-confetti span { animation: none !important; }
          .uf-confetti { display: none; }
        }

        /* -- REVEAL DESIGN E LAYOUT -- */
        .uf-reveal-hero-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: clamp(20px, 4vw, 56px);
          align-items: end;
        }
        .uf-reveal-hero-right {
          padding-left: clamp(16px, 3vw, 40px);
          border-left: 1px solid rgba(255,255,255,0.14);
        }
        .uf-chart-move-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 20px;
          align-items: start;
        }
        .uf-identity-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .uf-decision-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        /* card padding adapts across breakpoints */
        .uf-reveal-card { padding: clamp(14px, 2.5vw, 24px); }
        .uf-reveal-continuation {
          --uf-scroll-progress: 0;
          --uf-glow-a-x: 20%;
          --uf-glow-a-y: 18%;
          --uf-glow-b-x: 88%;
          --uf-glow-b-y: 72%;
          position: relative;
          isolation: isolate;
          margin: 0;
          padding: clamp(22px, 4vw, 56px);
          color: #fff;
          background:
            linear-gradient(180deg, rgba(3,16,14,0.98) 0%, rgba(5,43,36,0.98) 44%, rgba(3,16,14,0.98) 100%),
            radial-gradient(circle at 18% 16%, rgba(34,211,165,0.12), transparent 30%),
            radial-gradient(circle at 86% 70%, rgba(98,250,227,0.08), transparent 34%);
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .uf-reveal-continuation::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 0;
          background:
            radial-gradient(circle at var(--uf-glow-a-x) var(--uf-glow-a-y), rgba(98,250,227,0.13), transparent 28%),
            radial-gradient(circle at var(--uf-glow-b-x) var(--uf-glow-b-y), rgba(98,250,227,0.11), transparent 32%);
          opacity: 0.9;
          pointer-events: none;
        }
        .uf-reveal-continuation .uf-identity-grid {
          gap: 16px;
        }
        .uf-reveal-continuation .uf-unified-card,
        .uf-reveal-continuation .uf-assumptions-card {
          color: #fff !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045)),
            rgba(255,255,255,0.055) !important;
          border: 1px solid rgba(255,255,255,0.13) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 28px 64px rgba(0,0,0,0.22) !important;
          backdrop-filter: blur(16px);
        }
        .uf-reveal-continuation .uf-unified-card div,
        .uf-reveal-continuation .uf-unified-card p,
        .uf-reveal-continuation .uf-unified-card span,
        .uf-reveal-continuation .uf-next-step-card div,
        .uf-reveal-continuation .uf-assumptions-card div,
        .uf-reveal-continuation .uf-assumptions-card span {
          color: rgba(255,255,255,0.70) !important;
        }
        .uf-reveal-continuation .uf-unified-card div[style*="text-transform"],
        .uf-reveal-continuation .uf-next-step-card div[style*="text-transform"],
        .uf-reveal-continuation .uf-assumptions-card span[style*="text-transform"] {
          color: #a7f3d0 !important;
        }
        .uf-reveal-continuation .uf-unified-card .uf-unified-stat,
        .uf-reveal-continuation .uf-unified-stat,
        .uf-reveal-continuation .uf-unified-card div[style*="font-size: 30"],
        .uf-reveal-continuation .uf-next-step-card strong,
        .uf-reveal-continuation .uf-assumptions-card strong {
          color: #62fae3 !important;
        }
        .uf-reveal-continuation .uf-unified-card .uf-unified-stat-label,
        .uf-reveal-continuation .uf-unified-stat-label,
        .uf-reveal-continuation .uf-unified-card b {
          color: #fff !important;
        }
        .uf-reveal-continuation .uf-unified-avatar-shell {
          background: rgba(3,16,14,0.58) !important;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10) !important;
        }
        .uf-reveal-continuation .uf-scroll-reveal {
          --uf-reveal-y: 30px;
          --uf-reveal-scale: 0.985;
          --uf-motion-y: 0px;
          opacity: 0;
          transform: translate3d(0, calc(var(--uf-reveal-y) + var(--uf-motion-y)), 0) scale(var(--uf-reveal-scale));
          transition:
            opacity 720ms cubic-bezier(.2,.8,.2,1) var(--uf-reveal-delay, 0ms),
            transform 720ms cubic-bezier(.2,.8,.2,1) var(--uf-reveal-delay, 0ms);
          will-change: opacity, transform;
        }
        .uf-reveal-continuation .uf-scroll-reveal.is-visible {
          --uf-reveal-y: 0px;
          --uf-reveal-scale: 1;
          opacity: 1;
        }
        .uf-motion-depth {
          --uf-motion-y: 0px;
          will-change: transform;
        }
        .uf-reveal-footer-actions.uf-motion-depth,
        .uf-next-step-card.uf-motion-depth {
          transform: translate3d(0, var(--uf-motion-y), 0);
          transition: transform 180ms ease-out;
        }
        .uf-reveal-continuation .uf-unified-avatar-shell {
          animation: bridgeSurfaceFloat 5.2s ease-in-out 0.45s infinite;
        }
        .uf-reveal-continuation .uf-unified-card,
        .uf-reveal-continuation .uf-next-step-card,
        .uf-bridge-move-card,
        .uf-bridge-save,
        .uf-reveal-continuation .uf-btn-outline {
          transition:
            transform 220ms cubic-bezier(0.22,1,0.36,1),
            border-color 220ms ease,
            box-shadow 220ms ease,
            background-position 280ms ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .uf-reveal-continuation .uf-unified-card:hover,
          .uf-bridge-move-card:hover {
            transform: translate3d(0,-6px,0) scale(1.01);
            border-color: rgba(98,250,227,0.28) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 34px 76px rgba(0,0,0,0.3), 0 0 0 1px rgba(98,250,227,0.06) !important;
          }
          .uf-next-step-card.uf-motion-depth:hover {
            transform: translate3d(0, calc(var(--uf-motion-y) - 5px), 0) scale(1.006);
            border-color: rgba(98,250,227,0.28) !important;
          }
          .uf-bridge-save:hover,
          .uf-reveal-continuation .uf-btn-outline:hover {
            transform: translate3d(0,-3px,0);
            box-shadow: 0 22px 52px rgba(34,211,165,0.24);
          }
          .uf-bridge-save:active,
          .uf-reveal-continuation .uf-btn-outline:active {
            transform: translate3d(0,0,0) scale(0.985);
          }
        }
        .uf-reveal-continuation .uf-assumptions-card button {
          color: #fff !important;
          background: rgba(255,255,255,0.025) !important;
        }
        .uf-reveal-continuation .uf-assumptions-card [style*="borderTop"],
        .uf-reveal-continuation .uf-assumptions-card [style*="border-top"] {
          border-color: rgba(255,255,255,0.10) !important;
        }
        .uf-reveal-continuation .uf-geo-section {
          position: relative;
          isolation: isolate;
          margin: clamp(48px, 7vw, 96px) auto 0;
          padding: clamp(26px, 5vw, 58px) 0 clamp(12px, 3vw, 32px);
          overflow: visible;
          border: 0 !important;
        }
        .uf-reveal-continuation .uf-geo-section::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 0 50%;
          width: min(960px, 94vw);
          transform: translateX(-50%);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 48%, rgba(34,211,165,0.22), rgba(34,211,165,0.08) 26%, transparent 60%),
            linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          filter: blur(2px);
          opacity: 0.95;
          pointer-events: none;
        }
        .uf-reveal-continuation .uf-geo-copy {
          position: relative;
          z-index: 2;
          width: min(720px, 100%);
          margin: 0 auto clamp(6px, 1vw, 10px) !important;
        }
        .uf-reveal-continuation .uf-geo-section h2 {
          color: #fff !important;
          font-size: clamp(32px, 5vw, 64px) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.07em !important;
        }
        .uf-reveal-continuation .uf-geo-section p,
        .uf-reveal-continuation .uf-disclaimer {
          color: rgba(255,255,255,0.58) !important;
        }
        .uf-reveal-continuation .uf-geo-stage {
          position: relative;
          z-index: 1;
          width: min(900px, 92vw);
          height: clamp(390px, 42vw, 590px);
          margin: clamp(-12px, -1vw, -4px) auto 0;
          border: 0;
          background:
            radial-gradient(circle at 50% 50%, rgba(98,250,227,0.08), transparent 42%),
            radial-gradient(circle at 50% 58%, rgba(34,211,165,0.10), transparent 48%);
          mask-image: radial-gradient(ellipse 62% 58% at 50% 52%, #000 0 58%, rgba(0,0,0,0.68) 72%, transparent 88%);
        }
        @media (prefers-reduced-motion: reduce) {
          .uf-reveal-continuation .uf-scroll-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .uf-motion-depth,
          .uf-reveal-footer-actions.uf-motion-depth,
          .uf-next-step-card.uf-motion-depth {
            transform: none !important;
          }
          .uf-bridge-aurora,
          .uf-bridge-gridwash,
          .uf-bridge-chart-sweep,
          .uf-motion-magic,
          .uf-reveal-continuation .uf-unified-avatar-shell,
          .uf-bridge-save,
          .uf-automate-btn {
            animation: none !important;
          }
          .uf-bridge-chart-sweep {
            display: none;
          }
        }
        body.uf-result-mode .uf-home-seo-shell {
          display: none !important;
        }
        .uf-method-disclosure {
          width: min(760px, 100%);
          margin: 10px auto 0;
          text-align: center;
          color: rgba(255,255,255,0.42);
          font-size: 12px;
          line-height: 1.45;
        }
        .uf-reveal-continuation .uf-btn-outline {
          color: #62fae3 !important;
          background: rgba(255,255,255,0.07) !important;
          border-color: rgba(98,250,227,0.24) !important;
        }
        .uf-reveal-continuation .uf-btn-outline svg path {
          stroke: #62fae3 !important;
        }
        /* Landing-style reveal polish: calm uf7 palette, no orange/yellow accent family. */
        .uf-bridge-hero {
          background:
            radial-gradient(1100px 700px at 50% 118%, #0a2f22 0%, transparent 60%),
            radial-gradient(820px 560px at 12% -10%, rgba(98,250,227,0.16), transparent 62%),
            #04110c;
          border-radius: 0;
          box-shadow: none;
        }
        .uf-bridge-aurora {
          opacity: 0.28;
          filter: blur(86px);
          animation-duration: 28s;
        }
        .uf-bridge-gridwash {
          opacity: 0.16;
          animation: none;
          background: repeating-linear-gradient(90deg, transparent 0 40px, rgba(255,255,255,0.035) 41px 42px);
        }
        .uf-bridge-chip,
        .uf-bridge-age-delta {
          border-color: rgba(98,250,227,0.28);
          background: rgba(98,250,227,0.09);
          color: #62FAE3;
        }
        .uf-bridge-chip-dot {
          background: #62FAE3;
          box-shadow: 0 0 18px rgba(98,250,227,0.45);
        }
        .uf-bridge-age,
        .uf-bridge-runway-copy strong {
          font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
          font-weight: 400;
          letter-spacing: -0.035em;
          text-shadow: 0 4px 60px rgba(34,211,165,0.24);
        }
        .uf-motion-magic {
          background: none;
          -webkit-background-clip: initial;
          background-clip: initial;
          color: #62FAE3 !important;
          animation: none;
        }
        .uf-bridge-chart-sweep {
          opacity: 0.18;
          animation: none;
          background: linear-gradient(90deg, transparent, rgba(98,250,227,0.16), transparent);
        }
        .uf-bridge-chart-plot,
        .uf-bridge-runway,
        .uf-bridge-move-card,
        .uf-reveal-continuation .uf-unified-card,
        .uf-reveal-continuation .uf-next-step-card,
        .uf-reveal-continuation .uf-assumptions-card {
          border-color: rgba(255,255,255,0.14) !important;
          background: rgba(255,255,255,0.055) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 44px rgba(0,0,0,0.16) !important;
          backdrop-filter: none;
        }
        .uf-bridge-plan-column {
          background: linear-gradient(180deg, #B8FFE9 0%, #62FAE3 36%, #22D3A5 100%);
          box-shadow: 0 14px 28px rgba(34,211,165,0.16), inset 0 1px 0 rgba(255,255,255,0.24);
        }
        .uf-bridge-base-column {
          background: linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0.045));
        }
        .uf-bridge-chart-flag,
        .uf-reveal-continuation .uf-btn-outline {
          color: #62FAE3 !important;
          border-color: rgba(98,250,227,0.24) !important;
          background: rgba(98,250,227,0.08) !important;
        }
        .uf-bridge-save {
          background: linear-gradient(90deg, #B8FFE9, #62FAE3 50%, #22D3A5) !important;
          color: #04110c !important;
          box-shadow: 0 14px 34px rgba(34,211,165,0.22) !important;
          animation: none !important;
        }
        .uf-reveal-continuation {
          background:
            radial-gradient(1100px 700px at 50% -10%, rgba(10,47,34,0.72), transparent 60%),
            #04110c;
        }
        .uf-reveal-continuation::before {
          opacity: 0.42;
          background: radial-gradient(circle at 50% 0%, rgba(98,250,227,0.12), transparent 38%);
        }
        .uf-reveal-continuation .uf-unified-avatar-shell {
          animation: none;
        }
        .uf-reveal-continuation .uf-scroll-reveal {
          --uf-reveal-y: 22px;
          transition-duration: 640ms;
        }
        @media (hover: hover) and (pointer: fine) {
          .uf-reveal-continuation .uf-unified-card:hover,
          .uf-bridge-move-card:hover,
          .uf-next-step-card.uf-motion-depth:hover {
            transform: translate3d(0,-2px,0) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 20px 48px rgba(0,0,0,0.2) !important;
          }
          .uf-bridge-save:hover,
          .uf-reveal-continuation .uf-btn-outline:hover {
            transform: translate3d(0,-2px,0);
            box-shadow: 0 16px 38px rgba(34,211,165,0.20) !important;
          }
        }
        .uf-confetti span:nth-child(odd) { background: #62FAE3 !important; }
        .uf-confetti span:nth-child(even) { background: #A7F3D0 !important; }
        .uf-confetti span:nth-child(3n) { background: #22D3A5 !important; }
        .uf-confetti span:nth-child(5n) { background: #FFFFFF !important; }
        body.uf-result-mode { overflow-x: hidden; }
        @media (max-width: 640px) {
          .uf-reveal-continuation .uf-geo-section { overflow: clip; }
          .uf-reveal-continuation .uf-geo-stage { width: 100%; height: clamp(350px, 92vw, 470px); }
        }
        /* footer buttons row */
        .uf-footer-btns { display: flex; gap: 10px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }

        /* 1024px — decision grid 4→2 col before it gets cramped */
        @media (max-width: 1024px) {
          .uf-decision-grid { grid-template-columns: repeat(2, 1fr); }
        }
        /* 900px — chart stacks above monthly move */
        @media (max-width: 900px) {
          .uf-bridge-layout { grid-template-columns: 1fr; }
          .uf-bridge-layout::before { display: none; }
          .uf-bridge-runway {
            grid-column: auto;
            grid-row: auto;
            height: 460px;
            min-height: 0;
            border: 1px solid rgba(255,255,255,0.13);
            border-radius: 20px;
            background: rgba(255,255,255,0.07);
          }
          .uf-bridge-runway-labels {
            grid-column: auto;
            grid-row: auto;
            padding: 0;
            margin-top: -8px;
          }
          .uf-bridge-action { display: flex; max-width: none; justify-self: stretch; }
          .uf-bridge-save, .uf-bridge-trust { grid-column: 1 / -1; }
          .uf-chart-move-grid { grid-template-columns: 1fr; }
          .uf-decision-grid { grid-template-columns: repeat(2, 1fr); }
        }
        /* 640px — hero stacks, identity stacks */
        @media (max-width: 640px) {
          .uf-bridge-hero { border-radius: 18px 18px 0 0; padding: 22px 16px; }
          .uf-bridge-age-row { display: block; }
          .uf-bridge-age-delta { display: inline-grid; justify-items: start; margin-top: 14px; }
          .uf-bridge-action { display: flex; }
          .uf-bridge-runway { height: 430px; padding: 18px; }
          .uf-bridge-runway-copy { display: block; }
          .uf-bridge-runway-copy strong { display: block; margin-top: 6px; }
          .uf-bridge-chart-head {
            display: grid;
            gap: 12px;
          }
          .uf-bridge-chart-plot { border-radius: 20px; }
          .uf-bridge-chart-plot::before { inset: 18px 10px 36px; }
          .uf-bridge-target-rail { left: 12px; right: 12px; }
          .uf-bridge-column-strip { inset: 52px 10px 34px; gap: 1.5px; }
          .uf-bridge-base-column { width: 82%; border-radius: 999px 999px 3px 3px; }
          .uf-bridge-plan-column { width: 66%; border-radius: 999px 999px 3px 3px; }
          .uf-bridge-chart-flag { padding: 4px 6px; font-size: 8px; letter-spacing: 0.05em; }
          .uf-bridge-age-tick { font-size: 8px; transform: rotate(-32deg); transform-origin: top center; }
          .uf-reveal-hero-grid { grid-template-columns: 1fr; gap: 24px; }
          .uf-reveal-hero-right { padding-left: 0; border-left: none; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.14); }
          .uf-identity-grid { grid-template-columns: 1fr; }
          .uf-decision-grid { grid-template-columns: repeat(2, 1fr); }
          .uf-footer-btns { width: 100%; }
          .uf-footer-btns > * { flex: 1 1 auto; justify-content: center; text-align: center; }
        }
        /* 480px — footer buttons stack to full-width column */
        @media (max-width: 480px) {
          .uf-footer-btns { flex-direction: column; }
          .uf-footer-btns > * { width: 100%; }
          .uf-decision-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
        /* -- FOOTER DIVIDER -- */
      `}</style>

      {screen === "hero" ? (
        <LandingPage onStart={() => setScreen("city")} />
      ) : (
      <>
      {/* The reveal is a full-screen takeover with its own top bar + progress,
          so the app chrome nav is hidden there to avoid a duplicated header. */}
      {screen !== "reveal" && (
        <Nav
          step={STEP_MAP[screen]}
          totalSteps={totalDots}
          onRestart={() => setScreen("hero")}
          onSignIn={signIn}
        />
      )}

      <div className={`uf-page${screen === "reveal" ? " uf-page-flush" : ""}`}>
        <div className="uf-page-bg" aria-hidden="true">
          <div className="uf-atm-orb uf-atm-orb-1" />
          <div className="uf-atm-orb uf-atm-orb-2" />
          <div className="uf-atm-orb uf-atm-orb-3" />
        </div>
        {screen === "city" && (
          <CityScreen
            onNext={c => { setCityState(c); setCurrency(stateToCurrency(c.stateKey)); setScreen("income"); }}
            onBack={() => setScreen("hero")}
            onSkip={() => {
              setCityState({ name: "United States (avg)", col: 52000, stateKey: "custom", isCustom: true });
              setCurrency("USD");
              setScreen("income");
            }}
          />
        )}
        {screen === "income" && (
          <IncomeScreen
            stateKey={cityState?.stateKey ?? "custom"}
            currency={currency}
            onCurrencyChange={setCurrency}
            onNext={inc => { setIncome(inc); setScreen("savings"); }}
            onBack={() => setScreen("city")}
          />
        )}
        {screen === "savings" && (
          <SavingsScreen
            income={income}
            currency={currency}
            onNext={(sav, monthlyExpenses) => {
              setSavings(sav);
              setCityState(prev => ({
                name: prev?.name || "Your current lifestyle",
                col: Math.max(0, monthlyExpenses * 12),
                stateKey: prev?.stateKey || "custom",
                isCustom: prev?.isCustom ?? true,
              }));
              setScreen("portfolio");
            }}
            onBack={() => setScreen("income")}
          />
        )}
        {screen === "portfolio" && (
          <PortfolioScreen
            currency={currency}
            initialPortfolioBalance={portfolioBalance}
            initialAge={currentAge}
            onNext={(p, age) => { setPortfolioBalance(p); setCurrentAge(age); setScreen("reveal"); }}
            onBack={() => setScreen("savings")}
          />
        )}
        {screen === "reveal" && cityState && (
          <RevealScreen
            city={cityState}
            income={income}
            savings={savings}
            stateKey={cityState.stateKey}
            currency={currency}
            currentAge={currentAge}
            portfolioBalance={portfolioBalance}
            landingSource={landingSource}
            onAdjust={() => setScreen("portfolio")}
          />
        )}

      </div>
      </>
      )}
    </>
  );
}
