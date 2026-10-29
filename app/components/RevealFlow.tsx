"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import YearCubes from "@/components/ui/YearCubes";
import Logo from "@/app/components/Logo";
import PercentileTrack from "@/app/components/PercentileTrack";
import type { RevealCtaPlacement } from "@/lib/analytics-events";
import type { CalculatorPrefill } from "@/lib/journey";
import SavingsPace from '@/app/components/SavingsPace';
import { saveCalculatorPrefill } from '@/lib/journey';
import HomeBackdrop from "@/app/components/auth/HomeBackdrop";
import SignInCard from "@/app/components/auth/SignInCard";
import ShareFreedomYear from "@/app/components/ShareFreedomYear";
import type { NetWorthComparison } from "@/lib/net-worth-compare";
import type { ExpatCity } from "@/app/components/ExpatFireGlobe";
import {FALLBACK_RATES} from '@/lib/currency';
import { CAUTIOUS_RETURN_PCT, DEFAULT_RETURN_PCT } from "@/lib/fire-number";

// Expat-FIRE globe (orthographic, home → city relocation line), loaded on demand (step 6 only).
const ExpatFireGlobe = dynamic(() => import("@/app/components/ExpatFireGlobe"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--uf-ink-2)", fontSize: 13 }}>
      Loading globe…
    </div>
  ),
});

export interface RevealFlowProps {
  freedomAge: number | null;
  freedomYear: number | null;
  /** Rounded whole years to FIRE. */
  yearsToFire: number | null;
  planningAge: number;
  ageWasAssumed: boolean;
  /** Growth after inflation the result uses, in percent (D-24). */
  returnPct: number;
  /** The history behind the growth, opened from the freedom-age step. */
  growthPicker?: React.ReactNode;
  /** The freedom number as an account would show it in the freedom year. */
  futureDollars?: { year: number; amount: number; inflationPct: number } | null;
  isAlreadyFire: boolean;
  fireTarget: number;
  /** 0–100, how much of the target is already invested. */
  pctThere: number;
  savingsRatePct: number;
  /** Public U.S. personal-saving-rate benchmark (~5%). */
  usBaselineRate: number;
  /** Common FIRE savings-rate target (25%). */
  fireBenchmarkRate: number;
  /** Net worth against US households of the same age (step 5); null outside the US. */
  netWorthComparison?: NetWorthComparison | null;

  /** Expat-FIRE globe data (step 6). */
  expatHome: { name: string; lat: number; lng: number };
  expatBaseAge: number | null;
  expatCities: ExpatCity[];
  /** Compact money formatter, e.g. 1_240_000 -> "$1.24M". */
  formatCompact: (n: number) => string;
  onSave: (placement: RevealCtaPlacement) => void;
  /** The result as the dashboard will read it, for the save step's backdrop. */
  prefill: CalculatorPrefill;
  /** Keeps the result in this browser; runs as sign-up starts on the save step. */
  onKeepResult: () => void;
  onAdjust: () => void;
  onShare: () => void;
  /** Called once per result step per reveal: step 2–7, or `unreachable` when
   *  the single not-reached screen is shown instead. */
  onStepViewed?: (step: number, unreachable: boolean) => void;
}

