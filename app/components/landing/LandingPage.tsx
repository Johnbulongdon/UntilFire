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
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const syncCompact = () => setIsCompact(media.matches);
    syncCompact();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncCompact);
      return () => media.removeEventListener("change", syncCompact);
    }

    media.addListener(syncCompact);
    return () => media.removeListener(syncCompact);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, height: isCompact ? 60 : 64,
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: isCompact ? "0 16px" : "0 24px",
      background: scrolled ? "rgba(250,253,251,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? `1px solid ${C.borderSoft}` : "none",
      zIndex: 50, transition: "background 0.3s, border-color 0.3s",
      gap: isCompact ? 12 : 24,
    }}>
      <div style={{ flex: "0 1 auto", minWidth: 0 }}>
        <Logo variant="light" size={isCompact ? 24 : 26} />
      </div>

      {!isCompact ? (
        <nav style={{ display: "flex", gap: 24, flex: "0 0 auto" }}>
          <a href="#how" style={{ fontFamily: F, fontWeight: 500, fontSize: 13, color: scrolled ? C.muted : C.green900, textDecoration: "none" }}>
            How it works
          </a>
          <a href="#pricing" style={{ fontFamily: F, fontWeight: 500, fontSize: 13, color: scrolled ? C.muted : C.green900, textDecoration: "none" }}>
            Pricing
          </a>
        </nav>
      ) : null}

      <button
        onClick={onStart}
        style={{
          height: isCompact ? 34 : 36,
          padding: isCompact ? "0 16px" : "0 18px",
          background: C.green900,
          color: "#fff",
          border: "none",
          borderRadius: 9999,
          fontFamily: F,
          fontWeight: 700,
          fontSize: isCompact ? 12 : 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Get started
      </button>
    </header>
  );
}

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

