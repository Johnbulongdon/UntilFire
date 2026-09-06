"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ExpatCity } from "@/app/components/ExpatFireGlobe";

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
  isAlreadyFire: boolean;
  fireTarget: number;
  /** 0–100, how much of the target is already invested. */
  pctThere: number;
  savingsRatePct: number;
  /** Public U.S. personal-saving-rate benchmark (~5%). */
  usBaselineRate: number;
  /** Common FIRE savings-rate target (25%). */
  fireBenchmarkRate: number;

  /** Expat-FIRE globe data (step 6). */
  expatHome: { name: string; lat: number; lng: number };
  expatBaseAge: number | null;
  expatCities: ExpatCity[];
  /** Compact money formatter, e.g. 1_240_000 -> "$1.24M". */
  formatCompact: (n: number) => string;
  onSave: () => void;
  onAdjust: () => void;
  onShare: () => void;
}

// Fixed dark presentation regardless of the visitor's light/dark preference —
// this reveal is a deliberate cinematic moment, not a themed surface. The
// shell forces the `.dark` token scope below so it draws from the same
// palette as the rest of the app's dark mode instead of a bespoke one.
const TEAL = "var(--uf-teal)";
const BG = "var(--uf-ground)";
// "Still working" needs to sit clearly between the dim "lived" grey and the
// bright teal "free years" — --uf-green is too close in hue to teal at this
// lightness and the two read as one colour in the dot grid.
const WORKING = "var(--uf-ink-3)";
// Mirrors --uf-teal in .dark — needed for translucent glows/tints, which
// rgba() can't derive from a CSS var.
const TEAL_RGB = "53,201,174";

const KEYFRAMES = `
@keyframes rf-spin{to{transform:rotate(360deg)}}
@keyframes rf-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes rf-pop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
@keyframes rf-dot{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
@keyframes rf-page{from{opacity:0;transform:translateY(14px) scale(.99)}to{opacity:1;transform:none}}
@keyframes rf-bar{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes rf-glow{from{opacity:0;transform:translate(-50%,-50%) scale(.7)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@media (prefers-reduced-motion: reduce){
  .rf-anim,[class^="rf-"]{animation:none!important}
}
`;

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduce;
}

/**
 * Count a value up to `to` over `dur` ms, formatting each frame with `fmt`.
 * `fmt` is held in a ref so its (per-render) identity never restarts the
 * animation — otherwise each setText re-render would relaunch it from zero.
 */