// Reveal motion uses the same theme as the rest of the journey.
const TEAL = "var(--uf-teal)";
const BG = "var(--uf-ground)";
// "Still working" needs to sit clearly between the dim "lived" grey and the
// bright teal "free years" — --uf-green is too close in hue to teal at this
// lightness and the two read as one colour in the dot grid.
const WORKING = "var(--uf-ink-3)";
const linkPlain: React.CSSProperties = { background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 13px Inter, sans-serif", cursor: "pointer", padding: "6px 2px" };
const linkButton: React.CSSProperties = { background: "none", border: "none", padding: 0, color: "var(--uf-green)", font: "700 13px Inter, sans-serif", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
// Mirrors --uf-teal in .dark — needed for translucent glows/tints, which
// rgba() can't derive from a CSS var.
const TEAL_RGB = "21,23,25";

const KEYFRAMES = `
@keyframes rf-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes rf-ring{from{stroke-dashoffset:741}}
@keyframes rf-halo{0%{transform:scale(.65);opacity:0}45%{opacity:.65}100%{transform:scale(1.7);opacity:0}}
@keyframes rf-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes rf-pop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
@keyframes rf-dot{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
@keyframes rf-page{from{opacity:0;transform:translateY(14px) scale(.99)}to{opacity:1;transform:none}}
@keyframes rf-bar{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes rf-bar-x{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes rf-glow{from{opacity:0;transform:translate(-50%,-50%) scale(.7)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@media (prefers-reduced-motion: reduce){
  .rf-root:not([data-motion="play"]) *{animation:none!important;transition:none!important}
}
/* Step 5 with the net-worth comparison is the tallest screen: on short
   viewports tighten it so Continue stays on screen without scrolling. */
@media (max-height: 820px){
  .rf-root[data-dense] .rf-stage{padding:8px 0!important}
  .rf-root[data-dense] .rf-s5{gap:8px!important}
  .rf-root[data-dense] .rf-s5-rule{margin:0!important}
  .rf-root[data-dense] .rf-bar{--rf-bar-scale:.6}
  .rf-root[data-dense] .rf-bar-col{gap:6px!important}
  .rf-root[data-dense] .rf-bar-val{font-size:20px!important}
}
@media (max-height: 700px){
  .rf-root[data-dense] .rf-s5-extra{display:none}
}
`;

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduce;
}

export default function RevealFlow(props: RevealFlowProps) {
  const {
    freedomAge, freedomYear, yearsToFire, planningAge, ageWasAssumed, returnPct, growthPicker, isAlreadyFire,
    fireTarget, pctThere, savingsRatePct, usBaselineRate, fireBenchmarkRate, netWorthComparison,
    expatHome, expatBaseAge, expatCities, formatCompact,
    onSave, prefill, onKeepResult, onAdjust, onShare, onStepViewed,
  } = props;

  const monthlyMoney = (n:number) => new Intl.NumberFormat("en-US", {style:"currency",currency:prefill.defaultCurrency ?? "USD",maximumFractionDigits:0}).format(n*(FALLBACK_RATES[prefill.defaultCurrency ?? "USD"] ?? 1));
  const prefersReducedMotion = useReducedMotion();
  // The reveal is an automatic presentation; Replay is optional.
  const [playMotion, setPlayMotion] = useState(false);
  const reduce = prefersReducedMotion && !playMotion;
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<CalculatorPrefill | null>(null);
  const savedPlan = selectedPlan ?? prefill;
  const [showGrowth, setShowGrowth] = useState(false);

  const replay = () => { setPlayMotion(true); setStep(1); };
  const next = () => setStep((s) => s === 5 ? 8 : s === 8 ? 7 : Math.min(7, s + 1));
  const back = () => setStep((s) => Math.max(2, s - 1));

  // Keyboard navigation between result steps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest("button, a, input, select, textarea, [role=dialog]")) return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step > 1 && step < 7) { e.preventDefault(); next(); }
      } else if (e.key === "ArrowLeft") {
        if (step > 2) { e.preventDefault(); back(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // Report each result step once per reveal, so a result that never became
  // a signup says where it stopped. Step 1 is the loader; the unreachable
  // screen replaces steps 2–7 and counts as one.
  const seenSteps = useRef(new Set<string>());
  const unreachable = yearsToFire === null;
  const seenKey = step < 2 ? null : unreachable ? "unreachable" : String(step);
  const onStepViewedRef = useRef(onStepViewed);
  onStepViewedRef.current = onStepViewed;
  useEffect(() => {
    if (!seenKey || seenSteps.current.has(seenKey)) return;
    seenSteps.current.add(seenKey);
    onStepViewedRef.current?.(step, unreachable);
  }, [seenKey, step, unreachable]);

  // Life-in-years dots.
  const lived = Math.max(0, Math.min(100, planningAge));
  const working = Math.max(0, Math.min(100 - lived, yearsToFire ?? 0));
  const freeYears = Math.max(0, 100 - lived - working);
  const dots = useMemo(() => Array.from({ length: 100 }, (_, i) => (
    i < lived ? "var(--uf-border-2)" : i < lived + working ? WORKING : TEAL
  )), [lived, working]);

  // Freedom-number ring (r=118 → circumference ≈ 741).
  const RING = 741;
  const ringOffset = RING * (1 - Math.max(0, Math.min(100, pctThere)) / 100);

  // Count-ups.
  const ageText = String(freedomYear ?? new Date().getFullYear());
  const numText = formatCompact(fireTarget);

  // Honest savings comparison bars.
  const maxRate = Math.max(savingsRatePct, fireBenchmarkRate, usBaselineRate, 1);
  const savingsMultiple = usBaselineRate > 0 ? savingsRatePct / usBaselineRate : 0;
  const beatsUs = savingsRatePct > usBaselineRate;


  const shell: React.CSSProperties = {
    minHeight: "100vh", background: BG, color: "var(--uf-ink)", display: "flex", flexDirection: "column",
    padding: "24px clamp(16px, 4vw, 40px) 32px", position: "relative", overflow: "hidden",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
  const stage: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    maxWidth: 1120, width: "100%", zIndex: 2,
  };
  const eyebrow: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: TEAL };
  const subtle: React.CSSProperties = { fontSize: 15, color: "var(--uf-ink-2)" };
  const anim = (a: string): React.CSSProperties => (reduce ? {} : { animation: a });

  // Keep the handoff on the same theme as the form and result.
  if (step === 1) return <ResultLoader onDone={() => setStep(2)} reduce={reduce} playMotion={playMotion} />;

  if (yearsToFire === null) return (
    <div className="rf-root" data-motion={playMotion ? "play" : "system"} style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <main style={{ ...stage, ...anim("rf-page .65s ease both"), flexDirection: "column", gap: 24, textAlign: "center", maxWidth: 560 }}>
        <Logo variant="auto" size={26} />
        <button type="button" onClick={replay} style={{ background: "none", border: "none", color: "var(--uf-green)", font: "inherit", cursor: "pointer" }}>{reduce ? "Play animations" : "Replay reveal"}</button>
        {reduce && <p style={subtle}>Animations are off because your device requests reduced motion.</p>}
        <div style={eyebrow}>YOUR STARTING POINT</div>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 42px)", lineHeight: 1.15, margin: 0 }}>Not reached under these assumptions</h1>
        <p style={subtle}>Your current inputs do not reach your FIRE number within our 65-year projection. This is a snapshot of today, not a verdict on your future.</p>
        <div style={{ fontSize: 28, fontWeight: 800 }}>FIRE number: {formatCompact(fireTarget)}</div>
        <p style={subtle}>Save your starting point, then choose a goal that fits your situation.</p>
        <button onClick={() => onSave("unreachable")} style={{ background: "var(--uf-green)", color: "var(--uf-card)", border: "none", borderRadius: 10, padding: 18, font: "800 18px Inter, sans-serif", cursor: "pointer" }}>Save my starting point →</button>
        <button onClick={onAdjust} style={{ background: "none", border: "none", color: "var(--uf-ink)", textDecoration: "underline", padding: 12, cursor: "pointer" }}>Adjust inputs</button>
      </main>
    </div>
  );

  if (step === 8) return <SavingsPace prefill={prefill} value={savedPlan.monthlySavings ?? 0}
    onBack={() => setStep(5)} onUse={plan => { setSelectedPlan(plan); setStep(7); }} />;

  // 7 — save: the sign-up card itself, over the blurred Home, so saving the
  // result and signing up are one page (no separate /login stop).
  if (step === 7) return (
    <div className="rf-root" style={{ minHeight: "100vh", position: "relative", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <HomeBackdrop prefill={savedPlan} />
      <main style={{ width: "100%", maxWidth: 400, padding: "0 24px", position: "relative", zIndex: 1, ...anim("rf-up .3s ease both") }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 10 }}><Logo variant="auto" size={28} /></div>
          <h1 className="uf-t-h1" style={{ margin: 0, color: "var(--uf-ink)", textWrap: "balance" }}>
            {(selectedPlan ? selectedPlan.retireYear != null : freedomYear !== null)
              ? <><span style={{ color: TEAL }}>{selectedPlan ? selectedPlan.retireYear : freedomYear}</span> is just your starting point</>
              : <>Your starting point is ready</>}
          </h1>
        </div>
        <SignInCard verb="Save" onStart={() => {
          onKeepResult();
          if (selectedPlan) saveCalculatorPrefill({ ...selectedPlan, generatedAt: new Date().toISOString() });
        }} />
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 18, marginTop: 16 }}>
          <button onClick={() => setStep(8)} style={linkPlain}>← Back to results</button>
          {!selectedPlan && <button onClick={onShare} style={linkPlain}>Share result</button>}
        </div>
      </main>
    </div>
  );

  return (
    <div className="rf-root" data-motion={playMotion ? "play" : "system"} data-brand-step={step} data-dense={step === 5 && netWorthComparison ? "" : undefined} style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1120, width: "100%", margin: "0 auto", zIndex: 2 }}>
        <Logo variant="auto" size={26} />
        <button type="button" onClick={replay} style={{ background: "none", border: "none", color: "var(--uf-green)", font: "600 13px Inter, sans-serif", cursor: "pointer", padding: 8 }}>
          {reduce ? "Play animations" : "Replay reveal"}
        </button>

      </div>

      {reduce && <p role="status" style={{ ...subtle, textAlign: "center", marginTop: 12 }}>Animations are off because your device requests reduced motion. You can choose Play animations above.</p>}

      {/* progress (6 segments for steps 2–7) */}
      <div style={{ maxWidth: 1120, width: "100%", margin: "18px auto 0", display: "flex", gap: 8, zIndex: 2 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: "var(--uf-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: [2,3,4,5,8,7].indexOf(step) >= i ? "100%" : "0%", background: TEAL, borderRadius: 4, transition: "width .5s ease" }} />
          </div>
        ))}
      </div>

      {/* stage — the keyed wrapper re-mounts per step, so rf-page animates every page-to-page transition */}
      <div className="rf-stage" style={stage}>
        <div key={step} className={step === 2 ? "rf-reveal-layout" : undefined} style={{ width: "100%", display: "flex", justifyContent: "center", ...anim("rf-page .28s cubic-bezier(.2,.8,.2,1) both") }}>

          {step === 2 && <>
            <div className="rf-reveal-copy" style={{display:'grid',gap:20}}>
              <div style={eyebrow}>YOUR FREEDOM PICTURE</div>
              <h1 style={{fontSize:'clamp(32px,4vw,44px)',lineHeight:1.08,margin:0}}>{isAlreadyFire?'Your starting point':'Your freedom date'}</h1>
              <div style={subtle}>{isAlreadyFire?'Your entered savings cover your freedom number.':ageWasAssumed?'At your current saving pace.': 'Work could become optional at '+freedomAge+'.'}</div>
              <div style={{fontSize:'clamp(72px,9vw,120px)',fontWeight:800,letterSpacing:'-.06em',lineHeight:1,...anim('rf-pop .35s ease both')}}>{isAlreadyFire?'Now':ageText}</div>
              <div style={subtle}>{isAlreadyFire?'Check your bills and balances before making plans.':'More choices ahead.'}</div>
              <button onClick={next} style={{justifySelf:'start',marginTop:12,border:0,borderRadius:999,padding:'17px 28px',background:'#151719',color:'#FFFFFF',font:'700 16px Inter,sans-serif',cursor:'pointer'}}>Continue →</button>
            </div>
            <RevealCurve prefill={prefill} target={fireTarget} years={yearsToFire??0} returnPct={returnPct} format={formatCompact}/>
          </>}

          {/* 3 — life in years */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em", ...anim("rf-up .3s ease both") }}>Here&apos;s your life, in years</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(20, 1fr)", gap: 7, width: "min(520px, 82vw)" }}>
                <YearCubes colors={dots} reduce={reduce} />
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
                <Legend color="var(--uf-border-2)" label={ageWasAssumed ? `So far (${lived}, assumed)` : `Lived (${lived})`} />
                <Legend color={WORKING} label={`Still working (${working})`} />
                <Legend color={TEAL} label={`Free years (${freeYears})`} highlight />
              </div>
              <div style={subtle}>
                {isAlreadyFire
                  ? <>You&apos;ve already bought back <b style={{ color: TEAL }}>{freeYears} free years</b> — assuming you live to 100.</>
                  : ageWasAssumed
                    ? <>Freedom in {working} years buys back <b style={{ color: TEAL }}>{freeYears} free years</b>. This uses an assumed age of {lived}, since you skipped it.</>
                    : <>Retiring at {freedomAge} buys back <b style={{ color: TEAL }}>{freeYears} free years</b> — assuming you live to 100.</>}
              </div>
            </div>
          )}

          {/* 4 — freedom number */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center", ...anim("rf-up .55s ease both") }}>
              <div style={eyebrow}>YOUR FREEDOM NUMBER</div>
              <div style={{ position: "relative", width: 260, height: 260, maxWidth: "80vw", maxHeight: "80vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 260 260" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                  <circle cx="130" cy="130" r="118" fill="none" stroke="var(--uf-border)" strokeWidth="14" />
                  <circle cx="130" cy="130" r="118" fill="none" stroke={TEAL} strokeWidth="14" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={ringOffset} style={{ animation: reduce ? undefined : "rf-ring .65s .05s cubic-bezier(.2,.8,.2,1) both" }} />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(38px, 9vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
                    {numText}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--uf-ink-2)", fontWeight: 600 }}>
                    in today’s money
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--uf-ink)" }}>
                {pctThere > 0
                  ? <>You&apos;re already <b style={{ color: TEAL }}>{Math.round(pctThere)}%</b> of the way there</>
                  : <>This is your target to reach.</>}
              </div>
              <div style={subtle}>{isAlreadyFire ? "Your inputs cover the target. Review your balances and bills." : pctThere >= 75 ? "Your target is getting closer." : "Everything you save is part of the picture."}</div>
            </div>
          )}

          {step === 5 && (
            <div style={{width:'100%',maxWidth:560,display:'grid',gap:24,...anim('rf-up .55s ease both')}}>
              <div style={eyebrow}>YOUR MONTHLY PICTURE</div>
              <div style={{fontSize:'clamp(32px,5vw,56px)',fontWeight:800,letterSpacing:'-.04em'}}>{savingsRatePct}% saved</div>
              <div style={{display:'flex',height:24,borderRadius:999,overflow:'hidden',background:'var(--uf-border)'}}><div style={{width:Math.min(100,Math.max(0,100-savingsRatePct))+'%',background:'#151719'}}/><div style={{flex:1,background:'#B9E7D6'}}/></div>
              <div style={{display:'flex',justifyContent:'space-between',gap:24}}><div><div style={subtle}>Expenses</div><strong style={{fontSize:28}}>{monthlyMoney(prefill.monthlySpendEstimate ?? (prefill.annualCost ?? 0)/12)}</strong></div><div style={{textAlign:'right'}}><div style={subtle}>Saved each month</div><strong style={{fontSize:28}}>{monthlyMoney(prefill.monthlySavings ?? 0)}</strong></div></div>
              <div style={subtle}>Your starting point. Small changes can move your date.</div>
            </div>
          )}

          {/* 6 — expat globe (real geo-arbitrage deltas) */}
          {step === 6 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center", width: "100%", ...anim("rf-up .55s ease both") }}>
              <div style={eyebrow}>EXPAT FIRE</div>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 800, letterSpacing: "-0.02em" }}>Retire even earlier somewhere else</div>
              {expatCities.length > 0 ? (
                <ExpatFireGlobe home={expatHome} baseAge={expatBaseAge ?? planningAge} cities={expatCities} playMotion={playMotion} />
              ) : (
                <div style={{ ...subtle, maxWidth: 460 }}>
                  You&apos;re already in one of the most cost-efficient places for your plan — relocating wouldn&apos;t pull your date much sooner.
                </div>
              )}
              <div style={{ ...subtle, maxWidth: 460 }}>
                Tap a city to compare.
              </div>
            </div>
          )}

        </div>
      </div>

      {/* nav (steps 2–6) */}
      <div style={{ maxWidth: 1120, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 56, zIndex: 2 }}>
        {step > 2 && step < 7 && (
          <button onClick={back} style={{ background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 14px Inter, sans-serif", cursor: "pointer", padding: 10 }}>← Back</button>
        )}
        {step > 2 && step < 7 && (
          <button onClick={next} style={{ background: "#151719", border: "1px solid #151719", color: "#FFFFFF", borderRadius: 999, padding: "17px 40px", font: "700 16px Inter, sans-serif", cursor: "pointer" }}>
            {step === 5 ? "Try one improvement →" : "Continue →"}
          </button>
        )}
      </div>
    </div>
  );
}

