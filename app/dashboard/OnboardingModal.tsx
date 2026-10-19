"use client";
import { useState } from "react";

const OnboardingMoneyField = ({ label, hint, value, onChange, defaultCurrency }: { label: string; hint: string; value: string; defaultCurrency: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={`onboarding-${label.replace(/[^a-z0-9]/gi, "-")}`} style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: "Manrope, sans-serif", letterSpacing: "0.02em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 600, color: "#6B7280", fontFamily: "Manrope, sans-serif" }}>{defaultCurrency}</span>
        <input
          id={`onboarding-${label.replace(/[^a-z0-9]/gi, "-")}`}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}

          placeholder="0"
          style={{ width: "100%", paddingLeft: 52, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 16, fontWeight: 600, fontFamily: "Manrope, sans-serif", outline: "none", boxSizing: "border-box", color: "#111827" }}
          onFocus={e => { e.target.style.borderColor = "#064E3B"; }}
        />
      </div>
      <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "Manrope, sans-serif" }}>{hint}</span>
    </div>
  );

export default function OnboardingModal({ defaultCurrency, onComplete, onDismiss }: {
  defaultCurrency: string;
  onComplete: (income: number, spending: number, savings: number) => void;
  onDismiss: () => void;
}) {
  const [inc, setInc] = useState("");
  const [spend, setSpend] = useState("");
  const [save, setSave] = useState("");
  const toNum = (s: string) => Number(s.replace(/,/g, ""));
  const valid = inc.trim() !== "" && Number.isFinite(toNum(inc)) && toNum(inc) > 0
    && spend.trim() !== "" && save.trim() !== ""
    && [spend, save].every(v => Number.isFinite(toNum(v)) && toNum(v) >= 0);
  const handleSubmit = () => {
    if (valid) onComplete(toNum(inc), toNum(spend), toNum(save));
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Find your FIRE number" onKeyDown={e => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) { e.preventDefault(); handleSubmit(); } }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px 28px", maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 24, margin: "auto" }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#20D4BF", marginBottom: 8, fontFamily: "Manrope, sans-serif" }}>Welcome to UntilFire</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.5px", lineHeight: 1.25 }}>
            Let&apos;s find your FIRE number
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, fontFamily: "Manrope, sans-serif", lineHeight: 1.5 }}>
            Income, spending, and current savings are enough to get started. You can refine everything later.
          </div>
        </div>

        {/* Financial fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OnboardingMoneyField defaultCurrency={defaultCurrency} label="Monthly take-home pay" hint="The amount that reaches your account each month." value={inc} onChange={setInc} />
          <OnboardingMoneyField defaultCurrency={defaultCurrency} label="Monthly expenses" hint="Rent, food, everything — rough total is fine" value={spend} onChange={setSpend} />
          <OnboardingMoneyField defaultCurrency={defaultCurrency} label="Current savings / net worth" hint="Total across accounts and investments — 0 is okay" value={save} onChange={setSave} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            disabled={!valid}
            style={{ background: valid ? "#064E3B" : "#E5E7EB", color: valid ? "#fff" : "#9CA3AF", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed", fontFamily: "Manrope, sans-serif", transition: "background 0.15s" }}
          >
            Get my FIRE number →
          </button>
          <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontFamily: "Manrope, sans-serif", padding: "4px 0" }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Checklist ──────────────────────────────────────────────────────────
