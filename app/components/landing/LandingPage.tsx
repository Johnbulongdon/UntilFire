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

function useCobeGlobe(canvasRef: React.RefObject<HTMLCanvasElement | null>, size: number, markers: { location: [number, number]; size: number }[], startPhi: number) {
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let visObserver: IntersectionObserver | null = null;
    let globe: { update: (state: { phi: number }) => void; destroy: () => void } | null = null;
    let phi = startPhi;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("cobe").then(({ default: createGlobe }) => {
      if (cancelled || !canvasRef.current) return;
      globe = createGlobe(canvasRef.current, {
        devicePixelRatio: 2,
        width: size * 2,
        height: size * 2,
        phi,
        theta: 0.22,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 24000,
        mapBrightness: 8,
        baseColor: [0.18, 0.5, 0.42],
        markerColor: [0.38, 0.98, 0.89],
        glowColor: [0.1, 0.4, 0.34],
        markers,
      });
      if (!reduceMotion) {
        let onscreen = true;
        const spin = () => {
          if (onscreen) {
            phi += 0.0028;
            globe?.update({ phi });
          }
          raf = requestAnimationFrame(spin);
        };
        raf = requestAnimationFrame(spin);
        // Pause rendering while the canvas is offscreen: keeps scrolling
        // smooth and saves battery — two live globes share one page.
        visObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => { onscreen = entry.isIntersecting; });
        });
        if (canvasRef.current) visObserver.observe(canvasRef.current);
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      visObserver?.disconnect();
      if (globe) globe.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── Nav ─────────────────────────────────────────────────────────────── */
function Nav7({ onStart }: { onStart: () => void }) {
  return (
    <header className="uf7-nav">
      <Logo variant="dark" size={26} />
      <nav className="uf7-nav-links">
        <a href="#how">How it works</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <button className="uf7-nav-cta" onClick={onStart}>Get started</button>
    </header>
  );
}

/* ── Countdown to the second birth ───────────────────────────────────── */
function Countdown7() {
  const [now, setNow] = useState<Date | null>(null);
  const [target, setTarget] = useState<Date>(() => new Date(2037, 2, 15));
  const [personal, setPersonal] = useState(false);

  useEffect(() => {
    const prefill = peekCalculatorPrefill();
    if (prefill && typeof prefill.retireYear === "number" && prefill.retireYear > new Date().getFullYear()) {
      setTarget(new Date(prefill.retireYear, 6, 1));
      setPersonal(true);
    }
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  let days = "—";
  let clock = "--:--:--";
  if (now) {
    const ms = Math.max(0, target.getTime() - now.getTime());
    days = Math.floor(ms / 86400000).toLocaleString();
    const rem = ms % 86400000;
    clock = pad(Math.floor(rem / 3600000)) + ":" + pad(Math.floor((rem % 3600000) / 60000)) + ":" + pad(Math.floor((rem % 60000) / 1000));
  }
  return (
    <div className="uf7-countdown">
      {personal ? "Your second birth in " : "Second birth in "}
      <b>{days}</b> days · <b>{clock}</b>
    </div>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────── */
function Hero7({ onStart }: { onStart: () => void }) {
  const dawnRef = useRef<HTMLCanvasElement | null>(null);
  useCobeGlobe(dawnRef, 1400, [
    { location: [18.79, 98.98], size: 0.06 },
    { location: [38.72, -9.14], size: 0.06 },
    { location: [19.43, -99.13], size: 0.06 },
    { location: [51.51, -0.13], size: 0.05 },
    { location: [35.68, 139.69], size: 0.05 },
    { location: [1.35, 103.82], size: 0.05 },
  ], 4.2);

  return (
    <section className="uf7-hero" style={{ ["--uf7hue" as string]: "0deg" }}>
      <div className="uf7-blob uf7-hb1" />
      <div className="uf7-blob uf7-hb2" />
      <div className="uf7-blob uf7-hb3" />
      <div className="uf7-blob uf7-hb4" />
      <div className="uf7-dawn-glow" aria-hidden />
      <div className="uf7-dawn" aria-hidden>
        <canvas ref={dawnRef} style={{ width: "100%", height: "100%" }} />
      </div>

      <div className="uf7-eyebrow">Finance your freedom</div>
      <h1 className="uf7-h1">You are born <i>twice</i>.</h1>
      <p className="uf7-note">
        Once, into the grind. The second time, the day work becomes optional — and the
        world becomes something to explore, not survive. UntilFire plans the years in between.
      </p>
      <Countdown7 />
      <button className="uf7-cta" onClick={onStart}>
        Find my second birthday <span className="uf7-arrow">→</span>
      </button>
      <p className="uf7-micro">Free · No account · Numbers stay private</p>

      <div className="uf7-trust">
        <p className="uf7-trust-label">Securely connects to 14,000+ banks &amp; brokerages</p>
        <div className="uf7-trust-strip">
          <div className="uf7-trust-track">
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
            <div className="uf7-slider-foot">Starting from $0, after {TRYIT_YEARS} years at a 7% average annual return.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── The compound gap: one chart, bars vs drift ──────────────────────── */
function CompoundGap7() {
  const y0 = new Date().getFullYear();
  const bars = useMemo(() => Array.from({ length: 26 }, (_, i) => Math.max(3, Math.pow(i / 25, 1.9) * 88)), []);
  return (
    <section className="uf7-block" style={{ ["--uf7hue" as string]: "62deg" }}>
      <div className="uf7-blob uf7-glow-l" />
      <div className="uf7-wrap">
        <div className="uf7-sec-eyebrow uf7-rv">The compound gap</div>
        <h2 className="uf7-statement uf7-rv">Your money compounds.<br />A plan makes it <em>count</em>.</h2>
        <div className="uf7-runway uf7-rv">
          <div className="uf7-target-line" />
          <div className="uf7-target-tag">Your FIRE target</div>
          <svg className="uf7-drift" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden>
            <path d="M0,312 C260,300 520,268 800,210" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2.5" strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
            <circle cx="794" cy="211" r="5" fill="rgba(255,255,255,0.5)" />
          </svg>
          {bars.map((h, i) => (
            <div className="uf7-bar" key={i} style={{ height: `${h}%` }} />
          ))}
          <div className="uf7-chart-note uf7-cn-plan">With a plan — {y0 + 11}</div>
          <div className="uf7-chart-leader" />
          <div className="uf7-chart-note uf7-cn-base">Drifting — {y0 + 18}</div>
        </div>
        <div className="uf7-runway-axis">
          <span>{y0}</span><span>{y0 + 4}</span><span>{y0 + 9}</span><span>{y0 + 13}</span><span>{y0 + 18}</span>
        </div>
        <p className="uf7-earlier uf7-rv">Same savings, guided monthly: <em>{y0 + 11} instead of {y0 + 18}</em>.</p>
      </div>
    </section>
  );
}

/* ── The world: globe + real city numbers ────────────────────────────── */
function World7() {
  const globeRef = useRef<HTMLCanvasElement | null>(null);
  useCobeGlobe(globeRef, 440, [
    { location: [18.79, 98.98], size: 0.07 },
    { location: [19.43, -99.13], size: 0.07 },
    { location: [38.72, -9.14], size: 0.07 },
    { location: [35.68, 139.69], size: 0.05 },
    { location: [51.51, -0.13], size: 0.05 },
    { location: [37.77, -122.42], size: 0.05 },
  ], 2.2);

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
            <canvas ref={globeRef} style={{ width: "100%", height: "100%" }} />
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
    <section className="uf7-block" id="pricing" style={{ ["--uf7hue" as string]: "52deg" }}>
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
            <button className="uf7-free-cta" onClick={onStart}>Find my second birthday</button>
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
        <h2 className="uf7-closing-h uf7-rv">Your second life<br />is <i>waiting</i>.</h2>
        <p className="uf7-closing-sub uf7-rv">Find your second birthday — free, no login, about 60 seconds.</p>
        <button className="uf7-cta uf7-rv" onClick={onStart} style={{ marginTop: 38 }}>
          Find my second birthday <span className="uf7-arrow">→</span>
        </button>
      </div>
    </section>
  );
}


/* ── Footer ──────────────────────────────────────────────────────────── */
function FooterSection() {
  return (
    <footer style={{ background: "#030d0a", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "48px 24px 32px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginBottom: 32 }}>
          {[
            ["How it works", "#how"],
            ["Learn", "/learn"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.72)", textDecoration: "none" }}>{label}</a>
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
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 0 16px", fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500, flexWrap: "wrap", gap: 16 }}>
          <span>© 2026 UntilFire</span>
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
          <span>Make work optional</span>
        </div>
      </div>
    </footer>
  );
}



const CSS7 = `
  .uf7-root { background: #04110c; color: #fff; overflow-x: hidden; }
  .uf7-root * { box-sizing: border-box; }
  .uf7-grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 40;
    opacity: 0.45; mix-blend-mode: overlay;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.55"/></svg>');
  }
  .uf7-blob { position: absolute; border-radius: 50%; filter: blur(90px) hue-rotate(calc(var(--uf7hue, 0deg) + var(--uf7shue, 0deg))); pointer-events: none; }
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
    background: rgba(4,17,12,0.5); backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .uf7-nav-links { display: flex; gap: 26px; }
  .uf7-nav-links a { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.72); text-decoration: none; }
  .uf7-nav-cta {
    padding: 9px 18px; border-radius: 2px; border: none; cursor: pointer;
    font-family: ${F}; font-size: 13px; font-weight: 700; color: #04110c; background: rgba(255,255,255,0.92);
  }

  .uf7-hero {
    position: relative; min-height: 100vh; overflow: hidden; text-align: center;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 150px 24px 220px;
    background: radial-gradient(1100px 700px at 50% 118%, #0a2f22 0%, transparent 60%), #04110c;
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
  .uf7-eyebrow { position: relative; z-index: 4; font-size: 12px; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: #62fae3; }
  .uf7-h1 {
    position: relative; z-index: 4; margin: 18px 0 0; font-family: ${SERIF}; font-weight: 400;
    font-size: clamp(48px, 7.4vw, 88px); line-height: 1.04; letter-spacing: -0.02em;
    color: rgba(255,255,255,0.96); text-shadow: 0 3px 60px rgba(0,0,0,0.4);
  }
  .uf7-h1 i { font-style: italic; }
  .uf7-note { position: relative; z-index: 4; margin: 26px auto 0; max-width: 520px; font-size: 16px; line-height: 1.6; font-weight: 500; color: rgba(255,255,255,0.75); }
  .uf7-countdown {
    position: relative; z-index: 4; margin-top: 20px;
    font-family: ${MONO};
    font-size: clamp(12px, 1.6vw, 16px); letter-spacing: 0.2em; text-transform: uppercase;
    color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums;
  }
  .uf7-countdown b { color: #62fae3; font-weight: 500; }
  .uf7-cta {
    position: relative; z-index: 4; margin-top: 36px;
    display: inline-flex; align-items: center; gap: 10px;
    height: 60px; padding: 0 38px; border-radius: 2px; cursor: pointer;
    background: rgba(5,14,11,0.72); border: 1px solid rgba(255,255,255,0.22);
    backdrop-filter: blur(14px); color: #fff; font-family: ${F}; font-size: 17px; font-weight: 700;
    box-shadow: 0 0 0 1px rgba(98,250,227,0.12), 0 0 44px rgba(34,211,165,0.32), 0 18px 40px rgba(0,0,0,0.4);
  }
  .uf7-arrow { color: #62fae3; }
  .uf7-micro { position: relative; z-index: 4; margin-top: 16px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); }

  .uf7-trust { position: relative; z-index: 4; margin-top: 44px; width: 100%; max-width: 720px; }
  .uf7-trust-label {
    margin: 0; font-family: ${MONO}; font-size: 11px; font-weight: 500; letter-spacing: 0.14em;
    text-transform: uppercase; color: rgba(255,255,255,0.42); text-align: center;
  }
  .uf7-trust-strip {
    position: relative; overflow: hidden; margin-top: 18px; width: 100%;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%);
  }
  .uf7-trust-track { display: flex; gap: 16px; align-items: center; width: max-content; animation: uf7trustScroll 30s linear infinite; }
  @media (prefers-reduced-motion: reduce) { .uf7-trust-track { animation: none; } }
  @keyframes uf7trustScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  .uf7-trust-logo { border-radius: 8px; object-fit: cover; opacity: 0.75; flex-shrink: 0; filter: grayscale(0.15); }

  .uf7-block { position: relative; overflow: hidden; padding: 110px 24px; background: #04110c; }
  .uf7-wrap { position: relative; z-index: 4; max-width: 920px; margin: 0 auto; }
  .uf7-wrap-wide { max-width: 1040px; }
  .uf7-center { text-align: center; }
  .uf7-sec-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.26em; text-transform: uppercase; color: #62fae3; }
  .uf7-statement { margin: 18px 0 0; font-family: ${SERIF}; font-weight: 400; font-size: clamp(28px, 4.4vw, 46px); line-height: 1.2; letter-spacing: -0.02em; }
  .uf7-statement em, .uf7-statement i { font-style: italic; }
  .uf7-statement em { color: #62fae3; }
  .uf7-glow-l { width: 640px; height: 520px; top: -180px; left: -260px; background: radial-gradient(circle, rgba(34,211,165,0.18), transparent 62%); animation: uf7drift1 36s ease-in-out infinite; }
  .uf7-glow-r { width: 700px; height: 560px; top: -160px; right: -280px; background: radial-gradient(circle, rgba(79,70,229,0.2), transparent 62%); animation: uf7drift2 40s ease-in-out infinite; }

  .uf7-rows { margin-top: 60px; }
  .uf7-row { display: grid; grid-template-columns: 110px 1fr; gap: 28px; align-items: baseline; padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.14); }
  .uf7-row:last-child { border-bottom: 1px solid rgba(255,255,255,0.14); }
  .uf7-row-n { font-family: ${SERIF}; font-size: clamp(38px, 5vw, 54px); color: rgba(98,250,227,0.85); line-height: 1; }
  .uf7-row h3 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.015em; }
  .uf7-row p { margin: 8px 0 0; font-size: 15px; line-height: 1.65; color: rgba(255,255,255,0.68); max-width: 460px; }

  .uf7-slider-stage { margin-top: 64px; }
  .uf7-live-amount { font-family: ${SERIF}; font-size: clamp(52px, 8vw, 96px); line-height: 1; letter-spacing: -0.02em; text-shadow: 0 4px 60px rgba(34,211,165,0.3); color: #62fae3; }
  .uf7-saves { margin-top: 14px; font-size: 14px; font-weight: 700; color: #62fae3; min-height: 20px; }
  .uf7-slider-row { margin: 44px auto 0; max-width: 560px; }
  .uf7-slider-label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.68); margin-bottom: 14px; }
  .uf7-slider-label strong { color: #fff; font-variant-numeric: tabular-nums; }
  .uf7-slider-row input[type="range"] { width: 100%; appearance: none; -webkit-appearance: none; height: 3px; border-radius: 99px; background: linear-gradient(90deg, #22d3a5, rgba(255,255,255,0.15)); outline: none; }
  .uf7-slider-row input[type="range"]::-webkit-slider-thumb {
    appearance: none; -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%;
    background: #62fae3; border: 3px solid #04110c;
    box-shadow: 0 0 0 1px rgba(98,250,227,0.6), 0 0 24px rgba(98,250,227,0.55); cursor: pointer;
  }
  .uf7-slider-row input[type="range"]::-moz-range-thumb {
    width: 22px; height: 22px; border-radius: 50%;
    background: #62fae3; border: 3px solid #04110c;
    box-shadow: 0 0 0 1px rgba(98,250,227,0.6), 0 0 24px rgba(98,250,227,0.55); cursor: pointer;
  }
  .uf7-slider-foot { margin-top: 14px; font-size: 12px; color: rgba(255,255,255,0.42); }

  .uf7-runway { margin-top: 70px; position: relative; height: 320px; display: flex; align-items: flex-end; gap: 6px; }
  .uf7-bar { flex: 1; border-radius: 3px 3px 1px 1px; background: linear-gradient(180deg, rgba(98,250,227,0.95), rgba(34,211,165,0.25)); transform-origin: bottom; }
  .uf7-target-line { position: absolute; left: 0; right: 0; top: 12%; border-top: 2px dashed rgba(98,250,227,0.5); }
  .uf7-target-tag { position: absolute; right: 0; top: 12%; transform: translateY(-130%); font-family: ${MONO}; font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #62fae3; }
  .uf7-drift { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .uf7-chart-note { position: absolute; white-space: nowrap; font-family: ${MONO}; font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; }
  .uf7-cn-plan { top: -12%; right: 0; color: #62fae3; }
  .uf7-cn-base { top: 56%; right: 0; color: rgba(255,255,255,0.48); }
  .uf7-chart-leader { position: absolute; top: -5%; right: 10px; height: 13%; width: 1px; background: rgba(98,250,227,0.45); }
  .uf7-runway-axis { display: flex; justify-content: space-between; margin-top: 14px; font-family: ${MONO}; font-size: 11px; color: rgba(255,255,255,0.45); }
  .uf7-earlier { margin-top: 34px; font-family: ${SERIF}; font-size: clamp(22px, 3vw, 30px); }
  .uf7-earlier em { color: #62fae3; font-style: italic; }

  .uf7-stars {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.7;
    background-image:
      radial-gradient(1.2px 1.2px at 12% 22%, rgba(255,255,255,0.7), transparent 100%),
      radial-gradient(1px 1px at 28% 64%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(1.4px 1.4px at 43% 12%, rgba(255,255,255,0.6), transparent 100%),
      radial-gradient(1px 1px at 61% 38%, rgba(255,255,255,0.4), transparent 100%),
      radial-gradient(1.3px 1.3px at 74% 70%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(1px 1px at 87% 18%, rgba(255,255,255,0.5), transparent 100%),
      radial-gradient(1.1px 1.1px at 52% 86%, rgba(255,255,255,0.4), transparent 100%),
      radial-gradient(1.3px 1.3px at 8% 78%, rgba(255,255,255,0.5), transparent 100%);
  }
  .uf7-globe-grid { margin-top: 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
  .uf7-globe-stage { position: relative; aspect-ratio: 1; width: min(440px, 100%); justify-self: center; }
  .uf7-city-row { display: grid; grid-template-columns: 1fr auto auto; gap: 18px; align-items: baseline; padding: 17px 0; border-top: 1px solid rgba(255,255,255,0.14); }
  .uf7-city-row:last-of-type { border-bottom: 1px solid rgba(255,255,255,0.14); }
  .uf7-city { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
  .uf7-cost { font-size: 14px; color: rgba(255,255,255,0.68); font-variant-numeric: tabular-nums; }
  .uf7-status { font-family: ${MONO}; font-size: 12px; font-weight: 500; letter-spacing: 0.06em; }
  .uf7-ready { color: #62fae3; }
  .uf7-later { color: rgba(255,255,255,0.45); }
  .uf7-globe-foot { margin-top: 22px; font-size: 12.5px; color: rgba(255,255,255,0.5); }

  .uf7-price-cols { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; }
  .uf7-pcol { padding: 8px 44px 8px 0; }
  .uf7-pcol + .uf7-pcol { border-left: 1px solid rgba(255,255,255,0.14); padding: 8px 0 8px 44px; }
  .uf7-tier { font-size: 13px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.6); }
  .uf7-amount { margin-top: 14px; font-family: ${SERIF}; font-size: clamp(40px, 5vw, 56px); line-height: 1; }
  .uf7-amount small { font-size: 15px; color: rgba(255,255,255,0.68); font-family: ${F}; font-weight: 600; }
  .uf7-trial-note { display: block; margin-top: 12px; font-family: ${MONO}; font-size: 11px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #62fae3; }
  .uf7-pcol ul { margin: 26px 0 0; padding: 0; list-style: none; }
  .uf7-pcol li { font-size: 14.5px; line-height: 1.5; color: rgba(255,255,255,0.78); padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.07); }
  .uf7-pcol li:first-child { border-top: none; }
  .uf7-pro-cta { margin-top: 28px; display: inline-block; padding: 14px 34px; border-radius: 2px; border: none; cursor: pointer; font-size: 14.5px; font-weight: 800; color: #04110c; background: linear-gradient(90deg, #b8ffe9, #62fae3 50%, #22d3a5); box-shadow: 0 14px 34px rgba(34,211,165,0.26); font-family: ${F}; }
  .uf7-free-cta { margin-top: 28px; display: inline-block; padding: 13px 30px; border-radius: 2px; cursor: pointer; font-size: 14.5px; font-weight: 700; color: #fff; background: rgba(5,14,11,0.6); border: 1px solid rgba(255,255,255,0.22); font-family: ${F}; }

  .uf7-quote-mark { font-family: ${SERIF}; font-size: 90px; line-height: 0.4; color: rgba(98,250,227,0.5); }
  .uf7-big-quote { margin: 34px auto 0; font-family: ${SERIF}; font-size: clamp(26px, 4vw, 40px); line-height: 1.3; max-width: 780px; }
  .uf7-attr { margin-top: 30px; font-size: 12px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.45); }

  .uf7-faq-list { margin-top: 56px; }
  .uf7-faq-list details { border-top: 1px solid rgba(255,255,255,0.14); padding: 24px 4px; }
  .uf7-faq-list details:last-child { border-bottom: 1px solid rgba(255,255,255,0.14); }
  .uf7-faq-list summary { cursor: pointer; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; list-style: none; display: flex; justify-content: space-between; align-items: center; }
  .uf7-faq-list summary::-webkit-details-marker { display: none; }
  .uf7-faq-list summary::after { content: "+"; color: #62fae3; font-size: 22px; font-weight: 500; }
  .uf7-faq-list details[open] summary::after { content: "–"; }
  .uf7-faq-list details p { margin: 14px 0 0; font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.68); max-width: 640px; }

  .uf7-closing { text-align: center; padding: 150px 24px 160px; }
  .uf7-closing-h { margin: 0; font-family: ${SERIF}; font-weight: 400; font-size: clamp(40px, 6.6vw, 68px); line-height: 1.06; letter-spacing: -0.02em; }
  .uf7-closing-sub { margin: 22px auto 0; max-width: 420px; font-size: 15.5px; line-height: 1.6; color: rgba(255,255,255,0.68); }
  .uf7-close-a { width: 760px; height: 560px; bottom: -260px; left: 50%; transform: translateX(-58%); background: radial-gradient(circle, rgba(34,211,165,0.28), transparent 62%); animation: uf7drift1 30s ease-in-out infinite; }
  .uf7-close-b { width: 560px; height: 480px; bottom: -200px; right: -160px; background: radial-gradient(circle, rgba(79,70,229,0.28), transparent 62%); animation: uf7drift2 34s ease-in-out infinite; }

  @media (max-width: 760px) {
    .uf7-nav-links { display: none; }
    .uf7-hero { padding: 130px 20px 190px; }
    .uf7-block { padding: 88px 20px; }
    .uf7-row { grid-template-columns: 60px 1fr; gap: 18px; padding: 28px 0; }
    .uf7-globe-grid { grid-template-columns: 1fr; gap: 40px; }
    .uf7-runway { height: 220px; gap: 3px; }
    .uf7-price-cols { grid-template-columns: 1fr; }
    .uf7-pcol { padding: 8px 0 40px; }
    .uf7-pcol + .uf7-pcol { border-left: none; border-top: 1px solid rgba(255,255,255,0.14); padding: 40px 0 8px; }
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
      <CompoundGap7 />
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