/** A brief, theme-aware handoff without the old black video backdrop. */
function ResultLoader({ onDone, reduce, playMotion }: { onDone: () => void; reduce: boolean; playMotion: boolean }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), reduce ? 0 : 500);
    return () => clearTimeout(timer);
  }, [reduce]);
  return (
    <div className="rf-root" data-motion={playMotion ? "play" : "system"} style={{ minHeight: "100vh", background: BG, color: "var(--uf-ink)", display: "flex", flexDirection: "column", gap: 24, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <Logo variant="auto" size={36} />
      <svg aria-hidden viewBox="0 0 400 180" style={{ width: "min(400px, 85vw)", overflow: "visible" }}>
        <path d="M10 165 H390" fill="none" stroke="var(--uf-border-2)" />
        <path d="M10 160 C140 160 245 145 300 90 S365 25 390 10" fill="none" stroke={TEAL} strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" style={{ animation: reduce ? undefined : "rf-draw .4s cubic-bezier(.4,0,.2,1) both" }} />
        <circle cx="390" cy="10" r="7" fill={TEAL} style={{ animation: reduce ? undefined : "rf-dot .15s .3s both", transformBox: "fill-box", transformOrigin: "center" }} />
      </svg>
      <div role="status" style={{ textAlign: "center", animation: reduce ? undefined : "rf-up .6s ease both" }}>
        <div style={{ fontFamily: "var(--uf-font-display)", fontSize: 30 }}>Let’s find your place on the curve.</div>
        <p style={{ color: "var(--uf-ink-2)", marginTop: 10 }}>Your numbers. Your starting point.</p>
      </div>
    </div>
  );
}

function Legend({ color, label, highlight }: { color: string; label: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: highlight ? TEAL : "var(--uf-ink-2)", fontWeight: highlight ? 600 : 400 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
      {label}
    </div>
  );
}

/**
 * Net worth against US households of the same age, as a position on a line.
 * Always phrased as how many have less: a comparison meant to orient, not to
 * rank anyone down.
 */
function NetWorthStanding({ comparison, reduce }: { comparison: NetWorthComparison; reduce: boolean }) {
  const { aheadOfPct, aboveTop, bandLabel } = comparison;
  const who = `US households ${bandLabel}`;
  const position = aboveTop ? 99.5 : Math.max(0.5, aheadOfPct);
  const headline = aboveTop
    ? <>Your net worth is ahead of <span style={{ color: TEAL }}>more than 99%</span> of {who}</>
    : aheadOfPct >= 1
      ? <>Your net worth is ahead of <span style={{ color: TEAL }}>{aheadOfPct}%</span> of {who}</>
      : <>Your net worth is at the start line</>;
  const note = aheadOfPct >= 50
    ? "The line marks the median."
    : aheadOfPct >= 1
      ? null
      : "Where you start isn't where you finish.";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(20px, 3.8vw, 26px)", fontWeight: 800, letterSpacing: "-0.02em", maxWidth: 520, lineHeight: 1.2 }}>
        {headline}
      </div>
      <PercentileTrack
        position={position}
        label={aboveTop ? `Ahead of more than 99% of ${who}` : `Ahead of ${aheadOfPct}% of ${who}`}
        fillAnimation={reduce ? undefined : "rf-bar-x .8s .15s cubic-bezier(.2,.8,.2,1) both"}
      />
      {note && <div style={{ fontSize: 13, color: "var(--uf-ink-2)", lineHeight: 1.55, maxWidth: 440 }}>{note}</div>}
    </div>
  );
}

