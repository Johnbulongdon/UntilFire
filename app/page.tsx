"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { saveCalculatorPrefill } from "@/lib/journey";
import { calcFIRE, calcTakeHome, recommendActionsForReveal } from "@/lib/fire";
import NextActions from "@/components/NextActions";
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
import WizardProgress from "@/app/components/landing/WizardProgress";
import HeroScreen from "@/app/components/landing/HeroScreen";
import CityScreen, { type CityState } from "@/app/components/landing/CityScreen";
import { SUPPORTED_CURRENCIES, CURRENCY_NAMES, FALLBACK_RATES, formatUSDInCurrency, getCurrencySymbol, type SupportedCurrency } from "@/lib/currency";

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function fmtUSD(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

type IncomeMode = "annual" | "monthly" | "biweekly" | "hourly" | "takehome";
type ShareCardKind = "identity" | "benchmark";

type FireIdentity = {
  name: string;
  headline: string;
  description: string;
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

const FIRE_STAGES = {
  ignition: {
    index: 0,
    name: "Ignition",
    description: "You're building the foundation. The biggest levers right now are savings rate and income growth.",
  },
  momentum: {
    index: 1,
    name: "Momentum",
    description: "Compounding is doing real work. Stay consistent, widen the gap, and let time do the heavy lifting.",
  },
  "final-stretch": {
    index: 2,
    name: "Final Stretch",
    description: "You're close. Focus shifts from accumulation to protecting what you've built.",
  },
  achieved: {
    index: 3,
    name: "FIRE Achieved",
    description: "The accumulation phase is complete. Focus now is withdrawal strategy and designing the life you want.",
  },
} as const;
type FireStage = keyof typeof FIRE_STAGES;

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

const INCOME_MODES: { key: IncomeMode; label: string; unit: string; hint: string }[] = [
  { key: "annual", label: "Annual", unit: "/yr", hint: "Before-tax yearly salary or compensation." },
  { key: "monthly", label: "Monthly", unit: "/mo", hint: "Gross monthly income before taxes." },
  { key: "biweekly", label: "Bi-weekly", unit: "/check", hint: "Amount per paycheck if paid every 2 weeks." },
  { key: "hourly", label: "Hourly", unit: "/hr", hint: "Hourly gross wage (assuming 40h/week)." },
  { key: "takehome", label: "Take-home", unit: "/mo", hint: "Use the amount that lands in your bank each month." },
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

// -----------------------------------------------------------------------------
// SCREEN 2 — CURRENCY
// -----------------------------------------------------------------------------

const POPULAR_CURRENCIES: SupportedCurrency[] = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "INR", "JPY", "CHF", "NZD"];

// ISO 3166-1 alpha-2 codes for flag images (flagcdn.com)
const CURRENCY_COUNTRY: Partial<Record<SupportedCurrency, string>> = {
  USD:"us", EUR:"eu", GBP:"gb", CAD:"ca", AUD:"au",
  SGD:"sg", INR:"in", JPY:"jp", CHF:"ch", NZD:"nz",
  CNY:"cn", HKD:"hk", KRW:"kr", SEK:"se", NOK:"no",
  DKK:"dk", MYR:"my", THB:"th", IDR:"id", PHP:"ph",
  VND:"vn", TWD:"tw", MXN:"mx", BRL:"br", ZAR:"za",
  AED:"ae", SAR:"sa", TRY:"tr", PLN:"pl", CZK:"cz",
  HUF:"hu", ILS:"il", NGN:"ng", PKR:"pk",
};

const CURRENCY_CONFETTI_COLORS: Record<string, string[]> = {
  USD: ["#B22234","#FFFFFF","#3C3B6E","#B22234","#FFFFFF","#3C3B6E"],
  EUR: ["#003399","#FFCC00","#003399","#FFCC00","#FFFFFF"],
  GBP: ["#CF142B","#FFFFFF","#00247D","#CF142B","#FFFFFF"],
  CAD: ["#FF0000","#FFFFFF","#FF0000","#FFFFFF"],
  AUD: ["#00008B","#FF0000","#FFFFFF","#FFCC00","#00008B"],
  SGD: ["#EF3340","#FFFFFF","#EF3340","#FFFFFF"],
  INR: ["#FF9933","#138808","#FFFFFF","#000080","#FF9933"],
  JPY: ["#BC002D","#FFFFFF","#BC002D","#FFFFFF"],
  CHF: ["#FF0000","#FFFFFF","#FF0000","#FFFFFF"],
  NZD: ["#00247D","#CC142B","#FFFFFF","#000000","#CC142B"],
};
const DEFAULT_CONFETTI_COLORS = ["#62FAE3","#9FE870","#FDE68A","#FCA5A5","#A7F3D0"];

const CONFETTI_POSITIONS = [
  { left:"3%",  x:"-160px", r:"-200deg", delay:"0.00s" },
  { left:"9%",  x:"-100px", r: "170deg", delay:"0.04s" },
  { left:"15%", x: "-60px", r:"-140deg", delay:"0.02s" },
  { left:"21%", x: "-20px", r: "220deg", delay:"0.08s" },
  { left:"27%", x:  "20px", r:"-180deg", delay:"0.04s" },
  { left:"33%", x:  "60px", r: "150deg", delay:"0.10s" },
  { left:"40%", x: "100px", r:"-160deg", delay:"0.02s" },
  { left:"47%", x: "160px", r: "240deg", delay:"0.12s" },
  { left:"53%", x: "-80px", r:"-120deg", delay:"0.06s" },
  { left:"60%", x: "140px", r: "200deg", delay:"0.14s" },
  { left:"67%", x:"-140px", r:"-220deg", delay:"0.04s" },
  { left:"73%", x:  "80px", r: "160deg", delay:"0.08s" },
  { left:"79%", x: "-40px", r: "-80deg", delay:"0.10s" },
  { left:"85%", x: "120px", r: "180deg", delay:"0.16s" },
  { left:"91%", x:"-120px", r:"-240deg", delay:"0.06s" },
  { left:"97%", x:  "40px", r: "130deg", delay:"0.12s" },
];

function CurrencyScreen({ onNext, onBack }: { onNext: (c: SupportedCurrency) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<SupportedCurrency>("USD");
  const [confettiKey, setConfettiKey] = useState(0);
  const [burstCurrency, setBurstCurrency] = useState<SupportedCurrency>("USD");

  const colors = CURRENCY_CONFETTI_COLORS[burstCurrency] ?? DEFAULT_CONFETTI_COLORS;

  // Generate unique per-piece keyframes with x/r values embedded — avoids CSS custom property issues
  const confettiCSS = confettiKey > 0
    ? CONFETTI_POSITIONS.map((pos, i) => `
        @keyframes ccF${confettiKey}x${i} {
          0%   { opacity:0; transform:translate3d(0,-20px,0) rotate(0deg) scale(0.5); }
          8%   { opacity:1; }
          100% { opacity:0; transform:translate3d(${pos.x},100vh,0) rotate(${pos.r}) scale(1.1); }
        }
      `).join("")
    : "";

  return (
    <>
      {confettiKey > 0 && (
        <>
          <style>{confettiCSS}</style>
          <div className="uf-currency-confetti" aria-hidden>
            {CONFETTI_POSITIONS.map((pos, i) => (
              <span
                key={`${confettiKey}-${i}`}
                style={{
                  left: pos.left,
                  background: colors[i % colors.length],
                  animation: `ccF${confettiKey}x${i} 1.35s ease-out ${pos.delay} forwards`,
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="uf-screen">
        <WizardProgress step={2} />
        <p className="uf-step-label">Step 2 of 6</p>
        <div className="uf-eyebrow">Currency</div>
        <h2 className="uf-h2">What currency do you <span className="uf-accent">earn in?</span></h2>
        <p className="uf-body" style={{ marginBottom: 24 }}>
          We&apos;ll let you enter your income and savings in your local currency and convert everything automatically.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
          {POPULAR_CURRENCIES.map(c => (
            <button
              key={c}
              onClick={() => { setSelected(c); setBurstCurrency(c); setConfettiKey(k => k + 1); }}
              className={`uf-currency-btn${selected === c ? " selected" : ""}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                {CURRENCY_COUNTRY[c] && (
                  <img
                    src={`https://flagcdn.com/w20/${CURRENCY_COUNTRY[c]}.png`}
                    srcSet={`https://flagcdn.com/w40/${CURRENCY_COUNTRY[c]}.png 2x`}
                    width={20}
                    height={15}
                    alt=""
                    style={{ borderRadius: 2, objectFit: "cover", display: "block", flexShrink: 0 }}
                  />
                )}
                <span className="uf-currency-code">{c}</span>
              </div>
              <span className="uf-currency-name">{CURRENCY_NAMES[c]}</span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 28 }}>
          <label className="uf-label">Other currencies</label>
          <select
            className="uf-input"
            value={POPULAR_CURRENCIES.includes(selected) ? "" : selected}
            onChange={e => { if (e.target.value) setSelected(e.target.value as SupportedCurrency); }}
          >
            <option value="">Choose from full list…</option>
            {SUPPORTED_CURRENCIES.filter(c => !POPULAR_CURRENCIES.includes(c)).map(c => (
              <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>
            ))}
          </select>
        </div>

        <div className="uf-nav-row">
          <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
          <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} onClick={() => onNext(selected)}>
            Continue with {selected} →
          </button>
        </div>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// SCREEN 3 — INCOME
// -----------------------------------------------------------------------------

function IncomeScreen({ stateKey, currency = "USD", onNext, onBack }: {
  stateKey: string;
  currency?: SupportedCurrency;
  onNext: (income: number) => void;
  onBack: () => void;
}) {
  const isNonUSD = currency !== "USD";
  const isCustomJurisdiction = stateKey === "custom";
  const forceTakeHome = isNonUSD || isCustomJurisdiction;
  const [mode, setMode] = useState<IncomeMode>(forceTakeHome ? "takehome" : "annual");
  const [rawValue, setRawValue] = useState<string>("");
  const [takeHomeRaw, setTakeHomeRaw] = useState<string>("");

  const currSymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;

  const numVal = parseFloat(rawValue) || 0;
  const annualGross = mode === "takehome" ? 0 : toAnnualGross(numVal, mode);
  const monthlyTakeHome = mode === "takehome" ? parseFloat(takeHomeRaw) || 0 : 0;
  const annualTakeHome = monthlyTakeHome * 12;
  const tax = mode !== "takehome" ? calcTakeHome(annualGross, stateKey) : null;

  const displayGross = mode === "takehome" ? null : annualGross;
  const displayTakeHome = mode === "takehome" ? annualTakeHome : (tax?.takeHome ?? 0);
  const displayMonthly = displayTakeHome / 12;
  const displayHourly = displayTakeHome / 2080;
  const displayEffRate = mode === "takehome" ? null : (tax?.effectiveRate ?? 0);

  const incomeForFIRELocal = mode === "takehome" ? annualTakeHome : (tax?.takeHome ?? 0);
  const incomeForFIRE = isNonUSD ? Math.round(incomeForFIRELocal / fxRate) : incomeForFIRELocal;
  const canContinue = mode === "takehome" ? monthlyTakeHome > 0 : annualGross > 0;

  return (
    <div className="uf-screen">
      <WizardProgress step={3} />
      <p className="uf-step-label">Step 3 of 6</p>
      <div className="uf-eyebrow">Income</div>
      <h2 className="uf-h2">What do you <span className="uf-accent">earn?</span></h2>
      <p className="uf-body" style={{ marginBottom: 24 }}>
        Enter however your pay is structured. We&apos;ll handle the conversion.
      </p>

      {!forceTakeHome && (
        <div className="uf-mode-pills">
          {INCOME_MODES.map((m) => (
            <button
              key={m.key}
              className={`uf-mode-pill ${mode === m.key ? "active" : ""}`}
              onClick={() => { setMode(m.key); setRawValue(""); }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      <p className="uf-hint" style={{ marginBottom: 16 }}>
        {isNonUSD
          ? `Non-USD currency: enter your monthly take-home in ${currency}. We'll convert to USD automatically.`
          : isCustomJurisdiction
            ? "Custom city: tax jurisdiction is unknown, so enter your monthly take-home directly."
            : INCOME_MODES.find((m) => m.key === mode)?.hint}
      </p>

      {mode !== "takehome" ? (
        <>
          <label className="uf-label">Gross income</label>
          <div className="uf-big-input-wrap">
            <span className="uf-input-prefix uf-big-prefix">$</span>
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
          <label className="uf-label">Monthly take-home income ({currSymbol})</label>
          <div className="uf-big-input-wrap">
            <span className="uf-input-prefix uf-big-prefix">{currSymbol}</span>
            <input
              type="number"
              className="uf-input uf-input-mono uf-input-big"
              style={{ paddingLeft: 28 }}
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

      <div className="uf-stats-grid" style={{ marginTop: 16 }}>
        {displayGross !== null ? (
          <div className="uf-card">
            <div className="uf-card-sub">Annual gross</div>
            <div className="uf-card-main">{fmtUSD(displayGross)}</div>
          </div>
        ) : null}
        <div className="uf-card">
          <div className="uf-card-sub">Annual take-home</div>
          <div className="uf-card-main">{isNonUSD ? `${currSymbol}${Math.round(displayTakeHome).toLocaleString()}` : fmtUSD(displayTakeHome)}</div>
        </div>
        <div className="uf-card">
          <div className="uf-card-sub">Monthly take-home</div>
          <div className="uf-card-main">{isNonUSD ? `${currSymbol}${Math.round(displayMonthly).toLocaleString()}` : fmtUSD(displayMonthly)}</div>
        </div>
        {displayEffRate !== null ? (
          <div className="uf-card">
            <div className="uf-card-sub">Effective tax rate</div>
            <div className="uf-card-main">{displayEffRate.toFixed(1)}%</div>
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

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} disabled={!canContinue} onClick={() => onNext(incomeForFIRE)}>
          Continue {"->"}
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SCREEN 4 — SAVINGS
// -----------------------------------------------------------------------------

// income is always annual take-home in USD from IncomeScreen
function SavingsScreen({ income, currency = "USD", onNext, onBack }: {
  income: number;
  currency?: SupportedCurrency;
  onNext: (savings: number) => void;
  onBack: () => void;
}) {
  const isNonUSD = currency !== "USD";
  const currSymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;

  const [savings, setSavings] = useState(isNonUSD ? Math.round(1500 * fxRate) : 1500);
  // income arrives in USD; to show savings rate in local currency, convert monthly USD income to local
  const monthlyUSD = income / 12;
  const monthlyLocal = isNonUSD ? monthlyUSD * fxRate : monthlyUSD;
  const rate = monthlyLocal > 0 ? Math.round((savings / monthlyLocal) * 100) : 0;

  const rateColor = rate < 15 ? "var(--danger)" : rate < 30 ? "var(--accent)" : "var(--teal)";
  const rateLabel = rate < 10 ? "Very low" : rate < 20 ? "Below average" : rate < 30 ? "Average"
    : rate < 40 ? "Good" : rate < 50 ? "Strong" : "FIRE pace! 🔥";

  const sliderMax = isNonUSD ? Math.round(10000 * fxRate) : 10000;
  const sliderStep = isNonUSD ? Math.round(100 * fxRate) : 100;

  return (
    <div className="uf-screen">
      <WizardProgress step={4} />
      <p className="uf-step-label">Step 4 of 6</p>
      <div className="uf-eyebrow">Finances</div>
      <h2 className="uf-h2">How much are you <span className="uf-accent">saving?</span></h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Don&apos;t worry about being exact — we&apos;ll help you track real numbers after setup.
      </p>

      <label className="uf-label">Monthly savings amount ({currSymbol})</label>
      <div className="uf-big-input-wrap">
        <span className="uf-input-prefix uf-big-prefix">{currSymbol}</span>
        <input
          type="number"
          className="uf-input uf-input-mono uf-input-big"
          style={{ paddingLeft: 28 }}
          value={savings || ""}
          min={0}
          onChange={e => setSavings(Math.max(0, parseInt(e.target.value) || 0))}
          autoFocus
        />
        <span className="uf-unit">/month</span>
      </div>

      <div className="uf-slider-wrap">
        <input
          type="range" min={0} max={sliderMax} step={sliderStep}
          value={Math.min(savings, sliderMax)}
          className="uf-range"
          onChange={e => setSavings(parseInt(e.target.value))}
        />
        <div className="uf-range-labels">
          <span>{currSymbol}0</span>
          <span>{currSymbol}{Math.round(sliderMax / 2).toLocaleString()}</span>
          <span>{currSymbol}{sliderMax.toLocaleString()}/mo</span>
        </div>
      </div>

      <div className="uf-stat-row">
        <div className="uf-stat-box">
          <div className="uf-stat-val uf-accent">{currSymbol}{savings.toLocaleString()}/mo</div>
          <div className="uf-stat-lab">Monthly savings</div>
        </div>
        <div className="uf-stat-box">
          <div className="uf-stat-val">{rate}%</div>
          <div className="uf-stat-lab">Of take-home income</div>
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
          <span>0%</span><span>20% (Good)</span><span>50%+ (FIRE)</span>
        </div>
      </div>

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} onClick={() => onNext(isNonUSD ? Math.round(savings / fxRate) : savings)}>
          Next →
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PORTFOLIO BALANCE + AGE SCREEN
// -----------------------------------------------------------------------------

function PortfolioScreen({ currency = "USD", onNext, onBack }: {
  currency?: SupportedCurrency;
  onNext: (portfolio: number, age?: number) => void;
  onBack: () => void;
}) {
  const isNonUSD = currency !== "USD";
  const currSymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;

  const [portfolioRaw, setPortfolioRaw] = useState<string>("");
  const [ageRaw, setAgeRaw] = useState<string>("");

  const portfolio = Math.max(0, parseInt(portfolioRaw.replace(/,/g, ""), 10) || 0);
  const parsedAge = (() => {
    const n = parseInt(ageRaw, 10);
    return Number.isFinite(n) && n >= 16 && n <= 90 ? n : undefined;
  })();

  return (
    <div className="uf-screen">
      <WizardProgress step={5} />
      <p className="uf-step-label">Step 5 of 6</p>
      <div className="uf-eyebrow">Finances</div>
      <h2 className="uf-h2">What&apos;s your <span className="uf-accent">current portfolio?</span></h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Include 401(k), IRA, brokerage, and other long-term savings. Estimate is fine. Zero is fine too.
      </p>

      <label className="uf-label">Total invested savings ({currSymbol})</label>
      <div className="uf-big-input-wrap">
        <span className="uf-input-prefix uf-big-prefix">{currSymbol}</span>
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
      <p className="uf-hint">Leave at 0 if you&apos;re starting fresh. Every dollar here compounds and pulls your retirement date earlier.</p>

      <div style={{ marginTop: 24 }}>
        <label className="uf-label" htmlFor="uf-current-age">
          Your current age <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
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
        <p className="uf-hint">We&apos;ll show you exactly which age freedom hits.</p>
      </div>

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} onClick={() => onNext(isNonUSD ? Math.round(portfolio / fxRate) : portfolio, parsedAge)}>
          Show my FIRE number
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
  cityName, fireIdentity, benchmark, onClose,
}: {
  cityName: string;
  fireIdentity: FireIdentity; benchmark: SavingsBenchmark;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ShareCardKind>("identity");

  const cityShort = cityName.split(",")[0] || cityName;
  const shareUrl = `https://untilfire.com/?source=share-${selectedCard}`;
  const benchmarkShareBody = benchmark.savingsRate > benchmark.baselineRate
    ? `My savings rate beats the benchmark in ${cityShort}. Find your freedom date at UntilFire.`
    : `I found my FIRE starting point in ${cityShort}. Find your freedom date at UntilFire.`;
  const shareCards: Record<ShareCardKind, { label: string; title: string; body: string; text: string }> = {
    identity: {
      label: "Card A · FIRE Type",
      title: `I’m a ${fireIdentity.name} 🔥`,
      body: `${fireIdentity.headline} Find your FIRE Type at UntilFire.`,
      text: `I’m a ${fireIdentity.name} 🔥\n${fireIdentity.headline}\nFind your FIRE Type at UntilFire.`,
    },
    benchmark: {
      label: "Card B · Benchmark",
      title: benchmark.headline,
      body: benchmarkShareBody,
      text: `${benchmark.headline}\n${benchmarkShareBody}`,
    },
  };
  const activeShare = shareCards[selectedCard];
  const redditTitle = activeShare.title;

  function copyToClipboard() {
    navigator.clipboard.writeText(`${activeShare.text}\n${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openShare(platform: "x" | "facebook" | "reddit") {
    const encodedText = encodeURIComponent(activeShare.text);
    const encodedUrl = encodeURIComponent(shareUrl);
    const urls = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(redditTitle)}`,
    };
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
        <div className="uf-share-card">
          <div className="uf-share-card-brand">
            <Logo variant="dark" size={20} />
          </div>
          <div className="uf-share-card-label" style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: 11 }}>{selectedCard === "identity" ? "FIRE Type" : "Benchmark"}</div>
          <div className="uf-share-card-number" style={{ fontSize: 28, lineHeight: 1.1 }}>{activeShare.title}</div>
          <div className="uf-share-card-meta" style={{ fontSize: 15, color: '#62FAE3', fontWeight: 800, lineHeight: 1.35 }}>{activeShare.body}</div>
          <div className="uf-share-card-city" style={{ color: 'rgba(255,255,255,0.4)' }}>No exact income · no FIRE number · no freedom date</div>
          <div className="uf-share-card-divider" />
          <div className="uf-share-card-url">Find your freedom date {"->"} untilfire.com</div>
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
// GROWTH BAR CHART
// -----------------------------------------------------------------------------

function GrowthBarChart({
  bars,
  fireTarget,
  fireYear,
  fmtCcy,
}: {
  bars: { year: number; contributions: number; returns: number }[];
  fireTarget: number;
  fireYear: number;
  fmtCcy: (n: number) => string;
}) {
  const W = 600, H = 260, padL = 56, padR = 20, padT = 32, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = Math.max(...bars.map(b => b.contributions + b.returns), fireTarget) * 1.08;
  const yS = (v: number) => padT + innerH - (v / maxVal) * innerH;
  const barCount = bars.length;
  const gap = 5;
  const barW = Math.max(10, (innerW - gap * (barCount - 1)) / barCount);
  const xS = (i: number) => padL + i * (barW + gap);
  const fireY = yS(fireTarget);
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map(f => fireTarget * f);

  const lastBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const lastTotal = lastBar ? lastBar.contributions + lastBar.returns : 0;
  const returnsPct = lastBar && lastTotal > 0 ? Math.round(lastBar.returns / lastTotal * 100) : 0;
  const lastBarCx = bars.length > 0 ? xS(bars.length - 1) + barW / 2 : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={yS(v)} y2={yS(v)} stroke="#F1F5F9" strokeWidth="1" />
          <text x={padL - 8} y={yS(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#94A3B8" fontWeight="600">
            {v === 0 ? "$0" : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}k`}
          </text>
        </g>
      ))}

      {/* FIRE target line */}
      <line x1={padL} x2={W - padR} y1={fireY} y2={fireY} stroke="#059669" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
      <text x={padL + 4} y={fireY - 6} fontSize="9" fontWeight="700" fill="#059669" letterSpacing="0.04em">
        FIRE · {fmtCcy(fireTarget)}
      </text>

      {/* Stacked bars */}
      {bars.map((b, i) => {
        const contribH = Math.max(0, (b.contributions / maxVal) * innerH);
        const returnsH = Math.max(0, (b.returns / maxVal) * innerH);
        const x = xS(i);
        const bottomY = padT + innerH;
        const isLast = i === bars.length - 1;
        return (
          <g key={i}>
            {/* Contributions bar (green, bottom) */}
            <rect x={x} y={bottomY - contribH} width={barW} height={contribH}
              fill={isLast ? "#047857" : "#059669"} rx="2" />
            {/* Returns bar (teal, top) */}
            {returnsH > 0 && (
              <rect x={x} y={bottomY - contribH - returnsH} width={barW} height={returnsH}
                fill={isLast ? "#14B8A6" : "#22D4BF"} rx="2" />
            )}
            {/* X-axis label */}
            <text x={x + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#94A3B8" fontWeight="600">
              {b.year === 0 ? "Now" : `+${b.year}y`}
            </text>
          </g>
        );
      })}

      {/* Last bar annotations */}
      {lastBar && (
        <>
          {/* Dot at FIRE target on last bar */}
          <circle cx={lastBarCx} cy={fireY} r={5} fill="#22D4BF" />
          {/* Retire year label */}
          <text x={lastBarCx} y={yS(lastTotal) - (returnsPct > 0 ? 22 : 6)}
            textAnchor="middle" fontSize="9" fontWeight="700" fill="#0F172A">
            {fireYear}
          </text>
          {/* Returns percentage annotation */}
          {returnsPct > 0 && (
            <text x={lastBarCx} y={yS(lastTotal) - 8}
              textAnchor="middle" fontSize="9" fontWeight="800" fill="#14B8A6">
              {returnsPct}% returns
            </text>
          )}
        </>
      )}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// SCREEN 4 -REVEAL
// -----------------------------------------------------------------------------

function useCountUp(target: number, duration: number, running: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    function ease(t: number) { return 1 - Math.pow(1 - t, 4); }
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      setVal(Math.round(ease(t) * target));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration, running]);
  return val;
}

function RevealScreen({ city, income, savings, stateKey, currency = "USD", currentAge, portfolioBalance = 0, landingSource, onAdjust }: {
  city: CityState; income: number; savings: number; stateKey: string;
  currency?: SupportedCurrency;
  currentAge?: number; portfolioBalance?: number;
  landingSource?: string;
  onAdjust: () => void;
}) {
  const result = calcFIRE(savings, city.col, currentAge, portfolioBalance);
  const { takeHome } = calcTakeHome(income, stateKey);
  const fmtCcy = (usd: number) => formatUSDInCurrency(usd, currency, FALLBACK_RATES);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const currSymbol = getCurrencySymbol(currency);
  const router = useRouter();
  const revealActions = useMemo(
    () =>
      recommendActionsForReveal({
        monthlyIncome: Math.round(takeHome / 12),
        monthlySavings: savings,
        annualCostOfLiving: city.col,
        fireYears: result.years,
        currentAge,
      }),
    [takeHome, savings, city.col, result.years, currentAge],
  );
  const topRevealAction = revealActions[0] ?? null;

  // Phase 1: calculating steps
  const [calcPhase, setCalcPhase] = useState(true);
  const [activeSteps, setActiveSteps] = useState<number[]>([]);
  const [barPct, setBarPct] = useState(0);

  // Phase 2: number reveal
  const [counting, setCounting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const numRef = useRef<HTMLDivElement>(null);

  const counted = useCountUp(result.fireTarget, 2200, counting);

  // Run calculating sequence
  useEffect(() => {
    setCalcPhase(true);
    setActiveSteps([]);
    setBarPct(0);
    setCounting(false);
    setRevealed(false);

    const calcSteps = [0, 1, 2, 3];
    calcSteps.forEach((i) => {
      setTimeout(() => {
        setActiveSteps(prev => [...prev, i]);
        setBarPct(((i + 1) / calcSteps.length) * 85);
      }, i * 620);
    });
    setTimeout(() => {
      setBarPct(100);
    }, calcSteps.length * 620);
    setTimeout(() => {
      setCalcPhase(false);
      setCounting(true);
      // Trigger slam animation
      setTimeout(() => {
        numRef.current?.classList.add("uf-fire-slam");
      }, 50);
    }, calcSteps.length * 620 + 800);
  }, []);

  useEffect(() => {
    if (counted >= result.fireTarget && counting) {
      setTimeout(() => setRevealed(true), 300);
    }
  }, [counted, result.fireTarget, counting]);

  // Fire the reveal funnel event exactly once per mount, when the projection
  // is fully settled. Done inside an effect so the event is tied to the
  // user-visible reveal, not the initial render.
  const revealEmitted = useRef(false);
  useEffect(() => {
    if (revealed && !revealEmitted.current) {
      revealEmitted.current = true;
      trackCalculatorRevealed({
        stateKey,
        isCustomCity: city.isCustom,
        fireTarget: result.fireTarget,
        yearsToFire: result.years,
        landingSource,
      });
    }
  }, [revealed, stateKey, city.isCustom, result.fireTarget, result.years, landingSource]);

  // Delta calculations
  const highSaver = calcFIRE((takeHome / 12) * 0.5, city.col, currentAge);
  const costYears = Math.max(0, result.years - highSaver.years).toFixed(1);

  const [extraSavings, setExtraSavings] = useState(500);
  const [diningCutPct, setDiningCutPct] = useState(20);

  const d1 = calcFIRE(savings + city.col * (diningCutPct / 100) / 12, city.col, currentAge);
  const d2 = calcFIRE(savings + 416, city.col, currentAge);
  const d3 = calcFIRE(Math.max(0, savings - income * 0.1 / 12), city.col, currentAge);
  const d4 = calcFIRE(savings + extraSavings, city.col, currentAge);

  const chartBars = useMemo(() => {
    const r = 0.07;
    const totalYears = Math.ceil(result.years);
    const step = Math.max(1, Math.ceil(totalYears / 10));
    const pts: { year: number; contributions: number; returns: number }[] = [];
    for (let t = 0; t <= totalYears; t += step) {
      const grow = Math.pow(1 + r, t);
      const total = portfolioBalance * grow + savings * 12 * (grow - 1) / r;
      const totalContrib = portfolioBalance + savings * 12 * t;
      pts.push({ year: t, contributions: totalContrib, returns: Math.max(0, total - totalContrib) });
    }
    if (pts[pts.length - 1]?.year !== totalYears) {
      const grow = Math.pow(1 + r, totalYears);
      const total = portfolioBalance * grow + savings * 12 * (grow - 1) / r;
      const totalContrib = portfolioBalance + savings * 12 * totalYears;
      pts.push({ year: totalYears, contributions: totalContrib, returns: Math.max(0, total - totalContrib) });
    }
    return pts;
  }, [portfolioBalance, savings, result.years]);

  const monthlyMoveYearsSaved = Math.max(0, result.years - d4.years);
  const monthlyMoveRetireYear = d4.retireYear;
  const monthlyTakeHome = takeHome / 12;
  const savingsBenchmark = getSavingsBenchmark(city.name, savings, monthlyTakeHome);
  const fireIdentity = deriveFireIdentity(savingsBenchmark.savingsRate, portfolioBalance, result.years);
  const fireStage: FireStage = result.years === 0 ? "achieved"
    : result.years <= 5 ? "final-stretch"
    : result.years <= 15 ? "momentum"
    : "ignition";
  const isAlreadyFire = fireStage === "achieved";
  const stageData = FIRE_STAGES[fireStage];

  function fmtDelta(yrs: number): string {
    if (yrs < 1 / 12) return "< 1 month sooner";
    if (yrs < 2) return `${Math.round(yrs * 12)} month${Math.round(yrs * 12) !== 1 ? "s" : ""} sooner`;
    return `${yrs.toFixed(1)} years sooner`;
  }
  const portfolioYearsSaved = portfolioBalance > 0
    ? Math.max(0, calcFIRE(savings, city.col, currentAge, 0).years - result.years)
    : 0;

  const calcLabels = ["City cost-of-living", "After-tax income", "Compound growth at 7%", "25× withdrawal rule"];

  return (
    <div className="uf-screen uf-reveal-screen">
      {showShare && (
          <ShareModal
          cityName={city.name}
          fireIdentity={fireIdentity}
          benchmark={savingsBenchmark}
          onClose={() => setShowShare(false)}
        />
      )}
      {/* PHASE 1 */}
      {calcPhase && (
        <div className="uf-calc-phase">
          <div className="uf-calc-label">Running your projection...</div>
          <div className="uf-calc-steps">
            {calcLabels.map((label, i) => (
              <span key={i} className={`uf-calc-step ${activeSteps.includes(i) ? "lit" : ""}`}>
                {label}
                {i < calcLabels.length - 1 && <span className="uf-calc-dot">·</span>}
              </span>
            ))}
          </div>
          <div className="uf-calc-bar-track">
            <div className="uf-calc-bar-fill" style={{ width: `${barPct}%` }} />
          </div>
        </div>
      )}

      {/* PHASE 2 */}
      {!calcPhase && (
        <div className="uf-number-phase">
          {/* Hero number */}
          <div className={`uf-fire-hero ${revealed ? "uf-fire-hero-celebrate" : ""}`}>
            {revealed && (
              <div className="uf-confetti" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span />
              </div>
            )}
            {revealed && <div className="uf-celebration-pill">🎉 Projection unlocked</div>}
            <div className="uf-fire-eyebrow">Your estimated FIRE number</div>
            <div ref={numRef} className="uf-fire-num">
              {fmtCcy(counted)}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginBottom: 8, fontFamily: "'Manrope', sans-serif" }}>
              Based on the 4% rule: save this amount and live off investment returns without running out of money.
            </div>
            <div className="uf-fire-date-row">
              <div className="uf-fire-date-line" />
              <div className="uf-fire-date">
                <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748B", marginBottom: 4 }}>
                  Your freedom date
                </span>
                {result.age !== undefined ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                      Age {result.age}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 500, letterSpacing: "0.02em" }}>
                      {isAlreadyFire ? `Right now · ${result.retireYear}` : `in ${result.years} year${result.years === 1 ? '' : 's'} · ${result.retireYear}`}
                    </span>
                  </div>
                ) : (
                  isAlreadyFire
                    ? `Work is already optional as of ${result.retireYear}.`
                    : `Work could become optional in ${result.retireYear} (${result.years} year${result.years === 1 ? '' : 's'} from now)`
                )}
              </div>
              <div className="uf-fire-date-line" />
            </div>
            <div className="uf-fire-city">{city.name}</div>
            {revealed && (
              <button className="uf-share-trigger" onClick={() => setShowShare(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share my FIRE Type
              </button>
            )}
          </div>

          {revealed && (
            <>
              <div className="uf-result-milestones" aria-label="Your result summary">
                <div className="uf-result-milestone">
                  <span className="uf-result-milestone-icon">✓</span>
                  <span>FIRE number found</span>
                </div>
                <div className="uf-result-milestone">
                  <span className="uf-result-milestone-icon">✓</span>
                  <span>Freedom date mapped</span>
                </div>
                <div className="uf-result-milestone active">
                  <span className="uf-result-milestone-icon">⚡</span>
                  <span>{isAlreadyFire ? "Next chapter awaits" : "One monthly move ready"}</span>
                </div>
              </div>

              {/* Growth bar chart — contributions vs returns */}
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 20px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#059669", marginBottom: 4 }}>
                      Your path to FIRE
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
                      Compounded at 7% real return
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11, fontWeight: 600, alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#059669", display: "inline-block" }} />
                      Your savings
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#22D4BF", display: "inline-block" }} />
                      Market returns
                    </span>
                  </div>
                </div>
                <GrowthBarChart bars={chartBars} fireTarget={result.fireTarget} fireYear={result.retireYear} fmtCcy={fmtCcy} />
                {chartBars.length > 0 && (() => {
                  const last = chartBars[chartBars.length - 1];
                  const totalFireVal = last.contributions + last.returns;
                  const returnsPct = totalFireVal > 0 ? Math.round(last.returns / totalFireVal * 100) : 0;
                  return returnsPct > 0 ? (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>📈</span>
                      <span style={{ fontSize: 12, color: "#065F46", lineHeight: 1.4 }}>
                        <strong>{returnsPct}% of your FIRE number</strong> comes from market compounding — not from what you saved.{" "}
                        <span style={{ color: "#047857" }}>That&apos;s {fmtCcy(last.returns)} the market added for you.</span>
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Stage indicator */}
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {([0, 1, 2, 3] as const).map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stageData.index ? "#059669" : "#D1FAE5" }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#059669", marginBottom: 4 }}>
                  Stage {stageData.index + 1} of 4 — {stageData.name}
                </div>
                <div style={{ fontSize: 13, color: "#065F46", fontWeight: 500, lineHeight: 1.5 }}>
                  {stageData.description}
                </div>
              </div>

              <div className="uf-benchmark-card">
                <div className="uf-insight-kicker">Savings rate benchmark</div>
                <div className="uf-insight-title">{savingsBenchmark.headline}</div>
                <div className="uf-insight-copy">{savingsBenchmark.detail}</div>
                <div className="uf-insight-source">{savingsBenchmark.source}</div>
              </div>

              <div className="uf-identity-card">
                <div className="uf-insight-kicker">Your FIRE Type</div>
                <div className="uf-identity-row">
                  <div className="uf-identity-icon">🔥</div>
                  <div>
                    <div className="uf-insight-title">{fireIdentity.name}</div>
                    <div className="uf-insight-copy">{fireIdentity.headline}</div>
                  </div>
                </div>
                <div className="uf-insight-source">{fireIdentity.description}</div>
              </div>

              {!isAlreadyFire && (/* Monthly move aha */
              <div className="uf-monthly-move-card">
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#A7F3D0", marginBottom: 8 }}>
                  One monthly move
                </div>
                <div style={{ fontSize: 22, fontWeight: 850, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  Invest {currSymbol}{Math.round(extraSavings * fxRate).toLocaleString()}/mo more and your freedom date moves {monthlyMoveYearsSaved > 0 ? fmtDelta(monthlyMoveYearsSaved) : "closer"}.
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 8, lineHeight: 1.45 }}>
                  At that pace, work could become optional around {monthlyMoveRetireYear}{d4.age !== undefined ? `, at age ${d4.age}` : ""}. Adjust the slider below to find a monthly move that feels realistic.
                </div>
              </div>
              )}

              {!isAlreadyFire && (/* Cost statement */
              <div className="uf-cost-card">
                <div className="uf-cost-label">At your current savings rate, your spending is costing you</div>
                <div className="uf-cost-years">{costYears} years</div>
                <div className="uf-cost-sub">of freedom vs. someone saving 50% of their income</div>
              </div>
              )}

              {!isAlreadyFire && (<>
              {/* Delta grid — interactive */}
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", marginBottom: 10 }}>
                How your decisions change your FIRE date
              </div>
              <div className="uf-delta-grid">
                {portfolioBalance > 0 && portfolioYearsSaved > 0 && (
                  <div className="uf-delta-card positive" style={{ gridColumn: "1 / -1" }}>
                    <div className="uf-delta-label">Your {fmtCcy(portfolioBalance)} head start</div>
                    <div className="uf-delta-val pos">-{portfolioYearsSaved} yr{portfolioYearsSaved !== 1 ? "s" : ""} vs. starting from zero</div>
                  </div>
                )}

                {/* Interactive: dining cut */}
                <div className="uf-delta-card positive">
                  <div className="uf-delta-label">Cut dining out by {diningCutPct}%</div>
                  <div className="uf-delta-val pos">
                    {(result.years - d1.years) > 0 ? fmtDelta(result.years - d1.years) : "< 1 month sooner"}
                  </div>
                  <input
                    type="range" min={5} max={50} step={5} value={diningCutPct}
                    onChange={e => setDiningCutPct(Number(e.target.value))}
                    style={{ width: "100%", marginTop: 10, accentColor: "#059669" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 3 }}>
                    <span>5%</span><span>50%</span>
                  </div>
                </div>

                {/* Interactive: extra savings */}
                <div className="uf-delta-card positive">
                  <div className="uf-delta-label">Save {currSymbol}{Math.round(extraSavings * fxRate).toLocaleString()}/mo more</div>
                  <div className="uf-delta-val pos">
                    {(result.years - d4.years) > 0 ? fmtDelta(result.years - d4.years) : "< 1 month sooner"}
                  </div>
                  <input
                    type="range" min={100} max={2000} step={100} value={extraSavings}
                    onChange={e => setExtraSavings(Number(e.target.value))}
                    style={{ width: "100%", marginTop: 10, accentColor: "#059669" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 3 }}>
                    <span>{currSymbol}{Math.round(100 * fxRate)}</span><span>{currSymbol}{Math.round(2000 * fxRate).toLocaleString()}</span>
                  </div>
                </div>

                {/* Static: pay cut */}
                <div className="uf-delta-card negative">
                  <div className="uf-delta-label">Take a 10% pay cut</div>
                  <div className="uf-delta-val neg">+{(d3.years - result.years).toFixed(1)} yrs delayed</div>
                </div>

                {/* Static: annual bonus */}
                <div className="uf-delta-card positive">
                  <div className="uf-delta-label">Invest your annual bonus</div>
                  <div className="uf-delta-val pos">
                    {(result.years - d2.years) > 0 ? fmtDelta(result.years - d2.years) : "< 1 month sooner"}
                  </div>
                </div>
              </div>
              </>)}

              {!isAlreadyFire && (<div style={{ marginBottom: 18 }}>
                {topRevealAction ? (
                  <div
                    style={{
                      background: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      borderRadius: 14,
                      padding: "14px 16px",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#047857", marginBottom: 6 }}>
                      Recommended next move
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#064E3B", lineHeight: 1.35 }}>
                      {topRevealAction.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#065F46", marginTop: 6 }}>
                      {topRevealAction.rationale}
                    </div>
                  </div>
                ) : null}
                <NextActions
                  actions={revealActions}
                  variant="light"
                  heading="What to do next"
                  subheading="These moves are ranked by projected FIRE-date impact from your current inputs."
                  layout="stack"
                  onAction={() => {
                    saveCalculatorPrefill({
                      monthlyIncome: Math.round(takeHome / 12),
                      monthlySavings: savings,
                      monthlySpendEstimate: Math.max(0, Math.round(takeHome / 12 - savings)),
                      cityName: city.name,
                      stateKey,
                      fireTarget: result.fireTarget,
                      annualCost: city.col,
                      currentAge,
                      portfolioBalance,
                      landingSource,
                    });
                    router.push("/login");
                  }}
                />
              </div>)}

              {/* PRIMARY CTA */}
              <Link
  href="/login"
  className="uf-btn uf-btn-teal uf-btn-full uf-btn-lg"
  style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}
  onClick={() => {
    saveCalculatorPrefill({
      monthlyIncome: Math.round(takeHome / 12),
      monthlySavings: savings,
      monthlySpendEstimate: Math.max(0, Math.round(takeHome / 12 - savings)),
      cityName: city.name,
      stateKey,
      fireTarget: result.fireTarget,
      annualCost: city.col,
      retireYear: result.retireYear,
      generatedAt: new Date().toISOString(),
      currentAge,
      portfolioBalance,
      landingSource,
    });
  }}
>
  Track this in your dashboard
</Link>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="uf-btn uf-btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={onAdjust}>Adjust inputs</button>
              </div>
              <div style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 12,
                color: "#475569",
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                <strong style={{ color: "#064E3B" }}>Private first:</strong> no login required for this estimate, and UntilFire does not store your financial details from this no-login calculator. Projection uses your inputs, a 7% real return assumption, and the 25× / 4% FIRE rule.
              </div>
              <p className="uf-disclaimer">
                Estimate only. Not financial advice. Based on 7% real return (historical S&P500 average after inflation).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// ROOT
// -----------------------------------------------------------------------------

type Screen = "hero" | "city" | "currency" | "income" | "savings" | "portfolio" | "reveal";

export default function Home() {
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
    const sourceFromUrl = normaliseAcquisitionSource(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("source")
        : null,
    );
    const nextSource = sourceFromUrl ?? getAcquisitionSource();
    if (sourceFromUrl) {
      setAcquisitionSource(sourceFromUrl);
    }
    setLandingSourceState(nextSource);
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
      currency: "currency",
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

  const STEP_MAP: Record<Screen, number> = { hero: 0, city: 1, currency: 2, income: 3, savings: 4, portfolio: 5, reveal: 6 };
  const totalDots = 7;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #F7F9FB;
          --bg-hero: #003527;
          --bg-card: #FFFFFF;
          --bg-elevated: #F1F5F9;
          --border: #E2E8F0;
          --border-light: #E2E8F0;
          --text: #19181E;
          --text-muted: #64748B;
          --text-dim: #94A3B8;
          --accent: #064E3B;
          --accent-dim: rgba(6,78,59,0.08);
          --accent-glow: rgba(6,78,59,0.20);
          --teal: #20D4BF;
          --teal-bright: #62FAE3;
          --teal-dim: rgba(32,212,191,0.12);
          --danger: #DC2626;
          --purple: #a78bfa;
          --font-display: 'Manrope', sans-serif;
          --font-body: 'Manrope', sans-serif;
          --font-mono: 'Inter', sans-serif;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }

        /* -- NAV -- */
        .uf-nav { position: fixed; top: 0; left: 0; right: 0; height: 56px; background: rgba(255,255,255,0.95); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 100; backdrop-filter: blur(12px); }
        .uf-nav-logo { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: #064E3B; letter-spacing: -0.5px; }
        .uf-nav-logo span { color: var(--teal); }
        .uf-nav-dots { display: flex; gap: 6px; align-items: center; }
        .uf-nav-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: all 0.3s; }
        .uf-nav-dot.active { background: var(--accent); width: 24px; border-radius: 4px; }
        .uf-nav-dot.done { background: var(--teal); }

        /* -- CURRENCY -- */
        .uf-currency-btn { display: flex; flex-direction: column; align-items: flex-start; padding: 12px 14px; background: #fff; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
        .uf-currency-btn:hover { border-color: var(--accent); background: var(--accent-dim); }
        .uf-currency-btn.selected { border-color: var(--accent); background: var(--accent-dim); box-shadow: 0 0 0 1px var(--accent); }
        .uf-currency-code { font-weight: 800; font-size: 15px; color: var(--text); font-family: var(--font-display); }
        .uf-currency-name { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .uf-currency-confetti { position: fixed; top: 0; left: 0; right: 0; height: 100vh; pointer-events: none; z-index: 200; overflow: hidden; }
        .uf-currency-confetti span { position: absolute; top: 0; width: 8px; height: 13px; border-radius: 3px; }
        .uf-nav-restart { font-size: 13px; color: var(--text-muted); background: none; border: none; cursor: pointer; font-family: var(--font-body); transition: color 0.2s; }
        .uf-nav-restart:hover { color: var(--text); }
        .uf-nav-signin { font-size: 13px; font-weight: 600; color: var(--accent); background: none; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-family: var(--font-body); transition: all 0.2s; }
        .uf-nav-signin:hover { border-color: var(--accent); background: var(--accent-dim); }
        .uf-hero-signin { display: block; width: 100%; margin-top: 10px; background: none; border: none; color: rgba(255,255,255,0.5); font-family: var(--font-body); font-size: 14px; cursor: pointer; padding: 8px; transition: color 0.2s; }
        .uf-hero-signin:hover { color: rgba(255,255,255,0.8); }

        /* -- SCREEN -- */
        .uf-page { padding-top: 56px; min-height: 100vh; display: flex; flex-direction: column; align-items: stretch; position: relative; background: var(--bg); }
        .uf-page-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .uf-atm-orb { position: absolute; border-radius: 50%; filter: blur(120px); will-change: transform, opacity; }
        .uf-atm-orb-1 { width: 600px; height: 600px; top: -100px; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(6,78,59,0.07) 0%, transparent 70%); animation: orbDrift1 14s ease-in-out infinite alternate; }
        .uf-atm-orb-2 { width: 450px; height: 450px; top: 40vh; left: -120px; background: radial-gradient(circle, rgba(32,212,191,0.07) 0%, transparent 70%); animation: orbDrift2 18s ease-in-out 2s infinite alternate; }
        .uf-atm-orb-3 { width: 360px; height: 360px; top: 20vh; right: -100px; background: radial-gradient(circle, rgba(6,78,59,0.05) 0%, transparent 70%); animation: orbDrift3 22s ease-in-out 4s infinite alternate; }
        .uf-screen { width: 100%; max-width: 540px; margin: 0 auto; padding: 40px 24px 24px; position: relative; z-index: 1; }
        .uf-reveal-screen { max-width: 680px; }
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
            border: 1px solid rgba(226, 232, 240, 0.9);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.94);
            box-shadow: 0 14px 40px rgba(15, 23, 42, 0.14);
            backdrop-filter: blur(12px);
            z-index: 50;
          }
        }

        /* -- WIZARD PROGRESS -- */
        .uf-wizard-progress { display: flex; align-items: center; margin-bottom: 8px; }
        .uf-wizard-row { display: flex; align-items: center; flex: 1; }
        .uf-wizard-row:last-child { flex: 0; }
        .uf-wdot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); flex-shrink: 0; transition: all 0.3s; }
        .uf-wdot.done { background: var(--teal); }
        .uf-wdot.active { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
        .uf-wline { flex: 1; height: 2px; background: var(--border); margin: 0 2px; transition: background 0.4s; }
        .uf-wline.done { background: var(--teal); }
        .uf-wline.active { background: var(--accent); }

        /* -- BUTTONS -- */
        .uf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 28px; border-radius: 8px; font-family: var(--font-body); font-size: 15px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; text-decoration: none; }
        .uf-btn-primary { background: var(--accent); color: #fff; }
        .uf-btn-primary:hover:not(:disabled) { background: #065F46; transform: translateY(-1px); box-shadow: 0 8px 24px var(--accent-glow); }
        .uf-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .uf-btn-ghost { background: transparent; color: var(--text-muted); border: 1.5px solid var(--border); }
        .uf-btn-ghost:hover { color: var(--text); background: var(--bg-elevated); border-color: var(--text-dim); }
        .uf-btn-teal { background: var(--teal-bright); color: #003527; font-weight: 700; }
        .uf-btn-teal:hover { background: #4df5d6; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(98,250,227,0.35); }
        .uf-btn-full { width: 100%; }
        .uf-btn-lg { padding: 18px 36px; font-size: 17px; }
        .uf-nav-row { margin-top: 32px; display: flex; gap: 12px; }

        /* -- INPUTS -- */
        .uf-label { font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; display: block; letter-spacing: 0.2px; }
        .uf-input { width: 100%; background: #fff; border: 1.5px solid var(--border); border-radius: 8px; padding: 13px 14px; font-family: var(--font-body); font-size: 16px; color: var(--text); outline: none; transition: border-color 0.2s; }
        .uf-input:focus { border-color: #047857; box-shadow: 0 0 0 3px rgba(6,78,59,0.12); }
        .uf-input-mono { font-family: var(--font-mono); font-size: 18px; font-weight: 500; }
        .uf-input-big { padding: 14px 16px; }
        .uf-big-input-wrap { position: relative; display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .uf-input-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 15px; pointer-events: none; }
        .uf-big-prefix { font-size: 18px; font-weight: 500; }
        .uf-search-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .uf-unit { font-size: 14px; color: var(--text-muted); white-space: nowrap; }

        /* -- MODE PILLS -- */
        .uf-mode-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .uf-mode-pill { padding: 7px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: #fff; color: var(--text-muted); font-family: var(--font-body); transition: all 0.15s; }
        .uf-mode-pill:hover { border-color: #047857; color: var(--accent); }
        .uf-mode-pill.active { background: #ECFDF5; border-color: #047857; color: #065F46; font-weight: 700; }

        /* -- RANGE SLIDER -- */
        .uf-slider-wrap { margin: 8px 0; }
        .uf-range { width: 100%; -webkit-appearance: none; height: 4px; border-radius: 2px; background: var(--border); outline: none; cursor: pointer; }
        .uf-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid #fff; box-shadow: 0 0 0 2px var(--accent); cursor: pointer; }
        .uf-range-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); margin-top: 6px; }

        /* -- DROPDOWN -- */
        .uf-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 6px); background: #fff; border: 1.5px solid var(--border); border-radius: 12px; max-height: 280px; overflow-y: auto; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06); }
        .uf-dropdown-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: transparent; border: none; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; text-align: left; }
        .uf-dropdown-item:hover { background: #F8FAFC; }
        .uf-dropdown-flag { font-size: 18px; line-height: 1; flex-shrink: 0; }
        .uf-dropdown-name { font-size: 14px; color: var(--text); font-weight: 600; }
        .uf-dropdown-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .uf-dropdown-custom { width: 100%; display: flex; align-items: center; gap: 10px; padding: 13px 16px; background: #ECFDF5; border: none; border-top: 1px solid #D1FAE5; cursor: pointer; transition: background 0.15s; text-align: left; }
        .uf-dropdown-custom:hover { background: #D1FAE5; }
        .uf-dropdown-custom-title { font-size: 14px; color: var(--accent); font-weight: 700; }

        /* -- CUSTOM CITY -- */
        .uf-custom-city { background: #ECFDF5; border: 1px solid #D1FAE5; border-radius: 12px; padding: 16px; margin-top: 14px; }
        .uf-custom-row { display: flex; gap: 10px; align-items: center; }

        /* -- CITY INFO -- */
        .uf-city-info { margin-top: 16px; }
        .uf-city-info-label { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
        .uf-info-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; display: flex; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .uf-info-col { flex: 1; padding: 14px 16px; }
        .uf-info-col:not(:last-child) { border-right: 1px solid var(--border); }
        .uf-info-val { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--accent); }
        .uf-info-lab { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-weight: 600; letter-spacing: 0.3px; }
        .uf-info-divider { width: 1px; background: var(--border); }

        /* -- STAT ROW -- */
        .uf-stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 20px; }
        .uf-stat-box { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .uf-stat-val { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text); }
        .uf-stat-lab { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-weight: 600; }

        /* -- CARD -- */
        .uf-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .uf-card-accent { background: #ECFDF5; border-color: #D1FAE5; }
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
        .uf-progress-track { background: #E2E8F0; border-radius: 4px; height: 8px; overflow: hidden; }
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
        .uf-goal-card { background: #fff; border: 1.5px solid var(--border); border-radius: 12px; padding: 18px; cursor: pointer; text-align: left; transition: all 0.15s; font-family: var(--font-body); }
        .uf-goal-card:hover { border-color: var(--accent); background: #ECFDF5; }
        .uf-goal-card.active { border-color: var(--accent); background: #ECFDF5; }
        .uf-goal-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .uf-goal-emoji { font-size: 24px; line-height: 1; }
        .uf-goal-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; transition: all 0.15s; }
        .uf-goal-card.active .uf-goal-radio { border-width: 5px; border-color: var(--accent); }
        .uf-goal-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .uf-goal-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

        /* Mobile responsive for hero */
        @media(max-width: 900px) {
          .uf-hero-inner { grid-template-columns: 1fr; padding: 48px 24px 48px; gap: 32px; }
          .uf-hero-preview { display: none; }
          .uf-hero .uf-h1 { font-size: 36px; }
          .uf-hero-strip { padding: 16px 24px; flex-wrap: wrap; gap: 16px; }
          .uf-goals-grid { grid-template-columns: 1fr; }
          .uf-stat-row { grid-template-columns: 1fr 1fr; }
        }

        @media(max-width: 480px) {
          .uf-screen { padding: 28px 16px 20px; }
          .uf-hero-inner { padding: 32px 16px 32px; }
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
          0% { opacity: 0; transform: translate3d(0,-32px,0) rotate(0deg) scale(0.6); }
          12% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(var(--x),126px,0) rotate(var(--r)) scale(1); }
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

        @keyframes fireGlow {
          0%   { text-shadow: 0 0 0px rgba(6,78,59,0); }
          40%  { text-shadow: 0 0 40px rgba(6,78,59,0.3); }
          100% { text-shadow: 0 0 20px rgba(6,78,59,0.2); }
        }
        @keyframes revealSlam {
          0%   { opacity: 0; transform: scale(0.55); }
          60%  { opacity: 1; transform: scale(1.06); }
          80%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes pulseBorder {
          0%,100% { box-shadow: 0 0 0 0 rgba(6,78,59,0); }
          50%      { box-shadow: 0 0 0 8px rgba(6,78,59,0.08); }
        }
        .uf-fire-slam { animation: revealSlam 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards, fireGlow 1.6s ease 0.5s forwards; }

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
        .uf-celebration-pill { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; margin-bottom: 14px; border-radius: 999px; background: rgba(159,232,112,0.14); border: 1px solid rgba(159,232,112,0.28); color: #D9FFB8; font-size: 12px; font-weight: 800; letter-spacing: 0.01em; animation: celebrationPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
        .uf-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
        .uf-confetti span { position: absolute; top: 18px; left: 50%; width: 7px; height: 12px; border-radius: 3px; background: #9FE870; animation: confettiFall 1.25s ease-out forwards; }
        .uf-confetti span:nth-child(1) { --x: -220px; --r: -180deg; left: 16%; background: #62FAE3; animation-delay: 0.02s; }
        .uf-confetti span:nth-child(2) { --x: -120px; --r: 150deg; left: 30%; background: #A7F3D0; animation-delay: 0.10s; }
        .uf-confetti span:nth-child(3) { --x: -42px; --r: -120deg; left: 43%; background: #FDE68A; animation-delay: 0.04s; }
        .uf-confetti span:nth-child(4) { --x: 34px; --r: 210deg; left: 52%; background: #9FE870; animation-delay: 0.12s; }
        .uf-confetti span:nth-child(5) { --x: 96px; --r: -240deg; left: 60%; background: #62FAE3; animation-delay: 0.06s; }
        .uf-confetti span:nth-child(6) { --x: 156px; --r: 190deg; left: 70%; background: #FCA5A5; animation-delay: 0.14s; }
        .uf-confetti span:nth-child(7) { --x: 212px; --r: -160deg; left: 82%; background: #A7F3D0; animation-delay: 0.08s; }
        .uf-confetti span:nth-child(8) { --x: 250px; --r: 260deg; left: 90%; background: #FDE68A; animation-delay: 0.16s; }
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
        .uf-result-milestone.active .uf-result-milestone-icon { background: #9FE870; color: #163300; }
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

        /* Platform share buttons */
        .uf-share-btns { display: flex; flex-direction: column; gap: 9px; }
        .uf-share-btn { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 12px 18px; border-radius: 8px; font-family: var(--font-body); font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.18s; }
        .uf-share-x { background: #0f0f0f; color: #fff; border: 1px solid #222; }
        .uf-share-x:hover { background: #1a1a1a; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
        .uf-share-facebook { background: #1877F2; color: #fff; }
        .uf-share-facebook:hover { background: #1565d8; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(24,119,242,0.35); }
        .uf-share-reddit { background: #FF4500; color: #fff; }
        .uf-share-reddit:hover { background: #e03d00; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,69,0,0.35); }
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

        /* -- FOOTER DIVIDER -- */
      `}</style>

      <Nav
        step={STEP_MAP[screen]}
        totalSteps={totalDots}
        onRestart={() => setScreen("hero")}
        onSignIn={signIn}
        isDark={screen === "hero"}
      />

      <div className="uf-page">
        <div className="uf-page-bg" aria-hidden="true">
          <div className="uf-atm-orb uf-atm-orb-1" />
          <div className="uf-atm-orb uf-atm-orb-2" />
          <div className="uf-atm-orb uf-atm-orb-3" />
        </div>
        {screen === "hero" && (
          <HeroScreen onStart={() => setScreen("city")} onSignIn={signIn} />
        )}
        {screen === "hero" && (
          <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 24px 32px' }}>
            <a
              href="/fire-type?source=landing-hero-card"
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '18px 20px', textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontSize: 32, flexShrink: 0 }}>🔥</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 3 }}>
                  Not ready to enter numbers yet?
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Take the 2-min FIRE Type quiz to discover your financial independence personality.
                </div>
              </div>
              <div style={{ color: '#22D3A5', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>→</div>
            </a>
          </div>
        )}
        {screen === "city" && (
          <CityScreen
            onNext={c => { setCityState(c); setScreen("currency"); }}
            onBack={() => setScreen("hero")}
          />
        )}
        {screen === "currency" && (
          <CurrencyScreen
            onNext={c => { setCurrency(c); setScreen("income"); }}
            onBack={() => setScreen("city")}
          />
        )}
        {screen === "income" && (
          <IncomeScreen
            stateKey={cityState?.stateKey ?? "custom"}
            currency={currency}
            onNext={inc => { setIncome(inc); setScreen("savings"); }}
            onBack={() => setScreen("currency")}
          />
        )}
        {screen === "savings" && (
          <SavingsScreen
            income={income}
            currency={currency}
            onNext={sav => { setSavings(sav); setScreen("portfolio"); }}
            onBack={() => setScreen("income")}
          />
        )}
        {screen === "portfolio" && (
          <PortfolioScreen
            currency={currency}
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
  );
}
