"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Real interactive geo-arbitrage globe, loaded on demand (step 6 only).
const GeoArbitrageGlobe = dynamic(() => import("@/app/components/GeoArbitrageGlobe"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
      Loading globe…
    </div>
  ),
});

export interface RevealScenario {
  /** Short label, e.g. "Save $500 more each month". */
  label: string;
  /** Age this scenario reaches FIRE. */
  age: number;
  /** Years sooner (positive) or later (negative) than the current plan. */
  delta: number;
}

export interface RevealFlowProps {
  freedomAge: number;
  freedomYear: number;
  /** Rounded whole years to FIRE. */
  yearsToFire: number;
  planningAge: number;
  ageWasAssumed: boolean;
  isAlreadyFire: boolean;
  fireTarget: number;
  /** 0–100, how much of the target is already invested. */
  pctThere: number;
  cityName: string;
  savingsRatePct: number;
  /** Public U.S. personal-saving-rate benchmark (~5%). */
  usBaselineRate: number;
  /** Common FIRE savings-rate target (25%). */
  fireBenchmarkRate: number;
  scenarios: RevealScenario[];
  monthlySavings: number;
  portfolioBalance: number;
  currentCityKey: string;
  /** Compact money formatter, e.g. 1_240_000 -> "$1.24M". */
  formatCompact: (n: number) => string;
  onSave: () => void;
  onAdjust: () => void;
  onShare: () => void;
  onCitySelect: (key: string) => void;
}

