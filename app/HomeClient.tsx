"use client";

import { TAX_ESTIMATES_AVAILABLE } from "@/lib/release-gates";

import { useState, useEffect, useMemo, useRef } from "react";
import { useOnboardingMotion } from "@/lib/use-onboarding-motion";
import SettlingNumber from "@/components/ui/SettlingNumber";
import AmountTiles from "@/components/ui/AmountTiles";
import MoneyField from "@/components/ui/MoneyField";
import AgeWheel from "@/components/ui/AgeWheel";
import { advanceOnEnter } from "@/lib/keyboard-navigation";
import Logo from "@/app/components/Logo";
import { useRouter } from "next/navigation";
import RevealFlow from "@/app/components/RevealFlow";
import type { ExpatCity } from "@/app/components/ExpatFireGlobe";
import { CITY_COORDS } from "@/lib/city-coords";
import { supabase } from "@/lib/supabase";
import { saveCalculatorPrefill, type CalculatorPrefill } from "@/lib/journey";
import { saveExplorePlan } from "@/lib/explore-store";
import { calcFIRE, calcTakeHome } from "@/lib/fire";
import { DEFAULT_RETURN_PCT, inflationFor } from "@/lib/fire-number";
import { freedomAgeAt } from "@/lib/plan-settings";
import {
  trackLandingViewed,
  trackCalculatorStepViewed,
  trackCalculatorRevealed,
  trackRevealCtaClicked,
  trackRevealStepViewed,
  isInternalTestSession,
  isInternalUser,
} from "@/lib/analytics";
import { REVEAL_STEP_IDS, type RevealCtaPlacement } from "@/lib/analytics-events";
import { compareNetWorth } from "@/lib/net-worth-compare";
import { NET_WORTH_BENCHMARKS } from "@/lib/net-worth-benchmarks";
import { NET_WORTH_INFLATION } from "@/lib/net-worth-inflation";
import type { CalculatorStepId } from "@/lib/analytics-events";
import {
  getAcquisitionSource,
  normaliseAcquisitionSource,
  setAcquisitionSource,
} from "@/lib/acquisition";
import Nav from "@/app/components/landing/Nav";
import BrandedIntake from "@/app/components/landing/BrandedIntake";
import LandingPage from "@/app/components/landing/NextHorizonLanding";
import CityScreen, { type CityState } from "@/app/components/landing/CityScreen";
import OnboardingShell, { ONBOARDING_CSS } from "@/app/components/landing/OnboardingShell";
import type { SceneIcon } from "@/app/components/landing/OnboardingScene";
import { CITIES } from "@/lib/fire-data";
import { FireTypeAvatar } from "@/app/fire-type/FireTypeAvatar";
import { getTypeMeta, isValidFireTypeCode } from "@/app/fire-type/quiz-data";
import { formatMoney } from "@/lib/money";
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

/** A round suggestion: two significant figures, so a labelled share stays true. */
function niceAmount(n: number): number {
  if (n <= 0) return 0;
  const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(n)) - 1));
  return Math.max(step, Math.round(n / step) * step);
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

