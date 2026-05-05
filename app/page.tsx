"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { saveCalculatorPrefill } from "@/lib/journey";
import { CITIES, City, STATE_TAX } from "@/lib/fire-data";
import { calcFIRE, calcTakeHome } from "@/lib/fire";
import {
  trackLandingViewed,
  trackCalculatorStepViewed,
  trackCalculatorRevealed,
} from "@/lib/analytics";
import type { CalculatorStepId } from "@/lib/analytics-events";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────────

function Nav({ step, totalSteps, onRestart, onSignIn }: {
  step: number; totalSteps: number; onRestart: () => void; onSignIn: () => void;
}) {
  return (
    <nav className="uf-nav">
      <div className="uf-nav-logo">Until<span>Fire</span></div>
      <div className="uf-nav-dots">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`uf-nav-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>
      {step > 0 && (
        <button className="uf-nav-restart" onClick={onRestart}>Start over</button>
      )}
      {step === 0 && (
        <button className="uf-nav-signin" onClick={onSignIn}>Sign in</button>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

function WizardProgress({ step }: { step: number }) {
  const steps = ["Goals", "City", "Income", "Finances"];
  return (
    <div className="uf-wizard-progress">
      {steps.map((label, i) => (
        <div key={i} className="uf-wizard-row">
          <div className={`uf-wdot ${i < step ? "done" : i === step ? "active" : ""}`} title={label} />
          {i < steps.length - 1 && (
            <div className={`uf-wline ${i < step ? "done" : i === step ? "active" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 0 — HERO (two-column desktop layout)
// ─────────────────────────────────────────────────────────────────────────────

const PREVIEW_BARS = [28, 38, 33, 48, 42, 62, 57, 72, 66, 80, 76, 95];
// Real, verifiable product facts. CITIES.length is read at render time so this
// can never drift out of sync with the dataset.
const HERO_STATS = [
  { v: "Free",                  l: "No credit card" },
  { v: "60s",                   l: "To your FIRE number" },
  { v: `${CITIES.length}`,      l: "Cities supported" },
  { v: "No login",              l: "To run the calculator" },
];

function HeroScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`uf-hero${mounted ? " uf-hero--mounted" : ""}`}>
      {/* Two-column grid */}
      <div className="uf-hero-inner">
        {/* Left — copy */}
        <div className="uf-hero-content">
          <div className="uf-badge">
            <span className="uf-badge-dot" /> Free — no credit card required
          </div>
          <h1 className="uf-h1">
            Financial Independence<br />
            <span className="uf-accent-flame">Through Trusted Growth.</span>
          </h1>
          <p className="uf-body">
            Know exactly when you can retire — adjusted for your city, your income,
            and the 4% rule. Takes 60 seconds. No login required.
          </p>
          <div className="uf-hero-ctas">
            <button className="uf-btn uf-btn-teal uf-btn-lg uf-btn-power" onClick={onStart}>
              Calculate my FIRE number →
            </button>
            <button
              className="uf-btn uf-btn-ghost-dark"
              onClick={onSignIn}
            >
              Log in →
            </button>
          </div>
        </div>

        {/* Right — dashboard preview card */}
        <div className="uf-hero-preview">
          <div className="uf-preview-card">
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#62FAE3", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>Current Net Worth</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 8 }}>
                  $842,150
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#34D399", background: "rgba(52,211,153,0.15)", padding: "2px 8px", borderRadius: 99 }}>↑ 12.4%</span>
                </div>
              </div>
              <div style={{ background: "#064E3B", borderRadius: 8, padding: "8px 14px", textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#62FAE3", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>FIRE Date</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Oct 2031</div>
              </div>
            </div>
            {/* Mini bar chart */}
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 64, marginBottom: 16 }}>
              {PREVIEW_BARS.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: i === PREVIEW_BARS.length - 1 ? "#62FAE3" : "rgba(98,250,227,0.22)", borderRadius: "2px 2px 0 0", transition: "height 0.3s" }} />
              ))}
            </div>
            {/* 3 stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[{ l: "Savings Rate", v: "42.5%" }, { l: "Portfolio", v: "$714K" }, { l: "Target", v: "$1.5M" }].map(s => (
                <div key={s.l} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.4px" }}>{s.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{s.v}</div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Progress to FIRE</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#62FAE3" }}>47.6%</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "47.6%", background: "linear-gradient(90deg, #059669, #62FAE3)", borderRadius: 99 }} />
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
            Sample dashboard — your numbers will differ
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="uf-hero-strip">
        {HERO_STATS.map(s => (
          <div key={s.l} className="uf-hero-strip-item">
            <div className="uf-hero-strip-val">{s.v}</div>
            <div className="uf-hero-strip-lab">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1 — GOALS
// ─────────────────────────────────────────────────────────────────────────────

const FIRE_GOALS = [
  { id: "early",   emoji: "🚀", title: "Early Retirement",      desc: "Exit the workforce fully — the classic FIRE path." },
  { id: "coast",   emoji: "🌊", title: "Coast FIRE",             desc: "Work part-time or passion projects while investments compound." },
  { id: "gen",     emoji: "🌳", title: "Generational Wealth",    desc: "Build a lasting financial legacy for your family." },
  { id: "nomad",   emoji: "🌍", title: "Nomadic Lifestyle",      desc: "Travel freely with a portfolio that funds the journey." },
];

function GoalsScreen({ onNext, onBack }: { onNext: (goal: string) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="uf-screen">
      <WizardProgress step={0} />
      <p className="uf-step-label">Step 1 of 4</p>
      <div className="uf-eyebrow">Your path</div>
      <h2 className="uf-h2">What&apos;s your <span className="uf-accent">FIRE goal?</span></h2>
      <p className="uf-body" style={{ marginBottom: 28 }}>
        Choose the lifestyle you&apos;re working toward. This shapes your projections.
      </p>

      <div className="uf-goals-grid">
        {FIRE_GOALS.map(g => (
          <button
            key={g.id}
            className={`uf-goal-card ${selected === g.id ? "active" : ""}`}
            onClick={() => setSelected(g.id)}
          >
            <div className="uf-goal-top">
              <span className="uf-goal-emoji">{g.emoji}</span>
              <div className={`uf-goal-radio ${selected === g.id ? "checked" : ""}`} />
            </div>
            <div className="uf-goal-title">{g.title}</div>
            <div className="uf-goal-desc">{g.desc}</div>
          </button>
        ))}
      </div>

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button
          className="uf-btn uf-btn-primary"
          style={{ flex: 1 }}
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2 — CITY
// ─────────────────────────────────────────────────────────────────────────────

interface CityState {
  name: string;
  col: number;
  stateKey: string;
  isCustom: boolean;
}

function CityScreen({ onNext, onBack }: {
  onNext: (c: CityState) => void;
  onBack: () => void;
}) {
  const [query, setQuery]           = useState("");
  const [open, setOpen]             = useState(false);
  const [selected, setSelected]     = useState<CityState | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customMonthly, setCustomMonthly] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  const matches = query.trim()
    ? CITIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  function pickCity(city: City) {
    setSelected({ name: city.name, col: city.col, stateKey: city.state, isCustom: false });
    setQuery(city.name);
    setOpen(false);
    setShowCustom(false);
  }

  function openCustom() {
    setOpen(false);
    setShowCustom(true);
    setSelected(null);
    setTimeout(() => document.getElementById("customMonthly")?.focus(), 80);
  }

  function confirmCustom() {
    const monthly = parseInt(customMonthly) || 0;
    if (monthly < 100) return;
    setSelected({ name: query || "Custom City", col: monthly * 12, stateKey: "custom", isCustom: true });
    setShowCustom(false);
  }

  // close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const diff = selected ? selected.col - 52000 : 0;

  return (
    <div className="uf-screen">
      <WizardProgress step={1} />
      <p className="uf-step-label">Step 2 of 4</p>
      <div className="uf-eyebrow">Location</div>
      <h2 className="uf-h2">Where do you want<br />to <span className="uf-accent">retire?</span></h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Your FIRE number changes significantly by city. We use real cost-of-living data — not national averages.
      </p>

      {/* Search input */}
      <label className="uf-label">Start typing your city or country</label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          className="uf-input"
          placeholder="e.g. Austin, Tokyo, London…"
          value={query}
          autoComplete="off"
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            setSelected(null);
            setShowCustom(false);
          }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
        />
        <svg className="uf-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>

        {/* Dropdown */}
        {open && query.trim() && (
          <div ref={dropRef} className="uf-dropdown">
            {matches.map(c => (
              <button key={c.key} className="uf-dropdown-item" onMouseDown={() => pickCity(c)}>
                <span className="uf-dropdown-flag">{c.flag}</span>
                <div>
                  <div className="uf-dropdown-name">{c.name}</div>
                  <div className="uf-dropdown-sub">
                    Est. {fmtUSD(c.col)}/yr · FIRE target {fmtUSD(c.col * 25)}
                  </div>
                </div>
              </button>
            ))}
            {/* Always show custom option */}
            <button className="uf-dropdown-custom" onMouseDown={openCustom}>
              <span className="uf-dropdown-flag">📍</span>
              <div>
                <div className="uf-dropdown-custom-title">
                  &ldquo;{query}&rdquo; — enter my monthly expenses
                </div>
                <div className="uf-dropdown-sub">My city isn&apos;t in the list — I&apos;ll set it manually</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Custom city inline form */}
      {showCustom && (
        <div className="uf-custom-city">
          <label className="uf-label">
            Your city isn&apos;t in our list — enter your estimated monthly expenses (USD)
          </label>
          <div className="uf-custom-row">
            <div style={{ position: "relative", flex: 1 }}>
              <span className="uf-input-prefix">$</span>
              <input
                id="customMonthly"
                type="number"
                className="uf-input uf-input-mono"
                style={{ paddingLeft: 28 }}
                placeholder="e.g. 2800"
                min={100}
                value={customMonthly}
                onChange={e => setCustomMonthly(e.target.value)}
              />
            </div>
            <span className="uf-unit">/month</span>
            <button
              className="uf-btn uf-btn-primary"
              disabled={!customMonthly || parseInt(customMonthly) < 100}
              onClick={confirmCustom}
            >
              Use this
            </button>
          </div>
          <p className="uf-hint">
            We&apos;ll calculate your FIRE number using the 25× rule on your annual expenses.
          </p>
        </div>
      )}

      {/* City info card */}
      {selected && (
        <div className="uf-city-info">
          <div className="uf-city-info-label">
            {selected.isCustom
              ? "📍 Custom city — using your manual monthly expense figure"
              : `${CITIES.find(c => c.name === selected.name)?.flag ?? ""} ${STATE_TAX[selected.stateKey]?.label ?? "Local tax rates apply"}`}
          </div>
          <div className="uf-info-card">
            <div className="uf-info-col">
              <div className="uf-info-val">{fmtUSD(selected.col)}</div>
              <div className="uf-info-lab">Est. annual expenses</div>
            </div>
            <div className="uf-info-divider" />
            <div className="uf-info-col">
              <div className="uf-info-val">{fmtUSD(selected.col * 25)}</div>
              <div className="uf-info-lab">FIRE target (25× rule)</div>
            </div>
            <div className="uf-info-divider" />
            <div className="uf-info-col">
              <div className="uf-info-val" style={{ color: diff > 0 ? "var(--danger)" : "var(--teal)" }}>
                {diff >= 0 ? "+" : ""}{fmtUSD(diff)}
              </div>
              <div className="uf-info-lab">vs. US avg</div>
            </div>
          </div>
        </div>
      )}

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button
          className="uf-btn uf-btn-primary"
          style={{ flex: 1 }}
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2 — INCOME
// ─────────────────────────────────────────────────────────────────────────────

type IncomeMode = 'annual' | 'monthly' | 'biweekly' | 'hourly' | 'takehome';

const INCOME_MODES: { key: IncomeMode; label: string; unit: string; hint: string }[] = [
  { key: 'annual',    label: 'Annual',    unit: '/year',       hint: 'Yearly gross salary' },
  { key: 'monthly',   label: 'Monthly',   unit: '/month',      hint: 'Monthly gross (×12)' },
  { key: 'biweekly',  label: 'Bi-weekly', unit: '/paycheck',   hint: '26 paychecks/yr' },
  { key: 'hourly',    label: 'Hourly',    unit: '/hr',         hint: '2,080 hrs/yr' },
  { key: 'takehome',  label: 'Take-home', unit: '/month',      hint: 'Skip tax calc — enter what lands in your bank' },
];

// Convert any mode's raw value to annual gross
function toAnnualGross(value: number, mode: IncomeMode): number {
  switch (mode) {
    case 'annual':   return value;
    case 'monthly':  return value * 12;
    case 'biweekly': return value * 26;
    case 'hourly':   return value * 2080;
    case 'takehome': return 0; // handled separately
    default:         return value;
  }
}

function IncomeScreen({ stateKey, onNext, onBack }: {
  stateKey: string;
  onNext: (income: number, takeHomeOverride?: number) => void;
  onBack: () => void;
}) {
  // For custom cities we don't know the user's tax jurisdiction. Force
  // take-home mode and lock the other modes so we never silently apply
  // someone else's tax table to their income.
  const isCustomJurisdiction = stateKey === 'custom';
  const [mode, setMode]         = useState<IncomeMode>(isCustomJurisdiction ? 'takehome' : 'annual');
  const [rawValue, setRawValue] = useState<string>('90000');
  const [takeHomeRaw, setTakeHomeRaw] = useState<string>(''); // for take-home mode

  const numVal = parseFloat(rawValue) || 0;

  // Derived annual gross
  const annualGross = mode === 'takehome' ? 0 : toAnnualGross(numVal, mode);

  // Take-home mode: user enters monthly take-home directly
  const monthlyTakeHome = mode === 'takehome'
    ? (parseFloat(takeHomeRaw) || 0)
    : 0;
  const annualTakeHome = monthlyTakeHome * 12;

  // Tax calc — use real calc for gross modes, back-calculate for take-home mode
  const tax = mode !== 'takehome' ? calcTakeHome(annualGross, stateKey) : null;

  // For take-home mode: back-calculate effective rate if gross also entered
  const customEffectiveRate = (mode === 'takehome' && annualGross === 0)
    ? null
    : null; // could extend later to accept both gross + take-home

  // What we display in the stat cards
  const displayGross    = mode === 'takehome' ? null : annualGross;
  const displayTakeHome = mode === 'takehome' ? annualTakeHome : (tax?.takeHome ?? 0);
  const displayMonthly  = displayTakeHome / 12;
  const displayHourly   = displayTakeHome / 2080;
  const displayEffRate  = mode === 'takehome' ? null : (tax?.effectiveRate ?? 0);

  // What we pass to FIRE calc (always annual take-home equivalent)
  // For gross modes: use tax.takeHome as proxy for income used in savings rate calc
  // For take-home mode: monthly * 12 is the take-home
  const incomeForFIRE = mode === 'takehome' ? annualTakeHome : (tax?.takeHome ?? 0);

  // Placeholder per mode
  const placeholders: Record<IncomeMode, string> = {
    annual:   '90000',
    monthly:  '7500',
    biweekly: '3462',
    hourly:   '43',
    takehome: '5000',
  };

  const canContinue = mode === 'takehome'
    ? monthlyTakeHome > 0
    : annualGross > 0;

  return (
    <div className="uf-screen">
      <WizardProgress step={2} />
      <p className="uf-step-label">Step 3 of 4</p>
      <div className="uf-eyebrow">Income</div>
      <h2 className="uf-h2">What do you <span className="uf-accent">earn?</span></h2>
      <p className="uf-body" style={{ marginBottom: 24 }}>
        Enter however your pay is structured — we&apos;ll handle the conversion.
      </p>

      {/* Mode pills */}
      <div className="uf-mode-pills">
        {INCOME_MODES.map(m => {
          const disabled = isCustomJurisdiction && m.key !== 'takehome';
          return (
            <button
              key={m.key}
              className={`uf-mode-pill ${mode === m.key ? 'active' : ''}`}
              disabled={disabled}
              title={disabled ? "Custom city — tax jurisdiction unknown. Enter take-home directly." : undefined}
              style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              onClick={() => { if (disabled) return; setMode(m.key); setRawValue(''); }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {isCustomJurisdiction ? (
        <p className="uf-hint" style={{ marginBottom: 16, color: 'var(--accent)' }}>
          Custom city: we don&apos;t know your tax jurisdiction, so we can&apos;t estimate
          take-home from gross. Enter your monthly take-home directly.
        </p>
      ) : (
        <p className="uf-hint" style={{ marginBottom: 16 }}>
          {INCOME_MODES.find(m => m.key === mode)?.hint}
        </p>
      )}

      {/* Main input */}
      {mode !== 'takehome' ? (
        <>
          <label className="uf-label">
            {mode === 'annual'   && 'Annual gross income'}
            {mode === 'monthly'  && 'Monthly gross income (before tax)'}
            {mode === 'biweekly' && 'Bi-weekly gross paycheck'}
            {mode === 'hourly'   && 'Hourly rate (gross)'}
          </label>
          <div className="uf-big-input-wrap">
            <span className="uf-input-prefix uf-big-prefix">$</span>
            <input
              key={mode}
              type="number"
              className="uf-input uf-input-mono uf-input-big"
              style={{ paddingLeft: 28 }}
              value={rawValue}
              placeholder={placeholders[mode]}
              min={0}
              onChange={e => setRawValue(e.target.value)}
              autoFocus
            />
            <span className="uf-unit">{INCOME_MODES.find(m => m.key === mode)?.unit}</span>
          </div>
          {/* Slider only for annual mode */}
          {mode === 'annual' && (
            <div className="uf-slider-wrap">
              <input
                type="range" min={20000} max={500000} step={5000}
                value={Math.min(annualGross || 0, 500000)}
                className="uf-range"
                onChange={e => setRawValue(e.target.value)}
              />
              <div className="uf-range-labels"><span>$20k</span><span>$250k</span><span>$500k+</span></div>
            </div>
          )}
        </>
      ) : (
        /* Take-home mode */
        <>
          <label className="uf-label">Monthly take-home (what actually lands in your bank)</label>
          <div className="uf-big-input-wrap">
            <span className="uf-input-prefix uf-big-prefix">$</span>
            <input
              type="number"
              className="uf-input uf-input-mono uf-input-big"
              style={{ paddingLeft: 28 }}
              value={takeHomeRaw}
              placeholder="5000"
              min={0}
              onChange={e => setTakeHomeRaw(e.target.value)}
              autoFocus
            />
            <span className="uf-unit">/month</span>
          </div>
          <p className="uf-hint" style={{ marginBottom: 8 }}>
            We&apos;ll skip the tax calculator and use this directly for your FIRE projection.
          </p>
        </>
      )}

      {/* Stat cards */}
      {canContinue && (
        <div className="uf-stat-row" style={{ marginTop: 20 }}>
          {mode !== 'takehome' && displayGross !== null && (
            <div className="uf-stat-box">
              <div className="uf-stat-val">{fmtUSD(displayGross)}</div>
              <div className="uf-stat-lab">Gross annual</div>
            </div>
          )}
          <div className="uf-stat-box">
            <div className="uf-stat-val" style={{ color: 'var(--teal)' }}>{fmtUSD(displayTakeHome)}</div>
            <div className="uf-stat-lab">Annual take-home</div>
          </div>
          <div className="uf-stat-box">
            <div className="uf-stat-val">{fmtUSD(displayMonthly)}</div>
            <div className="uf-stat-lab">Monthly take-home</div>
          </div>
        </div>
      )}

      {/* Tax breakdown — only for gross modes */}
      {mode !== 'takehome' && tax && canContinue && (
        <>
          <div className="uf-card" style={{ marginTop: 14 }}>
            <div className="uf-card-head">Tax breakdown</div>
            <div className="uf-tax-row">
              <span className="uf-tax-label">Federal income tax</span>
              <span className="uf-mono">{tax.fedTax > 0 ? `-${fmtUSD(tax.fedTax)}` : tax.isUSCity ? '$0' : 'n/a'}</span>
            </div>
            <div className="uf-tax-row">
              <span className="uf-tax-label">{tax.isUSCity ? 'State / local tax' : 'Est. income tax'} ({tax.jurisdictionLabel})</span>
              <span className="uf-mono">{tax.stateTax > 0 ? `-${fmtUSD(tax.stateTax)}` : '$0'}</span>
            </div>
            {tax.isUSCity && (
              <div className="uf-tax-row">
                <span className="uf-tax-label">FICA (Social Security + Medicare)</span>
                <span className="uf-mono">{tax.fica > 0 ? `-${fmtUSD(tax.fica)}` : '$0'}</span>
              </div>
            )}
            <div className="uf-tax-divider" />
            <div className="uf-tax-row" style={{ fontWeight: 500 }}>
              <span>Effective total tax rate</span>
              <span className="uf-mono uf-accent">{displayEffRate?.toFixed(1)}%</span>
            </div>
          </div>
          <div className="uf-card uf-card-accent" style={{ marginTop: 12 }}>
            <div className="uf-card-sub">Your <strong>real hourly rate</strong> after all taxes</div>
            <div className="uf-hourly">{displayHourly.toFixed(2)}/hr</div>
            <div className="uf-card-hint">Based on 2,080 working hours/yr</div>
          </div>
        </>
      )}

      {/* Take-home mode note */}
      {mode === 'takehome' && canContinue && (
        <div className="uf-card" style={{ marginTop: 14, background: 'var(--teal-dim)', borderColor: 'rgba(34,211,165,0.2)' }}>
          <div className="uf-tax-row" style={{ fontWeight: 500 }}>
            <span>Annual take-home (estimated)</span>
            <span className="uf-mono" style={{ color: 'var(--teal)' }}>{fmtUSD(annualTakeHome)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
            Tax breakdown skipped — using your real take-home directly. Most accurate option if our tax estimate felt off.
          </div>
        </div>
      )}

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button
          className="uf-btn uf-btn-primary"
          style={{ flex: 1 }}
          disabled={!canContinue}
          onClick={() => onNext(incomeForFIRE)}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3 — SAVINGS
// ─────────────────────────────────────────────────────────────────────────────

// income is now always annual take-home (already post-tax) from IncomeScreen
function SavingsScreen({ income, stateKey, onNext, onBack }: {
  income: number; stateKey: string;
  onNext: (savings: number, currentAge?: number) => void;
  onBack: () => void;
}) {
  const [savings, setSavings] = useState(1500);
  const [ageRaw, setAgeRaw] = useState<string>("");
  const parsedAge = (() => {
    const n = parseInt(ageRaw, 10);
    return Number.isFinite(n) && n >= 16 && n <= 90 ? n : undefined;
  })();
  // income is already take-home annual — divide by 12 for monthly
  const monthly = income / 12;
  const rate = monthly > 0 ? Math.round((savings / monthly) * 100) : 0;

  const rateColor = rate < 15 ? "var(--danger)" : rate < 30 ? "var(--accent)" : "var(--teal)";
  const rateLabel = rate < 10 ? "Very low" : rate < 20 ? "Below average" : rate < 30 ? "Average"
    : rate < 40 ? "Good" : rate < 50 ? "Strong" : "FIRE pace! 🔥";

  return (
    <div className="uf-screen">
      <WizardProgress step={3} />
      <p className="uf-step-label">Step 4 of 4</p>
      <div className="uf-eyebrow">Finances</div>
      <h2 className="uf-h2">How much are you <span className="uf-accent">saving?</span></h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Don&apos;t worry about being exact — we&apos;ll help you track real numbers after setup.
      </p>

      <label className="uf-label">Monthly savings amount</label>
      <div className="uf-big-input-wrap">
        <span className="uf-input-prefix uf-big-prefix">$</span>
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
          type="range" min={0} max={10000} step={100}
          value={Math.min(savings, 10000)}
          className="uf-range"
          onChange={e => setSavings(parseInt(e.target.value))}
        />
        <div className="uf-range-labels"><span>$0</span><span>$5k</span><span>$10k/mo</span></div>
      </div>

      <div className="uf-stat-row">
        <div className="uf-stat-box">
          <div className="uf-stat-val uf-accent">{fmtUSD(savings)}/mo</div>
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

      <div style={{ marginTop: 20 }}>
        <label className="uf-label" htmlFor="uf-current-age">
          Your current age <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional — used to project your retirement age)</span>
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
        <p className="uf-hint">Leave blank if you&apos;d rather not say — we&apos;ll just show your FIRE year, not your age at FIRE.</p>
      </div>

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} onClick={() => onNext(savings, parsedAge)}>
          Show my FIRE number 🔥
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST INLINE — shown on reveal screen
// ─────────────────────────────────────────────────────────────────────────────

function WaitlistInline({ fireTarget, retireYear }: { fireTarget: number; retireYear: number }) {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit() {
    if (!isValid || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fireTarget, retireYear }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="uf-wl-inline uf-wl-done">
        <span style={{ fontSize: 18 }}>&#x2713;</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--teal)" }}>You&apos;re on the list</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>We&apos;ll email you when the FIRE adviser launches.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="uf-wl-inline">
      <div className="uf-wl-inline-head">
        <div className="uf-wl-inline-title">Get early access to the FIRE adviser</div>
        <div className="uf-wl-inline-sub">
          Tells you exactly what to do each month to reach {fmtUSD(fireTarget)} by {retireYear}. Launching at $9/mo.
        </div>
      </div>
      <div className="uf-wl-inline-form">
        <input
          type="email"
          className="uf-input"
          style={{ flex: 1, fontSize: 14, padding: "11px 14px" }}
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        <button
          className="uf-btn uf-btn-primary"
          style={{ whiteSpace: "nowrap", padding: "11px 20px", fontSize: 14, opacity: status === "loading" ? 0.6 : 1 }}
          disabled={!isValid || status === "loading"}
          onClick={handleSubmit}
        >
          {status === "loading" ? "Joining…" : "Join waitlist"}
        </button>
      </div>
      {status === "error" && (
        <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>Something went wrong. Try again.</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ShareModal({
  retireYear, years, cityName, onClose,
}: {
  retireYear: number; years: number; cityName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://untilfire.com/share?city=${encodeURIComponent(cityName)}&year=${retireYear}&years=${years}`;
  const shareText = `Ran my FIRE numbers on untilfire.com — it shows when you could retire based on where you live. Free, no login, takes 60 seconds. Mine came back ${cityName} by ${retireYear}. Worth a look.`;
  const redditTitle = `Found a free FIRE calculator that factors in your city — here's what it said for ${cityName}`;

  function copyToClipboard() {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openShare(platform: "x" | "facebook" | "reddit") {
    const encodedText = encodeURIComponent(shareText);
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
        <button className="uf-share-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="uf-share-heading">Share this discovery</div>

        {/* Preview card */}
        <div className="uf-share-card">
          <div className="uf-share-card-brand">
            <span className="uf-share-card-logo">until<span>fire</span></span>
          </div>
          <div className="uf-share-card-label" style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: 11 }}>Retire in</div>
          <div className="uf-share-card-number" style={{ fontSize: 28 }}>{cityName}</div>
          <div className="uf-share-card-meta" style={{ fontSize: 22, color: '#62FAE3', fontWeight: 800 }}>by {retireYear}</div>
          <div className="uf-share-card-city" style={{ color: 'rgba(255,255,255,0.4)' }}>{years} years away · free calculator</div>
          <div className="uf-share-card-divider" />
          <div className="uf-share-card-url">What does your city look like? → untilfire.com</div>
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

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 4 — REVEAL
// ─────────────────────────────────────────────────────────────────────────────

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

function RevealScreen({ city, income, savings, stateKey, fireGoal, currentAge, onAdjust }: {
  city: CityState; income: number; savings: number; stateKey: string; fireGoal: string;
  currentAge?: number;
  onAdjust: () => void;
}) {
  const result = calcFIRE(savings, city.col, currentAge);
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
        fireGoal,
      });
    }
  }, [revealed, stateKey, city.isCustom, result.fireTarget, result.years, fireGoal]);

  // Delta calculations
  const highSaver = calcFIRE((takeHome / 12) * 0.5, city.col, currentAge);
  const costYears = Math.max(0, result.years - highSaver.years).toFixed(1);

  const d1 = calcFIRE(savings + city.col * 0.04 / 12, city.col, currentAge);
  const d2 = calcFIRE(savings + 416, city.col, currentAge);
  const d3 = calcFIRE(Math.max(0, savings - income * 0.1 / 12), city.col, currentAge);
  const d4 = calcFIRE(savings + 500, city.col, currentAge);

  const calcLabels = ["City cost-of-living", "After-tax income", "Compound growth at 7%", "25× withdrawal rule"];

  return (
    <div className="uf-screen uf-reveal-screen">
      {showShare && (
        <ShareModal
          retireYear={result.retireYear}
          years={result.years}
          cityName={city.name}
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
          <div className="uf-fire-hero">
            <div className="uf-fire-eyebrow">Your estimated FIRE number</div>
            <div ref={numRef} className="uf-fire-num">
              {fmtUSD(counted)}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginBottom: 8, fontFamily: "'Manrope', sans-serif" }}>
              Based on the 4% rule: save this amount and live off investment returns without running out of money.
            </div>
            <div className="uf-fire-date-row">
              <div className="uf-fire-date-line" />
              <div className="uf-fire-date">
                {result.age !== undefined
                  ? `You could retire in ${result.retireYear} at age ${result.age}`
                  : `You could retire in ${result.retireYear} (${result.years} year${result.years === 1 ? '' : 's'} from now)`}
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
                Share my FIRE number
              </button>
            )}
          </div>

          {revealed && (
            <>
              {/* Cost statement */}
              <div className="uf-cost-card">
                <div className="uf-cost-label">At your current savings rate, your spending is costing you</div>
                <div className="uf-cost-years">{costYears} years</div>
                <div className="uf-cost-sub">of freedom vs. someone saving 50% of their income</div>
              </div>

              {/* Delta grid */}
              <div className="uf-delta-grid">
                {[
                  { label: "Cut dining out by 20%",    val: (result.years - d1.years), positive: true },
                  { label: "Save $500/mo more today",  val: (result.years - d4.years), positive: true },
                  { label: "Take a 10% pay cut",       val: (d3.years - result.years), positive: false },
                  { label: "Invest your annual bonus", val: (result.years - d2.years), positive: true },
                ].map((item, i) => (
                  <div key={i} className={`uf-delta-card ${item.positive ? "positive" : "negative"}`}>
                    <div className="uf-delta-label">{item.label}</div>
                    <div className={`uf-delta-val ${item.positive ? "pos" : "neg"}`}>
                      {item.positive
                        ? item.val > 0 ? `-${item.val.toFixed(1)} yrs` : "< 1 yr"
                        : `+${item.val.toFixed(1)} yrs`}
                    </div>
                  </div>
                ))}
              </div>

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
      fireGoal,
      fireTarget: result.fireTarget,
      retireYear: result.retireYear,
      generatedAt: new Date().toISOString(),
    });
  }}
>
  Save this plan and open your dashboard
</Link>
              <Link href="/learn/how-fire-assumptions-change-your-retirement-date" className="uf-btn uf-btn-ghost uf-btn-full" style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>See what changes your retirement date</Link>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="uf-btn uf-btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={onAdjust}>Adjust inputs</button>
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

// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST
// ─────────────────────────────────────────────────────────────────────────────

function WaitlistSection() {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle");

  async function handleSubmit() {
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch { setStatus("error"); }
  }

  return (
    <div className="uf-waitlist">
      <div className="uf-eyebrow" style={{ textAlign: "center", marginBottom: 16 }}>🔥 Coming Soon</div>
      <h2 className="uf-h2" style={{ textAlign: "center", marginBottom: 12 }}>Get the AI roadmap</h2>
      <p className="uf-body" style={{ textAlign: "center", marginBottom: 32 }}>
        Join the waitlist for the AI-powered FIRE roadmap: a personalized monthly plan to retire faster. Launching at $9/mo.
      </p>
      {status === "done" ? (
        <div className="uf-waitlist-success">🎉 You&apos;re on the list! We&apos;ll email you when we launch.</div>
      ) : (
        <div className="uf-waitlist-form">
          <input
            type="email" placeholder="your@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            className="uf-input"
          />
          <button
            className="uf-btn uf-btn-primary"
            disabled={status === "loading"}
            onClick={handleSubmit}
            style={{ whiteSpace: "nowrap" }}
          >
            {status === "loading" ? "Joining..." : "Join waitlist"}
          </button>
        </div>
      )}
      {status === "error" && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>Something went wrong. Try again.</p>}
      <p className="uf-hint" style={{ textAlign: "center", marginTop: 16 }}>No spam. Unsubscribe anytime.</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

type Screen = "hero" | "goals" | "city" | "income" | "savings" | "reveal";

export default function Home() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("hero");

  // Wizard state
  const [fireGoal, setFireGoal]     = useState<string>("early");
  const [cityState, setCityState]   = useState<CityState | null>(null);
  const [income, setIncome]         = useState(90000);
  const [savings, setSavings]       = useState(1500);
  const [currentAge, setCurrentAge] = useState<number | undefined>(undefined);

  // Auth redirect — keep existing behaviour
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
      trackLandingViewed();
      return;
    }
    const stepMap: Partial<Record<Screen, CalculatorStepId>> = {
      goals: "goals",
      city: "city",
      income: "income",
      savings: "savings",
    };
    const stepId = stepMap[screen];
    if (stepId) {
      trackCalculatorStepViewed(stepId, fireGoal);
    }
  }, [screen, fireGoal]);

  function signIn() {
    router.push('/login');
  }

  const STEP_MAP: Record<Screen, number> = { hero: 0, goals: 1, city: 2, income: 3, savings: 4, reveal: 5 };
  const totalDots = 6;

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

        /* ── NAV ── */
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

        /* ── SCREEN ── */
        .uf-page { padding-top: 56px; min-height: 100vh; display: flex; flex-direction: column; align-items: stretch; position: relative; background: var(--bg); }
        .uf-page-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .uf-atm-orb { position: absolute; border-radius: 50%; filter: blur(120px); will-change: transform, opacity; }
        .uf-atm-orb-1 { width: 600px; height: 600px; top: -100px; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(6,78,59,0.07) 0%, transparent 70%); animation: orbDrift1 14s ease-in-out infinite alternate; }
        .uf-atm-orb-2 { width: 450px; height: 450px; top: 40vh; left: -120px; background: radial-gradient(circle, rgba(32,212,191,0.07) 0%, transparent 70%); animation: orbDrift2 18s ease-in-out 2s infinite alternate; }
        .uf-atm-orb-3 { width: 360px; height: 360px; top: 20vh; right: -100px; background: radial-gradient(circle, rgba(6,78,59,0.05) 0%, transparent 70%); animation: orbDrift3 22s ease-in-out 4s infinite alternate; }
        .uf-screen { width: 100%; max-width: 540px; margin: 0 auto; padding: 40px 24px 24px; position: relative; z-index: 1; }
        .uf-reveal-screen { max-width: 680px; }
        .uf-section-sep { width: 240px; height: 1px; margin: 0 auto; background: linear-gradient(90deg, transparent, var(--border-light), transparent); position: relative; z-index: 1; }

        /* ── TYPOGRAPHY ── */
        .uf-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
        .uf-h1 { font-family: var(--font-display); font-size: clamp(32px,5vw,52px); font-weight: 800; line-height: 1.05; letter-spacing: -1px; color: var(--text); margin-bottom: 14px; }
        .uf-h2 { font-family: var(--font-display); font-size: clamp(24px,4vw,38px); font-weight: 700; line-height: 1.1; letter-spacing: -0.5px; color: var(--text); margin-bottom: 8px; }
        .uf-accent { color: var(--accent); }
        .uf-body { font-size: 16px; line-height: 1.6; color: var(--text-muted); }
        .uf-mono { font-family: var(--font-mono); }
        .uf-hint { font-size: 11px; color: var(--text-dim); margin-top: 8px; }
        .uf-step-label { font-size: 12px; color: var(--text-muted); margin-bottom: 32px; }

        /* ── WIZARD PROGRESS ── */
        .uf-wizard-progress { display: flex; align-items: center; margin-bottom: 8px; }
        .uf-wizard-row { display: flex; align-items: center; flex: 1; }
        .uf-wizard-row:last-child { flex: 0; }
        .uf-wdot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); flex-shrink: 0; transition: all 0.3s; }
        .uf-wdot.done { background: var(--teal); }
        .uf-wdot.active { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
        .uf-wline { flex: 1; height: 2px; background: var(--border); margin: 0 2px; transition: background 0.4s; }
        .uf-wline.done { background: var(--teal); }
        .uf-wline.active { background: var(--accent); }

        /* ── BUTTONS ── */
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

        /* ── INPUTS ── */
        .uf-label { font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; display: block; letter-spacing: 0.2px; }
        .uf-input { width: 100%; background: #fff; border: 1.5px solid var(--border); border-radius: 8px; padding: 11px 14px; font-family: var(--font-body); font-size: 14px; color: var(--text); outline: none; transition: border-color 0.2s; }
        .uf-input:focus { border-color: #047857; box-shadow: 0 0 0 3px rgba(6,78,59,0.12); }
        .uf-input-mono { font-family: var(--font-mono); font-size: 18px; font-weight: 500; }
        .uf-input-big { padding: 12px 14px; }
        .uf-big-input-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .uf-input-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 15px; pointer-events: none; }
        .uf-big-prefix { font-size: 18px; font-weight: 500; }
        .uf-unit { font-size: 14px; color: var(--text-muted); white-space: nowrap; }

        /* ── MODE PILLS ── */
        .uf-mode-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .uf-mode-pill { padding: 7px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: #fff; color: var(--text-muted); font-family: var(--font-body); transition: all 0.15s; }
        .uf-mode-pill:hover { border-color: #047857; color: var(--accent); }
        .uf-mode-pill.active { background: #ECFDF5; border-color: #047857; color: #065F46; font-weight: 700; }

        /* ── RANGE SLIDER ── */
        .uf-slider-wrap { margin: 8px 0; }
        .uf-range { width: 100%; -webkit-appearance: none; height: 4px; border-radius: 2px; background: var(--border); outline: none; cursor: pointer; }
        .uf-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid #fff; box-shadow: 0 0 0 2px var(--accent); cursor: pointer; }
        .uf-range-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); margin-top: 6px; }

        /* ── DROPDOWN ── */
        .uf-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 6px); background: #fff; border: 1.5px solid var(--border); border-radius: 12px; max-height: 280px; overflow-y: auto; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06); }
        .uf-dropdown-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: transparent; border: none; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; text-align: left; }
        .uf-dropdown-item:hover { background: #F8FAFC; }
        .uf-dropdown-flag { font-size: 18px; line-height: 1; flex-shrink: 0; }
        .uf-dropdown-name { font-size: 14px; color: var(--text); font-weight: 600; }
        .uf-dropdown-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .uf-dropdown-custom { width: 100%; display: flex; align-items: center; gap: 10px; padding: 13px 16px; background: #ECFDF5; border: none; border-top: 1px solid #D1FAE5; cursor: pointer; transition: background 0.15s; text-align: left; }
        .uf-dropdown-custom:hover { background: #D1FAE5; }
        .uf-dropdown-custom-title { font-size: 14px; color: var(--accent); font-weight: 700; }

        /* ── CUSTOM CITY ── */
        .uf-custom-city { background: #ECFDF5; border: 1px solid #D1FAE5; border-radius: 12px; padding: 16px; margin-top: 14px; }
        .uf-custom-row { display: flex; gap: 10px; align-items: center; }

        /* ── CITY INFO ── */
        .uf-city-info { margin-top: 16px; }
        .uf-city-info-label { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
        .uf-info-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; display: flex; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .uf-info-col { flex: 1; padding: 14px 16px; }
        .uf-info-col:not(:last-child) { border-right: 1px solid var(--border); }
        .uf-info-val { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--accent); }
        .uf-info-lab { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-weight: 600; letter-spacing: 0.3px; }
        .uf-info-divider { width: 1px; background: var(--border); }

        /* ── STAT ROW ── */
        .uf-stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 20px; }
        .uf-stat-box { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .uf-stat-val { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text); }
        .uf-stat-lab { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-weight: 600; }

        /* ── CARD ── */
        .uf-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .uf-card-accent { background: #ECFDF5; border-color: #D1FAE5; }
        .uf-card-head { font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .uf-card-sub { font-size: 13px; color: var(--text-muted); }
        .uf-card-hint { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
        .uf-hourly { font-family: var(--font-mono); font-size: 24px; font-weight: 700; color: var(--accent); margin-top: 4px; }
        .uf-hourly::before { content: '$'; }

        /* ── TAX ── */
        .uf-tax-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 7px; }
        .uf-tax-label { color: var(--text-muted); }
        .uf-tax-divider { border-top: 1px solid var(--border); margin: 6px 0; }

        /* ── PROGRESS BAR ── */
        .uf-progress-track { background: #E2E8F0; border-radius: 4px; height: 8px; overflow: hidden; }
        .uf-progress-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .uf-rate-head { display: flex; justify-content: space-between; margin-bottom: 6px; }

        /* ── HERO SCREEN ── */
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

        /* ── GOALS GRID ── */
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
        }

        /* ── REVEAL ── */
        .uf-calc-phase { text-align: center; padding: 60px 0; }
        .uf-calc-label { font-size: 13px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
        .uf-calc-steps { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 32px; }
        .uf-calc-step { font-size: 13px; color: var(--text-muted); opacity: 0.3; transition: opacity 0.4s, color 0.4s, font-weight 0.4s; }
        .uf-calc-step.lit { opacity: 1; color: var(--accent); font-weight: 600; }
        .uf-calc-dot { margin: 0 6px; color: var(--border-light); }
        .uf-calc-bar-track { max-width: 320px; margin: 0 auto; background: var(--border); border-radius: 4px; height: 3px; overflow: hidden; }
        .uf-calc-bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.4s ease; }

        .uf-number-phase {}

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
          background: #003527;
          animation: pulseBorder 2.5s ease 0.8s infinite;
          width: 100%;
          overflow: hidden;
        }
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

        /* ── WAITLIST INLINE ── */
        .uf-wl-inline { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-top: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .uf-wl-inline-head { margin-bottom: 12px; }
        .uf-wl-inline-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .uf-wl-inline-sub { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
        .uf-wl-inline-form { display: flex; gap: 8px; }
        .uf-wl-done { display: flex; align-items: center; gap: 12px; background: #ECFDF5; border-color: #D1FAE5; }

        /* ── WAITLIST ── */
        .uf-waitlist { max-width: 520px; margin: 0 auto; padding: 48px 24px 64px; position: relative; z-index: 1; }
        .uf-waitlist-success { background: #ECFDF5; border: 1px solid #D1FAE5; border-radius: 14px; padding: 20px 24px; color: var(--accent); font-weight: 700; font-size: 16px; text-align: center; }
        .uf-waitlist-form { display: flex; gap: 10px; }

        /* ── SHARE TRIGGER ── */
        .uf-share-trigger { display: inline-flex; align-items: center; gap: 8px; margin: 18px auto 0; padding: 10px 22px; border-radius: 8px; background: #ECFDF5; border: 1px solid #D1FAE5; color: var(--accent); font-family: var(--font-body); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .uf-share-trigger:hover { background: #D1FAE5; border-color: #047857; transform: translateY(-1px); }

        /* ── SHARE MODAL ── */
        .uf-share-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .uf-share-modal { background: #fff; border: 1px solid var(--border); border-radius: 20px; padding: 32px; width: 100%; max-width: 460px; position: relative; animation: slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 24px 64px rgba(0,0,0,0.12); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .uf-share-close { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--text-muted); font-size: 16px; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s; }
        .uf-share-close:hover { background: var(--bg-elevated); color: var(--text); }
        .uf-share-heading { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 20px; letter-spacing: -0.3px; }

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

        /* ── FOOTER DIVIDER ── */
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
          <HeroScreen onStart={() => setScreen("goals")} onSignIn={signIn} />
        )}
        {screen === "goals" && (
          <GoalsScreen
            onNext={g => { setFireGoal(g); setScreen("city"); }}
            onBack={() => setScreen("hero")}
          />
        )}
        {screen === "city" && (
          <CityScreen
            onNext={c => { setCityState(c); setScreen("income"); }}
            onBack={() => setScreen("goals")}
          />
        )}
        {screen === "income" && (
          <IncomeScreen
            stateKey={cityState?.stateKey ?? "custom"}
            onNext={inc => { setIncome(inc); setScreen("savings"); }}
            onBack={() => setScreen("city")}
          />
        )}
        {screen === "savings" && (
          <SavingsScreen
            income={income}
            stateKey={cityState?.stateKey ?? "custom"}
            onNext={(sav, age) => { setSavings(sav); setCurrentAge(age); setScreen("reveal"); }}
            onBack={() => setScreen("income")}
          />
        )}
        {screen === "reveal" && cityState && (
          <RevealScreen
            city={cityState}
            income={income}
            savings={savings}
            stateKey={cityState.stateKey}
            fireGoal={fireGoal}
            currentAge={currentAge}
            onAdjust={() => setScreen("savings")}
          />
        )}

        <div className="uf-section-sep" aria-hidden="true" />
        <WaitlistSection />
      </div>
    </>
  );
}