const TEAL = "#62FAE3";
const BG = "#003527";

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
    fireTarget, pctThere, cityName, savingsRatePct, usBaselineRate, fireBenchmarkRate,
    scenarios, monthlySavings, portfolioBalance, currentCityKey, formatCompact,
    onSave, onAdjust, onShare, onCitySelect,
  } = props;

  const reduce = useReducedMotion();
  const [step, setStep] = useState(1);
  const [scenarioIdx, setScenarioIdx] = useState(0);

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
  const working = Math.max(0, Math.min(100 - lived, yearsToFire));
  const freeYears = Math.max(0, 100 - lived - working);
  const dots = useMemo(() => Array.from({ length: 100 }, (_, i) => (
    i < lived ? "rgba(255,255,255,0.16)" : i < lived + working ? "#059669" : TEAL
  )), [lived, working]);

  // Freedom-number ring (r=118 → circumference ≈ 741).
  const RING = 741;
  const ringOffset = RING * (1 - Math.max(0, Math.min(100, pctThere)) / 100);

  // Count-ups.
  const ageText = useCountUp(step === 2, freedomAge, 900, reduce, (v) => String(Math.round(v)));
  const numText = useCountUp(step === 4, fireTarget, 1100, reduce, (v) => formatCompact(v));

  // Honest savings comparison bars.
  const maxRate = Math.max(savingsRatePct, fireBenchmarkRate, usBaselineRate, 1);
  const savingsMultiple = usBaselineRate > 0 ? savingsRatePct / usBaselineRate : 0;
  const beatsUs = savingsRatePct > usBaselineRate;

  const selected = scenarios[scenarioIdx] ?? scenarios[0];

  const shell: React.CSSProperties = {
    minHeight: "100vh", background: BG, color: "#fff", display: "flex", flexDirection: "column",
    padding: "24px clamp(16px, 4vw, 40px) 32px", position: "relative", overflow: "hidden",
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
  const stage: React.CSSProperties = {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    maxWidth: 1120, width: "100%", margin: "0 auto", zIndex: 2, padding: "24px 0",
  };
  const eyebrow: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: TEAL };
  const subtle: React.CSSProperties = { fontSize: 15, color: "rgba(255,255,255,0.55)" };
  const anim = (a: string): React.CSSProperties => (reduce ? {} : { animation: a });

  // Step 1 is a clean, full-screen brand loading clip that plays once and then
  // hands off to the reveal (step 2). Rendered on its own so no reveal chrome
  // (top bar, progress) shows during loading.
  if (step === 1) return <VideoLoader onDone={() => setStep(2)} reduce={reduce} />;

  return (
    <div style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 42%, transparent 36%, rgba(0,0,0,.5))", pointerEvents: "none", zIndex: 1 }} />

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1120, width: "100%", margin: "0 auto", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", color: BG, fontWeight: 800, fontSize: 14 }}>U</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.2px" }}>UntilFire</span>
        </div>
        {step < 7 && (
          <button onClick={() => goTo(7)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", font: "600 13px Manrope, sans-serif", cursor: "pointer", padding: "6px 4px" }}>
            Skip to save →
          </button>
        )}
      </div>

      {/* progress (6 segments for steps 2–7) */}
      <div style={{ maxWidth: 1120, width: "100%", margin: "18px auto 0", display: "flex", gap: 8, zIndex: 2 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
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
              <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", width: 560, height: 560, maxWidth: "90vw", maxHeight: "90vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(98,250,227,.18), transparent 60%)", pointerEvents: "none", ...anim("rf-glow .9s .1s ease both") }} />
              <div style={{ ...eyebrow, position: "relative", ...anim("rf-up .5s ease both") }}>
                {isAlreadyFire ? "YOU'RE ALREADY FINANCIALLY FREE" : "YOU COULD BE FREE AT"}
              </div>
              <div style={{ fontSize: "clamp(96px, 22vw, 200px)", lineHeight: 0.85, fontWeight: 800, letterSpacing: "-0.04em", position: "relative", ...anim("rf-pop .7s .1s ease both") }}>
                {isAlreadyFire ? "Now" : ageText}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.9)", position: "relative", ...anim("rf-up .5s .4s ease both") }}>
                {isAlreadyFire ? "Your investments cover your cost of living." : `in the year ${freedomYear}`}
              </div>
              {!isAlreadyFire && (
                <div style={{ ...subtle, marginTop: 4, position: "relative", ...anim("rf-up .5s .55s ease both") }}>
                  Most people wait until 65. You don&apos;t have to.
                </div>
              )}
              {ageWasAssumed && !isAlreadyFire && (
                <button onClick={onAdjust} style={{ marginTop: 2, background: "none", border: "none", color: "rgba(255,255,255,0.5)", font: "600 13px Manrope, sans-serif", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  Based on an assumed age of {planningAge} — add yours for a sharper date →
                </button>
              )}
            </div>
          )}

          {/* 3 — life in years */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
              <div style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em", ...anim("rf-up .5s ease both") }}>Here&apos;s your life, in years</div>
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
                <Legend color="rgba(255,255,255,0.16)" label={`Lived (${lived})`} />
                <Legend color="#059669" label={`Still working (${working})`} />
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
                  <circle cx="130" cy="130" r="118" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
                  <circle cx="130" cy="130" r="118" fill="none" stroke={TEAL} strokeWidth="14" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={reduce ? ringOffset : RING} style={{ transition: reduce ? undefined : "stroke-dashoffset 1.1s .25s ease", strokeDashoffset: ringOffset }} />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: "clamp(38px, 9vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em" }}>{numText}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>invested</div>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
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
              <div style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
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
                  : <>Nudging past the ~{usBaselineRate}% U.S. average is the fastest lever on your date — even $50/month moves it.</>}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", maxWidth: 460 }}>
                Benchmarks: ~{usBaselineRate}% U.S. personal saving rate (BEA/FRED); 25% is a common FIRE savings target.
              </div>
            </div>
          )}

          {/* 6 — expat globe (real geo-arbitrage data) */}
          {step === 6 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center", width: "100%", ...anim("rf-up .55s ease both") }}>
              <div style={eyebrow}>EXPAT FIRE</div>
              <div style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 800, letterSpacing: "-0.02em" }}>Retire even earlier somewhere else</div>
              <div style={{ width: "min(520px, 88vw)", height: "min(340px, 60vw)", position: "relative" }}>
                <GeoArbitrageGlobe
                  monthlySavings={monthlySavings}
                  portfolioBalance={portfolioBalance}
                  currentAge={planningAge}
                  currentCityKey={currentCityKey}
                  onCitySelect={onCitySelect}
                  fillContainer
                />
              </div>
              <div style={{ ...subtle, maxWidth: 460 }}>
                Green cities cost less than {cityName.split(",")[0] || cityName} — your money already covers life there. Tap one to see the date.
              </div>
            </div>
          )}

          {/* 7 — save */}
          {step === 7 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", maxWidth: 480, ...anim("rf-up .55s ease both") }}>
              <div style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Save your plan —<br />and make it happen.
              </div>
              <div style={subtle}>Track the monthly moves that pull your freedom date closer.</div>

              <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: 18, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: TEAL, marginBottom: 13 }}>EXPLORE SCENARIOS — WHAT IF YOU…</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {scenarios.map((s, i) => {
                    const active = i === scenarioIdx;
                    return (
                      <button key={s.label} onClick={() => setScenarioIdx(i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 13px", borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all .15s ease", background: active ? "rgba(98,250,227,0.12)" : "rgba(255,255,255,0.05)", border: active ? `1px solid ${TEAL}` : "1px solid rgba(255,255,255,0.14)", color: active ? "#fff" : "rgba(255,255,255,0.85)", font: "inherit" }}>
                        <span style={{ width: 15, height: 15, borderRadius: "50%", flex: "none", background: active ? TEAL : "transparent", border: active ? `2px solid ${TEAL}` : "2px solid rgba(255,255,255,0.4)", boxShadow: active ? `inset 0 0 0 2px ${BG}` : undefined }} />
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: active ? TEAL : "rgba(255,255,255,0.55)" }}>{s.age}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14, marginTop: 14 }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>You&apos;d reach FIRE at</span>
                  <b style={{ color: TEAL, fontSize: 19 }}>{selected?.age}</b>
                  <span style={{ fontWeight: 700, fontSize: 14, color: selected && selected.delta > 0 ? TEAL : selected && selected.delta < 0 ? "#f0a0a0" : "rgba(255,255,255,0.5)" }}>
                    {selected && selected.delta > 0 ? `${selected.delta} yrs sooner` : selected && selected.delta < 0 ? `${Math.abs(selected.delta)} yrs later` : "your current plan"}
                  </span>
                </div>
              </div>

              <button onClick={onSave} style={{ width: "100%", background: TEAL, color: BG, border: "none", borderRadius: 10, padding: 18, font: "800 18px Manrope, sans-serif", cursor: "pointer" }}>
                Start my path — it&apos;s free →
              </button>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Free to start · No credit card · Takes 30 seconds</div>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <button onClick={onShare} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", font: "600 13px Manrope, sans-serif", cursor: "pointer" }}>Share result</button>
                <button onClick={onAdjust} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", font: "600 13px Manrope, sans-serif", cursor: "pointer" }}>Adjust inputs</button>
                <button onClick={() => goTo(2)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", font: "600 13px Manrope, sans-serif", cursor: "pointer" }}>← Back to results</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* nav (steps 2–6) */}
      <div style={{ maxWidth: 1120, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 56, zIndex: 2 }}>
        {step > 2 && step < 7 && (
          <button onClick={back} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", font: "600 14px Manrope, sans-serif", cursor: "pointer", padding: 10 }}>← Back</button>
        )}
        {step >= 2 && step < 7 && (
          <button onClick={next} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", borderRadius: 10, padding: "15px 40px", font: "700 16px Manrope, sans-serif", cursor: "pointer" }}>
            {step === 6 ? "Save my plan →" : "Continue →"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Full-screen brand loading page shown before the reveal: just the logo clip,
 * centered and compact for a premium feel. It hands off on the clip's natural
 * end, and also on decode-error, blocked autoplay, or a stall safety-net, so a
 * visitor is never stranded on the loader. Reduced motion skips the clip.
 */
function VideoLoader({ onDone, reduce }: { onDone: () => void; reduce: boolean }) {
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    // Hold ~the clip length in case `ended` doesn't fire; longer net guards a stall.
    const hold = setTimeout(finish, reduce ? 500 : 4100);
    const net = setTimeout(finish, 6500);
    return () => { clearTimeout(hold); clearTimeout(net); };
  }, [reduce]);

  const shell: React.CSSProperties = {
    minHeight: "100vh", background: "#08080e", display: "flex",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  };
  if (reduce) return <div style={shell} aria-hidden />;

  return (
    <div style={shell}>
      <video
        src="/logo/reveal-loader.mp4"
        muted
        playsInline
        autoPlay
        preload="auto"
        onEnded={finish}
        onError={finish}
        onCanPlay={(e) => {
          const p = e.currentTarget.play?.();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }}
        style={{ width: "min(40%, 36vh)", maxWidth: 240, aspectRatio: "1 / 1", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}

function Legend({ color, label, highlight }: { color: string; label: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: highlight ? TEAL : "rgba(255,255,255,0.7)", fontWeight: highlight ? 600 : 400 }}>
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
  const bg = tone === "you" ? TEAL : tone === "mid" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)";
  const valueColor = tone === "you" ? TEAL : tone === "mid" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.7)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
      {youBadge && (
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", color: BG, background: TEAL, borderRadius: 6, padding: "3px 9px" }}>YOU</span>
      )}
      <div style={{ fontSize: tone === "you" ? 30 : 22, fontWeight: 800, color: valueColor }}>{value}</div>
      <div style={{ width: tone === "you" ? 90 : 78, height: h, borderRadius: "8px 8px 0 0", background: bg, transformOrigin: "bottom", boxShadow: tone === "you" ? "0 0 42px rgba(98,250,227,0.42)" : undefined, animation: reduce ? "none" : `rf-bar .65s ${delay} cubic-bezier(.2,.8,.2,1) both` }} />
      <div style={{ fontSize: 13, color: tone === "you" ? TEAL : "rgba(255,255,255,0.6)", fontWeight: tone === "you" ? 600 : 400 }}>{label}</div>
    </div>
  );
}
