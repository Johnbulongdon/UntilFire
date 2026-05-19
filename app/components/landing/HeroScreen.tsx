"use client";

import { useEffect, useState } from "react";

function HeroSlot({ width, height, label }: { width: number; height: number; label: string }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ width, height, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <span
          className="uf-hero-cursor"
          style={{
            width: 3,
            height: Math.round(height * 0.62),
            background: "#62FAE3",
            marginBottom: Math.round(height * 0.14),
            opacity: 0.85,
          }}
        />
      </div>
      <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.95)", opacity: 0.92, borderRadius: 1 }} />
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(98,250,227,0.75)" }}>
        {label}
      </div>
    </div>
  );
}

export default function HeroScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const slotMonthW = isMobile ? 200 : 300;
  const slotMonthH = isMobile ? 110 : 160;
  const slotYearW = isMobile ? 260 : 380;
  const slotYearH = isMobile ? 110 : 160;

  return (
    <>
      <style>{`
        @keyframes heroBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .uf-hero-cursor {
          animation: heroBlink 1.05s steps(1) infinite;
          border-radius: 1.5px;
          display: inline-block;
        }
      `}</style>

      <div style={{
        width: "100%",
        height: "calc(100vh - 56px)",
        position: "relative",
        background: "radial-gradient(ellipse 1100px 600px at 50% 40%, #0a4a36 0%, #053828 32%, #02261b 70%, #001610 100%)",
        overflow: "hidden",
        color: "#fff",
      }}>
        {/* Topographic contour lines */}
        <svg
          aria-hidden
          viewBox="0 0 1280 760"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.22, pointerEvents: "none" }}
        >
          {Array.from({ length: 14 }).map((_, i) => {
            const r = 280 + i * 60;
            return (
              <ellipse
                key={i}
                cx={640}
                cy={440}
                rx={r * 1.7}
                ry={r * 0.55}
                fill="none"
                stroke="rgba(98,250,227,0.5)"
                strokeWidth="0.8"
              />
            );
          })}
        </svg>

        {/* Grain noise overlay */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.5'/></svg>")`,
            opacity: 0.08,
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }}
        />

        {/* Teal light pool */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
            width: 980,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(98,250,227,0.18) 0%, rgba(98,250,227,0.06) 35%, transparent 65%)",
            filter: "blur(8px)",
            pointerEvents: "none",
          }}
        />

        {/* Main content */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: isMobile ? "32px 24px 48px" : "32px 80px 48px",
        }}>
          {/* Eyebrow pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "6px 14px",
            background: "rgba(98,250,227,0.08)",
            border: "1px solid rgba(98,250,227,0.22)",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#62FAE3",
            marginBottom: 26,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#62FAE3", flexShrink: 0 }} />
            Your freedom date
          </div>

          {/* Slot row */}
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "center" : "flex-end",
            gap: isMobile ? 20 : 64,
            marginTop: 4,
          }}>
            <HeroSlot width={slotMonthW} height={slotMonthH} label="month" />

            {!isMobile && (
              <div aria-hidden style={{
                width: 10, height: 10, borderRadius: "50%",
                background: "#62FAE3",
                marginBottom: 90,
                boxShadow: "0 0 18px rgba(98,250,227,0.6)",
                flexShrink: 0,
              }} />
            )}

            <HeroSlot width={slotYearW} height={slotYearH} label="year" />
          </div>

          {/* H1 */}
          <h1 style={{
            margin: "40px 0 12px",
            fontWeight: 300,
            fontSize: isMobile ? 28 : 44,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: "#fff",
            maxWidth: 820,
            fontFamily: "inherit",
          }}>
            The personal finance app built for{" "}
            <em style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 400, fontStyle: "italic", color: "#62FAE3" }}>
              FIRE
            </em>
            .
          </h1>

          {/* Subtext */}
          <p style={{
            margin: 0,
            maxWidth: 520,
            fontSize: 16,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 400,
          }}>
            See your FIRE number, your timeline, and the money moves that get you there faster. Free, no login.
          </p>

          {/* CTAs */}
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={onStart}
                style={{
                  height: 56,
                  padding: "0 28px",
                  background: "#62FAE3",
                  color: "#003527",
                  border: "none",
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: "-0.005em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 0 1px rgba(98,250,227,0.4), 0 12px 28px rgba(0,0,0,0.4)",
                  fontFamily: "inherit",
                }}
              >
                Find my freedom date
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,53,39,0.18)",
                  fontSize: 14, fontWeight: 700,
                }}>→</span>
              </button>

              <button
                style={{
                  height: 56, padding: "0 22px",
                  background: "transparent",
                  color: "rgba(255,255,255,0.85)",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  borderRadius: 9999,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                See a sample
              </button>
            </div>

            {/* Trust line */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              flexWrap: "wrap",
              justifyContent: "center",
            }}>
              {["Free", "No login", "60 seconds"].map((item, i, arr) => (
                <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#62FAE3", opacity: 0.85, flexShrink: 0 }} />
                  {item}
                  {i < arr.length - 1 && <span style={{ opacity: 0.35, marginLeft: 6 }}>·</span>}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Left edge year ticks */}
        {!isMobile && (
          <div aria-hidden style={{
            position: "absolute",
            left: 56,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}>
            {["2026", " ", "2030", " ", "2040", " ", "2050"].map((y, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 11,
                letterSpacing: "0.2em",
                color: y === " " ? "transparent" : "rgba(255,255,255,0.35)",
                fontWeight: 600,
              }}>
                <span style={{
                  width: y === " " ? 6 : 14,
                  height: 1,
                  background: y === " " ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.45)",
                  display: "inline-block",
                }} />
                {y}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