function Bar({ heightPct, value, label, tone, delay, reduce, youBadge, compact }: {
  heightPct: number; value: string; label: string; tone: "dim" | "mid" | "you"; delay: string; reduce: boolean; youBadge?: boolean; compact?: boolean;
}) {
  const maxPx = compact ? 92 : 148;
  const h = Math.max(24, Math.round(Math.max(0, Math.min(1, heightPct)) * maxPx));
  const bg = tone === "you" ? TEAL : tone === "mid" ? "var(--uf-ink-3)" : "var(--uf-border-2)";
  const valueColor = tone === "you" ? TEAL : tone === "mid" ? "var(--uf-ink-2)" : "var(--uf-ink-2)";
  return (
    <div className="rf-bar-col" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
      {youBadge && (
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", color: BG, background: TEAL, borderRadius: 6, padding: "3px 9px" }}>YOU</span>
      )}
      <div className="rf-bar-val" style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: tone === "you" ? 30 : 22, fontWeight: 800, color: valueColor }}>{value}</div>
      <div className="rf-bar" style={{ width: tone === "you" ? 90 : 78, height: `calc(${h}px * var(--rf-bar-scale, 1))`, borderRadius: "8px 8px 0 0", background: bg, transformOrigin: "bottom", boxShadow: tone === "you" ? `0 0 42px rgba(${TEAL_RGB},0.42)` : undefined, animation: reduce ? "none" : `rf-bar .65s ${delay} cubic-bezier(.2,.8,.2,1) both` }} />
      <div style={{ fontSize: 13, color: tone === "you" ? TEAL : "var(--uf-ink-2)", fontWeight: tone === "you" ? 600 : 400 }}>{label}</div>
    </div>
  );
}

