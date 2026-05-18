"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CITIES } from "@/lib/fire-data";
import {
  UNTILFIRE_ANCHOR_DESCRIPTION,
  UNTILFIRE_ANCHOR_HEADLINE,
} from "@/lib/positioning";

const HERO_STATS = [
  { v: "Free", l: "No login required" },
  { v: "60s", l: "To your FIRE number" },
  { v: `${CITIES.length}`, l: "City tax rates included" },
  { v: "0", l: "Data stored without login" },
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
          <div className="uf-badge"><span className="uf-badge-dot" /> Free · No login · 60 seconds</div>
          <h1 className="uf-h1">{UNTILFIRE_ANCHOR_HEADLINE}</h1>
          <p className="uf-body">{UNTILFIRE_ANCHOR_DESCRIPTION}</p>
          <div className="uf-hero-ctas">
            <button className="uf-btn uf-btn-teal uf-btn-lg uf-btn-power" onClick={onStart}>Find my FIRE number {"→"}</button>
            <button className="uf-btn uf-btn-ghost-dark" onClick={onSignIn}>Log in {"->"}</button>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href="/fire-type?source=homepage-secondary" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
              Or take the 2-min FIRE Type quiz →
            </Link>
          </div>
        </div>

        <div className="uf-hero-preview">
          <div className="uf-preview-card">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(98,250,227,0.12)", border: "1px solid rgba(98,250,227,0.25)", borderRadius: 99, padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#62FAE3", letterSpacing: "0.5px", marginBottom: 16 }}>
              🎉 Projection unlocked
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(98,250,227,0.7)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 6 }}>Your FIRE number</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 4 }}>$1,240,000</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Based on the 4% rule · San Francisco, CA</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#62FAE3", letterSpacing: "-0.5px" }}>Age 47</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>in 14 years · 2039</span>
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div style={{ background: "rgba(5,150,105,0.15)", border: "1px solid rgba(5,150,105,0.3)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= 1 ? "#059669" : "rgba(255,255,255,0.12)" }} />
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#34D399", textTransform: "uppercase", letterSpacing: "0.08em" }}>Stage 2 of 4 — Momentum</div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>
            Sample output — your numbers will differ
          </div>
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
