"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { saveCalculatorPrefill } from "@/lib/journey";
import { calcFIRE, calcTakeHome } from "@/lib/fire";
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

const POPULAR_CURRENCIES: SupportedCurrency[] = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "INR", "JPY", "CHF", "NZD"];

function CurrencyScreen({ onNext, onBack }: { onNext: (currency: SupportedCurrency) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<SupportedCurrency>("USD");

  return (
    <div className="uf-screen">
      <WizardProgress step={1} />
      <p className="uf-step-label">Step 2 of 5</p>
      <div className="uf-eyebrow">Currency</div>
      <h2 className="uf-h2">What currency do you <span className="uf-accent">earn in?</span></h2>
      <p className="uf-body" style={{ marginBottom: 24 }}>
        We&apos;ll use this as your default dashboard currency and convert the calculator inputs automatically.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
        {POPULAR_CURRENCIES.map((currency) => (
          <button
            key={currency}
            type="button"
            onClick={() => setSelected(currency)}
            className={`uf-currency-btn${selected === currency ? " selected" : ""}`}
          >
            <span className="uf-currency-code">{currency}</span>
            <span className="uf-currency-name">{CURRENCY_NAMES[currency]}</span>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 28 }}>
        <label className="uf-label">Other currencies</label>
        <select
          className="uf-input"
          value={POPULAR_CURRENCIES.includes(selected) ? "" : selected}
          onChange={(e) => {
            if (e.target.value) setSelected(e.target.value as SupportedCurrency);
          }}
        >
          <option value="">Choose from full list...</option>
          {SUPPORTED_CURRENCIES.filter((currency) => !POPULAR_CURRENCIES.includes(currency)).map((currency) => (
            <option key={currency} value={currency}>
              {currency} - {CURRENCY_NAMES[currency]}
            </option>
          ))}
        </select>
      </div>

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} onClick={() => onNext(selected)}>
          Continue with {selected} {"->"}
        </button>
      </div>
    </div>
  );
}

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
  const currencySymbol = getCurrencySymbol(currency);
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

  const takeHomeForPlanner = mode === "takehome" ? annualTakeHome : (tax?.takeHome ?? 0);
  const incomeForFIRE = isNonUSD ? Math.round(takeHomeForPlanner / fxRate) : takeHomeForPlanner;
  const canContinue = mode === "takehome" ? monthlyTakeHome > 0 : annualGross > 0;

  return (
    <div className="uf-screen">
      <WizardProgress step={2} />
      <p className="uf-step-label">Step 3 of 5</p>
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
              onClick={() => {
                setMode(m.key);
                setRawValue("");
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      <p className="uf-hint" style={{ marginBottom: 16 }}>
        {isNonUSD
          ? `Non-USD currency: enter your monthly take-home in ${currency}. We'll convert it to USD automatically.`
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
          <label className="uf-label">Monthly take-home income ({currency})</label>
          <div className="uf-big-input-wrap">
            <span className="uf-input-prefix uf-big-prefix">{currencySymbol}</span>
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
          <div className="uf-card-main">
            {isNonUSD ? `${currencySymbol}${Math.round(displayTakeHome).toLocaleString()}` : fmtUSD(displayTakeHome)}
          </div>
        </div>
        <div className="uf-card">
          <div className="uf-card-sub">Monthly take-home</div>
          <div className="uf-card-main">
            {isNonUSD ? `${currencySymbol}${Math.round(displayMonthly).toLocaleString()}` : fmtUSD(displayMonthly)}
          </div>
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
// SCREEN 3 -SAVINGS
// -----------------------------------------------------------------------------

// income is now always annual take-home (already post-tax) from IncomeScreen
function SavingsScreen({ income, currency = "USD", onNext, onBack }: {
  income: number;
  currency?: SupportedCurrency;
  onNext: (savings: number) => void;
  onBack: () => void;
}) {
  const isNonUSD = currency !== "USD";
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const sliderMax = isNonUSD ? Math.round(10000 * fxRate) : 10000;
  const sliderStep = isNonUSD ? Math.max(1, Math.round(100 * fxRate)) : 100;
  const [savings, setSavings] = useState(isNonUSD ? Math.round(1500 * fxRate) : 1500);
  const monthly = income / 12;
  const monthlyLocal = isNonUSD ? monthly * fxRate : monthly;
  const rate = monthlyLocal > 0 ? Math.round((savings / monthlyLocal) * 100) : 0;

  const rateColor = rate < 15 ? "var(--danger)" : rate < 30 ? "var(--accent)" : "var(--teal)";
  const rateLabel = rate < 10 ? "Very low" : rate < 20 ? "Below average" : rate < 30 ? "Average"
    : rate < 40 ? "Good" : rate < 50 ? "Strong" : "FIRE pace!";

  return (
    <div className="uf-screen">
      <WizardProgress step={3} />
      <p className="uf-step-label">Step 4 of 5</p>
      <div className="uf-eyebrow">Finances</div>
      <h2 className="uf-h2">How much are you <span className="uf-accent">saving?</span></h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Don&apos;t worry about being exact -we&apos;ll help you track real numbers after setup.
      </p>

      <label className="uf-label">Monthly savings amount ({currency})</label>
      <div className="uf-big-input-wrap">
        <span className="uf-input-prefix uf-big-prefix">{currencySymbol}</span>
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
          <span>{currencySymbol}0</span><span>{currencySymbol}{Math.round(sliderMax / 2).toLocaleString()}</span><span>{currencySymbol}{sliderMax.toLocaleString()}/mo</span>
        </div>
      </div>

      <div className="uf-stat-row">
        <div className="uf-stat-box">
          <div className="uf-stat-val uf-accent">{currencySymbol}{Math.round(savings).toLocaleString()}/mo</div>
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
          Next {"->"}
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
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const [portfolioRaw, setPortfolioRaw] = useState<string>("");
  const [ageRaw, setAgeRaw] = useState<string>("");

  const portfolioInput = Math.max(0, parseInt(portfolioRaw.replace(/,/g, ""), 10) || 0);
  const portfolio = isNonUSD ? Math.round(portfolioInput / fxRate) : portfolioInput;
  const parsedAge = (() => {
    const n = parseInt(ageRaw, 10);
    return Number.isFinite(n) && n >= 16 && n <= 90 ? n : undefined;
  })();

  return (
    <div className="uf-screen">
      <WizardProgress step={4} />
      <p className="uf-step-label">Step 5 of 5</p>
      <div className="uf-eyebrow">Finances</div>
      <h2 className="uf-h2">What&apos;s your <span className="uf-accent">current portfolio?</span></h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Include 401(k), IRA, brokerage, and other long-term savings. Estimate is fine. Zero is fine too.
      </p>

      <label className="uf-label">Total invested savings ({currency})</label>
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
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} onClick={() => onNext(portfolio, parsedAge)}>
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
  const yMax = data.fireTarget * 1.08;
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
  const result = calcFIRE(savings, city.col, currentAge, portfolioBalance);
  const { takeHome } = calcTakeHome(income, stateKey);

  // Phase 1: calculating steps
  const [calcPhase, setCalcPhase] = useState(true);
  const [activeSteps, setActiveSteps] = useState<number[]>([]);
  const [barPct, setBarPct] = useState(0);

  // Phase 2: number reveal
  const [counting, setCounting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const numRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const belowRef = useRef<HTMLDivElement>(null);

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
    }, calcSteps.length * 620 + 800);
  }, []);

  // GSAP hero entrance + count-up
  useEffect(() => {
    if (!counting || !heroRef.current) return;
    const target = result.fireTarget;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo('[data-gsap="chip"]',       { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.45 })
        .fromTo('[data-gsap="date-label"]', { opacity: 0, y: 14  }, { opacity: 1, y: 0, duration: 0.55 }, "-=0.25")
        .fromTo('[data-gsap="date-date"]',  { opacity: 0, y: 30  }, { opacity: 1, y: 0, duration: 0.7  }, "-=0.4")
        .fromTo('[data-gsap="date-sub"]',   { opacity: 0         }, { opacity: 1,        duration: 0.5  }, "-=0.3")
        .fromTo('[data-gsap="fire-right"]', { opacity: 0, x: 22  }, { opacity: 1, x: 0, duration: 0.65 }, "<-=0.45")
        .fromTo('[data-gsap="milestone"]',  { opacity: 0, y: 8   }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.07 }, "-=0.25");

      const proxy = { val: 0 };
      gsap.to(proxy, {
        val: target,
        duration: 2.0,
        ease: "power4.out",
        delay: 0.35,
        onUpdate() {
          if (numRef.current) numRef.current.textContent = fmtUSD(Math.round(proxy.val));
        },
        onComplete() {
          setTimeout(() => setRevealed(true), 220);
        },
      });
    }, heroRef);
    return () => ctx.revert();
  }, [counting]); // eslint-disable-line react-hooks/exhaustive-deps

  // GSAP below-hero entrance
  useEffect(() => {
    if (!revealed || !belowRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo('[data-gsap="chart-section"]', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.65 })
        .fromTo('[data-gsap="identity-card"]',  { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.1 }, "-=0.3")
        .fromTo('[data-gsap="decision-card"]',  { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06 }, "-=0.25")
        .fromTo('[data-gsap="footer-cta"]',     { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45 }, "-=0.15");
    }, belowRef);
    return () => ctx.revert();
  }, [revealed]);

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

  const [extraSavings, setExtraSavings] = useState(500);

  const d1 = calcFIRE(savings + Math.round(city.col * 0.2 / 12), city.col, currentAge, portfolioBalance);
  const d2 = calcFIRE(savings + 416, city.col, currentAge, portfolioBalance);
  const d3 = calcFIRE(Math.max(0, savings - income * 0.1 / 12), city.col, currentAge, portfolioBalance);
  const d4 = calcFIRE(savings + extraSavings, city.col, currentAge, portfolioBalance);
  const monthlyTakeHome = takeHome / 12;
  const savingsBenchmark = getSavingsBenchmark(city.name, savings, monthlyTakeHome);
  const fireIdentity = deriveFireIdentity(savingsBenchmark.savingsRate, portfolioBalance, result.years);
  const fireStage: FireStage = result.years === 0 ? "achieved"
    : result.years <= 5 ? "final-stretch"
    : result.years <= 15 ? "momentum"
    : "ignition";
  const isAlreadyFire = fireStage === "achieved";
  const stageData = FIRE_STAGES[fireStage];

  const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const fireMonthFull = MONTHS_FULL[Math.max(0, Math.floor((result.years % 1) * 12))];
  const savedYears = Math.max(0, result.years - d4.years);
  const savedY = Math.floor(savedYears);
  const savedM = Math.round((savedYears - savedY) * 12);
  const monthlyMoveLabel = savedY > 0 && savedM > 0 ? `${savedY}y ${savedM}mo` : savedY > 0 ? `${savedY}y` : `${savedM}mo`;
  const newDateLabel = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + Math.round(d4.years * 12));
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  })();
  const yearsLabel = (() => {
    if (result.years < 1) return "less than a year";
    const y = Math.floor(result.years);
    const m = Math.round((result.years % 1) * 12);
    return m > 0 ? `${y}y ${m}mo` : `${y}y`;
  })();
  const extraAtFire = extraSavings * 12 * d4.years * 1.4;
  const extraAtFireLabel = extraAtFire >= 1_000_000 ? `$${(extraAtFire / 1_000_000).toFixed(2)}M` : `$${Math.round(extraAtFire / 1000)}k`;
  const monthlyTakeHomeForBenchmark = takeHome / 12;
  const savingsRatePct = Math.round((savings / (monthlyTakeHomeForBenchmark || 1)) * 100);
  const savingsMultiple = ((savingsRatePct / PUBLIC_SAVINGS_RATE_BASELINE) || 0).toFixed(1);
  const milestones = [
    { label: "FIRE number found", done: true },
    { label: "Freedom date mapped", done: true },
    { label: isAlreadyFire ? "Next chapter awaits" : "Monthly move ready", done: !isAlreadyFire },
  ];
  const chartData = useMemo(() => {
    const r = 0.07;
    const annualBase = savings * 12;
    const annualBoosted = (savings + extraSavings) * 12;
    const buildPts = (annual: number, years: number) => {
      const stepsPerYear = 4;
      const totalSteps = Math.ceil(years * stepsPerYear);
      const pts: { t: number; value: number }[] = [];
      for (let i = 0; i <= totalSteps; i++) {
        const t = i / stepsPerYear;
        const grow = Math.pow(1 + r, t);
        pts.push({ t, value: portfolioBalance * grow + annual * (grow - 1) / r });
      }
      return pts;
    };
    const maxYears = Math.max(result.years, d4.years, 1);
    return {
      basePts: buildPts(annualBase, result.years > 0 ? result.years : 20),
      boostedPts: buildPts(annualBoosted, d4.years > 0 ? d4.years : 20),
      maxYears,
      fireTarget: result.fireTarget ?? 0,
    };
  }, [portfolioBalance, savings, extraSavings, result.years, result.fireTarget, d4.years]);

  const calcLabels = ["City cost-of-living", "After-tax income", "Compound growth at 7%", "25× withdrawal rule"];

  const stageIdx = stageData.index;
  const stages4 = ["Ignition", "Momentum", "Final Stretch", "FIRE Achieved"] as const;

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

      {/* PHASE 1 — calculating */}
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

      {/* PHASE 2 — reveal */}
      {!calcPhase && (
        <div className="uf-number-phase">

          {/* ── GREEN GRADIENT HERO ── */}
          <div ref={heroRef} style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #059669 0%, #003527 100%)", color: "#fff", padding: "clamp(32px, 5vw, 64px) clamp(20px, 4vw, 56px) clamp(28px, 4vw, 56px)", marginBottom: 0, borderRadius: "16px 16px 0 0" }}>
            {/* Decorative circles */}
            <div aria-hidden className="uf-reveal-ring" style={{ ["--ring-dur" as string]: "18s", ["--ring-delay" as string]: "0s", ["--ring-lo" as string]: "0.06", ["--ring-hi" as string]: "0.14", position: "absolute", top: -200, right: -80, width: 560, height: 560, borderRadius: "50%", border: "1px solid rgba(34,211,165,0.08)", pointerEvents: "none" }} />
            <div aria-hidden className="uf-reveal-ring" style={{ ["--ring-dur" as string]: "13s", ["--ring-delay" as string]: "2.5s", ["--ring-lo" as string]: "0.05", ["--ring-hi" as string]: "0.12", position: "absolute", top: -100, right: 20, width: 380, height: 380, borderRadius: "50%", border: "1px solid rgba(34,211,165,0.06)", pointerEvents: "none" }} />
            <div aria-hidden className="uf-reveal-ring" style={{ ["--ring-dur" as string]: "9s", ["--ring-delay" as string]: "5s", ["--ring-lo" as string]: "0.03", ["--ring-hi" as string]: "0.09", position: "absolute", top: 40, right: 140, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(34,211,165,0.04)", pointerEvents: "none" }} />
            {revealed && (
              <div className="uf-confetti" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span />
                <span /><span /><span /><span /><span /><span /><span /><span />
                <span /><span /><span /><span /><span /><span /><span /><span />
              </div>
            )}

            <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative" }}>
              {/* Stage chip */}
              <div data-gsap="chip" className="uf-stage-chip-anim" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 12px 7px 10px", background: "rgba(34,211,165,0.10)", border: "1px solid rgba(34,211,165,0.28)", borderRadius: 999, marginBottom: 28, opacity: 0 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {stages4.map((_, i) => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: 99, background: i <= stageIdx ? "#22D3A5" : "rgba(34,211,165,0.25)" }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#22D3A5", textTransform: "uppercase" }}>{stageData.name}</span>
              </div>

              {/* 2-column grid */}
              <div className="uf-reveal-hero-grid">
                {/* Left: freedom date */}
                <div>
                  <div data-gsap="date-label" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#22D3A5", opacity: 0 }}>
                    Your freedom date
                  </div>
                  <div data-gsap="date-date" style={{ marginTop: 14, lineHeight: 0.95, fontWeight: 600, letterSpacing: "-0.045em", opacity: 0 }}>
                    <div style={{ fontSize: "clamp(48px, 8vw, 96px)", color: "#fff", whiteSpace: "nowrap" }}>
                      {isAlreadyFire ? "Now" : fireMonthFull}
                    </div>
                    {!isAlreadyFire && (
                      <div style={{ fontSize: "clamp(48px, 8vw, 96px)", color: "#22D3A5", whiteSpace: "nowrap" }}>
                        {result.retireYear}
                      </div>
                    )}
                  </div>
                  <div data-gsap="date-sub" style={{ marginTop: 18, fontSize: "clamp(14px, 2vw, 18px)", color: "rgba(255,255,255,0.72)", fontWeight: 500, letterSpacing: "-0.005em", opacity: 0 }}>
                    {result.age !== undefined && !isAlreadyFire && (
                      <>Age <b style={{ color: "#fff", fontWeight: 700 }}>{result.age}</b>
                      <span style={{ margin: "0 10px", opacity: 0.4 }}>·</span>
                      <b style={{ color: "#fff", fontWeight: 700 }}>{yearsLabel}</b> from now
                      <span style={{ margin: "0 10px", opacity: 0.4 }}>·</span>
                      {city.name}</>
                    )}
                    {isAlreadyFire && city.name}
                  </div>
                </div>

                {/* Right: FIRE number + milestones */}
                <div data-gsap="fire-right" className="uf-reveal-hero-right" style={{ opacity: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                    FIRE number
                  </div>
                  <div ref={numRef} className="uf-fire-num" style={{ marginTop: 10, fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1, fontWeight: 600, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", color: "#fff" }} />
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 260, lineHeight: 1.45 }}>
                    25× annual expenses at the 4% safe withdrawal rate.
                  </div>
                  <div style={{ marginTop: 22, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {milestones.map((m) => (
                      <div data-gsap="milestone" key={m.label} style={{ flex: "1 1 auto", minWidth: 100, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, opacity: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 99, flexShrink: 0, background: m.done ? "#22D3A5" : "rgba(34,211,165,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {m.done
                            ? <svg width="8" height="8" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#003527" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            : <svg width="8" height="8" viewBox="0 0 10 10"><path d="M3 5h4M5 3l2 2-2 2" stroke="#22D3A5" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          }
                        </div>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CHART + MONTHLY MOVE ── */}
          {revealed && (
            <div ref={belowRef}>
              <div data-gsap="chart-section" style={{ background: "#F8FAFC", padding: "clamp(20px, 3vw, 40px) clamp(16px, 3vw, 40px)", borderRadius: "0 0 16px 16px", marginBottom: 16 }}>
                <div className="uf-chart-move-grid">
                  {/* Chart card */}
                  <div className="uf-reveal-card" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, paddingBottom: 16, boxShadow: "0 24px 40px -28px rgba(15,23,42,0.14)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#059669" }}>Your path to FIRE</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginTop: 6, letterSpacing: "-0.015em" }}>Compounded at 7% real return</div>
                      </div>
                      <div style={{ display: "flex", gap: 18, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#6B7280" }}>
                          <span style={{ display: "inline-block", width: 14, borderTop: "2px dashed #6B7280" }} />
                          Base plan
                        </span>
                        {extraSavings > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#003527" }}>
                            <span style={{ display: "inline-block", width: 14, borderTop: "2.5px solid #003527" }} />
                            With +${extraSavings}/mo
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <FireGrowthChart data={chartData} extraSavings={extraSavings} baseRetireYear={result.retireYear} boostedRetireYear={d4.retireYear} currentAge={currentAge} />
                    </div>
                  </div>

                  {/* Monthly move sidebar */}
                  {!isAlreadyFire && (
                    <div className="uf-reveal-card" style={{ background: "#003527", color: "#fff", borderRadius: 16, paddingBottom: "clamp(18px, 2.5vw, 26px)", position: "relative", overflow: "hidden", boxShadow: "0 24px 40px -28px rgba(15,23,42,0.16)" }}>
                      <div aria-hidden style={{ position: "absolute", top: -80, right: -80, width: 220, height: 220, borderRadius: 99, background: "radial-gradient(circle, #22D3A5 0%, transparent 65%)", opacity: 0.16, pointerEvents: "none" }} />
                      <div style={{ position: "relative" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#22D3A5" }}>The monthly move</div>
                        <div style={{ marginTop: 12, fontSize: 19, lineHeight: 1.3, fontWeight: 500, letterSpacing: "-0.01em" }}>
                          Invest <span style={{ color: "#22D3A5", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${extraSavings}</span> more / month and your freedom date moves{" "}
                          <span style={{ color: "#22D3A5", fontWeight: 700 }}>{savedYears > 0 ? monthlyMoveLabel : "closer"}</span> sooner.
                        </div>
                        <div style={{ marginTop: 22 }}>
                          <input
                            type="range" min="0" max="2000" step="50" value={extraSavings}
                            onChange={e => setExtraSavings(Number(e.target.value))}
                            style={{ width: "100%", accentColor: "#22D3A5", height: 4 }}
                          />
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                            <span>$0</span><span>$500</span><span>$1k</span><span>$1.5k</span><span>$2k</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.04em" }}>NEW DATE</span>
                            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{newDateLabel}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.04em" }}>YEARS CUT</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "#22D3A5", fontVariantNumeric: "tabular-nums" }}>{savedYears > 0 ? monthlyMoveLabel : "—"}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.04em" }}>EXTRA AT FIRE</span>
                            <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{extraSavings > 0 ? `+${extraAtFireLabel}` : "—"}</span>
                          </div>
                        </div>
                        <Link
                          href="/login"
                          className="uf-automate-btn"
                          style={{ display: "block", marginTop: 22, width: "100%", height: 44, borderRadius: 10, background: "#22D3A5", color: "#003527", fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: "44px", textDecoration: "none" }}
                          onClick={() => saveCalculatorPrefill({ monthlyIncome: Math.round(takeHome / 12), monthlySavings: savings, monthlySpendEstimate: Math.max(0, Math.round(takeHome / 12 - savings)), cityName: city.name, stateKey, fireTarget: result.fireTarget, annualCost: city.col, retireYear: result.retireYear, generatedAt: new Date().toISOString(), currentAge, portfolioBalance, landingSource, defaultCurrency: currency })}
                        >
                          Automate this →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── IDENTITY ROW ── */}
              <div className="uf-identity-grid" style={{ marginBottom: 16 }}>
                {/* FIRE type — dark green */}
                <div data-gsap="identity-card" className="uf-reveal-card" style={{ position: "relative", overflow: "hidden", background: "#003527", color: "#fff", borderRadius: 18, minHeight: 140, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div aria-hidden style={{ position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: 99, background: "radial-gradient(circle, #22D3A5 0%, transparent 70%)", opacity: 0.22, pointerEvents: "none" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#22D3A5" }}>Your FIRE type</div>
                  <div style={{ position: "relative" }}>
                    <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.05 }}>{fireIdentity.name}</div>
                    <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.45, maxWidth: 320 }}>{fireIdentity.headline}</div>
                  </div>
                </div>
                {/* Savings benchmark — light */}
                <div data-gsap="identity-card" className="uf-reveal-card" style={{ background: "#F9FAFB", border: "1px solid #E2E8F0", borderRadius: 18, minHeight: 140, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#059669" }}>Savings rate benchmark</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 700, color: "#003527", letterSpacing: "-0.035em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{savingsMultiple}×</div>
                      <div style={{ fontSize: 14, color: "#0F172A", fontWeight: 600 }}>ahead of the U.S. average</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
                      You save <b style={{ color: "#0F172A" }}>{savingsRatePct}%</b> of take-home, vs. <b style={{ color: "#0F172A" }}>{PUBLIC_SAVINGS_RATE_BASELINE}%</b> nationally.
                    </div>
                  </div>
                </div>
              </div>

              {/* ── DECISION IMPACT ── */}
              {!isAlreadyFire && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#059669" }}>Decision impact</div>
                      <div style={{ fontSize: 18, color: "#0F172A", marginTop: 4, fontWeight: 600, letterSpacing: "-0.01em" }}>What each lever buys you</div>
                    </div>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>vs. today&apos;s plan</span>
                  </div>
                  <div className="uf-decision-grid">
                    {[
                      { label: "Cut dining out by 20%", delta: result.years - d1.years, detail: "~$" + Math.round(city.col * 0.2 / 12) + "/mo redirected" },
                      { label: "Save $250/mo more", delta: result.years - calcFIRE(savings + 250, city.col, currentAge, portfolioBalance).years, detail: "Auto-transfer to brokerage" },
                      { label: "Take a 10% pay cut", delta: d3.years - result.years, detail: "Career trade-off" },
                      { label: "Invest annual bonus", delta: result.years - d2.years, detail: "Lump-sum, fully invested" },
                    ].map((m, i) => {
                      const isNeg = m.delta < 0;
                      const abs = Math.abs(m.delta);
                      const y = Math.floor(abs), mo = Math.round((abs - y) * 12);
                      const label = y > 0 ? (mo > 0 ? `${y}y ${mo}mo` : `${y}y`) : `${mo}mo`;
                      const sign = isNeg ? "+" : "−";
                      return (
                        <div data-gsap="decision-card" key={i} className="uf-reveal-card" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, display: "flex", flexDirection: "column", gap: 8, minHeight: 100 }}>
                          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: isNeg ? "#B45309" : "#003527", fontVariantNumeric: "tabular-nums" }}>{sign}{label}</div>
                          <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, lineHeight: 1.3 }}>{m.label}</div>
                          <div style={{ fontSize: 11, color: "#6B7280", marginTop: "auto" }}>{m.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── FOOTER CTA ── */}
              <div data-gsap="footer-cta" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "clamp(14px, 2vw, 20px) clamp(16px, 2.5vw, 24px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.005em" }}>Lock this trajectory in your dashboard.</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>No login required · Financial details aren&apos;t stored · 7% real return, 25× / 4% FIRE rule</div>
                </div>
                <div className="uf-footer-btns">
                  <button style={{ height: 44, padding: "0 16px", borderRadius: 10, cursor: "pointer", background: "#fff", border: "1px solid #E2E8F0", color: "#0F172A", fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowShare(true)}>
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M9 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM3 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM9 10.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4.3 5.7l3.4-2M4.3 6.3l3.4 2" stroke="#0F172A" strokeWidth="1.1" strokeLinecap="round"/></svg>
                    Share
                  </button>
                  <button style={{ height: 44, padding: "0 16px", borderRadius: 10, cursor: "pointer", background: "#fff", border: "1px solid #E2E8F0", color: "#0F172A", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }} onClick={onAdjust}>
                    Adjust inputs
                  </button>
                  <Link
                    href="/login"
                    style={{ height: 44, padding: "0 20px", borderRadius: 10, background: "#003527", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => saveCalculatorPrefill({ monthlyIncome: Math.round(takeHome / 12), monthlySavings: savings, monthlySpendEstimate: Math.max(0, Math.round(takeHome / 12 - savings)), cityName: city.name, stateKey, fireTarget: result.fireTarget, annualCost: city.col, retireYear: result.retireYear, generatedAt: new Date().toISOString(), currentAge, portfolioBalance, landingSource, defaultCurrency: currency })}
                  >
                    Track this →
                  </Link>
                </div>
              </div>
              <p className="uf-disclaimer">
                Estimate only. Not financial advice. Based on 7% real return (historical S&P500 average after inflation).
              </p>
            </div>
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

        /* -- CURRENCY -- */
        .uf-currency-btn { display: flex; flex-direction: column; align-items: flex-start; padding: 12px 14px; background: #fff; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
        .uf-currency-btn:hover { border-color: var(--accent); background: var(--accent-dim); }
        .uf-currency-btn.selected { border-color: var(--accent); background: var(--accent-dim); box-shadow: 0 0 0 1px var(--accent); }
        .uf-currency-code { font-weight: 800; font-size: 15px; color: var(--text); font-family: var(--font-display); }
        .uf-currency-name { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

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
        .uf-reveal-ring { animation: ringDrift var(--ring-dur,16s) ease-in-out var(--ring-delay,0s) infinite; }
        .uf-stage-chip-anim { animation: chipPulse 3s ease-in-out 1.4s infinite; }
        .uf-section-up { animation: sectionSlideUp 0.65s cubic-bezier(0.22,1,0.36,1) var(--su-delay,0s) both; }
        .uf-automate-btn {
          background: linear-gradient(90deg, #22D3A5 0%, #62FAE3 38%, #22D3A5 62%, #1ab896 100%);
          background-size: 200% auto;
          animation: automateShimmer 2.6s linear infinite;
          color: #003527 !important; border: none !important;
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
        .uf-celebration-pill { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; margin-bottom: 14px; border-radius: 999px; background: rgba(159,232,112,0.14); border: 1px solid rgba(159,232,112,0.28); color: #D9FFB8; font-size: 12px; font-weight: 800; letter-spacing: 0.01em; animation: celebrationPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
        .uf-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
        .uf-confetti span {
          position: absolute; top: 8px;
          width: var(--w,8px); height: var(--h,13px);
          border-radius: var(--br,3px);
          animation: confettiFall var(--dur,1.9s) ease-out var(--delay,0s) forwards;
        }
        .uf-confetti span:nth-child(1)  { left:3%;  background:#62FAE3; --x:-280px; --r:-210deg; --delay:.02s; --w:6px;  --h:11px; }
        .uf-confetti span:nth-child(2)  { left:9%;  background:#FDE68A; --x:-200px; --r:170deg;  --delay:.30s; --br:50%; --w:10px; --h:10px; }
        .uf-confetti span:nth-child(3)  { left:15%; background:#9FE870; --x:-140px; --r:-150deg; --delay:.06s; }
        .uf-confetti span:nth-child(4)  { left:21%; background:#22D3A5; --x: -90px; --r:200deg;  --delay:.40s; --br:2px; --w:11px; --h:6px; }
        .uf-confetti span:nth-child(5)  { left:27%; background:#FCA5A5; --x: -44px; --r:-180deg; --delay:.10s; --br:50%; --w:9px;  --h:9px; }
        .uf-confetti span:nth-child(6)  { left:33%; background:#FDE68A; --x:   8px; --r:160deg;  --delay:.48s; --w:7px;  --h:13px; }
        .uf-confetti span:nth-child(7)  { left:39%; background:#62FAE3; --x:  52px; --r:-200deg; --delay:.14s; --br:2px; --w:12px; --h:6px; }
        .uf-confetti span:nth-child(8)  { left:45%; background:#9FE870; --x:  86px; --r:230deg;  --delay:.52s; }
        .uf-confetti span:nth-child(9)  { left:51%; background:#fff;    --x: 108px; --r:-170deg; --delay:.04s; --br:50%; --w:7px;  --h:7px;  --dur:1.6s; }
        .uf-confetti span:nth-child(10) { left:57%; background:#FCA5A5; --x: 134px; --r:190deg;  --delay:.36s; }
        .uf-confetti span:nth-child(11) { left:63%; background:#22D3A5; --x: 164px; --r:-220deg; --delay:.08s; --br:2px; --w:9px;  --h:6px; }
        .uf-confetti span:nth-child(12) { left:69%; background:#FDE68A; --x: 200px; --r:180deg;  --delay:.44s; --br:50%; --w:11px; --h:11px; }
        .uf-confetti span:nth-child(13) { left:75%; background:#9FE870; --x: 238px; --r:-160deg; --delay:.12s; }
        .uf-confetti span:nth-child(14) { left:81%; background:#62FAE3; --x: 268px; --r:200deg;  --delay:.56s; --br:2px; --w:13px; --h:5px; }
        .uf-confetti span:nth-child(15) { left:87%; background:#FCA5A5; --x: 298px; --r:-240deg; --delay:.16s; --br:50%; --w:8px;  --h:8px; }
        .uf-confetti span:nth-child(16) { left:93%; background:#FDE68A; --x: 320px; --r:170deg;  --delay:.60s; }
        .uf-confetti span:nth-child(17) { left:6%;  background:#22D3A5; --x:-260px; --r:190deg;  --delay:.75s; --br:50%; --w:9px;  --h:9px; }
        .uf-confetti span:nth-child(18) { left:18%; background:#FDE68A; --x:-160px; --r:-160deg; --delay:.82s; }
        .uf-confetti span:nth-child(19) { left:30%; background:#62FAE3; --x: -70px; --r:210deg;  --delay:.68s; --br:2px; --w:10px; --h:6px; }
        .uf-confetti span:nth-child(20) { left:42%; background:#FCA5A5; --x:  28px; --r:-200deg; --delay:.88s; --br:50%; --w:8px;  --h:8px; }
        .uf-confetti span:nth-child(21) { left:55%; background:#9FE870; --x: 118px; --r:170deg;  --delay:.74s; }
        .uf-confetti span:nth-child(22) { left:67%; background:#fff;    --x: 188px; --r:-220deg; --delay:.94s; --br:2px; --w:11px; --h:7px; }
        .uf-confetti span:nth-child(23) { left:79%; background:#22D3A5; --x: 256px; --r:190deg;  --delay:.80s; --br:50%; --w:9px;  --h:9px; }
        .uf-confetti span:nth-child(24) { left:91%; background:#FDE68A; --x: 308px; --r:-170deg; --delay:1.0s; }
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
        /* footer buttons row */
        .uf-footer-btns { display: flex; gap: 10px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }

        /* 1024px — decision grid 4→2 col before it gets cramped */
        @media (max-width: 1024px) {
          .uf-decision-grid { grid-template-columns: repeat(2, 1fr); }
        }
        /* 900px — chart stacks above monthly move */
        @media (max-width: 900px) {
          .uf-chart-move-grid { grid-template-columns: 1fr; }
          .uf-decision-grid { grid-template-columns: repeat(2, 1fr); }
        }
        /* 640px — hero stacks, identity stacks */
        @media (max-width: 640px) {
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

      <Nav
        step={STEP_MAP[screen]}
        totalSteps={totalDots}
        onRestart={() => setScreen("hero")}
        onSignIn={signIn}
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
            onNext={nextCurrency => { setCurrency(nextCurrency); setScreen("income"); }}
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