/** Annual balances use the same end-of-year contribution convention as the reveal engine. */
function RevealCurve({prefill,target,years,returnPct,format}:{prefill:CalculatorPrefill;target:number;years:number;returnPct:number;format:(n:number)=>string}){
 const n=Math.max(1,Math.min(65,Math.ceil(years))),start=Math.max(0,prefill.portfolioBalance??0),saving=Math.max(0,prefill.monthlySavings??0)*12;
 const values=[start];for(let i=1;i<=n;i++)values.push(values[i-1]*(1+returnPct/100)+saving);
 const max=Math.max(target,...values,1),x=(i:number)=>20+i/n*460,y=(v:number)=>180-v/max*145;
 const line=values.map((v,i)=>(i?'L':'M')+x(i)+','+y(v)).join(' ');
 return <div className="rf-reveal-chart"><svg viewBox="0 0 500 230" role="img" aria-label="Your saved balance growing towards your freedom target"><line x1="20" x2="480" y1={y(target)} y2={y(target)} stroke="#15171955" strokeDasharray="3 5"/><path d={line+' L480 200 H20 Z'} fill="#FFFFFF50"/><path d={line} fill="none" stroke="#151719" strokeWidth="3" pathLength="1"/><circle cx="20" cy={y(start)} r="4" fill="#151719"/><circle cx="480" cy={y(values.at(-1)!)} r="5" fill="#151719"/></svg><div style={{display:'flex',justifyContent:'space-between',gap:16,fontSize:12}}><span>Today · {format(start)}</span><span>Freedom target · {format(target)}</span></div></div>
}