function IncomeScreen({ stateKey, cityName, cityCol, currency = "USD", onCurrencyChange, onNext, onAnswer }: {
  stateKey: string;
  cityName?: string;
  /** Annual living costs for the chosen city, in USD; 0 when unknown. */
  cityCol?: number;
  currency?: SupportedCurrency;
  onCurrencyChange?: (c: SupportedCurrency) => void;
  onNext: (income: number) => void;
  onAnswer?: (text: string) => void;
}) {
  const isNonUSD = currency !== "USD";
  const isCustomJurisdiction = stateKey === "custom";
  const canEstimateTax = TAX_ESTIMATES_AVAILABLE && !isNonUSD && !isCustomJurisdiction;
  const [mode, setMode] = useState<IncomeMode>("takehome");
  const [rawValue, setRawValue] = useState<string>("");
  const [takeHomeRaw, setTakeHomeRaw] = useState<string>("");
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const previousIncomeFx = useRef(fxRate);
  useEffect(() => {
    const ratio = fxRate / previousIncomeFx.current;
    previousIncomeFx.current = fxRate;
    if (ratio === 1) return;
    const convert = (raw: string) => raw === "" ? raw : String(Math.round(Number(raw) * ratio * 100) / 100);
    setRawValue(convert);
    setTakeHomeRaw(convert);
  }, [fxRate]);

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

  const modeUnit = INCOME_MODES.find((m) => m.key === mode)?.unit;
  // Suggestions sit around the city's living costs: tight, typical,
  // comfortable, high (D-50). Gross pay is grossed up roughly a third.
  const monthlyCost = cityCol && cityCol > 0 ? cityCol / 12 : 4000;
  const periodFactor = mode === "annual" ? 12 : mode === "biweekly" ? 12 / 26 : mode === "hourly" ? 12 / 2080 : 1;
  const incomeOptions = [1.1, 1.4, 1.9, 2.6].map((m, i) => ({
    value: niceAmount(monthlyCost * m * fxRate * (mode === "takehome" ? 1 : 1.3) * periodFactor),
    sub: ["Tight", "Typical here", "Comfortable", "High"][i],
    tag: i === 1 ? "Common" : undefined,
  }));
  useEffect(() => {
    onAnswer?.(canContinue ? `${localMoney(displayMonthly)} a month` : "");
  }, [canContinue, displayMonthly, onAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="uf-screen" style={{ paddingTop: 16 }}>
      <h2 className="uf-ob-q">What lands in your bank each month?</h2>
      <p className="uf-ob-hint">
        Start with the monthly amount that lands in your bank. An estimate is fine.
        {cityName && cityCol ? ` Suggestions follow living costs in ${cityName.split(",")[0]}.` : ""}
      </p>

      {mode !== "takehome" ? (
        <AmountTiles label={`Gross income (${currency})`} value={rawValue === "" ? null : numVal} options={incomeOptions} onChange={n => setRawValue(String(n))} symbol={currencySymbol} unit={modeUnit}>
          <MoneyField key={mode} label={`Gross income (${currency})`} value={rawValue} onChange={setRawValue} />
        </AmountTiles>
      ) : (
        <AmountTiles label={`Monthly take-home pay (${currency})`} value={takeHomeRaw === "" ? null : monthlyTakeHome} options={incomeOptions} onChange={n => setTakeHomeRaw(String(n))} symbol={currencySymbol} unit="a month">
          <MoneyField label={`Monthly take-home pay (${currency})`} value={takeHomeRaw} onChange={setTakeHomeRaw} />
        </AmountTiles>
      )}
      {isNonUSD && <p className="uf-hint">1 {currency} ≈ {(1 / fxRate).toFixed(4)} USD (indicative rate)</p>}

      <details className="uf-input-alternative"><summary>Change currency</summary>
      {onCurrencyChange && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
          {/* A real label, so assistive tech announces "Currency", not an
              unnamed combo box. */}
          <label htmlFor="uf-income-currency" style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Currency:</label>
          <select
            id="uf-income-currency"
            value={currency}
            onChange={e => onCurrencyChange(e.target.value as SupportedCurrency)}
            style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-ink)", background: "var(--uf-card)", border: "1px solid var(--uf-border-2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c} value={c}>{c} — {CURRENCY_NAMES[c] ?? c}</option>
            ))}
          </select>
        </div>
      )}
      <div className="uf-mode-pills">
          {INCOME_MODES.filter(m => TAX_ESTIMATES_AVAILABLE || m.key === "takehome").map((m) => (
            <button
              key={m.key}
              aria-pressed={mode === m.key}
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
      </details>

      {canContinue && (
        <details className="uf-input-alternative"><summary>See income breakdown</summary>
        <div className="uf-stats-grid" style={{ marginTop: 16 }}>
          {displayGross !== null ? (
            <div className="uf-card">
              <div className="uf-card-sub">Annual gross</div>
              <div className="uf-card-main">{isNonUSD ? localMoney(displayGross) : formatMoney(displayGross)}</div>
            </div>
          ) : null}
          <div className="uf-card">
            <div className="uf-card-sub">Annual take-home</div>
            <div className="uf-card-main">
              {isNonUSD ? localMoney(displayTakeHome) : formatMoney(displayTakeHome)}
            </div>
          </div>
          <div className="uf-card">
            <div className="uf-card-sub">Monthly take-home</div>
            <div className="uf-card-main">
              {isNonUSD ? localMoney(displayMonthly) : formatMoney(displayMonthly)}
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
        </div>        </details>

      )}

      <div className="uf-ob-foot">
        <button data-primary-next className="uf-btn uf-btn-primary" disabled={!canContinue} onClick={() => onNext(incomeForFIRE)}>
          Continue
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

function SavingsScreen({ income, currency = "USD", onNext, onAnswer }: {
  income: number;
  currency?: SupportedCurrency;
  onNext: (savings: number, monthlyExpenses: number) => void;
  onAnswer?: (text: string) => void;
}) {
  const isNonUSD = currency !== "USD";
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const monthly = income / 12;
  const monthlyLocal = isNonUSD ? monthly * fxRate : monthly;
  const defaultSavings = isNonUSD ? Math.round(1500 * fxRate) : 1500;
  const [mode, setMode] = useState<SavingsInputMode>("savings");
  const [period, setPeriod] = useState<SavingsPeriod>("monthly");
  const [amount, setAmount] = useState(Math.min(defaultSavings, Math.floor(monthlyLocal)));
  const [cleared, setCleared] = useState(false);
  const [capped, setCapped] = useState(false);
  const previousSavingsFx = useRef(fxRate);
  useEffect(() => {
    const ratio = fxRate / previousSavingsFx.current;
    previousSavingsFx.current = fxRate;
    if (ratio !== 1) setAmount(previous => Math.round(previous * ratio));
  }, [fxRate]);
  const incomeLimit = Math.floor(period === "yearly" ? monthlyLocal * 12 : monthlyLocal);
  const boundedAmount = mode === "savings" ? Math.min(amount, incomeLimit) : amount;
  const monthlyAmount = period === "yearly" ? boundedAmount / 12 : boundedAmount;
  const savingsLocal = mode === "savings" ? monthlyAmount : Math.max(0, monthlyLocal - monthlyAmount);
  const expensesLocal = mode === "spending" ? monthlyAmount : Math.max(0, monthlyLocal - savingsLocal);
  const rate = monthlyLocal > 0 ? Math.min(100, Math.round((savingsLocal / monthlyLocal) * 100)) : 0;
  const sliderMax = Math.max(isNonUSD ? Math.round(10000 * fxRate) : 10000, Math.ceil(monthlyLocal / 100) * 100);

  const inputMax = mode === "savings" ? incomeLimit : period === "yearly" ? sliderMax * 12 : sliderMax;


  const handlePeriodChange = (nextPeriod: SavingsPeriod) => {
    if (nextPeriod === period) return;
    const converted = Math.round(nextPeriod === "yearly" ? boundedAmount * 12 : boundedAmount / 12);
    const nextLimit = Math.floor(nextPeriod === "yearly" ? monthlyLocal * 12 : monthlyLocal);
    setAmount(mode === "savings" ? Math.min(converted, nextLimit) : converted);
    setPeriod(nextPeriod);
  };

  const periodLabel = period === "yearly" ? "Yearly" : "Monthly";
  const periodUnit = period === "yearly" ? "/year" : "/month";
  const inputLabel = `${periodLabel} ${mode === "savings" ? "savings" : "spending"} amount`;



  const perPeriod = period === "yearly" ? 12 : 1;
  const savingsOptions = (mode === "savings" ? [0.1, 0.2, 0.3, 0.5] : [0.5, 0.6, 0.7, 0.8]).map(share => ({
    value: Math.min(niceAmount(monthlyLocal * share * perPeriod), mode === "savings" ? incomeLimit : Infinity),
    sub: mode === "savings" ? `${Math.round(share * 100)}% of pay` : `${Math.round(share * 100)}% of pay, ${Math.round(100 - share * 100)}% saved`,
  }));
  const money = (n: number) => `${currencySymbol}${Math.round(n).toLocaleString()}`;
  useEffect(() => {
    onAnswer?.(cleared ? "" : mode === "savings" ? `${money(savingsLocal)} saved a month` : `${money(expensesLocal)} spent a month`);
  }, [cleared, mode, savingsLocal, expensesLocal, onAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="uf-screen" style={{ paddingTop: 16 }}>
      <h2 className="uf-ob-q">{mode === "savings" ? "How much do you save?" : "How much do you spend?"}</h2>
      <p className="uf-ob-hint">
        Use whichever number you know: monthly or yearly savings or spending. Pick the closest, or type it.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div className="uf-mode-pills" style={{ marginBottom: 0 }}>
          <button
            type="button"
            aria-pressed={mode === "savings"}
            className={`uf-mode-pill ${mode === "savings" ? "active" : ""}`}
            onClick={() => { setAmount(Math.min(amount, incomeLimit)); setMode("savings"); }}
          >
            I know my savings
          </button>
          <button
            type="button"
            aria-pressed={mode === "spending"}
            className={`uf-mode-pill ${mode === "spending" ? "active" : ""}`}
            onClick={() => { if (mode === "savings") setAmount(Math.max(0, incomeLimit - boundedAmount)); setMode("spending"); }}
          >
            I know my spending
          </button>
        </div>
        <div className="uf-mode-pills" style={{ marginBottom: 0 }}>
          <button
            type="button"
            aria-pressed={period === "monthly"}
            className={`uf-mode-pill ${period === "monthly" ? "active" : ""}`}
            onClick={() => handlePeriodChange("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={period === "yearly"}
            className={`uf-mode-pill ${period === "yearly" ? "active" : ""}`}
            onClick={() => handlePeriodChange("yearly")}
          >
            Yearly
          </button>
        </div>
      </div>

      <AmountTiles label={`${inputLabel} (${currency})`} value={boundedAmount} options={savingsOptions} onChange={n => { setCleared(false); setCapped(false); setAmount(n); }} symbol={currencySymbol} unit={periodUnit}>
        <MoneyField
          label={`${inputLabel} (${currency})`}
          value={cleared ? "" : String(boundedAmount)}
          onChange={raw => {
            // Empty means not answered yet, never a silent zero.
            if (raw === "") { setCleared(true); return; }
            const value = Math.max(0, Math.round(Number(raw) || 0));
            setCleared(false);
            setCapped(mode === "savings" && value > inputMax);
            setAmount(mode === "savings" ? Math.min(value, incomeLimit) : value);
          }}
        />
      </AmountTiles>
      <p className="uf-hint" aria-live="polite">
        {cleared
          ? "Enter an amount, or pick one above. Zero is fine."
          : capped
          ? <>You can&apos;t save more than you take home, so this is set to your pay: {money(incomeLimit)}{periodUnit}.</>
          : mode === "spending"
          ? <>That leaves {money(savingsLocal)} a month saved, <SettlingNumber value={rate} />% of your pay.</>
          : <>That&apos;s <SettlingNumber value={rate} />% of your pay, leaving {money(expensesLocal)} a month to spend.</>}
      </p>

      {!cleared && savingsLocal === 0 && (
        <p className="uf-hint" style={{ color: "var(--uf-warn-ink)" }}>
          With nothing saved each month your freedom date will be very far out. That&apos;s fine if it&apos;s true; you can change it later.
        </p>
      )}
      <div className="uf-ob-foot">
        <button
          data-primary-next className="uf-btn uf-btn-primary"
          disabled={cleared}
          onClick={() => onNext(
            isNonUSD ? Math.round(savingsLocal / fxRate) : savingsLocal,
            isNonUSD ? Math.round(expensesLocal / fxRate) : expensesLocal,
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PORTFOLIO BALANCE + AGE SCREEN
// -----------------------------------------------------------------------------

function PortfolioScreen({ currency = "USD", income, initialPortfolioBalance = 0, onNext, onAnswer }: {
  currency?: SupportedCurrency;
  /** Annual take-home in USD, for pay-relative suggestions. */
  income: number;
  initialPortfolioBalance?: number;
  onNext: (portfolio: number) => void;
  onAnswer?: (text: string) => void;
}) {
  const isNonUSD = currency !== "USD";
  const currencySymbol = getCurrencySymbol(currency);
  const fxRate = FALLBACK_RATES[currency] ?? 1;
  const initialPortfolioInput = initialPortfolioBalance > 0
    ? String(isNonUSD ? Math.round(initialPortfolioBalance * fxRate) : initialPortfolioBalance)
    : "";
  const [portfolioRaw, setPortfolioRaw] = useState<string>(initialPortfolioInput);
  const previousPortfolioFx = useRef(fxRate);
  useEffect(() => {
    const ratio = fxRate / previousPortfolioFx.current;
    previousPortfolioFx.current = fxRate;
    if (ratio !== 1) setPortfolioRaw(raw => raw === "" ? raw : String(Math.round(Number(raw) * ratio)));
  }, [fxRate]);

  const portfolioInput = Math.max(0, parseInt(portfolioRaw.replace(/,/g, ""), 10) || 0);
  const portfolio = isNonUSD ? Math.round(portfolioInput / fxRate) : portfolioInput;
  // Measured in pay, which means more than round numbers (D-50).
  const pay = (income / 12) * fxRate;
  const worthOptions = [
    { value: 0, sub: "Starting fresh" },
    { value: niceAmount(pay * 6), sub: "6 months of pay" },
    { value: niceAmount(pay * 12), sub: "A year of pay" },
    { value: niceAmount(pay * 36), sub: "3 years of pay" },
  ];
  useEffect(() => {
    onAnswer?.(portfolioRaw === "" ? "" : `${currencySymbol}${portfolioInput.toLocaleString()} so far`);
  }, [portfolioRaw, portfolioInput, currencySymbol, onAnswer]);

  return (
    <div className="uf-screen" style={{ paddingTop: 16 }}>
      <h2 className="uf-ob-q">What do you have saved and invested?</h2>
      <p className="uf-ob-hint">Stocks, funds, retirement accounts and cash savings. An estimate is fine, and zero is fine too.</p>

      <AmountTiles label={`Saved and invested (${currency})`} value={portfolioRaw === "" ? null : portfolioInput} options={worthOptions} onChange={n => setPortfolioRaw(String(n))} symbol={currencySymbol}>
        <MoneyField label={`Saved and invested (${currency})`} value={portfolioRaw} onChange={setPortfolioRaw} />
      </AmountTiles>

      <div className="uf-ob-foot">
        <button data-primary-next className="uf-btn uf-btn-primary" disabled={portfolioRaw === ""} onClick={() => onNext(portfolio)}>
          Continue
        </button>
      </div>
    </div>
  );
}

/** Age gets its own step and a wheel (D-50). Optional: Skip continues without it. */
function AgeScreen({ initialAge, onNext, onAnswer }: {
  initialAge?: number;
  onNext: (age?: number) => void;
  onAnswer?: (text: string) => void;
}) {
  const [age, setAge] = useState(initialAge ?? 32);
  useEffect(() => { onAnswer?.(`${age} years old`); }, [age, onAnswer]);
  return (
    <div className="uf-screen" style={{ paddingTop: 16 }}>
      <h2 className="uf-ob-q">How old are you?</h2>
      <p className="uf-ob-hint">So we can tell you how old you&apos;ll be when work becomes optional.</p>
      <AgeWheel value={age} onChange={setAge} />
      <div className="uf-ob-foot">
        <button data-primary-next className="uf-btn uf-btn-primary" onClick={() => onNext(age)}>
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
              <div className="uf-share-card-number" style={{ fontSize: selectedCard === "year" && retireYear ? 42 : 28, lineHeight: 1.1, color: selectedCard === "year" ? "#FFE58A" : undefined }}>{effectiveShareTitle}</div>
              <div className="uf-share-card-meta" style={{ fontSize: 15, color: selectedCard === "year" ? "rgba(255,255,255,0.75)" : "#FFE58A", fontWeight: selectedCard === "year" ? 500 : 800, lineHeight: 1.35 }}>{effectiveShareBody}</div>
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
  // Keep the sourced default after inflation (D-24); onboarding omits the
  // assumptions editor under D-30. Every figure on the result follows it.
  const returnPct = DEFAULT_RETURN_PCT;
  const marketReturn = returnPct / 100;

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
  // The age at freedom, rounded as on the dashboard (D-65), so both say the same age.
  const freedomAge = result.years === null ? null : freedomAgeAt(planningAge, result.years);
  const pctThere = result.fireTarget > 0
    ? Math.max(0, Math.round((portfolioBalance / result.fireTarget) * 100))
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
  // City costs are in US dollars; the visitor's figures are in their own
  // currency. Convert before comparing: HK$15,000 a month was being read as
  // $15,000, which made every abroad age far too early (D-37).
  const toUsd = (n: number) => n / (FALLBACK_RATES[currency] ?? 1);
  const spendingUsd = toUsd(city.col), savingsUsd = toUsd(savings), portfolioUsd = toUsd(portfolioBalance);
  // Explore picks up from here (D-58): your numbers in USD, and how you spend
  // against your city's typical cost, so your home city gives this same year.
  useEffect(() => {
    const homeCol = CITIES.find((c) => c.name === city.name)?.col;
    const lifestyle = homeCol ? Math.min(3, Math.max(0.3, spendingUsd / homeCol)) : 1;
    saveExplorePlan({ saved: portfolioUsd, monthlySaving: savingsUsd, age: currentAge, realReturn: marketReturn, targetMultiple: 25 * lifestyle, currency });
  }, [city.name, spendingUsd, savingsUsd, portfolioUsd, currentAge, marketReturn, currency]);
  const expatCities: ExpatCity[] = EXPAT_KEYS
    .map((k): ExpatCity | null => {
      const c = CITIES.find((x) => x.key === k);
      const co = CITY_COORDS[k];
      if (!c || !co || c.col >= spendingUsd || freedomAge === null) return null;
      const projection = calcFIRE(savingsUsd, c.col, planningAge, portfolioUsd, marketReturn);
      if (projection.years === null) return null;
      const age = planningAge + Math.floor(projection.years);
      return { key: k, name: c.name.split(",")[0], country: (c.name.split(", ")[1] ?? "").trim(), lat: co.lat, lng: co.lng, age, delta: freedomAge - age };
    })
    .filter((x): x is ExpatCity => x !== null && x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  const symbol = getCurrencySymbol(currency);
  const formatCompact = (n: number) => {
    const v = Math.max(0, n) * (FALLBACK_RATES[currency] ?? 1);
    if (v >= 1_000_000) return `${symbol}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${symbol}${Math.round(v / 1000)}k`;
    return `${symbol}${Math.round(v)}`;
  };

  const prefill: CalculatorPrefill = { monthlyIncome: Math.round(takeHome / 12), monthlySavings: savings, monthlySpendEstimate: Math.max(0, Math.round(takeHome / 12 - savings)), cityName: city.name, stateKey, fireTarget: result.fireTarget, annualCost: city.col, retireYear: result.retireYear ?? undefined, currentAge, portfolioBalance, landingSource, defaultCurrency: currency, realReturn: marketReturn };
  /** Keeps the result in this browser so the dashboard picks it up after sign-in. */
  const keepResult = (placement: RevealCtaPlacement) => {
    trackRevealCtaClicked({ placement, landingSource });
    saveCalculatorPrefill({ ...prefill, generatedAt: new Date().toISOString() });
  };
  const onSave = (placement: RevealCtaPlacement) => {
    keepResult(placement);
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
        returnPct={returnPct}
        futureDollars={result.years && result.years > 0 && result.retireYear !== null ? {
          year: result.retireYear,
          inflationPct: inflationFor(returnPct),
          amount: result.fireTarget * Math.pow(1 + inflationFor(returnPct) / 100, result.years),
        } : null}
        planningAge={planningAge}
        ageWasAssumed={ageWasAssumed}
        isAlreadyFire={isAlreadyFire}
        fireTarget={result.fireTarget}
        pctThere={pctThere}
        savingsRatePct={savingsRatePct}
        usBaselineRate={PUBLIC_SAVINGS_RATE_BASELINE}
        fireBenchmarkRate={25}
        netWorthComparison={compareNetWorth(
          { netWorthUsd: portfolioBalance, age: currentAge, ageAssumed: ageWasAssumed, currency },
          NET_WORTH_BENCHMARKS,
          NET_WORTH_INFLATION,
        )}
        expatHome={expatHome}
        expatBaseAge={freedomAge}
        expatCities={expatCities}
        formatCompact={formatCompact}
        onSave={onSave}
        prefill={prefill}
        onKeepResult={() => keepResult("reveal_save_step")}
        onStepViewed={(step, unreachable) => trackRevealStepViewed({
          stepId: unreachable ? "unreachable" : REVEAL_STEP_IDS[step],
          stepIndex: step,
        })}
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

type Screen = "hero" | "city" | "income" | "savings" | "portfolio" | "age" | "reveal";

/** The five questions, in order, with the scene's icon and a tag before any answer (D-50). */
const WIZARD: { screen: Screen; icon: SceneIcon; empty: string }[] = [
  { screen: "city", icon: "pin", empty: "Your city" },
  { screen: "income", icon: "pay", empty: "Your pay" },
  { screen: "savings", icon: "jar", empty: "Your saving" },
  { screen: "portfolio", icon: "stack", empty: "Saved so far" },
  { screen: "age", icon: "age", empty: "Your age" },
];

export default function HomeClient() {
  const wizardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("hero");
  const [visited, setVisited] = useState<Screen[]>([]);
  useOnboardingMotion(wizardRef, screen);
  useEffect(() => {
    if (screen === "hero") setVisited([]);
    else setVisited(previous => previous.includes(screen) ? previous : [...previous, screen]);
  }, [screen]);

  useEffect(() => {
    if (screen === "hero" || screen === "reveal") return;
    const onKey = (event: KeyboardEvent) => {
      const active = wizardRef.current?.querySelector<HTMLElement>("[data-onboarding-step]:not([hidden])");
      if (active) advanceOnEnter(event, active);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen]);

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
    // Past the landing screen, the page is the calculator and nothing else.
    document.body.classList.toggle("uf-flow-mode", screen !== "hero");
    return () => document.body.classList.remove("uf-result-mode", "uf-flow-mode");
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
      const cityFromLink = CITIES.find(c => c.key === urlParams.get("city"));
      if (cityFromLink) {
        setCityState({ name: cityFromLink.name, col: cityFromLink.col, stateKey: cityFromLink.state, isCustom: false });
        setCurrency(stateToCurrency(cityFromLink.state));
        setScreen("income");
      }
    }
  }, []);

  // Auth redirect — kept for real users, skipped for anyone internal.
  //
  // Sending a signed-in visitor to the dashboard is right: they came back for
  // their own numbers, not the sales pitch. But it also meant the only way to
  // walk the funnel was an incognito window, and incognito mints a fresh
  // PostHog id every session — so every test run arrived as another
  // brand-new visitor who happened to convert perfectly, in the two numbers
  // we are trying to read.
  //
  // Two escapes, both landing on the page as a person the internal filters
  // already know about. ?uf_internal=1 works signed out; an account listed in
  // NEXT_PUBLIC_INTERNAL_USER_IDS needs no flag at all, because the whole
  // point is to test without remembering to do anything special first.
  useEffect(() => {
    // Whoever stays on the page signed in gets a Dashboard button in the nav.
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
    if (isInternalTestSession()) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isInternalUser(session.user.id)) router.push("/dashboard");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(!!session);
      if (event === "SIGNED_IN" && session && !isInternalUser(session.user.id)) {
        router.push("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Funnel instrumentation: emit a single event per screen entry. The hero is
  // landing_viewed; the four wizard steps are calculator_step_viewed; reveal
  // fires its own event from inside RevealScreen so we know the calculation
  // actually completed.
  const landingTracked = useRef(false);
  useEffect(() => {
    if (screen === "hero") {
      if (landingTracked.current) return;
      landingTracked.current = true;
      trackLandingViewed(landingSource);
      return;
    }
    landingTracked.current = false;
    if (screen !== "reveal") return;
    const stepMap: Partial<Record<Screen, CalculatorStepId>> = {
      city: "city",
      income: "income",
      savings: "savings",
      portfolio: "portfolio",
      age: "age",
    };
    const stepId = stepMap[screen];
    if (stepId) {
      trackCalculatorStepViewed(stepId, landingSource);
    }
  }, [screen, landingSource]);

  function signIn() {
    router.push('/login');
  }

  // Each step reports its live answer for the scene's tag.
  const [answers, setAnswers] = useState<Partial<Record<Screen, string>>>({});
  const reportAnswer = useMemo(() => Object.fromEntries(WIZARD.map(({ screen: key }) =>
    [key, (text: string) => setAnswers(previous => previous[key] === text ? previous : { ...previous, [key]: text })])) as Record<string, (text: string) => void>, []);
  const wizardIndex = WIZARD.findIndex(w => w.screen === screen);
  const wizardStep = WIZARD[wizardIndex];
  const skipCity = () => {
    setCityState({ name: "Your current lifestyle", col: 0, stateKey: "custom", isCustom: true });
    setCurrency("USD");
    setScreen("income");
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: var(--uf-ground);
          --bg-hero: var(--uf-yellow);
          --bg-card: var(--uf-card);
          --bg-elevated: var(--uf-surface);
          --border: var(--uf-border);
          --border-light: var(--uf-border-2);
          --text: var(--uf-ink);
          --text-muted: var(--uf-ink-2);
          --text-dim: var(--uf-ink-3);
          --accent: var(--uf-green);
          --accent-dim: var(--uf-green-50);
          --accent-glow: rgba(255,229,138,0.32);
          --teal: var(--uf-teal);
          --teal-bright: var(--uf-green-700);
          --teal-dim: var(--uf-teal-soft);
          --danger: var(--uf-neg);
          --purple: #a78bfa;
          --font-display: var(--uf-font);
          --font-body: var(--uf-font);
          --font-mono: 'Inter', sans-serif;
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

        /* -- SCREEN -- */
        .uf-screen { width: 100%; max-width: 540px; margin: 0 auto; padding: 40px 24px 24px; position: relative; z-index: 1; }
        .uf-reveal-screen { max-width: 1100px; padding-left: 0; padding-right: 0; padding-top: 0; }

        /* -- TYPOGRAPHY -- */
        .uf-hint { font-size: 11px; color: var(--text-dim); margin-top: 8px; }

        @media (max-height: 700px) and (min-width: 901px) {
          .uf-screen { padding-top: 4px; z-index: 60; }
        }

        /* -- WIZARD PROGRESS -- */

        /* -- BUTTONS -- */
        .uf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 28px; border-radius: 8px; font-family: var(--font-body); font-size: 15px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; text-decoration: none; }
        .uf-btn-primary { background: var(--accent); color: var(--uf-card); }
        .uf-btn-primary:hover:not(:disabled) { background: var(--teal-bright); transform: translateY(-1px); box-shadow: 0 8px 24px var(--accent-glow); }
        .uf-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

        /* -- INPUTS -- */

        /* -- MODE PILLS -- */
        .uf-mode-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .uf-mode-pill { padding: 7px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted); font-family: var(--font-body); transition: all 0.15s; }
        .uf-mode-pill:hover { border-color: var(--accent); color: var(--accent); }
        .uf-mode-pill.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); font-weight: 700; }

        /* -- RANGE SLIDER -- */

        /* -- DROPDOWN -- */

        /* -- CUSTOM CITY -- */

        /* -- CITY INFO -- */

        /* -- STAT ROW -- */

        /* -- CARD -- */
        .uf-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .uf-card-accent { background: var(--accent-dim); border-color: var(--border); }
        .uf-card-sub { font-size: 13px; color: var(--text-muted); }
        .uf-card-hint { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
        .uf-hourly { font-family: var(--font-mono); font-size: 24px; font-weight: 700; color: var(--accent); margin-top: 4px; }
        .uf-hourly::before { content: '$'; }

        /* -- TAX -- */

        /* -- PROGRESS BAR -- */

        /* -- HERO SCREEN -- */

        /* Two-column inner grid */


        /* Hero CTA row */

        /* Live counter */

        /* Badge */

        /* Teal headline span */

        /* Power CTA */

        /* Dashboard preview card */

        /* Stats strip below hero */

        /* Entrance animations */

        /* Social proof */

        /* -- GOALS GRID -- */

        /* Mobile responsive for hero */
        @media(max-width: 900px) {
          .uf-nav { padding: 0 18px; gap: 14px; }
          .uf-nav-dots { margin-left: auto; }
          .uf-nav-actions { display: none; }
        }

        @media(max-width: 480px) {
          .uf-nav { justify-content: flex-start; padding: 0 16px; }
          .uf-nav-dots { display: none; }
          .uf-screen { padding: 28px 16px 20px; }
        }

        /* -- REVEAL -- */


        @media (prefers-reduced-motion: reduce) {
        }
        .uf-bridge-target-card,
        .uf-bridge-move-card,
        .uf-bridge-target-card > span,
        .uf-bridge-aurora,
        .uf-bridge-target-card,
        .uf-bridge-move-card,
        .uf-bridge-target-card > span,
        .uf-screen.uf-reveal-screen {
          width: 100%;
          max-width: none;
          padding: 0;
        }
        .uf-bridge-path-base,
        .uf-bridge-axis-label,
        .uf-bridge-target-card,
        .uf-bridge-move-card,
        .uf-bridge-target-card > span,
        .uf-bridge-target-card small,
        .uf-bridge-timeline,
        .uf-bridge-base-column,
        .uf-bridge-column.is-plan-target .uf-bridge-plan-column,
        .uf-bridge-plan-column::before,






        /* -- WAITLIST INLINE -- */

/* -- SHARE TRIGGER -- */

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
        .uf-share-card-option { border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted); border-radius: 999px; padding: 10px 12px; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.18s; }
        .uf-share-card-option:hover { border-color: var(--text); color: var(--text); }
        .uf-share-card-option.active { background: var(--uf-ink); border-color: var(--uf-ink); color: var(--uf-card); }

        /* Share preview card */
        .uf-share-card { background: #151719; border: none; border-radius: 24px; padding: 26px 24px 20px; margin-bottom: 20px; text-align: center; position: relative; overflow: hidden; }
        .uf-share-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,229,138,0.5), transparent); }
        .uf-share-card-brand { display: flex; align-items: center; justify-content: center; gap: 5px; margin-bottom: 18px; }
        .uf-share-card-label { font-size: 13px; font-weight: 700; color: #FFE58A; margin-bottom: 10px; }
        .uf-share-card-number { font-family: var(--font-mono); font-size: clamp(30px, 7vw, 46px); font-weight: 800; color: #fff; margin-bottom: 10px; line-height: 1; }
        .uf-share-card-meta { font-family: var(--font-mono); font-size: 12px; color: #FFE58A; margin-bottom: 5px; letter-spacing: 0.3px; font-weight: 700; }
        .uf-share-card-city { font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 16px; }
        .uf-share-card-divider { height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 14px; }
        .uf-share-card-url { font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.8px; font-family: var(--font-mono); }
        .uf-share-card-identity { display: grid; gap: 10px; }
        .uf-share-card-avatar-shell { display: flex; justify-content: center; margin-bottom: 4px; }
        .uf-share-card-avatar-stage { width: 190px; max-width: 100%; min-height: 220px; border-radius: 18px; background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); display: flex; align-items: flex-end; justify-content: center; overflow: hidden; margin: 0 auto; }
        .uf-share-card-code { font-family: var(--font-mono); font-size: 26px; font-weight: 800; letter-spacing: 0.24em; color: #FFE58A; margin-left: 0.24em; }
        .uf-share-card-quote { color: rgba(255,255,255,0.82); font-size: 14px; line-height: 1.5; font-style: italic; margin-top: 2px; }
        .uf-share-card-benchmark-stat { display: inline-flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; color: #FFF5CB; font-size: 12px; font-weight: 700; }
        .uf-share-card-benchmark-stat span { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.08); }

        /* Platform share buttons */
        .uf-share-btns { display: flex; flex-direction: column; gap: 9px; }
        .uf-share-btn { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 12px 18px; border-radius: 999px; font-family: var(--font-body); font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.18s; }
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
        .uf-share-email { background: var(--uf-blue); color: var(--uf-ink); border: 1px solid var(--border); }
        .uf-share-email:hover { border-color: var(--text); }
        .uf-share-more { background: var(--uf-ink); color: var(--uf-card); border: 1px solid var(--uf-ink); }
        .uf-share-more:hover { background: var(--uf-green-700); }
        .uf-share-copy { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }
        .uf-share-copy:hover { color: var(--text); background: var(--bg-card); border-color: var(--accent); }

        @media (max-width: 640px) {
          .uf-share-card-options { grid-template-columns: 1fr; }
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
        }

        /* -- REVEAL DESIGN E LAYOUT -- */
        /* card padding adapts across breakpoints */
        .uf-reveal-continuation .uf-unified-card,
        .uf-reveal-continuation .uf-unified-card div,
        .uf-reveal-continuation .uf-unified-card p,
        .uf-reveal-continuation .uf-unified-card span,
        .uf-reveal-continuation .uf-next-step-card div,
        .uf-reveal-continuation .uf-assumptions-card div,
        .uf-reveal-continuation .uf-unified-card div[style*="text-transform"],
        .uf-reveal-continuation .uf-next-step-card div[style*="text-transform"],
        .uf-reveal-continuation .uf-unified-card .uf-unified-stat,
        .uf-reveal-continuation .uf-unified-stat,
        .uf-reveal-continuation .uf-unified-card div[style*="font-size: 30"],
        .uf-reveal-continuation .uf-next-step-card strong,
        .uf-reveal-continuation .uf-unified-card .uf-unified-stat-label,
        .uf-reveal-continuation .uf-unified-stat-label,
        .uf-reveal-footer-actions.uf-motion-depth,
        .uf-reveal-continuation .uf-unified-card,
        .uf-reveal-continuation .uf-next-step-card,
        .uf-bridge-move-card,
        .uf-bridge-save,
        @media (hover: hover) and (pointer: fine) {
          .uf-reveal-continuation .uf-unified-card:hover,
          .uf-bridge-save:hover,
          .uf-bridge-save:active,
        }
        .uf-reveal-continuation .uf-assumptions-card [style*="borderTop"],
        .uf-reveal-continuation .uf-geo-section p,
        @media (prefers-reduced-motion: reduce) {
          .uf-motion-depth,
          .uf-reveal-footer-actions.uf-motion-depth,
          .uf-bridge-aurora,
          .uf-bridge-gridwash,
          .uf-bridge-chart-sweep,
          .uf-motion-magic,
          .uf-reveal-continuation .uf-unified-avatar-shell,
          .uf-bridge-save,
        }
        body.uf-flow-mode .uf-home-seo-shell {
          display: none !important;
        }
        /* Landing-style reveal polish: calm uf7 palette, no orange/yellow accent family. */
        .uf-bridge-chip,
        .uf-bridge-age,
        .uf-bridge-chart-plot,
        .uf-bridge-runway,
        .uf-bridge-move-card,
        .uf-reveal-continuation .uf-unified-card,
        .uf-reveal-continuation .uf-next-step-card,
        .uf-bridge-chart-flag,
        @media (hover: hover) and (pointer: fine) {
          .uf-reveal-continuation .uf-unified-card:hover,
          .uf-bridge-move-card:hover,
          .uf-bridge-save:hover,
        }
        body.uf-result-mode { overflow-x: hidden; }
        @media (max-width: 640px) {
        }
        /* footer buttons row */

        /* 1024px — decision grid 4→2 col before it gets cramped */
        @media (max-width: 1024px) {
        }
        /* 900px — chart stacks above monthly move */
        @media (max-width: 900px) {
        }
        /* 640px — hero stacks, identity stacks */
        @media (max-width: 640px) {
        }
        /* 480px — footer buttons stack to full-width column */
        @media (max-width: 480px) {
        }
        /* -- FOOTER DIVIDER -- */
      `}</style>

      {screen === "hero" ? (
        <LandingPage onStart={() => setScreen("city")} signedIn={signedIn} referred={!!landingSource?.startsWith("ref-")} />
      ) : (
      <>
      <div hidden={screen === "reveal"}>
        <BrandedIntake initialCity={cityState} initialCurrency={currency} startAt={screen === "income" ? 3 : 0}
          currencyForState={stateToCurrency} onBack={()=>setScreen("hero")}
          onStep={index=>{const ids:Record<number,CalculatorStepId>={1:'city',3:'income',4:'savings',5:'portfolio',6:'age'};if(ids[index])trackCalculatorStepViewed(ids[index],landingSource)}}
          onComplete={answer=>{setCityState(answer.city);setCurrency(answer.currency);setIncome(answer.income);setSavings(answer.income/12-answer.expenses);setPortfolioBalance(answer.invested);setCurrentAge(answer.age);setScreen("reveal")}}/>
      </div>
      {screen === "reveal" && cityState && <RevealScreen city={cityState} income={income} savings={savings} stateKey={cityState.stateKey} currency={currency} currentAge={currentAge} portfolioBalance={portfolioBalance} landingSource={landingSource} onAdjust={()=>setScreen("age")}/>}
      </>
      )}
    </>
  );
}
