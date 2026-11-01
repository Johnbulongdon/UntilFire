"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

const OnboardingMoneyField = ({ label, hint, value, onChange, defaultCurrency }: { label: string; hint: string; value: string; defaultCurrency: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={`onboarding-${label.replace(/[^a-z0-9]/gi, "-")}`} style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-ink)" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 600, color: "var(--uf-ink-3)" }}>{defaultCurrency}</span>
        <input
          id={`onboarding-${label.replace(/[^a-z0-9]/gi, "-")}`}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}

          placeholder="0"
          style={{ width: "100%", paddingLeft: 52, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: "1.5px solid var(--uf-border)", borderRadius: "var(--uf-r-control)", fontSize: 16, fontWeight: 600, fontFamily: "var(--uf-font)", fontVariantNumeric: "tabular-nums", outline: "none", boxSizing: "border-box", color: "var(--uf-ink)", background: "var(--uf-card)" }}
          onFocus={e => { e.target.style.borderColor = "var(--uf-ink)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--uf-border)"; }}
        />
      </div>
      <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{hint}</span>
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
    <div role="dialog" aria-modal="true" aria-label="Find your FIRE number" onKeyDown={e => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) { e.preventDefault(); handleSubmit(); } }} style={{ position: "fixed", inset: 0, background: "var(--uf-scrim)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "var(--uf-card)", color: "var(--uf-ink)", border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-modal)", padding: "32px 28px 24px", maxWidth: 440, width: "100%", boxShadow: "var(--uf-e3)", display: "flex", flexDirection: "column", gap: 24, margin: "auto" }}>
        {/* Header */}
        <div>
          <span style={{ display: "inline-block", background: "var(--uf-yellow)", color: "var(--uf-on-accent)", borderRadius: "var(--uf-r-pill)", padding: "4px 12px", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Welcome to UntilFire</span>
          <div className="uf-t-h2">
            Let&apos;s find your FIRE number
          </div>
          <div className="uf-t-body" style={{ color: "var(--uf-ink-2)", marginTop: 6 }}>
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
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={!valid}>
            Get my FIRE number →
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Checklist ──────────────────────────────────────────────────────────
