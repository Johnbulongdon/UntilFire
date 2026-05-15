"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CITIES } from "@/lib/fire-data";

const PREVIEW_BARS = [28, 38, 33, 48, 42, 62, 57, 72, 66, 80, 76, 95];
const HERO_STATS = [
  { v: "Free", l: "No credit card" },
  { v: "60s", l: "To your FIRE number" },
  { v: `${CITIES.length}`, l: "Cities supported" },
  { v: "No login", l: "To run the calculator" },
];

export default function HeroScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`uf-hero${mounted ? " uf-hero--mounted" : ""}`}>
      <div className="uf-hero-inner">
        <div className="uf-hero-content">
          <div className="uf-badge"><span className="uf-badge-dot" /> Free - no credit card required</div>
          <h1 className="uf-h1">Financial Independence<br /><span className="uf-accent-flame">Through Trusted Growth.</span></h1>
          <p className="uf-body">Know exactly when you can retire - adjusted for your city, your income, and the 4% rule. Takes 60 seconds. No login required.</p>
          <div className="uf-hero-ctas">
            <button className="uf-btn uf-btn-teal uf-btn-lg uf-btn-power" onClick={onStart}>Calculate my FIRE number {"->"}</button>
            <button className="uf-btn uf-btn-ghost-dark" onClick={onSignIn}>Log in {"->"}</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 16 }}>
            <Link href="/calculators" style={{ color: "rgba(255,255,255,0.88)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              Browse calculators
            </Link>
            <Link href="/learn" style={{ color: "rgba(255,255,255,0.88)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              Read FIRE guides
            </Link>
            <Link href="/fire-type?source=homepage-secondary" style={{ color: "rgba(255,255,255,0.88)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              Take the 2-min FIRE Type quiz
            </Link>
          </div>
        </div>

        <div className="uf-hero-preview">
          <div className="uf-preview-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#62FAE3", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>Current Net Worth</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 8 }}>
                  $842,150
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#34D399", background: "rgba(52,211,153,0.15)", padding: "2px 8px", borderRadius: 99 }}>+12.4%</span>
                </div>
              </div>
              <div style={{ background: "#064E3B", borderRadius: 8, padding: "8px 14px", textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#62FAE3", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>FIRE Date</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Oct 2031</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 64, marginBottom: 16 }}>
              {PREVIEW_BARS.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: i === PREVIEW_BARS.length - 1 ? "#62FAE3" : "rgba(98,250,227,0.22)", borderRadius: "2px 2px 0 0", transition: "height 0.3s" }} />
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Sample dashboard - your numbers will differ</div>
        </div>
      </div>

      <div className="uf-hero-strip">
        {HERO_STATS.map((s) => (
          <div key={s.l} className="uf-hero-strip-item">
            <div className="uf-hero-strip-val">{s.v}</div>
            <div className="uf-hero-strip-lab">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
