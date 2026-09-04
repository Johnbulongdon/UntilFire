"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Logo from "@/app/components/Logo";
import { CITIES } from "@/lib/fire-data";
import { peekCalculatorPrefill } from "@/lib/journey";

const F = "'Manrope', sans-serif";
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/* Same core assumptions as the calculator: 7% growth, 25x annual spending. */
const GROWTH_MONTHLY = 0.07 / 12;
function monthsToTarget(startBalance: number, monthlySave: number, target: number): number {
  let bal = startBalance;
  let m = 0;
  while (bal < target && m < 1200) {
    bal = bal * (1 + GROWTH_MONTHLY) + monthlySave;
    m += 1;
  }
  return m;
}

function futureDate(monthsFromNow: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d;
}

/* Compounding demo: fixed 30-year horizon starting from $0, so the ending
   balance shows what compounding does with whatever contribution it's fed. */
const TRYIT_YEARS = 30;
const TRYIT_MONTHS = TRYIT_YEARS * 12;
const TRYIT_SLIDER_DEFAULT = 300;

function futureValueOfContributions(monthlyContribution: number, months: number, monthlyRate: number): number {
  const growthFactor = Math.pow(1 + monthlyRate, months);
  return monthlyContribution * ((growthFactor - 1) / monthlyRate);
}

/* World section example: what a $1M portfolio covers today, per real city data. */
const WORLD_PORTFOLIO = 1000000;
const WORLD_SAVE_MONTHLY = 2000;
const WORLD_CITY_KEYS = ["chiangmai", "mexicocity", "lisbon", "tokyo", "london", "sf"];

const TRUST_LOGOS = [
  { name: "Chase", file: "chase.jpg" },
  { name: "Fidelity", file: "fidelity.jpg" },
  { name: "Vanguard", file: "vanguard.jpg" },
  { name: "Schwab", file: "schwab.jpg" },
  { name: "Bank of America", file: "bank-of-america.jpg" },
  { name: "Wells Fargo", file: "wells-fargo.jpg" },
  { name: "SoFi", file: "sofi.jpg" },
  { name: "Robinhood", file: "robinhood.jpg" },
  { name: "Amex", file: "amex.jpg" },
  { name: "Citi", file: "citi.jpg" },
  { name: "US Bank", file: "us-bank.jpg" },
  { name: "Discover", file: "discover.jpg" },
];

/* ── Nav ─────────────────────────────────────────────────────────────── */
function Nav7({ onStart }: { onStart: () => void }) {
  return (
    <header className="uf7-nav">
      <Logo variant="auto" size={26} />
      <nav className="uf7-nav-links">
        <a href="#how">How it works</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <button className="uf7-nav-cta" onClick={onStart}>Get started</button>
    </header>
  );
}

/* ── Returning visitor: their own date, if they already have one ──────
   Was Countdown7, a ticking clock to a "second birth". The hero no longer
   speaks that way, but the personalisation is worth keeping: someone who
   already ran the calculator should see their own date, not a generic
   pitch. Renders nothing at all for first-time visitors. ─────────────── */