/* ── Hero section ────────────────────────────────────────────────────── */
function HeroSection({ onStart }: { onStart: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  return (
    <section style={{
      position: "relative", minHeight: "100vh", overflow: "hidden",
      background: `linear-gradient(180deg, ${C.paper} 0%, ${C.cream} 45%, ${C.mint} 85%, ${C.mintDeep} 100%)`,
    }}>
      {/* Subtle animated background elements */}
      <div aria-hidden style={{
        position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: 900, height: 500, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(98,250,227,0.12) 0%, transparent 65%)",
        pointerEvents: "none",
        opacity: mounted ? 1 : 0,
        transition: "opacity 1.2s ease 0.3s",
      }} />
      <div aria-hidden style={{
        position: "absolute", top: "28%", right: "8%",
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(6,78,59,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
        animation: mounted ? "heroOrbFloat 8s ease-in-out infinite" : "none",
      }} />
      <div aria-hidden style={{
        position: "absolute", top: "45%", left: "5%",
        width: 120, height: 120, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(32,212,191,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        animation: mounted ? "heroOrbFloat 12s ease-in-out 2s infinite" : "none",
      }} />

      {/* Content */}
      <div className="uf-hero-content" style={{
        position: "relative", top: 0, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "120px 24px 80px", zIndex: 4,
        maxWidth: 900, margin: "0 auto",
      }}>
        {/* Single clear headline */}
        <h1 style={{
          margin: 0, fontFamily: F, fontWeight: 800,
          fontSize: "clamp(48px, 10vw, 96px)", lineHeight: 1,
          letterSpacing: "-0.05em", color: C.green900,
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(24px)",
          transition: "opacity 0.7s ease 0.12s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.12s",
        }}>
          Make work
          <br />
          <span style={{
            display: "block",
            marginTop: 8,
            opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.28s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.28s",
          }}>
            <span style={{ color: C.green700 }}>optional</span>.
          </span>
        </h1>

        {/* Supporting copy */}
        <p style={{
          margin: "40px 0 0", maxWidth: 520, fontSize: 19, lineHeight: 1.6,
          color: C.body, fontWeight: 500, fontFamily: F,
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(16px)",
          transition: "opacity 0.7s ease 0.48s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.48s",
        }}>
          See the date when work can become optional, understand what moves it
          closer, and take your first step with confidence.
        </p>

        {/* Single primary CTA */}
        <div style={{
          marginTop: 44,
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)",
          transition: "opacity 0.7s ease 0.62s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.62s",
        }}>
          <button
            onClick={onStart}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              height: 62, padding: "0 36px",
              background: C.green900, color: "#fff",
              border: "none", borderRadius: 9999,
              fontFamily: F, fontWeight: 700, fontSize: 18,
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: "0 12px 36px rgba(0,53,39,0.25)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 18px 48px rgba(0,53,39,0.32)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,53,39,0.25)"; }}
          >
            See my freedom date
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 13.5L11 9L6 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p style={{
            marginTop: 16, fontSize: 13, color: C.muted, fontWeight: 500,
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 0.82s",
          }}>
            No account needed · Numbers stay private · Takes 60 seconds
          </p>
        </div>

        {/* Trust band with financial institution logos */}
        <div style={{
          marginTop: 40,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(10px)",
          transition: "opacity 0.7s ease 0.75s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.75s",
          width: "100%",
          maxWidth: 720,
        }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: C.muted, textAlign: "center",
          }}>
            Securely connects to 14,000+ banks & brokerages
          </p>

          {/* Animated logo strip */}
          <div style={{
            marginTop: 18,
            position: "relative",
            overflow: "hidden",
            width: "100%",
          }}>
            {/* Fade masks */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 40,
              background: `linear-gradient(90deg, ${C.paper} 0%, transparent 100%)`,
              zIndex: 2, pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 40,
              background: `linear-gradient(-90deg, ${C.paper} 0%, transparent 100%)`,
              zIndex: 2, pointerEvents: "none",
            }} />

            {/* Scrolling logos */}
            <div className="uf-trust-logos" style={{
              display: "flex", gap: 16, alignItems: "center",
              animation: "trustScroll 30s linear infinite",
              width: "max-content",
            }}>
              {TRUST_LOGOS.map((logo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={logo.name}
                  src={`/app-icons/${logo.file}`}
                  alt={logo.name}
                  width={36}
                  height={36}
                  style={{ borderRadius: 8, objectFit: "cover", opacity: 0.8, flexShrink: 0 }}
                />
              ))}
              {/* Duplicate for seamless loop */}
              {TRUST_LOGOS.map((logo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={logo.name + "-dup"}
                  src={`/app-icons/${logo.file}`}
                  alt=""
                  aria-hidden
                  width={36}
                  height={36}
                  style={{ borderRadius: 8, objectFit: "cover", opacity: 0.8, flexShrink: 0 }}
                />
              ))}
            </div>
          </div>

          {/* Subtle trust cues */}
          <div style={{
            marginTop: 20, display: "flex", justifyContent: "center", gap: 24,
            flexWrap: "wrap",
          }}>
            {[
              { icon: "🔒", text: "Bank-level encryption" },
              { icon: "👁", text: "Read-only access" },
              { icon: "🔐", text: "Your data stays yours" },
            ].map(({ icon, text }) => (
              <span key={text} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 11, color: C.muted, fontWeight: 500,
              }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>{icon}</span>
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Animated freedom date preview */}
      <div aria-hidden className="uf-hero-preview" style={{
        position: "relative", margin: "60px auto 0", width: "min(680px, calc(100vw - 48px))",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.9s ease 0.55s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s",
      }}>
        <div className="uf-hero-preview-card" style={{
          background: C.green900, borderRadius: 20, padding: "28px 32px 32px",
          boxShadow: "0 32px 64px rgba(0,53,39,0.22), 0 8px 20px rgba(0,53,39,0.12)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Subtle gradient overlay */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "linear-gradient(135deg, rgba(98,250,227,0.08) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.teal }}>
              Your freedom date
            </div>
            <div className="uf-hero-preview-date" style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 16 }}>
              <div className="uf-hero-preview-month-wrap" style={{
                display: "flex", alignItems: "baseline", gap: 4,
                animation: "heroDateReveal 0.8s ease-out 1.2s both",
              }}>
                <span className="uf-hero-preview-month" style={{ fontSize: 58, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  March
                </span>
              </div>
              <span className="uf-hero-preview-year" style={{ fontSize: 58, fontWeight: 800, color: C.teal, letterSpacing: "-0.02em", lineHeight: 1 }}>
                2037
              </span>
            </div>
            <p style={{ marginTop: 14, fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, maxWidth: 320 }}>
              When work becomes optional based on your current plan.
            </p>
            <div className="uf-hero-preview-move" style={{
              marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span className="uf-hero-preview-move-label" style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Top move</span>
              <span className="uf-hero-preview-move-badge" style={{
                fontSize: 14, fontWeight: 700, color: "#fff",
                padding: "6px 14px", background: "rgba(98,250,227,0.15)",
                borderRadius: 999, border: "1px solid rgba(98,250,227,0.25)",
              }}>
                Increase 401(k) contribution — saves 2 years
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div aria-hidden style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 140,
        background: `linear-gradient(to bottom, rgba(185,227,208,0) 0%, ${C.mintDeep} 100%)`,
        zIndex: 3, pointerEvents: "none",
      }} />

      <style>{`
        @keyframes heroOrbFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes heroDateReveal {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes trustScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
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
          .uf-hero-content {
            padding: 100px 20px 48px !important;
          }
          .uf-hero-content h1 {
            font-size: clamp(40px, 14vw, 64px) !important;
          }
          .uf-hero-content > p {
            font-size: 16px !important;
            max-width: 300px !important;
            margin-top: 28px !important;
          }
          .uf-hero-content > div > button {
            height: 54px !important;
            font-size: 16px !important;
            padding: 0 28px !important;
          }
          .uf-trust-logos {
            gap: 28px !important;
          }
          .uf-trust-logos span {
            font-size: 12px !important;
          }
          .uf-hero-preview {
            width: calc(100vw - 32px) !important;
            margin-top: 44px !important;
          }
          .uf-hero-preview-card {
            padding: 24px 20px 24px !important;
            border-radius: 18px !important;
          }
          .uf-hero-preview-date {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          .uf-hero-preview-month,
          .uf-hero-preview-year {
            font-size: 44px !important;
          }
          .uf-hero-preview-move {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .uf-hero-preview-move-label {
            font-size: 12px !important;
          }
          .uf-hero-preview-move-badge {
            width: 100% !important;
            box-sizing: border-box !important;
            border-radius: 18px !important;
            white-space: normal !important;
            line-height: 1.45 !important;
            padding: 10px 14px !important;
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
      position: "relative", background: "#fff", padding: "100px 24px 80px",
      borderRadius: "28px 28px 0 0", marginTop: -28, zIndex: 3,
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <Reveal>
            <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: "clamp(36px, 6vw, 68px)", lineHeight: 1, letterSpacing: "-0.04em", color: C.green900 }}>
              From today&apos;s numbers<br />to a clear next step.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p style={{ margin: "20px auto 0", maxWidth: 480, fontSize: 17, lineHeight: 1.6, color: C.body, fontWeight: 500 }}>
              UntilFire shows where you stand, what matters now, and what to do
              next — so you can move toward work optionality with confidence.
            </p>
          </Reveal>
        </div>

        {/* Three steps - horizontal on desktop */}
        <div style={{ marginTop: 64, display: "flex", flexDirection: "column", gap: 32 }}>
          {[
            { n: "1", t: "See your freedom date", s: "Enter a few numbers. Get the date when work becomes optional.", accent: false },
            { n: "2", t: "Understand what moves it", s: "See which changes shorten your timeline the most.", accent: true },
            { n: "3", t: "Take your first step", s: "Get one clear action you can act on today.", accent: false },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12}>
              <div style={{
                display: "grid", gridTemplateColumns: "auto 1fr", gap: 24,
                padding: "24px 28px",
                background: s.accent ? C.green900 : C.paperWarm,
                borderRadius: 16, border: `1px solid ${s.accent ? C.green900 : C.border}`,
                alignItems: "center",
              }}>
                <div style={{
                  fontFamily: F, fontSize: 48, fontWeight: 800,
                  color: s.accent ? C.teal : C.green700,
                  letterSpacing: "-0.02em", lineHeight: 1,
                }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: s.accent ? "#fff" : C.green900 }}>
                    {s.t}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55, color: s.accent ? "rgba(255,255,255,0.75)" : C.body }}>
                    {s.s}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Why UntilFire ───────────────────────────────────────────────────── */
function WhySection() {
  return (
    <section id="why" style={{ background: C.paperWarm, padding: "80px 24px 80px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <Reveal>
            <h2 style={{ margin: 0, fontFamily: F, fontWeight: 700, fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08, letterSpacing: "-0.03em", color: C.green900 }}>
              Not just a calculator.<br />
              <span style={{ fontWeight: 800 }}>A clearer path.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p style={{ margin: "16px auto 0", maxWidth: 440, fontSize: 16, lineHeight: 1.6, color: C.body, fontWeight: 500 }}>
              UntilFire helps you understand where you stand, what to change,
              and how to keep moving forward.
            </p>
          </Reveal>
        </div>

        {/* Two column benefit cards */}
        <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {[
            {
              t: "Designed for one outcome",
              s: "Every feature is built to help you reach work optionality — from your first calculation to monthly progress.",
            },
            {
              t: "Start before you commit",
              s: "See your freedom date and first next move without creating an account. Upgrade when you want ongoing tracking.",
            },
            {
              t: "Focus on what matters",
              s: "Skip the noise. UntilFire surfaces the moves that move your date the most — based on your numbers.",
            },
            {
              t: "A living plan",
              s: "Life changes. Your plan adapts. UntilFire keeps the path clear as your situation evolves.",
            },
          ].map((card, i) => (
            <Reveal key={card.t} delay={i * 0.08}>
              <div style={{
                padding: "22px 24px",
                background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: C.green900, marginBottom: 8 }}>
                  {card.t}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: C.body }}>
                  {card.s}
                </div>
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
    <section id="pricing" style={{ background: "#fff", padding: "80px 24px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <Reveal>
            <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: C.green900 }}>
              Start free.<br />Upgrade for more depth.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ margin: "16px auto 0", maxWidth: 420, fontSize: 16, lineHeight: 1.6, color: C.body, fontWeight: 500 }}>
              See your freedom date and first move without an account. Go Pro when you want deeper guidance and ongoing tracking.
            </p>
          </Reveal>
        </div>

        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {/* Free */}
          <Reveal delay={0.08}>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted }}>Free</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: C.green900, letterSpacing: "-0.02em" }}>$0</span>
              </div>
              <p style={{ margin: "8px 0 18px", fontSize: 14, color: C.body, lineHeight: 1.5 }}>
                Your freedom date and first next move.
              </p>
              {[
                "Freedom date calculation",
                "One clear next move",
                "Decision sliders",
                "Shareable result card",
                "1 bank + 1 brokerage sync",
              ].map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", fontSize: 13, color: C.body }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 1, flexShrink: 0 }}><path d="M2.5 7l2.5 2.5 6-6" stroke={C.green700} strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
                  {f}
                </div>
              ))}
              <button onClick={onStart} style={{ marginTop: 20, width: "100%", height: 44, background: "#fff", color: C.green900, border: `1.5px solid ${C.green900}`, borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                See my freedom date
              </button>
            </div>
          </Reveal>

          {/* Pro */}
          <Reveal delay={0.16}>
            <div style={{ position: "relative", background: C.green900, color: "#fff", borderRadius: 18, padding: 28, boxShadow: "0 20px 48px rgba(0,53,39,0.22)" }}>
              <div style={{ position: "absolute", top: -10, right: 20, background: C.teal, color: C.green900, padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Most helpful
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.teal }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>$4.99</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>/mo</span>
              </div>
              <p style={{ margin: "8px 0 18px", fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                Deeper guidance and connected progress.
              </p>
              {[
                "Everything in Free",
                "Ranked next moves by time saved",
                "Action plan from your spending",
                "Unlimited bank & brokerage sync",
                "Progress tracking & reports",
              ].map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 1, flexShrink: 0 }}><path d="M2.5 7l2.5 2.5 6-6" stroke={C.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
                  {f}
                </div>
              ))}
              <Link href="/login" style={{ display: "block", marginTop: 20, width: "100%", height: 44, lineHeight: "44px", background: C.teal, color: C.green900, border: "none", borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
                Start Pro trial
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <p style={{ margin: "20px auto 0", maxWidth: 480, textAlign: "center", fontSize: 12, color: C.muted }}>
            Pro includes Stripe billing. Cancel anytime from your dashboard.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Stories ─────────────────────────────────────────────────────────── */
function StoriesSection() {
  const insights = [
    {
      quote: "Seeing the date change when I adjusted my savings — that was the moment it clicked.",
      context: "Beta user",
    },
    {
      quote: "I use 3 apps and a spreadsheet. None of them tell me if I'm actually on track.",
      context: "Beta survey",
    },
    {
      quote: "Finally an app that tells me what to do, not just where my money went.",
      context: "Beta user",
    },
  ];

  return (
    <section id="stories" style={{ background: "#fff", padding: "80px 24px 80px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Reveal>
          <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: C.green900, textAlign: "center" }}>
            What early users say
          </h2>
        </Reveal>

        <div style={{ marginTop: 48, display: "grid", gap: 20 }}>
          {insights.map((t, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div style={{
                background: C.paperWarm, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24,
                display: "flex", flexDirection: "column",
              }}>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: C.green900, fontWeight: 500, fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: C.muted }}>
                  — {t.context}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */
function FAQSection() {
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
    <section id="faq" style={{ background: C.paperWarm, padding: "80px 24px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Reveal>
          <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: C.green900, textAlign: "center" }}>
            Common questions
          </h2>
        </Reveal>

        <div style={{ marginTop: 40, display: "grid", gap: 12 }}>
          {faqs.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.06}>
              <details style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px" }}>
                <summary style={{ cursor: "pointer", fontFamily: F, fontSize: 16, fontWeight: 700, color: C.green900, letterSpacing: "-0.01em" }}>
                  {faq.q}
                </summary>
                <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.65, color: C.body }}>
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
    <section style={{ background: `linear-gradient(180deg, #fff 0%, ${C.mint} 100%)`, padding: "100px 24px 120px", overflow: "hidden" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: "clamp(34px, 6vw, 56px)", lineHeight: 1.06, letterSpacing: "-0.03em", color: C.green900 }}>
            One step toward<br />work optionality.
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p style={{ margin: "16px 0 0", maxWidth: 360, fontSize: 16, lineHeight: 1.6, color: C.body, fontWeight: 500, marginLeft: "auto", marginRight: "auto" }}>
            See your freedom date today. No account required.
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <div style={{ marginTop: 36 }}>
            <button onClick={onStart} style={{ height: 56, padding: "0 32px", background: C.green900, color: "#fff", border: "none", borderRadius: 9999, fontFamily: F, fontWeight: 700, fontSize: 17, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 12px 32px rgba(0,53,39,0.22)" }}>
              See my freedom date →
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────── */
function FooterSection() {
  return (
    <footer style={{ background: C.mint, padding: "48px 24px 32px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginBottom: 32 }}>
          {[
            ["How it works", "#how"],
            ["Learn", "/learn"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 14, fontWeight: 600, color: C.green900, textDecoration: "none" }}>{label}</a>
          ))}
        </div>

        {/* Wordmark */}
        <div style={{
          fontFamily: F, fontWeight: 800, fontSize: "clamp(56px, 14vw, 140px)", lineHeight: 0.85,
          letterSpacing: "-0.05em", textAlign: "center", color: C.green900,
          opacity: 0.25,
        }}>
          untilfire
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 0 16px", fontSize: 12, color: C.green700, fontWeight: 500, flexWrap: "wrap", gap: 16 }}>
          <span>© 2026 UntilFire</span>
          <a
            href="https://startupfa.st"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: C.green800, fontWeight: 700, textDecoration: "none" }}
          >
            Startup Fast
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
          <span>Make work optional</span>
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