function useCountUp(active: boolean, to: number, dur: number, reduce: boolean, fmt: (v: number) => string) {
  const fmtRef = useRef(fmt);
  fmtRef.current = fmt;
  const [text, setText] = useState(() => fmt(reduce ? to : 0));
  useEffect(() => {
    if (!active) return;
    if (reduce) { setText(fmtRef.current(to)); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setText(fmtRef.current(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, dur, reduce]);
  return text;
}

export default function RevealFlow(props: RevealFlowProps) {
  const {
    freedomAge, freedomYear, yearsToFire, planningAge, ageWasAssumed, isAlreadyFire,
    fireTarget, pctThere, savingsRatePct, usBaselineRate, fireBenchmarkRate,
    expatHome, expatBaseAge, expatCities, formatCompact,
    onSave, onAdjust, onShare,
  } = props;

  const reduce = useReducedMotion();
  const [step, setStep] = useState(1);

  const goTo = (n: number) => setStep(Math.min(7, Math.max(2, n)));
  const next = () => setStep((s) => Math.min(7, s + 1));
  const back = () => setStep((s) => Math.max(2, s - 1));

  // Keyboard navigation between result steps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step > 1 && step < 7) next();
      } else if (e.key === "ArrowLeft") {
        if (step > 2) back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

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
  const ageText = useCountUp(step === 2, freedomAge ?? 0, 900, reduce, (v) => String(Math.round(v)));
  const numText = useCountUp(step === 4, fireTarget, 1100, reduce, (v) => formatCompact(v));

  // Honest savings comparison bars.
  const maxRate = Math.max(savingsRatePct, fireBenchmarkRate, usBaselineRate, 1);
  const savingsMultiple = usBaselineRate > 0 ? savingsRatePct / usBaselineRate : 0;
  const beatsUs = savingsRatePct > usBaselineRate;


  const shell: React.CSSProperties = {
    minHeight: "100vh", background: BG, color: "var(--uf-ink)", display: "flex", flexDirection: "column",
    padding: "24px clamp(16px, 4vw, 40px) 32px", position: "relative", overflow: "hidden",
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
  const stage: React.CSSProperties = {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    maxWidth: 1120, width: "100%", margin: "0 auto", zIndex: 2, padding: "24px 0",
  };
  const eyebrow: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: TEAL };
  const subtle: React.CSSProperties = { fontSize: 15, color: "var(--uf-ink-2)" };
  const anim = (a: string): React.CSSProperties => (reduce ? {} : { animation: a });

  // Keep the handoff on the same theme as the form and result.
  if (step === 1) return <ResultLoader onDone={() => setStep(2)} reduce={reduce} />;

  if (yearsToFire === null) return (
    <div style={shell}>
      <main style={{ ...stage, flexDirection: "column", gap: 24, textAlign: "center", maxWidth: 560 }}>
        <div style={eyebrow}>YOUR STARTING POINT</div>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 42px)", lineHeight: 1.15, margin: 0 }}>Not reached under these assumptions</h1>
        <p style={subtle}>Your current inputs do not reach your freedom number within our 65-year projection. This is a snapshot of today, not a verdict on your future.</p>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Freedom number: {formatCompact(fireTarget)}</div>
        <p style={subtle}>Save your starting point, then choose a goal that fits your situation.</p>
        <button onClick={onSave} style={{ background: "var(--uf-green)", color: "#fff", border: "none", borderRadius: 10, padding: 18, font: "800 18px Manrope, sans-serif", cursor: "pointer" }}>Save my starting point →</button>
        <button onClick={onAdjust} style={{ background: "none", border: "none", color: "var(--uf-ink)", textDecoration: "underline", padding: 12, cursor: "pointer" }}>Adjust inputs</button>
      </main>
    </div>
  );

  return (
    <div style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 42%, transparent 36%, var(--uf-surface))", pointerEvents: "none", zIndex: 1 }} />

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1120, width: "100%", margin: "0 auto", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", color: BG, fontWeight: 800, fontSize: 14 }}>U</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.2px" }}>UntilFire</span>
        </div>
        {step < 7 && (
          <button onClick={() => goTo(7)} style={{ background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 13px Manrope, sans-serif", cursor: "pointer", padding: "6px 4px" }}>
            Skip to save →
          </button>
        )}
      </div>

      {/* progress (6 segments for steps 2–7) */}
      <div style={{ maxWidth: 1120, width: "100%", margin: "18px auto 0", display: "flex", gap: 8, zIndex: 2 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: "var(--uf-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: (i + 2) <= step ? "100%" : "0%", background: TEAL, borderRadius: 4, transition: "width .5s ease" }} />
          </div>
        ))}
      </div>

      {/* stage — the keyed wrapper re-mounts per step, so rf-page animates every page-to-page transition */}
      <div style={stage}>
        <div key={step} style={{ width: "100%", display: "flex", justifyContent: "center", ...anim("rf-page .45s cubic-bezier(.2,.8,.2,1) both") }}>

          {/* 2 — freedom age */}
          {step === 2 && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, position: "relative" }}>
              <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", width: 560, height: 560, maxWidth: "90vw", maxHeight: "90vw", borderRadius: "50%", background: `radial-gradient(circle, rgba(${TEAL_RGB},.18), transparent 60%)`, pointerEvents: "none", ...anim("rf-glow .9s .1s ease both") }} />
              <div style={{ ...eyebrow, position: "relative", ...anim("rf-up .5s ease both") }}>
                {isAlreadyFire ? "YOU'RE ALREADY FINANCIALLY FREE" : "YOU COULD BE FREE AT"}
              </div>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(96px, 22vw, 200px)", lineHeight: 0.85, fontWeight: 800, letterSpacing: "-0.04em", position: "relative", ...anim("rf-pop .7s .1s ease both") }}>
                {isAlreadyFire ? "Now" : ageText}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--uf-ink)", position: "relative", ...anim("rf-up .5s .4s ease both") }}>
                {isAlreadyFire ? "Your investments cover your cost of living." : `in the year ${freedomYear}`}
              </div>
              {!isAlreadyFire && (
                <div style={{ ...subtle, marginTop: 4, position: "relative", ...anim("rf-up .5s .55s ease both") }}>
                  Most people wait until 65. You don&apos;t have to.
                </div>
              )}
              {ageWasAssumed && !isAlreadyFire && (
                <button onClick={onAdjust} style={{ marginTop: 2, background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 13px Manrope, sans-serif", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  Based on an assumed age of {planningAge} — add yours for a sharper date →
                </button>
              )}
            </div>
          )}

          {/* 3 — life in years */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em", ...anim("rf-up .5s ease both") }}>Here&apos;s your life, in years</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(20, 1fr)", gap: 7, width: "min(520px, 82vw)" }}>
                {dots.map((c, i) => (
                  <div key={i} style={{
                    width: "100%", aspectRatio: "1", borderRadius: 3, background: c,
                    opacity: reduce ? 1 : 0,
                    animation: reduce ? undefined : "rf-dot .34s ease both",
                    animationDelay: reduce ? undefined : `${Math.min(i * 13, 1250)}ms`,
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
                <Legend color="var(--uf-border-2)" label={`Lived (${lived})`} />
                <Legend color={WORKING} label={`Still working (${working})`} />
                <Legend color={TEAL} label={`Free years (${freeYears})`} highlight />
              </div>
              <div style={subtle}>
                {isAlreadyFire
                  ? <>You&apos;ve already bought back <b style={{ color: TEAL }}>{freeYears} free years</b> — assuming you live to 100.</>
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
                  <circle cx="130" cy="130" r="118" fill="none" stroke={TEAL} strokeWidth="14" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={reduce ? ringOffset : RING} style={{ transition: reduce ? undefined : "stroke-dashoffset 1.1s .25s ease", strokeDashoffset: ringOffset }} />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(38px, 9vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em" }}>{numText}</div>
                  <div style={{ fontSize: 14, color: "var(--uf-ink-2)", fontWeight: 600 }}>invested</div>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--uf-ink)" }}>
                {pctThere > 0
                  ? <>You&apos;re already <b style={{ color: TEAL }}>{Math.round(pctThere)}%</b> of the way there</>
                  : <>This is your target to reach.</>}
              </div>
              <div style={subtle}>Once invested, work becomes optional.</div>
            </div>
          )}

          {/* 5 — how you stack up (honest benchmarks) */}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", ...anim("rf-up .55s ease both") }}>
              <div style={eyebrow}>HOW YOU STACK UP</div>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
                {beatsUs
                  ? <>You save <span style={{ color: TEAL }}>{savingsRatePct}%</span> of your take-home</>
                  : <>You&apos;re saving <span style={{ color: TEAL }}>{savingsRatePct}%</span> right now</>}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "clamp(20px, 5vw, 32px)", padding: "0 8px", marginTop: 8 }}>
                <Bar heightPct={usBaselineRate / maxRate} value={`${usBaselineRate}%`} label="U.S. average" tone="dim" delay=".15s" reduce={reduce} />
                <Bar heightPct={fireBenchmarkRate / maxRate} value={`${fireBenchmarkRate}%`} label="Typical FIRE saver" tone="mid" delay=".3s" reduce={reduce} />
                <Bar heightPct={savingsRatePct / maxRate} value={`${savingsRatePct}%`} label="You" tone="you" delay=".45s" reduce={reduce} youBadge />
              </div>
              <div style={subtle}>
                {beatsUs
                  ? <>That&apos;s about <b style={{ color: TEAL }}>{savingsMultiple.toFixed(1)}×</b> the ~{usBaselineRate}% average U.S. saver{savingsRatePct >= fireBenchmarkRate ? ", already past the 25% FIRE pace." : ", closing on the 25% FIRE pace."}</>
                  : <>Your savings rate is a starting point. A useful goal should fit your income, essential costs, and priorities.</>}
              </div>
              <div style={{ fontSize: 11, color: "var(--uf-ink-2)", maxWidth: 460 }}>
                Benchmarks: ~{usBaselineRate}% U.S. personal saving rate (BEA/FRED); 25% is a common FIRE savings target.
              </div>
            </div>
          )}

          {/* 6 — expat globe (real geo-arbitrage deltas) */}
          {step === 6 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center", width: "100%", ...anim("rf-up .55s ease both") }}>
              <div style={eyebrow}>EXPAT FIRE</div>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 800, letterSpacing: "-0.02em" }}>Retire even earlier somewhere else</div>
              {expatCities.length > 0 ? (
                <ExpatFireGlobe home={expatHome} baseAge={expatBaseAge ?? planningAge} cities={expatCities} />
              ) : (
                <div style={{ ...subtle, maxWidth: 460 }}>
                  You&apos;re already in one of the most cost-efficient places for your plan — relocating wouldn&apos;t pull your date much sooner.
                </div>
              )}
              <div style={{ ...subtle, maxWidth: 460 }}>
                A lower cost of living means a smaller target — pick a city to see how much sooner your date arrives.
              </div>
            </div>
          )}

          {/* 7 — save */}
          {step === 7 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", maxWidth: 480, ...anim("rf-up .55s ease both") }}>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Save your starting point.
              </div>
              <div style={subtle}>Keep the numbers you entered so you can choose a goal and track your progress.</div>

              <button onClick={onSave} style={{ width: "100%", background: "var(--uf-green)", color: "#fff", border: "none", borderRadius: 10, padding: 18, font: "800 18px Manrope, sans-serif", cursor: "pointer" }}>
                Save my starting point →
              </button>
              <div style={{ fontSize: 13, color: "var(--uf-ink-2)" }}>Free to start · No credit card · Takes 30 seconds</div>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <button onClick={onShare} style={{ background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 13px Manrope, sans-serif", cursor: "pointer" }}>Share result</button>
                <button onClick={onAdjust} style={{ background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 13px Manrope, sans-serif", cursor: "pointer" }}>Adjust inputs</button>
                <button onClick={() => goTo(2)} style={{ background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 13px Manrope, sans-serif", cursor: "pointer" }}>← Back to results</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* nav (steps 2–6) */}
      <div style={{ maxWidth: 1120, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 56, zIndex: 2 }}>
        {step > 2 && step < 7 && (
          <button onClick={back} style={{ background: "none", border: "none", color: "var(--uf-ink-2)", font: "600 14px Manrope, sans-serif", cursor: "pointer", padding: 10 }}>← Back</button>
        )}
        {step >= 2 && step < 7 && (
          <button onClick={next} style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border-2)", color: "var(--uf-ink)", borderRadius: 10, padding: "15px 40px", font: "700 16px Manrope, sans-serif", cursor: "pointer" }}>
            {step === 6 ? "Save my starting point →" : "Continue →"}
          </button>
        )}
      </div>
    </div>
  );
}

/** A brief, theme-aware handoff without the old black video backdrop. */
function ResultLoader({ onDone, reduce }: { onDone: () => void; reduce: boolean }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), reduce ? 0 : 500);
    return () => clearTimeout(timer);
  }, [reduce]);
  return (
    <div role="status" aria-label="Preparing your result" style={{
      minHeight: "100vh", background: BG, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <img src="/logo/horizon-color.svg" alt="" width={80} height={80} />
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

function Bar({ heightPct, value, label, tone, delay, reduce, youBadge }: {
  heightPct: number; value: string; label: string; tone: "dim" | "mid" | "you"; delay: string; reduce: boolean; youBadge?: boolean;
}) {
  const maxPx = 148;
  const h = Math.max(24, Math.round(Math.max(0, Math.min(1, heightPct)) * maxPx));
  const bg = tone === "you" ? TEAL : tone === "mid" ? "var(--uf-ink-3)" : "var(--uf-border-2)";
  const valueColor = tone === "you" ? TEAL : tone === "mid" ? "var(--uf-ink-2)" : "var(--uf-ink-2)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
      {youBadge && (
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", color: BG, background: TEAL, borderRadius: 6, padding: "3px 9px" }}>YOU</span>
      )}
      <div style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: tone === "you" ? 30 : 22, fontWeight: 800, color: valueColor }}>{value}</div>
      <div style={{ width: tone === "you" ? 90 : 78, height: h, borderRadius: "8px 8px 0 0", background: bg, transformOrigin: "bottom", boxShadow: tone === "you" ? `0 0 42px rgba(${TEAL_RGB},0.42)` : undefined, animation: reduce ? "none" : `rf-bar .65s ${delay} cubic-bezier(.2,.8,.2,1) both` }} />
      <div style={{ fontSize: 13, color: tone === "you" ? TEAL : "var(--uf-ink-2)", fontWeight: tone === "you" ? 600 : 400 }}>{label}</div>
    </div>
  );
}