function YourDateLine7() {
  const [retireYear, setRetireYear] = useState<number | null>(null);

  useEffect(() => {
    const prefill = peekCalculatorPrefill();
    if (prefill && typeof prefill.retireYear === "number" && prefill.retireYear > new Date().getFullYear()) {
      setRetireYear(prefill.retireYear);
    }
  }, []);

  if (retireYear === null) return null;
  return (
    <div className="uf7-yourdate">
      Last time, your freedom date was <b>{retireYear}</b>. Pick up where you left off.
    </div>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────── */
function Hero7({ onStart }: { onStart: () => void }) {
  const trustTrackRef = useRef<HTMLDivElement | null>(null);

  // Driven by rAF + inline transform rather than a CSS @keyframes animation.
  // The CSS version (animation: uf7trustScroll ...) reliably ran in every
  // browser we tested it in, but was reported frozen on at least one real
  // machine with nothing unusual about it — a plain requestAnimationFrame
  // loop setting style.transform directly doesn't depend on the browser's
  // CSS animation engine at all, so it's a strictly more reliable fallback
  // even though we never isolated why the CSS version failed there.
  useEffect(() => {
    const track = trustTrackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let x = 0;
    let last: number | null = null;
    const pxPerSecond = 20;
    const tick = (now: number) => {
      if (last === null) last = now;
      x += pxPerSecond * ((now - last) / 1000);
      last = now;
      const loopWidth = track.scrollWidth / 2;
      if (loopWidth > 0) x %= loopWidth;
      track.style.transform = `translateX(${-x}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="uf7-hero" style={{ ["--uf7hue" as string]: "0deg" }}>
      <div className="uf7-blob uf7-hb1" />
      <div className="uf7-blob uf7-hb2" />
      <div className="uf7-blob uf7-hb3" />
      <div className="uf7-blob uf7-hb4" />
      <div className="uf7-dawn-glow" aria-hidden />

      <div className="uf7-eyebrow">Finance your freedom</div>
      <h1 className="uf7-h1">Over half of it arrives<br />in the <i>last ten years</i>.</h1>
      <p className="uf7-note">
        The first decade feels like nothing is happening. That is the decade almost
        everyone quits — right before the part that pays. UntilFire keeps you in it.
      </p>

      {/* The whole argument in two figures: the first decade barely moves, the
          last one does most of the work. Same $500/mo, same 7% real return. */}
      <YourDateLine7 />

      <div className="uf7-splitstat">
        <div className="uf7-splitstat-card">
          <div className="uf7-splitstat-label">First decade</div>
          <div className="uf7-splitstat-num uf7-splitstat-dim">7%</div>
          <div className="uf7-splitstat-foot">of your final balance</div>
        </div>
        <div className="uf7-splitstat-card uf7-splitstat-hot">
          <div className="uf7-splitstat-label">Last decade</div>
          <div className="uf7-splitstat-num">54%</div>
          <div className="uf7-splitstat-foot">of your final balance</div>
        </div>
      </div>

      <button className="uf7-cta" onClick={onStart}>
        See where I am on the curve <span className="uf7-arrow">→</span>
      </button>
      <p className="uf7-micro">Free · No account · Numbers stay private</p>

      {/* The shape the headline describes. Flat for three decades, then
          steep — the two figures above state it, this shows it. Stroke and
          fill are tokens so it reads on cream and on the dark theme. */}
      <div className="uf7-curve" aria-hidden>
        <svg viewBox="0 0 1200 260" preserveAspectRatio="none">
          <defs>
            <linearGradient id="uf7cfill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1200" y2="0">
              <stop offset="0%" stopColor="var(--uf-surface-2)" stopOpacity="0.7" />
              <stop offset="62%" stopColor="var(--uf-teal-soft)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="var(--uf-teal)" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="uf7cline" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1200" y2="0">
              <stop offset="0%" stopColor="var(--uf-ink-3)" />
              <stop offset="62%" stopColor="var(--uf-teal-line)" />
              <stop offset="100%" stopColor="var(--uf-teal)" />
            </linearGradient>
          </defs>
          <path d="M0 232 L150 227 L300 219 L450 207 L600 190 L750 166 L900 132 L1050 86 L1200 24 L1200 260 L0 260 Z" fill="url(#uf7cfill)" />
          <path d="M0 232 L150 227 L300 219 L450 207 L600 190 L750 166 L900 132 L1050 86 L1200 24"
                fill="none" stroke="url(#uf7cline)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1="900" y1="0" x2="900" y2="260" stroke="var(--uf-teal)" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
        </svg>
        <span className="uf7-curve-here">you are here</span>
        <span className="uf7-curve-last">the last decade &rarr;</span>
        <div className="uf7-curve-axis">
          <span>today</span><span>10 yrs</span><span>20 yrs</span><span>30 yrs</span><span>40 yrs</span>
        </div>
      </div>

      <div className="uf7-trust">
        <p className="uf7-trust-label">Securely connects to 14,000+ banks &amp; brokerages</p>
        <div className="uf7-trust-strip">
          <div className="uf7-trust-track" ref={trustTrackRef}>
            {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={logo.name + i}
                src={`/app-icons/${logo.file}`}
                alt={i < TRUST_LOGOS.length ? logo.name : ""}
                aria-hidden={i >= TRUST_LOGOS.length}
                width={36}
                height={36}
                className="uf7-trust-logo"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How it works ────────────────────────────────────────────────────── */
function How7() {
  const steps = [
    { n: "01", t: "See your freedom date", d: "Enter a few numbers. Get the date when work becomes optional." },
    { n: "02", t: "Understand what moves it", d: "See which changes shorten your timeline the most." },
    { n: "03", t: "Take your first step", d: "Get one clear action you can act on today." },
  ];
  return (
    <section className="uf7-block" id="how" style={{ ["--uf7hue" as string]: "24deg" }}>
      <div className="uf7-blob uf7-glow-l" />
      <div className="uf7-wrap">
        <div className="uf7-sec-eyebrow uf7-rv">How it works</div>
        <h2 className="uf7-statement uf7-rv">Three steps between you and <em>your date</em>.</h2>
        <div className="uf7-rows">
          {steps.map((s) => (
            <div className="uf7-row uf7-rv" key={s.n}>
              <div className="uf7-row-n">{s.n}</div>
              <div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Try it: slider changes the monthly contribution, fixed 30-year horizon ── */
function TryIt7() {
  const [save, setSave] = useState(TRYIT_SLIDER_DEFAULT);
  const contributed = save * TRYIT_MONTHS;
  const ending = useMemo(() => futureValueOfContributions(save, TRYIT_MONTHS, GROWTH_MONTHLY), [save]);
  const grown = Math.max(0, ending - contributed);

  return (
    <section className="uf7-block uf7-center" style={{ ["--uf7hue" as string]: "44deg" }}>
      <div className="uf7-blob uf7-glow-r" />
      <div className="uf7-wrap">
        <div className="uf7-sec-eyebrow uf7-rv">Try it</div>
        <h2 className="uf7-statement uf7-rv">Compounding does the work.<br />Your number decides <em>how much</em>.</h2>
        <div className="uf7-slider-stage uf7-rv">
          <div className="uf7-live-amount">${Math.round(ending).toLocaleString()}</div>
          <div className="uf7-saves">
            You put in ${Math.round(contributed).toLocaleString()} — compounding added ${Math.round(grown).toLocaleString()}
          </div>
          <div className="uf7-slider-row">
            <div className="uf7-slider-label"><span>Monthly savings</span><strong>${save.toLocaleString()}/mo</strong></div>
            <input
              type="range"
              min={100}
              max={3000}
              step={100}
              value={save}
              onChange={(e) => setSave(+e.target.value)}
              aria-label="Monthly savings"
            />
            <div className="uf7-slider-foot">Starting from $0, after {TRYIT_YEARS} years at a 7% average annual return — the ~10% long-run market average, less ~3% inflation, so this is in today&apos;s money.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── The compound gap: one chart, bars vs drift ──────────────────────── */
/* ── The decade nobody warns you about ───────────────────────────────
   Replaces the old CompoundGap7 "plan vs drift" runway. Same compounding
   idea, but shown as the share each decade contributes, which is the more
   surprising and more honest version: the first decade really does feel
   like nothing, and saying so is what makes the rest believable.
   Figures: $500/mo, 40 years, 7% real (REAL_RETURN). ───────────────── */
const DECADE_SHARES = [
  { span: "Years 0–10",  amount: "$86,542",  pct: 7,  width: 12 },
  { span: "Years 10–20", amount: "$173,921", pct: 13, width: 25 },
  { span: "Years 20–30", amount: "$349,522", pct: 27, width: 50 },
  { span: "Years 30–40", amount: "$702,421", pct: 54, width: 100 },
];

function DecadeShape7() {
  return (
    <section className="uf7-block uf7-block--alt" style={{ ["--uf7hue" as string]: "62deg" }}>
      <div className="uf7-blob uf7-glow-l" />
      <div className="uf7-wrap">
        <div className="uf7-split">
          <div className="uf7-split-head">
            <div className="uf7-sec-eyebrow uf7-rv">The honest part</div>
            <h2 className="uf7-statement uf7-rv">The decade nobody <em>warns you about</em>.</h2>
            <p className="uf7-lede uf7-rv">
              Ten years in, a $500-a-month habit is worth about $86,500. It does not feel like
              financial independence. It feels like a savings account with extra steps.
            </p>
            <p className="uf7-lede uf7-rv">
              That is not failure — that is the shape of the thing. Left alone, the same habit
              produces <em className="uf7-hl">$702,000 in its fourth decade alone</em>.
            </p>
          </div>

          <div className="uf7-panel uf7-rv">
            <div className="uf7-panel-cap">What each decade adds</div>
            <div className="uf7-decades">
              {DECADE_SHARES.map((d, i) => (
                <div className="uf7-decade" key={d.span}>
                  <div className="uf7-decade-span">{d.span}</div>
                  <div className="uf7-decade-track">
                    <div
                      className={`uf7-decade-fill${i === DECADE_SHARES.length - 1 ? " uf7-decade-fill-hot" : ""}`}
                      style={{ width: `${d.width}%` }}
                    />
                  </div>
                  <div className="uf7-decade-amt">{d.amount}</div>
                  <div className="uf7-decade-pct">{d.pct}%</div>
                </div>
              ))}
            </div>
            <div className="uf7-panel-foot">$500/mo · 40 years · 7% real</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Starting early beats saving more ────────────────────────────────
   The turn after the honest section: the flat decade is the valuable one.
   $5,000/yr at 7% real, contributions at year end, both measured at 65. ── */
function StartEarly7() {
  return (
    <section className="uf7-block" style={{ ["--uf7hue" as string]: "80deg" }}>
      <div className="uf7-blob uf7-glow-r" />
      <div className="uf7-wrap">
        <div className="uf7-head-2up">
          <div>
            <div className="uf7-sec-eyebrow uf7-rv">Which is why</div>
            <h2 className="uf7-statement uf7-rv">Starting early beats <em>saving more</em>.</h2>
          </div>
          <p className="uf7-lede uf7-rv">
            Someone who invests for ten years and then never adds another dollar still
            finishes ahead of someone who starts a decade later and keeps paying in for thirty.
          </p>
        </div>

        <div className="uf7-versus uf7-rv">
          <div className="uf7-versus-card uf7-versus-win">
            <div className="uf7-versus-tag">Wins</div>
            <div className="uf7-versus-who">Starts at 25, stops at 35</div>
            <p className="uf7-versus-desc">$5,000 a year for ten years, then never adds another dollar.</p>
            <div className="uf7-versus-figs">
              <div>
                <div className="uf7-versus-lbl">Put in</div>
                <div className="uf7-versus-in">$50,000</div>
              </div>
              <div>
                <div className="uf7-versus-lbl">At 65</div>
                <div className="uf7-versus-out">$602,070</div>
              </div>
            </div>
          </div>

          <div className="uf7-versus-card">
            <div className="uf7-versus-who">Starts at 35, never stops</div>
            <p className="uf7-versus-desc">$5,000 a year, every year, for thirty-one years.</p>
            <div className="uf7-versus-figs">
              <div>
                <div className="uf7-versus-lbl">Put in</div>
                <div className="uf7-versus-in">$155,000</div>
              </div>
              <div>
                <div className="uf7-versus-lbl">At 65</div>
                <div className="uf7-versus-out uf7-versus-out-dim">$546,091</div>
              </div>
            </div>
          </div>
        </div>

        <p className="uf7-earlier uf7-rv">
          The early starter put in <em>$105,000 less</em> and still finished <em>$55,980 ahead</em>.
        </p>
      </div>
    </section>
  );
}

/* ── It works at any size ────────────────────────────────────────────
   The multiple is identical down the column on purpose: the multiplier is
   time, not the size of the contribution. 40 years at 7% real. ──────── */
const ANY_SIZE_ROWS = [
  { invest: "$100 / mo",   paid: "$48,000",  becomes: "$262,481" },
  { invest: "$250 / mo",   paid: "$120,000", becomes: "$656,203" },
  { invest: "$500 / mo",   paid: "$240,000", becomes: "$1,312,407" },
  { invest: "$1,000 / mo", paid: "$480,000", becomes: "$2,624,813" },
];

function AnySize7() {
  return (
    <section className="uf7-block uf7-block--alt" style={{ ["--uf7hue" as string]: "44deg" }}>
      <div className="uf7-wrap">
        <div className="uf7-sec-eyebrow uf7-rv">At any size</div>
        <h2 className="uf7-statement uf7-rv">You do not need a large number <em>to start</em>.</h2>
        <p className="uf7-lede uf7-rv">
          A habit beats a windfall, because a habit gets multiplied every month it runs.
        </p>

        <div className="uf7-table uf7-rv">
          <div className="uf7-table-head">
            <div>You invest</div>
            <div>You contribute</div>
            <div>It becomes</div>
            <div className="uf7-table-end">Multiple</div>
          </div>
          {ANY_SIZE_ROWS.map((r) => (
            <div className="uf7-table-row" key={r.invest}>
              <div className="uf7-table-invest">{r.invest}</div>
              <div className="uf7-table-paid">{r.paid}</div>
              <div className="uf7-table-becomes">{r.becomes}</div>
              <div className="uf7-table-end"><span className="uf7-mult">5.5&times;</span></div>
            </div>
          ))}
        </div>
        <p className="uf7-table-foot uf7-rv">
          Over 40 years at a 7% average annual return after inflation. The multiple is the
          same on every row because the multiplier is time, not the size of the cheque.
        </p>
      </div>
    </section>
  );
}

/* ── The world: globe + real city numbers ────────────────────────────── */
function World7() {
  const rows = useMemo(() => {
    return WORLD_CITY_KEYS
      .map((key) => CITIES.find((c) => c.key === key))
      .filter((c): c is (typeof CITIES)[number] => Boolean(c))
      .map((c) => {
        const target = c.col * 25;
        const ready = target <= WORLD_PORTFOLIO;
        const year = ready ? null : futureDate(monthsToTarget(WORLD_PORTFOLIO, WORLD_SAVE_MONTHLY, target)).getFullYear();
        return { name: c.name.split(",")[0], col: c.col, ready, year };
      });
  }, []);

  return (
    <section className="uf7-block" style={{ ["--uf7hue" as string]: "92deg" }}>
      <div className="uf7-blob uf7-glow-r" />
      <div className="uf7-stars" aria-hidden />
      <div className="uf7-wrap uf7-wrap-wide">
        <div className="uf7-sec-eyebrow uf7-rv">Where will you live it?</div>
        <h2 className="uf7-statement uf7-rv">Your second life comes with a <em>world</em>.</h2>
        <div className="uf7-globe-grid">
          <div className="uf7-globe-stage uf7-rv">
            {/* Static image, not the live WebGL globe: cobe renders its glow
                and markers fine but its internal world-map texture failed
                to decode on at least one real, ordinary Chrome install with
                nothing unusual about it, with zero error signal from the
                library — not something we can chase further from here. A
                pre-rendered frame is guaranteed to look the same for every
                visitor, at the cost of the rotation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/globe-static.webp" alt="" aria-hidden width={880} height={880} style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          </div>
          <div className="uf7-rv">
            {rows.map((r) => (
              <div className="uf7-city-row" key={r.name}>
                <span className="uf7-city">{r.name}</span>
                <span className="uf7-cost">${r.col.toLocaleString()}/yr</span>
                <span className={r.ready ? "uf7-status uf7-ready" : "uf7-status uf7-later"}>
                  {r.ready ? "✓ FIRE ready" : r.year}
                </span>
              </div>
            ))}
            <div className="uf7-globe-foot">
              Real cost-of-living estimates from our {CITIES.length}-city dataset. Status shown for a $1M portfolio today.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing: editorial columns ──────────────────────────────────────── */
function Pricing7({ onStart }: { onStart: () => void }) {
  return (
    <section className="uf7-block uf7-block--alt" id="pricing" style={{ ["--uf7hue" as string]: "52deg" }}>
      <div className="uf7-blob uf7-glow-l" />
      <div className="uf7-wrap">
        <div className="uf7-sec-eyebrow uf7-center uf7-rv">Pricing</div>
        <h2 className="uf7-statement uf7-center uf7-rv">Start free. <i>Stay</i> for the plan.</h2>
        <div className="uf7-price-cols">
          <div className="uf7-pcol uf7-rv">
            <div className="uf7-tier">Free</div>
            <div className="uf7-amount">$0</div>
            <ul>
              <li>Freedom date calculation</li>
              <li>One clear next move</li>
              <li>Decision sliders</li>
              <li>Shareable result card</li>
            </ul>
            <button className="uf7-free-cta" onClick={onStart}>Find my freedom date</button>
          </div>
          <div className="uf7-pcol uf7-rv">
            <div className="uf7-tier">Pro</div>
            <div className="uf7-amount">$4.99 <small>/mo after trial</small></div>
            <span className="uf7-trial-note">Three months free</span>
            <ul>
              <li>Everything in Free</li>
              <li>Ranked next moves by time saved</li>
              <li>Action plan from your spending</li>
              <li>Unlimited bank &amp; brokerage sync</li>
              <li>Progress tracking &amp; reports</li>
            </ul>
            <button className="uf7-pro-cta" onClick={onStart}>Start free trial</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Quote ───────────────────────────────────────────────────────────── */
function Quote7() {
  return (
    <section className="uf7-block uf7-center" style={{ ["--uf7hue" as string]: "30deg" }}>
      <div className="uf7-wrap">
        <div className="uf7-quote-mark uf7-rv">“</div>
        <p className="uf7-big-quote uf7-rv">Seeing the date change when I adjusted my savings — that was the moment it <i>clicked</i>.</p>
        <div className="uf7-attr uf7-rv">Beta user</div>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */
function Faq7() {
  const faqs = [
    {
      q: "What is a freedom date?",
      a: "The date when work can become optional based on your current income, spending, and savings. It's a starting line you can move closer with better choices.",
    },
    {
      q: "How is this different from a calculator?",
      a: "Most calculators stop at a number. UntilFire starts there and turns it into a plan: what matters, what to change next, and how to move forward.",
    },
    {
      q: "Do I need an account?",
      a: "No. You can see your freedom date and first move without creating an account. Create one when you want to save your plan and track progress.",
    },
    {
      q: "Is this financial advice?",
      a: "No. UntilFire is planning software that helps you understand scenarios and tradeoffs. It does not replace a licensed financial adviser.",
    },
  ];
  return (
    <section className="uf7-block" id="faq" style={{ ["--uf7hue" as string]: "14deg" }}>
      <div className="uf7-blob uf7-glow-l" />
      <div className="uf7-wrap">
        <div className="uf7-sec-eyebrow uf7-rv">FAQ</div>
        <h2 className="uf7-statement uf7-rv">Good <i>questions</i>.</h2>
        <div className="uf7-faq-list">
          {faqs.map((f, i) => (
            <details className="uf7-rv" key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Closing ─────────────────────────────────────────────────────────── */
function Closing7({ onStart }: { onStart: () => void }) {
  return (
    <section className="uf7-block uf7-closing" style={{ ["--uf7hue" as string]: "0deg" }}>
      <div className="uf7-blob uf7-close-a" />
      <div className="uf7-blob uf7-close-b" />
      <div className="uf7-wrap">
        <h2 className="uf7-closing-h uf7-rv">You are somewhere<br />on that <i>curve</i>.</h2>
        <p className="uf7-closing-sub uf7-rv">Sixty seconds to find out where — free, no login.</p>
        <button className="uf7-cta uf7-rv" onClick={onStart} style={{ marginTop: 38 }}>
          Find my freedom date <span className="uf7-arrow">→</span>
        </button>
      </div>
    </section>
  );
}


/* ── Footer ──────────────────────────────────────────────────────────── */
function FooterSection() {
  return (
    <footer style={{ background: "var(--uf-ground)", borderTop: "1px solid var(--uf-border)", padding: "48px 24px 32px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginBottom: 32 }}>
          {[
            ["How it works", "#how"],
            ["Learn", "/learn"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 14, fontWeight: 600, color: "var(--uf-ink-2)", textDecoration: "none" }}>{label}</a>
          ))}
        </div>

        {/* Wordmark */}
        <div style={{
          fontFamily: F, fontWeight: 800, fontSize: "clamp(56px, 14vw, 140px)", lineHeight: 0.85,
          letterSpacing: "-0.05em", textAlign: "center", color: "#ffffff",
          opacity: 0.08,
        }}>
          untilfire
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 0 16px", fontSize: 12, color: "var(--uf-ink-3)", fontWeight: 500, flexWrap: "wrap", gap: 16 }}>
          <span>© 2026 UntilFire</span>
          <a
            href="https://www.founder.best/products/untilfire?ref=founderbest"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.founder.best/top1.png"
              alt="UntilFire — #1 Product of the Week on Founder.best"
              width={200}
              loading="lazy"
            />
          </a>
          <a
            href="https://startupfa.st/projects/untilfire"
            target="_blank"
            rel="noopener"
            title="Startup Fast Top 1 Daily Winner"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://startupfa.st/images/badges/top1-dark.svg"
              alt="Startup Fast Top 1 Daily Winner"
              style={{ width: 195, height: "auto" }}
              loading="lazy"
            />
          </a>
          <a
            href="https://startupfa.me/s/untilfire?utm_source=www.untilfire.com"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://startupfa.me/badges/featured-badge-small.webp"
              alt="UntilFire - Featured on Startup Fame"
              width={224}
              height={36}
              loading="lazy"
            />
          </a>
          <a
            href="https://tooldynamo.com/tools/untilfire"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://tooldynamo.com/assets/images/badge.png"
              alt="Tool Dynamo"
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://stackdirectory.com/product/untilfire"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://stackdirectory.com/assets/images/badge.png"
              alt="Stack Directory"
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://launchstag.com/p/untilfire"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://launchstag.com/badge-dark.svg"
              alt="Featured on Launchstag"
              width={198}
              height={62}
              loading="lazy"
            />
          </a>
          <a
            href="https://saascity.io/live/untilfire"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://saascity.io/badges/featured-dark.svg"
              alt="Featured on SaaS City"
              width={150}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://saaslineup.com/product/untilfire?ref=badge"
            target="_blank"
            rel="dofollow"
            title="Featured on SaaSLineup"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://saaslineup.com/badge/untilfire.svg"
              alt="Featured on SaaSLineup"
              width={160}
              height={44}
              loading="lazy"
            />
          </a>
          <a
            href="https://thesaasdir.com/product/untilfire?ref=badge"
            target="_blank"
            rel="dofollow"
            title="Featured on TheSaaSDir"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://thesaasdir.com/badge/untilfire.svg"
              alt="Featured on TheSaaSDir"
              width={160}
              height={44}
              loading="lazy"
            />
          </a>
          <a
            href="https://themicrosaasdir.com/product/untilfire?ref=badge"
            target="_blank"
            rel="dofollow"
            title="Featured on TheMicroSaaSDir"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://themicrosaasdir.com/badge/untilfire.svg"
              alt="Featured on TheMicroSaaSDir"
              width={160}
              height={44}
              loading="lazy"
            />
          </a>
          <a
            href="https://tooldirs.com/product/untilfire"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://tooldirs.com/badge/badge_dark.svg"
              alt="Featured on ToolDirs"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://launchbuff.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Featured on LaunchBuff"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://launchbuff.com/badge-featured-dark.svg"
              alt="Featured on LaunchBuff"
              width={256}
              height={80}
              loading="lazy"
            />
          </a>
          <a
            href="https://startuplist.ing/p/xoooie?utm_source=www.untilfire.com"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://startuplist.ing/badges/dark-normal.svg"
              alt="Featured on StartupList.ing"
              width={171}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://www.uneed.best/tool/untilfire"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://www.uneed.best/POTD3A.png"
              alt="Uneed POTD3 Badge"
              style={{ width: 250 }}
              loading="lazy"
            />
          </a>
          <a
            href="https://startups.fm/startups/untilfire"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://startups.fm/badge/untilfire"
              alt="Featured on Startups.fm"
              width={240}
              height={63}
              loading="lazy"
            />
          </a>
          <a
            href="https://startupspotlight.co/startup/untilfire"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://startupspotlight.co/api/badge/cmqpzklis000e15nktsharpa4?variant=dark&v=2"
              alt="Featured on StartupSpotlight"
              width={248}
              height={48}
              loading="lazy"
            />
          </a>
          <a
            href="https://firstlook.tools/product/untilfire"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://firstlook.tools/badge/badge_transparent.svg"
              alt="Featured on First Look"
              width={200}
              height={54}
            />
          </a>
          <a
            href="https://wired.business"
            target="_blank"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://wired.business/badge0-dark.svg"
              alt="Featured on Wired Business"
              width={200}
              height={54}
            />
          </a>
          <a
            href="https://startupbase.io/products/untilfire-2?utm_source=startupbase&utm_medium=badge&utm_campaign=launch-badge-light"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://statics.startupbase.io/site/badges/launched-on-sb.svg"
              alt="Launched on StartupBase"
              width={255}
              height={55}
              loading="lazy"
            />
          </a>
          <a
            href="https://fazier.com/"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light"
              alt="Launched on Fazier"
              width={105}
              height={55}
              loading="lazy"
            />
          </a>
          <a
            href="https://noonlaunch.com/product/untilfire"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://noonlaunch.com/badges/untilfire.svg"
              alt="Featured on Noonlaunch"
              width={200}
              loading="lazy"
            />
          </a>
          <a
            href="https://twelve.tools"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://twelve.tools/badge0-dark.svg"
              alt="Featured on Twelve Tools"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://marketingdb.live"
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://marketingdb.live/badge.svg"
              alt="MarketingDB Badge"
              width={160}
              height={48}
              loading="lazy"
            />
          </a>
          <a
            href="https://kittylaunch.com/p/untilfire"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://kittylaunch.com/api/public/badges/launch_badge.svg?theme=light&name=UntilFire"
              width={280}
              alt="UntilFire on KittyLaunch"
              data-kittylaunch-badge="1"
              loading="lazy"
            />
          </a>
          <a
            href="https://postmake.io"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://postmake.io/postmake_badge_dark.png"
              alt="Featured on Postmake"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://confettisaas.com/submit"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://www.touched-grass.com/api/embed-badge?uuid=1dIUP7WnnC&theme=light&bg=grass"
              alt="ConfettiSaaS.com touched grass today!"
              width={220}
              height={47}
              loading="lazy"
            />
          </a>
          <a
            href="https://abacklaunch.com"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://abacklaunch.com/badges/featured-on-dark.svg"
              alt="Listed on Aback Launch"
              width={150}
              height={32}
              loading="lazy"
            />
          </a>
          <a
            href="https://saasgrow.app?ref=untilfire.com"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://saasgrow.app/api/badge?type=featured&style=dark"
              alt="UntilFire on SaaSGrow"
              width={240}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://toolfame.com/item/untilfire"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://toolfame.com/badge-light.svg"
              alt="Featured on toolfame.com"
              style={{ height: 54, width: "auto" }}
              loading="lazy"
            />
          </a>
          <a
            href="https://dododirectory.com"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://dododirectory.com/badge-dark.png"
              alt="Featured on DodoDirectory"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://sumodir.com/item/untilfire-wwwuntilfirecom"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://sumodir.com/badge.png"
              alt="Featured on SumoDir"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://web-review.com"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://web-review.com/badge.png"
              alt="Featured on Web Review"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://saasbison.com"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://saasbison.com/badge.png"
              alt="Featured on SaaSBison"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://toolfio.com"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://toolfio.com/toolfio-dark-badge.png"
              alt="Featured on Toolfio"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://gets.tools"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://gets.tools/badge/badge_dark.svg"
              alt="Featured on Gets.Tools"
              width={125}
              height={44}
              loading="lazy"
            />
          </a>
          <a
            href="https://tooldisk.com"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://tooldisk.com/badge/badge_dark.svg"
              alt="Featured on ToolDisk.com"
              width={125}
              height={44}
              loading="lazy"
            />
          </a>
          <a
            href="https://dofollow.tools"
            target="_blank"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://dofollow.tools/badge/badge_dark.svg"
              alt="Featured on Dofollow.Tools"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://www.showmysites.com"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://www.showmysites.com/static/backlink/gray_border.webp"
              alt="ShowMySites Badge"
              width={200}
              height={60}
              loading="lazy"
            />
          </a>
          <a
            href="https://startupdirectory.net"
            rel="dofollow"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://startupdirectory.net/badge/featured-light.svg"
              alt="Featured on StartupDirectory"
              width={200}
              height={54}
              loading="lazy"
            />
          </a>
          <a
            href="https://launchpadly.co/startup/untilfire?ref=badge"
            target="_blank"
            rel="noopener noreferrer"
            data-launchpadly-badge="untilfire"
            data-launchpadly-badge-variant="minimal"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://launchpadly.co/embed/badges/startup/untilfire.svg?variant=minimal"
              alt="Launchpadly Startup Directory"
              width={220}
              height={28}
              style={{ display: "block", border: 0 }}
              loading="lazy"
            />
          </a>
          <a
            href="https://sellwithboost.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://sellwithboost.com/badge/listing-dark.svg"
              alt="Listed on Sell With boost"
              style={{ height: 40, width: "auto" }}
              loading="lazy"
            />
          </a>
          <a
            href="https://hicyou.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
          >
            <img
              src="https://hicyou.com/badge/featured-dark.svg"
              alt="Featured"
              loading="lazy"
            />
          </a>
          <a
            href="https://curlship.com"
            target="_blank"
            rel="noopener"
            title="Listed on CurlShip"
            style={{ color: "var(--uf-ink-3)", textDecoration: "none" }}
          >
            Listed on CurlShip
          </a>
          <span>Make work optional</span>
        </div>
      </div>
    </footer>
  );
}



const CSS7 = `
  .uf7-root { background: var(--uf-ground); color: var(--uf-ink); overflow-x: hidden; }
  .uf7-root * { box-sizing: border-box; }
  .uf7-grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 40;
    opacity: 0.14; mix-blend-mode: overlay;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.55"/></svg>');
  }
  .uf7-blob { position: absolute; border-radius: 50%; filter: blur(90px) hue-rotate(calc(var(--uf7hue, 0deg) + var(--uf7shue, 0deg))); pointer-events: none; opacity: 0.22; }
  .dark .uf7-blob { opacity: 1; }
  .dark .uf7-grain { opacity: 0.45; }
  @keyframes uf7drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(50px,34px) scale(1.09); } }
  @keyframes uf7drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-44px,-28px) scale(1.06); } }
  @media (prefers-reduced-motion: reduce) {
    .uf7-blob { animation: none !important; }
    .uf7-rv { opacity: 1 !important; transform: none !important; }
  }
  .uf7-rv { opacity: 0; transform: translateY(26px); transition: opacity 0.75s ease, transform 0.75s cubic-bezier(0.22,1,0.36,1); }
  .uf7-rv.uf7-vis { opacity: 1; transform: none; }

  .uf7-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 28px;
    background: var(--uf-topbar-glass); backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--uf-surface);
  }
  .uf7-nav-links { display: flex; gap: 26px; }
  .uf7-nav-links a { font-size: 13px; font-weight: 600; color: var(--uf-ink-2); text-decoration: none; }
  .uf7-nav-cta {
    padding: 9px 18px; border-radius: var(--uf-r-pill); border: none; cursor: pointer;
    font-family: ${F}; font-size: 13px; font-weight: 700; color: var(--uf-ground); background: var(--uf-ink);
  }

  .uf7-hero {
    position: relative; min-height: 100vh; overflow: hidden; text-align: center;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 150px 24px 264px;
    background: radial-gradient(1100px 700px at 50% 118%, var(--uf-surface) 0%, transparent 60%), var(--uf-ground);
  }
  .uf7-hb1 { width: 820px; height: 660px; top: -240px; left: -180px; background: radial-gradient(circle at 40% 40%, rgba(34,211,165,0.58), transparent 65%); animation: uf7drift1 24s ease-in-out infinite; }
  .uf7-hb2 { width: 760px; height: 660px; top: -160px; right: -240px; background: radial-gradient(circle at 55% 45%, rgba(79,70,229,0.40), transparent 65%); animation: uf7drift2 30s ease-in-out infinite; }
  .uf7-hb3 { width: 620px; height: 560px; bottom: -220px; left: 6%; background: radial-gradient(circle at 50% 50%, rgba(98,250,227,0.3), transparent 65%); animation: uf7drift2 34s ease-in-out infinite reverse; }
  .uf7-hb4 { width: 540px; height: 500px; bottom: -160px; right: 4%; background: radial-gradient(circle at 50% 50%, rgba(30,64,175,0.28), transparent 62%); animation: uf7drift1 38s ease-in-out infinite reverse; }
  .uf7-dawn {
    position: absolute; z-index: 2; left: 50%; bottom: calc(-0.80 * min(1400px, 170vw)); transform: translateX(-50%);
    width: min(1400px, 170vw); aspect-ratio: 1; pointer-events: none;
  }
  .uf7-dawn-glow {
    position: absolute; z-index: 1; left: 50%; bottom: -8%; transform: translateX(-50%);
    width: min(1100px, 140vw); height: 380px; pointer-events: none;
    background: radial-gradient(ellipse at 50% 100%, rgba(98,250,227,0.34) 0%, rgba(34,211,165,0.14) 42%, transparent 70%);
    filter: blur(28px) hue-rotate(calc(var(--uf7hue, 0deg) + var(--uf7shue, 0deg)));
  }
  .uf7-eyebrow { position: relative; z-index: 4; font-size: 12px; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: var(--uf-teal); }
  .uf7-h1 {
    position: relative; z-index: 4; margin: 18px 0 0; font-family: ${SERIF}; font-weight: 400;
    font-size: clamp(48px, 7.4vw, 88px); line-height: 1.04; letter-spacing: -0.02em;
    color: var(--uf-ink);
  }
  .uf7-h1 i { font-style: italic; }
  .uf7-note { position: relative; z-index: 4; margin: 26px auto 0; max-width: 520px; font-size: 16px; line-height: 1.6; font-weight: 500; color: var(--uf-ink-2); }
  .uf7-cta {
    position: relative; z-index: 4; margin-top: 36px;
    display: inline-flex; align-items: center; gap: 10px;
    height: 60px; padding: 0 38px; border-radius: var(--uf-r-pill); cursor: pointer;
    background: var(--uf-green); border: 1px solid transparent;
    backdrop-filter: blur(14px); color: #fff; font-family: ${F}; font-size: 17px; font-weight: 700;
    box-shadow: var(--uf-e2);
  }
  .uf7-arrow { color: currentColor; opacity: 0.72; }
  .uf7-micro { position: relative; z-index: 4; margin-top: 16px; font-size: 13px; font-weight: 500; color: var(--uf-ink-3); }

  .uf7-trust { position: relative; z-index: 4; margin-top: 44px; width: 100%; max-width: 720px; }
  .uf7-trust-label {
    margin: 0; font-family: ${MONO}; font-size: 11px; font-weight: 500; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--uf-ink-3); text-align: center;
  }
  .uf7-trust-strip {
    position: relative; overflow: hidden; margin-top: 18px; width: 100%;
  }
  /* Edge fade via layered gradients instead of mask-image: masking a
     transform-animated element is a known trigger for browsers/GPUs to
     stop repainting the masked layer, which reads as the animation being
     frozen even though it's still running underneath. */
  .uf7-trust-strip::before, .uf7-trust-strip::after {
    content: ""; position: absolute; top: 0; bottom: 0; width: 64px; z-index: 2; pointer-events: none;
  }
  .uf7-trust-strip::before { left: 0; background: linear-gradient(90deg, var(--uf-ground), transparent); }
  .uf7-trust-strip::after { right: 0; background: linear-gradient(270deg, var(--uf-ground), transparent); }
  .uf7-trust-track {
    display: flex; gap: 16px; align-items: center; width: max-content;
  }
  .uf7-trust-logo { border-radius: 8px; object-fit: cover; opacity: 0.75; flex-shrink: 0; filter: grayscale(0.15); }

  .uf7-block { position: relative; overflow: hidden; padding: 104px 24px; background: var(--uf-ground); }

  /* Chapters. Every section used to sit on the same flat ground, which is
     why the page read as one undifferentiated scroll however much the copy
     changed. Alternating surfaces + a hairline give it pacing. */
  .uf7-block--alt { background: var(--uf-card); border-top: 1px solid var(--uf-surface); border-bottom: 1px solid var(--uf-surface); }

  /* Two columns: argument left, evidence right. The single 920px column was
     leaving a third of a desktop viewport empty. */
  .uf7-split { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 72px; align-items: center; }
  .uf7-split-head { align-self: center; }

  /* Holds the data so it reads as an object rather than floating on the page. */
  .uf7-panel { background: var(--uf-surface); border: 1px solid var(--uf-border); border-radius: 22px; padding: 28px; }

  /* ── Hero: the two decade figures, and the curve they describe ── */
  .uf7-yourdate { position: relative; z-index: 4; margin-top: 22px; font-family: ${MONO}; font-size: 13px; color: var(--uf-ink-3); }
  .uf7-yourdate b { color: var(--uf-teal); font-weight: 500; }
  /* Hero compound curve. Sits above the sun glow, below the copy. */
  .uf7-curve { position: absolute; left: 0; right: 0; bottom: 0; height: 214px; z-index: 3; pointer-events: none; }
  .uf7-curve svg { width: 100%; height: 100%; display: block; }
  .uf7-curve-here {
    position: absolute; left: 9%; bottom: 40px; font-family: ${MONO}; font-size: 11px;
    letter-spacing: 0.08em; color: var(--uf-ink-3); white-space: nowrap;
  }
  .uf7-curve-here::after {
    content: ""; position: absolute; left: 50%; bottom: -13px; width: 9px; height: 9px; margin-left: -4.5px;
    border-radius: 50%; background: var(--uf-ground); border: 2px solid var(--uf-ink-3);
  }
  .uf7-curve-last {
    position: absolute; left: 76%; top: 14px; font-family: ${MONO}; font-size: 11px;
    letter-spacing: 0.06em; color: var(--uf-teal-deep); white-space: nowrap;
  }
  .uf7-curve-axis {
    position: absolute; left: 0; right: 0; bottom: 8px; display: flex; justify-content: space-between;
    padding: 0 24px; font-family: ${MONO}; font-size: 10px; letter-spacing: 0.1em; color: var(--uf-ink-3); opacity: 0.75;
  }

  .uf7-splitstat { position: relative; z-index: 4; display: flex; gap: 16px; margin-top: 32px; flex-wrap: wrap; justify-content: center; }
  .uf7-splitstat-card { min-width: 168px; padding: 16px 24px; border-radius: 16px; background: var(--uf-surface); border: 1px solid var(--uf-border); text-align: left; }
  .uf7-splitstat-hot { background: rgba(34,211,165,0.10); border-color: rgba(98,250,227,0.34); }
  .uf7-splitstat-label { font-family: ${MONO}; font-size: 10px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--uf-ink-3); }
  .uf7-splitstat-num { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 40px; line-height: 1.1; margin-top: 6px; color: var(--uf-teal); }
  .uf7-splitstat-dim { color: var(--uf-ink-3); }
  .uf7-splitstat-foot { font-size: 12px; color: var(--uf-ink-3); margin-top: 2px; }

  /* ── Shared section lede ── */
  .uf7-panel-cap { font-family: ${MONO}; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--uf-ink-3); margin-bottom: 22px; }
  .uf7-panel-foot { font-family: ${MONO}; font-size: 11px; color: var(--uf-ink-3); margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--uf-border); }
  .uf7-hl { font-style: normal; color: var(--uf-teal); }
  .uf7-head-2up { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 56px; align-items: end; }
  .uf7-head-2up .uf7-lede { margin-top: 0; }
  .uf7-lede { margin: 20px 0 0; font-size: 17px; line-height: 1.75; color: var(--uf-ink-3); max-width: 620px; }

  /* ── Decade shares ── */
  .uf7-decades { margin-top: 48px; display: flex; flex-direction: column; gap: 14px; }
  .uf7-decade { display: grid; grid-template-columns: 88px 1fr 92px 38px; gap: 12px; align-items: center; }
  .uf7-decade-span { font-family: ${MONO}; font-size: 12px; color: var(--uf-ink-3); }
  .uf7-decade-track { height: 32px; border-radius: 10px; background: var(--uf-surface); overflow: hidden; }
  .uf7-decade-fill { height: 100%; border-radius: 10px; background: rgba(98,250,227,0.34); }
  .uf7-decade-fill-hot { background: linear-gradient(90deg, rgba(34,211,165,0.75), var(--uf-teal)); }
  .uf7-decade-amt { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 13px; color: var(--uf-ink-2); text-align: right; }
  .uf7-decade-pct { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 13px; color: var(--uf-teal); text-align: right; }

  /* ── Early vs late starter ── */
  .uf7-versus { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .uf7-versus-card { position: relative; padding: 28px; border-radius: 20px; background: var(--uf-surface); border: 1px solid var(--uf-border); }
  .uf7-versus-win { background: rgba(34,211,165,0.09); border-color: rgba(98,250,227,0.36); }
  .uf7-versus-tag { position: absolute; top: -11px; left: 28px; background: var(--uf-teal); color: #06231C; border-radius: 999px; padding: 3px 12px; font-size: 11px; font-weight: 800; }
  .uf7-versus-who { font-size: 16px; font-weight: 800; }
  .uf7-versus-desc { margin: 8px 0 0; font-size: 14px; line-height: 1.6; color: var(--uf-ink-3); }
  .uf7-versus-figs { display: flex; gap: 32px; margin-top: 24px; }
  .uf7-versus-lbl { font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--uf-ink-3); }
  .uf7-versus-in { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 20px; color: var(--uf-ink-2); margin-top: 4px; }
  .uf7-versus-out { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 28px; color: var(--uf-teal); margin-top: 2px; }
  .uf7-versus-out-dim { color: var(--uf-ink-3); }

  /* ── Any-size table ── */
  .uf7-table { margin-top: 44px; border: 1px solid var(--uf-border); border-radius: 18px; overflow: hidden; }
  .uf7-table-head, .uf7-table-row { display: grid; grid-template-columns: 1.1fr 1fr 1.1fr 0.7fr; gap: 16px; align-items: center; padding: 16px 24px; }
  .uf7-table-head { background: var(--uf-surface); font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--uf-ink-3); }
  .uf7-table-row { border-top: 1px solid var(--uf-border); }
  .uf7-table-end { text-align: right; }
  .uf7-table-invest { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 15px; }
  .uf7-table-paid { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 14px; color: var(--uf-ink-3); }
  .uf7-table-becomes { font-family: ${MONO}; font-variant-numeric: tabular-nums; font-size: 17px; color: var(--uf-teal); }
  .uf7-mult { display: inline-block; background: rgba(34,211,165,0.14); color: var(--uf-teal); border-radius: 999px; padding: 4px 11px; font-size: 12px; font-weight: 800; }
  .uf7-table-foot { margin: 18px 0 0; font-family: ${MONO}; font-size: 11px; line-height: 1.7; color: var(--uf-ink-3); max-width: 620px; }

  .uf7-wrap { position: relative; z-index: 4; max-width: 1060px; margin: 0 auto; }
  .uf7-wrap-wide { max-width: 1040px; }
  .uf7-center { text-align: center; }
  .uf7-sec-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.26em; text-transform: uppercase; color: var(--uf-teal); }
  .uf7-statement { margin: 18px 0 0; font-family: ${SERIF}; font-weight: 400; font-size: clamp(28px, 4.4vw, 46px); line-height: 1.2; letter-spacing: -0.02em; }
  .uf7-statement em, .uf7-statement i { font-style: italic; }
  .uf7-statement em { color: var(--uf-teal); }
  .uf7-glow-l { width: 640px; height: 520px; top: -180px; left: -260px; background: radial-gradient(circle, rgba(34,211,165,0.18), transparent 62%); animation: uf7drift1 36s ease-in-out infinite; }
  .uf7-glow-r { width: 700px; height: 560px; top: -160px; right: -280px; background: radial-gradient(circle, rgba(79,70,229,0.2), transparent 62%); animation: uf7drift2 40s ease-in-out infinite; }

  .uf7-rows { margin-top: 60px; }
  .uf7-row { display: grid; grid-template-columns: 110px 1fr; gap: 28px; align-items: baseline; padding: 32px 0; border-top: 1px solid var(--uf-border); }
  .uf7-row:last-child { border-bottom: 1px solid var(--uf-border); }
  .uf7-row-n { font-family: ${SERIF}; font-size: clamp(38px, 5vw, 54px); color: rgba(98,250,227,0.85); line-height: 1; }
  .uf7-row h3 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.015em; }
  .uf7-row p { margin: 8px 0 0; font-size: 15px; line-height: 1.65; color: var(--uf-ink-2); max-width: 460px; }

  .uf7-slider-stage { margin-top: 64px; }
  .uf7-live-amount { font-family: ${SERIF}; font-size: clamp(52px, 8vw, 96px); line-height: 1; letter-spacing: -0.02em; text-shadow: 0 4px 60px rgba(34,211,165,0.3); color: var(--uf-teal); }
  .uf7-saves { margin-top: 14px; font-size: 14px; font-weight: 700; color: var(--uf-teal); min-height: 20px; }
  .uf7-slider-row { margin: 44px auto 0; max-width: 560px; }
  .uf7-slider-label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--uf-ink-2); margin-bottom: 14px; }
  .uf7-slider-label strong { color: #fff; font-variant-numeric: tabular-nums; }
  .uf7-slider-row input[type="range"] { width: 100%; appearance: none; -webkit-appearance: none; height: 3px; border-radius: 99px; background: linear-gradient(90deg, var(--uf-teal), var(--uf-border)); outline: none; }
  .uf7-slider-row input[type="range"]::-webkit-slider-thumb {
    appearance: none; -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%;
    background: var(--uf-teal); border: 3px solid var(--uf-ground);
    box-shadow: 0 0 0 1px rgba(98,250,227,0.6), 0 0 24px rgba(98,250,227,0.55); cursor: pointer;
  }
  .uf7-slider-row input[type="range"]::-moz-range-thumb {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--uf-teal); border: 3px solid var(--uf-ground);
    box-shadow: 0 0 0 1px rgba(98,250,227,0.6), 0 0 24px rgba(98,250,227,0.55); cursor: pointer;
  }
  .uf7-slider-foot { margin-top: 14px; font-size: 12px; color: var(--uf-ink-3); }

  .uf7-earlier { margin-top: 34px; font-family: ${SERIF}; font-size: clamp(22px, 3vw, 30px); }
  .uf7-earlier em { color: var(--uf-teal); font-style: italic; }

  .uf7-stars {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.7;
    background-image:
      radial-gradient(1.2px 1.2px at 12% 22%, var(--uf-ink-2), transparent 100%),
      radial-gradient(1px 1px at 28% 64%, var(--uf-ink-3), transparent 100%),
      radial-gradient(1.4px 1.4px at 43% 12%, var(--uf-ink-3), transparent 100%),
      radial-gradient(1px 1px at 61% 38%, var(--uf-ink-3), transparent 100%),
      radial-gradient(1.3px 1.3px at 74% 70%, var(--uf-ink-3), transparent 100%),
      radial-gradient(1px 1px at 87% 18%, var(--uf-ink-3), transparent 100%),
      radial-gradient(1.1px 1.1px at 52% 86%, var(--uf-ink-3), transparent 100%),
      radial-gradient(1.3px 1.3px at 8% 78%, var(--uf-ink-3), transparent 100%);
  }
  .uf7-globe-grid { margin-top: 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
  .uf7-globe-stage { position: relative; aspect-ratio: 1; width: min(440px, 100%); justify-self: center; }
  .uf7-city-row { display: grid; grid-template-columns: 1fr auto auto; gap: 18px; align-items: baseline; padding: 17px 0; border-top: 1px solid var(--uf-border); }
  .uf7-city-row:last-of-type { border-bottom: 1px solid var(--uf-border); }
  .uf7-city { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
  .uf7-cost { font-size: 14px; color: var(--uf-ink-2); font-variant-numeric: tabular-nums; }
  .uf7-status { font-family: ${MONO}; font-size: 12px; font-weight: 500; letter-spacing: 0.06em; }
  .uf7-ready { color: var(--uf-teal); }
  .uf7-later { color: var(--uf-ink-3); }
  .uf7-globe-foot { margin-top: 22px; font-size: 12.5px; color: var(--uf-ink-3); }

  .uf7-price-cols { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; }
  .uf7-pcol { padding: 8px 44px 8px 0; }
  .uf7-pcol + .uf7-pcol { border-left: 1px solid var(--uf-border); padding: 8px 0 8px 44px; }
  .uf7-tier { font-size: 13px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--uf-ink-3); }
  .uf7-amount { margin-top: 14px; font-family: ${SERIF}; font-size: clamp(40px, 5vw, 56px); line-height: 1; }
  .uf7-amount small { font-size: 15px; color: var(--uf-ink-2); font-family: ${F}; font-weight: 600; }
  .uf7-trial-note { display: block; margin-top: 12px; font-family: ${MONO}; font-size: 11px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--uf-teal); }
  .uf7-pcol ul { margin: 26px 0 0; padding: 0; list-style: none; }
  .uf7-pcol li { font-size: 14.5px; line-height: 1.5; color: var(--uf-ink-2); padding: 8px 0; border-top: 1px solid var(--uf-surface); }
  .uf7-pcol li:first-child { border-top: none; }
  .uf7-pro-cta { margin-top: 28px; display: inline-block; padding: 14px 34px; border-radius: 2px; border: none; cursor: pointer; font-size: 14.5px; font-weight: 800; color: var(--uf-ground); background: linear-gradient(90deg, #b8ffe9, var(--uf-teal) 50%, var(--uf-teal)); box-shadow: 0 14px 34px rgba(34,211,165,0.26); font-family: ${F}; }
  .uf7-free-cta { margin-top: 28px; display: inline-block; padding: 13px 30px; border-radius: var(--uf-r-pill); cursor: pointer; font-size: 14.5px; font-weight: 700; color: #fff; background: var(--uf-green); border: 1px solid transparent; font-family: ${F}; }

  .uf7-quote-mark { font-family: ${SERIF}; font-size: 90px; line-height: 0.4; color: rgba(98,250,227,0.5); }
  .uf7-big-quote { margin: 34px auto 0; font-family: ${SERIF}; font-size: clamp(26px, 4vw, 40px); line-height: 1.3; max-width: 780px; }
  .uf7-attr { margin-top: 30px; font-size: 12px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--uf-ink-3); }

  .uf7-faq-list { margin-top: 56px; }
  .uf7-faq-list details { border-top: 1px solid var(--uf-border); padding: 24px 4px; }
  .uf7-faq-list details:last-child { border-bottom: 1px solid var(--uf-border); }
  .uf7-faq-list summary { cursor: pointer; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; list-style: none; display: flex; justify-content: space-between; align-items: center; }
  .uf7-faq-list summary::-webkit-details-marker { display: none; }
  .uf7-faq-list summary::after { content: "+"; color: var(--uf-teal); font-size: 22px; font-weight: 500; }
  .uf7-faq-list details[open] summary::after { content: "–"; }
  .uf7-faq-list details p { margin: 14px 0 0; font-size: 15px; line-height: 1.7; color: var(--uf-ink-2); max-width: 640px; }

  .uf7-closing { text-align: center; padding: 150px 24px 160px; }
  .uf7-closing-h { margin: 0; font-family: ${SERIF}; font-weight: 400; font-size: clamp(40px, 6.6vw, 68px); line-height: 1.06; letter-spacing: -0.02em; }
  .uf7-closing-sub { margin: 22px auto 0; max-width: 420px; font-size: 15.5px; line-height: 1.6; color: var(--uf-ink-2); }
  .uf7-close-a { width: 760px; height: 560px; bottom: -260px; left: 50%; transform: translateX(-58%); background: radial-gradient(circle, rgba(34,211,165,0.28), transparent 62%); animation: uf7drift1 30s ease-in-out infinite; }
  .uf7-close-b { width: 560px; height: 480px; bottom: -200px; right: -160px; background: radial-gradient(circle, rgba(79,70,229,0.28), transparent 62%); animation: uf7drift2 34s ease-in-out infinite; }

  @media (max-width: 760px) {
    .uf7-nav-links { display: none; }
    .uf7-hero { padding: 130px 20px 210px; }
    .uf7-block { padding: 88px 20px; }
    .uf7-split { grid-template-columns: 1fr; gap: 36px; }
    .uf7-head-2up { grid-template-columns: 1fr; gap: 20px; align-items: start; }
    .uf7-panel { padding: 22px; border-radius: 18px; }
    .uf7-row { grid-template-columns: 60px 1fr; gap: 18px; padding: 28px 0; }
    .uf7-globe-grid { grid-template-columns: 1fr; gap: 40px; }
    .uf7-price-cols { grid-template-columns: 1fr; }
    .uf7-pcol { padding: 8px 0 40px; }
    .uf7-pcol + .uf7-pcol { border-left: none; border-top: 1px solid var(--uf-border); padding: 40px 0 8px; }
    .uf7-versus { grid-template-columns: 1fr; }
    .uf7-decade { grid-template-columns: 88px 1fr 92px; gap: 12px; }
    .uf7-decade-pct { display: none; }
    .uf7-table-head { display: none; }
    .uf7-table-row { grid-template-columns: 1fr auto; gap: 6px 12px; }
    /* badge drops to a second line; keep it under the amount, not under the label */
    .uf7-table-row .uf7-table-end { grid-column: 2; }
    .uf7-table-paid { display: none; }
    .uf7-splitstat-card { min-width: 140px; padding: 14px 18px; }
    .uf7-curve { height: 148px; }
    .uf7-curve-last { display: none; }
    .uf7-curve-axis { font-size: 9px; padding: 0 14px; }
  }
`;

/* ── Page ────────────────────────────────────────────────────────────── */
export default function LandingPage({ onStart }: { onStart: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>(".uf7-rv"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let io: IntersectionObserver | null = null;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      items.forEach((el) => el.classList.add("uf7-vis"));
    } else {
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("uf7-vis");
          io?.unobserve(entry.target);
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      items.forEach((el) => io?.observe(el));
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        root.style.setProperty("--uf7shue", (p * 26).toFixed(1) + "deg");
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={rootRef} className="uf7-root" style={{ fontFamily: F }}>
      <div className="uf7-grain" aria-hidden />
      <Nav7 onStart={onStart} />
      <Hero7 onStart={onStart} />
      <How7 />
      <TryIt7 />
      <DecadeShape7 />
      <StartEarly7 />
      <AnySize7 />
      <World7 />
      <Pricing7 onStart={onStart} />
      <Quote7 />
      <Faq7 />
      <Closing7 onStart={onStart} />
      <FooterSection />
      <style>{CSS7}</style>
    </div>
  );
}
