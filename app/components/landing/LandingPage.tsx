"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/app/components/Logo";

const C = {
  green900: "#003527",
  green800: "#064E3B",
  green700: "#065F46",
  green600: "#047857",
  green100: "#D1FAE5",
  green50: "#ECFDF5",
  teal: "#62FAE3",
  teal500: "#20D4BF",
  paper: "#fafdfb",
  paperWarm: "#f6f9f4",
  cream: "#f3faf6",
  mint: "#d6efe2",
  mintDeep: "#b9e3d0",
  border: "#E2E8F0",
  borderSoft: "rgba(0,53,39,0.10)",
  text: "#003527",
  body: "#19181E",
  muted: "#64748B",
  faint: "#94A3B8",
};

const F = "'Manrope', sans-serif";

/* ── Scroll-reveal hook ──────────────────────────────────────────────── */
function useReveal(threshold = 0.14) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  dir = "up",
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  dir?: "up" | "left" | "right" | "fade";
  style?: React.CSSProperties;
}) {
  const { ref, visible } = useReveal();
  const translate =
    dir === "up" ? "translateY(28px)" :
    dir === "left" ? "translateX(-24px)" :
    dir === "right" ? "translateX(24px)" : "none";

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : translate,
        transition: `opacity 0.55s ease ${delay}s, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Nav ─────────────────────────────────────────────────────────────── */
function LandingNav({ onStart }: { onStart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="uf-nav" style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 68,
      display: "flex", alignItems: "center", padding: "0 40px",
      background: scrolled ? "rgba(250,253,251,0.9)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? `1px solid ${C.borderSoft}` : "1px solid transparent",
      zIndex: 50, transition: "background 0.25s, border-color 0.25s, backdrop-filter 0.25s",
    }}>
      {/* Logo */}
      <Logo variant="light" size={30} />

      {/* Nav links */}
      <nav className="uf-nav-links" style={{ display: "flex", gap: 30, marginLeft: 44 }}>
        {[
          ["How it works", "#how"],
          ["FIRE 101", "/fire-type"],
          ["Pricing", "#pricing"],
          ["FAQ", "#faq"],
        ].map(([label, href]) => (
          <a key={label} href={href} style={{ fontFamily: F, fontWeight: 500, fontSize: 14, color: C.muted, textDecoration: "none", whiteSpace: "nowrap" }}>
            {label}
          </a>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div className="uf-nav-actions" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/login" style={{ fontFamily: F, fontWeight: 600, fontSize: 14, color: C.muted, textDecoration: "none" }}>
          Log in
        </Link>
        <button
          onClick={onStart}
          style={{ height: 40, padding: "0 20px", background: C.green900, color: "#fff", border: "none", borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Get started
        </button>
      </div>
    </header>
  );
}

/* ── Hero section ────────────────────────────────────────────────────── */
function HeroSection({ onStart }: { onStart: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  return (
    <section style={{
      position: "relative", minHeight: 920, overflow: "hidden",
      background: `linear-gradient(180deg, ${C.paper} 0%, ${C.cream} 38%, ${C.mint} 78%, ${C.mintDeep} 100%)`,
    }}>
      {/* Animated radial glow */}
      <div aria-hidden style={{
        position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
        width: 700, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(98,250,227,0.18) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div className="uf-hero-content" style={{
        position: "relative", top: 0, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "140px 40px 0", zIndex: 4,
      }}>
        {/* Badge */}
        <div className="uf-hero-badge" style={{
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)",
          transition: "opacity 0.45s ease 0.05s, transform 0.45s cubic-bezier(0.22,1,0.36,1) 0.05s",
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 16px", background: C.teal, color: C.green900,
          borderRadius: 9999, fontSize: 13, fontWeight: 700, letterSpacing: "-0.005em",
          boxShadow: "0 6px 16px rgba(98,250,227,0.35)", whiteSpace: "nowrap",
        }}>
          60-second FIRE number · Free · No login to start
          <span style={{ fontSize: 13 }}>»</span>
        </div>

        {/* Headline */}
        <h1 className="uf-hero-title" style={{
          margin: "20px 0 0", fontFamily: F, fontWeight: 800,
          fontSize: "clamp(56px, 9vw, 104px)", lineHeight: 0.92,
          letterSpacing: "-0.045em", color: C.green900,
        }}>
          <span style={{
            display: "block",
            opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(16px)",
            transition: "opacity 0.5s ease 0.15s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s",
          }}>
            Personal finance
          </span>
          <span style={{
            display: "block",
            opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(16px)",
            transition: "opacity 0.5s ease 0.28s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.28s",
          }}>
            that sets you free.
          </span>
        </h1>

        {/* Sub */}
        <p className="uf-hero-subtitle" style={{
          margin: "28px 0 0", maxWidth: 620, fontSize: 18, lineHeight: 1.55,
          color: C.body, fontWeight: 500, fontFamily: F,
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)",
          transition: "opacity 0.5s ease 0.42s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.42s",
        }}>
          Start with your freedom date in 60 seconds. Then UntilFire gives you a
          plan to move it closer.
        </p>

        {/* CTA pill */}
        <div className="uf-hero-cta" style={{
          marginTop: 32, display: "inline-flex", alignItems: "center", gap: 10,
          padding: 8, background: "#fff", border: `1px solid ${C.borderSoft}`,
          borderRadius: 9999, boxShadow: "0 14px 40px rgba(0,53,39,0.10)",
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)",
          transition: "opacity 0.5s ease 0.55s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.55s",
        }}>
          {/* Month/Year placeholder */}
          <div className="uf-date-placeholder" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "flex-end", height: 22, gap: 3 }}>
                <span style={{ width: 2, height: 16, background: C.green700, borderRadius: 1, animation: "ufBlink 1.1s steps(1) infinite" }} />
                <div style={{ width: 56, height: 2, background: C.green900, borderRadius: 1 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>Month</span>
            </div>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green900, marginBottom: 14 }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "flex-end", height: 22 }}>
                <div style={{ width: 72, height: 2, background: C.green900, borderRadius: 1 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>Year</span>
            </div>
            <span className="uf-date-helper" style={{ marginLeft: 14, fontSize: 13, fontWeight: 500, color: C.faint, whiteSpace: "nowrap" }}>
              Your FIRE date will appear here
            </span>
          </div>
          <button
            className="uf-hero-cta-button"
            onClick={onStart}
            style={{ height: 52, padding: "0 26px", background: C.green900, color: "#fff", border: "none", borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Get my FIRE number
          </button>
        </div>

        {/* Trust line */}
        <div className="uf-hero-trust" style={{
          marginTop: 18, display: "flex", alignItems: "center", gap: 12,
          fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted,
          opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.7s",
        }}>
          {["Free forever", "No login", "Your plan"].map((s, i) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {i > 0 && <span style={{ opacity: 0.35, marginRight: 2 }}>·</span>}
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green600 }} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Tilted product preview */}
      <div aria-hidden className="uf-product-preview" style={{
        position: "relative", margin: "56px auto 0", width: "min(1040px, 90vw)",
        opacity: mounted ? 1 : 0, transform: mounted ? "perspective(1200px) rotateX(8deg)" : "perspective(1200px) rotateX(18deg) translateY(40px)",
        transition: "opacity 0.7s ease 0.5s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s",
        transformOrigin: "50% 100%",
        background: "#0f1614", borderRadius: 20, padding: 10,
        boxShadow: "0 50px 80px rgba(0,30,20,0.3), 0 16px 30px rgba(0,30,20,0.2)",
      }}>
        <div className="uf-product-preview-inner" style={{ background: C.paperWarm, borderRadius: 13, padding: 20, display: "grid", gridTemplateRows: "auto 1fr", gap: 14 }}>
          {/* Mock tab bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: C.green800 }} />
              <span style={{ fontFamily: F, fontWeight: 700, fontSize: 14, color: C.green900 }}>UntilFire</span>
              <div className="uf-product-tabs" style={{ display: "flex", gap: 4, marginLeft: 14 }}>
                {["Dashboard", "Calculator", "Insights"].map((t, i) => (
                  <div key={t} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: i === 0 ? "rgba(209,250,229,0.6)" : "transparent", color: i === 0 ? C.green700 : C.muted }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="uf-product-controls" style={{ display: "flex", gap: 6 }}>
              {["#F1F5F9", "#F1F5F9", C.green700].map((bg, i) => (
                <div key={i} style={{ width: 24, height: 24, borderRadius: 999, background: bg }} />
              ))}
            </div>
          </div>
          {/* Mock dashboard cards */}
          <div className="uf-product-cards" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: C.green900, borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.teal }}>Your freedom date</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", height: 36 }}>
                    <span style={{ width: 2, height: 22, background: C.teal, borderRadius: 1, animation: "ufBlink 1.1s steps(1) infinite" }} />
                  </div>
                  <div style={{ width: 64, height: 2.5, background: "rgba(255,255,255,0.9)", borderRadius: 1 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(98,250,227,0.75)" }}>Month</span>
                </div>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal, marginBottom: 22 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ height: 36 }} />
                  <div style={{ width: 88, height: 2.5, background: "rgba(255,255,255,0.9)", borderRadius: 1 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(98,250,227,0.75)" }}>Year</span>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>When work becomes optional.</div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>FIRE number</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: C.faint }}>$</span>
                <div style={{ width: 110, height: 3.5, background: C.green900, borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 10, height: 5, borderRadius: 99, background: "#F1F5F9" }} />
              <div style={{ fontSize: 11, color: C.faint, marginTop: 7 }}>— % of the way there</div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>Highest-impact move</div>
              <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800, color: C.green900, lineHeight: 1.3 }}>Boost 401(k) by $180</div>
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>Saves 4 months · ~$0 take-home impact</div>
              {[0, 1].map(i => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 0", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, marginTop: i === 0 ? 10 : 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px dashed #CBD5E1" }} />
                  <div style={{ flex: 1, height: 5, background: "#F1F5F9", borderRadius: 99 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div aria-hidden style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 130,
        background: `linear-gradient(to bottom, rgba(185,227,208,0) 0%, ${C.mintDeep} 100%)`,
        zIndex: 3, pointerEvents: "none",
      }} />

      <style>{`
        @keyframes ufBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @media (max-width: 760px) {
          .uf-nav {
            height: 72px !important;
            padding: 0 18px !important;
            background: rgba(250,253,251,0.96) !important;
            border-bottom: 1px solid rgba(0,53,39,0.10) !important;
            backdrop-filter: blur(16px) !important;
          }
          .uf-nav-links { display: none !important; }
          .uf-nav-actions { display: none !important; }
          .uf-hero-content { padding: 112px 18px 0 !important; }
          .uf-hero-badge {
            max-width: 100% !important;
            white-space: normal !important;
            justify-content: center !important;
            text-align: center !important;
            line-height: 1.25 !important;
            padding: 7px 12px !important;
            font-size: 12px !important;
          }
          .uf-hero-title {
            margin-top: 18px !important;
            font-size: clamp(42px, 13.5vw, 58px) !important;
            line-height: 0.98 !important;
            letter-spacing: -0.05em !important;
          }
          .uf-hero-subtitle {
            margin-top: 22px !important;
            max-width: 340px !important;
            font-size: 17px !important;
            line-height: 1.5 !important;
          }
          .uf-hero-cta {
            width: calc(100vw - 32px) !important;
            max-width: 360px !important;
            box-sizing: border-box !important;
            flex-direction: column !important;
            border-radius: 28px !important;
            padding: 10px !important;
            gap: 10px !important;
          }
          .uf-date-placeholder {
            width: 100% !important;
            box-sizing: border-box !important;
            justify-content: center !important;
            padding: 6px 8px 2px !important;
            gap: 6px !important;
          }
          .uf-date-helper {
            display: none !important;
          }
          .uf-hero-cta-button {
            width: 100% !important;
            height: 50px !important;
          }
          .uf-hero-trust {
            max-width: 340px !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            row-gap: 10px !important;
            column-gap: 12px !important;
            font-size: 11px !important;
            letter-spacing: 0.13em !important;
          }
          .uf-product-preview {
            width: calc(100vw - 32px) !important;
            margin-top: 44px !important;
            padding: 8px !important;
            border-radius: 18px !important;
            transform: none !important;
          }
          .uf-product-preview-inner {
            padding: 14px !important;
            overflow: hidden !important;
          }
          .uf-product-tabs > div:not(:first-child),
          .uf-product-controls {
            display: none !important;
          }
          .uf-product-cards {
            grid-template-columns: 1fr !important;
          }
          .uf-product-cards > div:nth-child(n+2) {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ── How It Works ────────────────────────────────────────────────────── */
function HowSection() {
  return (
    <section id="how" style={{
      position: "relative", background: "#fff", padding: "120px 40px 100px",
      borderRadius: "28px 28px 0 0", marginTop: -28, zIndex: 3,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", border: `1.5px solid ${C.borderSoft}`, background: "#fff", borderRadius: 9999, fontSize: 13, fontWeight: 700, color: C.green900 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h10M2 10h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            How it works
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 style={{ margin: "18px 0 0", fontFamily: F, fontWeight: 800, fontSize: "clamp(40px, 6vw, 80px)", lineHeight: 0.96, letterSpacing: "-0.04em", color: C.green900 }}>
            Three numbers in.<br />One date out.
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p style={{ margin: "18px auto 0", maxWidth: 520, fontSize: 17, lineHeight: 1.55, color: C.body, fontWeight: 500, fontFamily: F }}>
            Income, spending, savings. UntilFire gives you the date first, then turns
            it into a path: what to change, why it matters, and how much
            freedom time it can buy back.
          </p>
        </Reveal>

        {/* Three steps */}
        <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 36, textAlign: "left" }}>
          {[
            { n: "01", t: "Get your starting line.", s: "Answer a few plain questions. City and tax assumptions support the math, but the point is simple: when does work become optional for you?" },
            { n: "02", t: "See what moves the date.", s: "Your FIRE number, projected date, and biggest levers. Free, no login. The 60-second answer everyone else makes you sign up for." },
            { n: "03", t: "Follow the plan with us.", s: "UntilFire turns the math into a calm plan — save more, cut a category, redirect income, or protect momentum." },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div style={{ padding: "24px 24px 28px", background: C.paperWarm, borderRadius: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: C.green700, letterSpacing: "0.16em" }}>{s.n}</div>
                <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em", color: C.green900 }}>{s.t}</div>
                <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: C.body }}>{s.s}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Path callout */}
        <Reveal delay={0.1} style={{ marginTop: 56 }}>
          <div style={{ background: C.green900, borderRadius: 16, padding: "28px 32px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Example plan:</span>
            {[
              ["Find the date", "today"],
              ["Pick one move", "next"],
              ["Track the shift", "every update"],
              ["Keep going", "until work is optional"],
            ].map(([step, timing]) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 16px" }}>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{step}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>{timing}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Why UntilFire ───────────────────────────────────────────────────── */
function WhySection() {
  return (
    <section id="why" style={{ background: C.paperWarm, padding: "100px 40px 100px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", border: `1.5px solid ${C.borderSoft}`, background: "#fff", borderRadius: 9999, fontSize: 13, fontWeight: 700, color: C.green900 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.8 3.6 4 .6-2.9 2.8.7 4L7 10.1 3.4 12l.7-4L1.2 5.2l4-.6L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            Decision Impact Engine
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 style={{ margin: "18px 0 0", fontFamily: F, fontWeight: 800, fontSize: "clamp(38px, 6vw, 78px)", lineHeight: 0.96, letterSpacing: "-0.04em", color: C.green900 }}>
            Most calculators<br />walk away. We stay.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p style={{ margin: "18px auto 0", maxWidth: 560, fontSize: 17, lineHeight: 1.55, color: C.body, fontWeight: 500 }}>
            FIRECalc and cFIREsim give you a number. ProjectionLab gives you a model.
            UntilFire shows you the price of every choice — and tells you what to do this month.
          </p>
        </Reveal>

        <div style={{ marginTop: 70, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 40, textAlign: "left" }}>
          {[
            {
              icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 18l4-5 3 3 6-8 3 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7" cy="13" r="1.3" fill="currentColor" /><circle cx="10" cy="16" r="1.3" fill="currentColor" /><circle cx="16" cy="8" r="1.3" fill="currentColor" /></svg>,
              title: "Decision Impact Engine",
              copy: "Drag a slider. Watch your FIRE date move. Every choice has a visible price in years of freedom — not a generic 'consider saving more'.",
              badge: <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.green900 }}><span style={{ color: C.green600 }}>↑</span> Save +$500/mo <span style={{ color: C.green700, fontWeight: 800 }}>− 2.1 yrs</span></div>,
            },
            {
              icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M4 11h14M11 4c2.5 3 2.5 11 0 14M11 4c-2.5 3-2.5 11 0 14" stroke="currentColor" strokeWidth="1.3" /></svg>,
              title: "A path, not homework",
              copy: "Like a coach for financial independence: UntilFire does not just mark your answer right or wrong. It gives you the next practice move.",
              badge: <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Start", "Next move", "Progress", "Repeat"].map((c, i) => (
                  <div key={c} style={{ padding: "5px 12px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 12, fontWeight: 700, color: i === 3 ? C.muted : C.green900 }}>{c}</div>
                ))}
              </div>,
            },
            {
              icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M11 6v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
              title: "Your highest-impact move",
              copy: "Pro tier: the AI adviser surfaces the one move that saves the most years — ranked from your live numbers. Save more, cut a category, or grow income.",
              badge: <div style={{ padding: "10px 14px", background: C.green900, color: "#fff", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 700 }}><span style={{ width: 7, height: 7, background: C.teal, borderRadius: 99 }} />Boost 401(k) by $180 <span style={{ color: C.teal, fontSize: 12 }}>− 4 mo</span></div>,
            },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 0.1}>
              <div>
                <div style={{ width: 52, height: 52, borderRadius: 13, background: "#fff", border: `1px solid ${C.border}`, display: "grid", placeItems: "center", color: C.green700, boxShadow: "0 4px 12px rgba(0,53,39,0.06)" }}>
                  {card.icon}
                </div>
                <h3 style={{ margin: "18px 0 8px", fontFamily: F, fontSize: 22, fontWeight: 800, letterSpacing: "-0.015em", color: C.green900 }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.muted }}>{card.copy}</p>
                <div style={{ marginTop: 22 }}>{card.badge}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ─────────────────────────────────────────────────────────── */
function PricingSection({ onStart }: { onStart: () => void }) {
  return (
    <section id="pricing" style={{ background: "#fff", padding: "100px 40px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", border: `1.5px solid ${C.borderSoft}`, background: "#fff", borderRadius: 9999, fontSize: 13, fontWeight: 700, color: C.green900 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M3 4h7a2 2 0 010 4H4a2 2 0 000 4h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            Pricing
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 style={{ margin: "18px 0 0", fontFamily: F, fontWeight: 800, fontSize: "clamp(38px, 6vw, 74px)", lineHeight: 0.96, letterSpacing: "-0.04em", color: C.green900 }}>
            Two tiers. No tricks.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p style={{ margin: "18px auto 0", maxWidth: 480, fontSize: 17, lineHeight: 1.55, color: C.body, fontWeight: 500 }}>
            The 60-second answer is free, forever. The adviser that keeps moving your date is what we charge for.
          </p>
        </Reveal>

        <div style={{ marginTop: 52, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 480px))", gap: 22, justifyContent: "center", textAlign: "left" }}>
          {/* Free */}
          <Reveal delay={0.05}>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted }}>Free</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 8 }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: C.green900, letterSpacing: "-0.03em" }}>$0</span>
                <span style={{ fontSize: 14, color: C.muted, marginLeft: 3 }}>forever</span>
              </div>
              <p style={{ margin: "6px 0 20px", fontSize: 15, color: C.body, lineHeight: 1.5 }}>
                The 60-second answer. No account required.
              </p>
              {[
                "Freedom date + FIRE number in 60 seconds",
                "City and tax assumptions where useful",
                "Decision Impact sliders that show years gained",
                "Cinematic FIRE reveal + shareable card",
                "FIRE Type quiz + Learning Hub",
              ].map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", fontSize: 14, color: C.body }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginTop: 2, flexShrink: 0 }}><path d="M3 8l3 3 7-7" stroke={C.green700} strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
                  {f}
                </div>
              ))}
              <button onClick={onStart} style={{ marginTop: 22, width: "100%", height: 46, background: "#fff", color: C.green900, border: `1.5px solid ${C.green900}`, borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Get my FIRE number
              </button>
            </div>
          </Reveal>

          {/* Pro */}
          <Reveal delay={0.16}>
            <div style={{ position: "relative", background: C.green900, color: "#fff", border: `1px solid ${C.green900}`, borderRadius: 20, padding: 32, boxShadow: "0 24px 50px rgba(0,53,39,0.2)" }}>
              <div style={{ position: "absolute", top: -12, right: 24, background: C.teal, color: C.green900, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                AI Adviser
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.teal }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 8 }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>$4.99</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginLeft: 3 }}>/ month · cancel anytime</span>
              </div>
              <p style={{ margin: "6px 0 20px", fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                The adviser that keeps moving your date. Login required.
              </p>
              {[
                ["Everything in Free", false],
                ["Highest-Impact Move card (live, ranked)", false],
                ["Monthly action plan from your actual spending", false],
                ["Monte Carlo simulation · multi-currency tracking", false],
                ["Plaid-connected real-time sync", true],
                ["Weekly FIRE report by email", false],
              ].map(([f, soon]) => (
                <div key={f as string} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", fontSize: 14, color: soon ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.9)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginTop: 2, flexShrink: 0 }}><path d="M3 8l3 3 7-7" stroke={C.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
                  {f}
                  {soon && <span style={{ marginLeft: 4, padding: "1px 6px", border: "1px solid rgba(98,250,227,0.35)", borderRadius: 999, fontSize: 9, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0, alignSelf: "center" }}>soon</span>}
                </div>
              ))}
              <Link href="/login" style={{ display: "block", marginTop: 22, width: "100%", height: 46, lineHeight: "46px", background: C.teal, color: C.green900, border: "none", borderRadius: 9999, fontFamily: F, fontWeight: 800, fontSize: 15, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
                Try Pro — $4.99/mo
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div style={{ marginTop: 18, fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: "0.06em" }}>
            Pro signs you in with Google · Stripe billing · cancel from your dashboard
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Stories ─────────────────────────────────────────────────────────── */
function StoriesSection() {
  const testimonials = [
    { initials: "MK", name: "Maya K.", role: "Started 2024", quote: "My freedom date was 2047. A year later it's 2042. The plan made it feel possible." },
    { initials: "JB", name: "Jordan B.", role: "UntilFire user · 2 yrs", quote: "Best part isn't the date — it's the one move. I stopped checking 8 spreadsheets a week. Now I just do the move." },
    { initials: "AS", name: "Alex S.", role: "Started 2023", quote: "UntilFire didn't promise me anything. It just showed me the date. That was enough to change how I live." },
  ];

  return (
    <section id="stories" style={{ background: "#fff", padding: "100px 40px 120px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", border: `1.5px solid ${C.borderSoft}`, background: "#fff", borderRadius: 9999, fontSize: 13, fontWeight: 700, color: C.green900 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.8 3.6 4 .6-2.9 2.8.7 4L7 10.1 3.4 12l.7-4L1.2 5.2l4-.6L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            From the community
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 style={{ margin: "18px 0 0", fontFamily: F, fontWeight: 800, fontSize: "clamp(36px, 5.5vw, 72px)", lineHeight: 0.96, letterSpacing: "-0.04em", color: C.green900 }}>
            Stories from the<br />FIRE-walk.
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p style={{ margin: "18px auto 0", maxWidth: 480, fontSize: 17, lineHeight: 1.55, color: C.body, fontWeight: 500 }}>
            Notes from people who looked up their freedom date, believed it, then moved it.
          </p>
        </Reveal>

        <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, boxShadow: "0 8px 24px rgba(0,53,39,0.07)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 99, background: C.green50, display: "grid", placeItems: "center", color: C.green700, fontWeight: 800, fontSize: 20 }}>
                  {t.initials}
                </div>
                <div style={{ marginTop: 14, fontFamily: F, fontWeight: 800, fontSize: 18, color: C.green900 }}>{t.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: C.muted }}>{t.role}</div>
                <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
                  {[0, 1, 2, 3, 4].map(i => <span key={i} style={{ color: "#F4B400", fontSize: 13 }}>★</span>)}
                </div>
                <p style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.55, color: C.body, fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <div style={{ marginTop: 28, fontSize: 11, color: C.faint, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
            Sample testimonials — replace at launch with real beta users
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */
function FAQSection() {
  const faqs = [
    {
      q: "What is a freedom date?",
      a: "Your freedom date is the point where work can become optional based on your current income, spending, savings, and FIRE assumptions. It is not a promise. It is a starting line you can move closer with better choices.",
    },
    {
      q: "How is UntilFire different from a FIRE calculator?",
      a: "Most calculators stop after giving you a number. UntilFire starts there, then turns the result into a plan: what matters, what to change next, and how that could move your date.",
    },
    {
      q: "Do I need to connect my bank or create an account?",
      a: "No. The first value moment is free and no-login. You can get a freedom date before connecting accounts, saving anything, or upgrading.",
    },
    {
      q: "Why do city and tax assumptions matter?",
      a: "They make the math more realistic because income, taxes, and living costs vary a lot by place. But they support the answer — the core value is the plan that helps you bring work optionality closer.",
    },
    {
      q: "Is this financial advice?",
      a: "No. UntilFire is planning software, not a licensed financial adviser. It helps you understand scenarios and tradeoffs so you can make clearer decisions or discuss them with a professional.",
    },
    {
      q: "What does Pro add?",
      a: "Pro is for continuity after the free result: a personal FIRE adviser, live plan, budget tracking, connected-account sync, and deeper recommendations based on your real numbers.",
    },
  ];

  return (
    <section id="faq" style={{ background: C.paperWarm, padding: "100px 40px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", border: `1.5px solid ${C.borderSoft}`, background: "#fff", borderRadius: 9999, fontSize: 13, fontWeight: 700, color: C.green900 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12.5a5.5 5.5 0 100-11 5.5 5.5 0 000 11zM5.6 5.4a1.5 1.5 0 112.4 1.2c-.7.5-1 .8-1 1.5M7 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              FAQ
            </div>
            <h2 style={{ margin: "18px 0 0", fontFamily: F, fontWeight: 800, fontSize: "clamp(36px, 5.5vw, 70px)", lineHeight: 0.98, letterSpacing: "-0.04em", color: C.green900 }}>
              Clear answers before<br />you share real numbers.
            </h2>
            <p style={{ margin: "18px auto 0", maxWidth: 560, fontSize: 17, lineHeight: 1.55, color: C.body, fontWeight: 500 }}>
              The quick version: get the date first, understand the assumptions,
              then use the plan to move work optionality closer.
            </p>
          </div>
        </Reveal>

        <div style={{ marginTop: 52, display: "grid", gap: 12 }}>
          {faqs.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.04}>
              <details style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px", boxShadow: "0 8px 22px rgba(0,53,39,0.05)" }}>
                <summary style={{ cursor: "pointer", fontFamily: F, fontSize: 18, fontWeight: 800, color: C.green900, letterSpacing: "-0.01em" }}>
                  {faq.q}
                </summary>
                <p style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.65, color: C.body }}>
                  {faq.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Closing CTA ─────────────────────────────────────────────────────── */
function ClosingSection({ onStart }: { onStart: () => void }) {
  return (
    <section style={{ background: `linear-gradient(180deg, #fff 0%, ${C.mint} 100%)`, padding: "120px 40px 140px", overflow: "hidden" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <img src="/logo/horizon-color.svg" width={68} height={68} alt="" style={{ borderRadius: 16, boxShadow: "0 16px 40px rgba(0,53,39,0.25)", marginBottom: 24, display: "block" }} />
        </Reveal>
        <Reveal delay={0.08}>
          <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: "clamp(36px, 6vw, 68px)", lineHeight: 0.98, letterSpacing: "-0.04em", color: C.green900 }}>
            Know if you can FIRE.<br />
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontStyle: "italic", color: C.green700 }}>
              Then know what to do.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.18}>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <button onClick={onStart} style={{ height: 58, padding: "0 30px", background: C.green900, color: "#fff", border: "none", borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 17, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 14px 36px rgba(0,53,39,0.25)" }}>
              Get my FIRE number — free →
            </button>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", height: 58, padding: "0 24px", background: "transparent", color: C.green900, border: `1.5px solid ${C.green900}`, borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 16, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" }}>
              See Pro — $4.99/mo
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.26}>
          <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted }}>
            Free calculator · 60 seconds · No login to start
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────── */
function FooterSection() {
  return (
    <footer style={{ background: C.mint, padding: "56px 40px 0", overflow: "hidden" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 28, paddingBottom: 20, flexWrap: "wrap" }}>
          {[
            ["How it works", "#how"],
            ["FIRE 101", "/fire-type"],
            ["Pricing", "#pricing"],
            ["Stories", "#stories"],
            ["FAQ", "#faq"],
            ["Privacy", "#"],
            ["Terms", "#"],
          ].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 14, fontWeight: 600, color: C.green900, cursor: "pointer", textDecoration: "none" }}>{label}</a>
          ))}
        </div>

        {/* Big wordmark */}
        <div style={{
          fontFamily: F, fontWeight: 800, fontSize: "clamp(80px, 18vw, 240px)", lineHeight: 0.85,
          letterSpacing: "-0.06em", textAlign: "center", color: C.green900,
          background: `linear-gradient(180deg, rgba(0,53,39,0.9) 0%, rgba(0,53,39,0.4) 60%, rgba(0,53,39,0.14) 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", paddingTop: 16, userSelect: "none",
        }}>
          untilfire
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0 28px", fontSize: 12, color: C.green700, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", flexWrap: "wrap", gap: 10 }}>
          <span>© 2026 UntilFire</span>
          <span>Know if you can FIRE — then know what to do.</span>
          <span>Privacy · Terms</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Root ────────────────────────────────────────────────────────────── */
export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ fontFamily: F, overflowX: "hidden" }}>
      <LandingNav onStart={onStart} />
      <HeroSection onStart={onStart} />
      <HowSection />
      <WhySection />
      <PricingSection onStart={onStart} />
      <StoriesSection />
      <FAQSection />
      <ClosingSection onStart={onStart} />
      <FooterSection />
    </div>
  );
}
