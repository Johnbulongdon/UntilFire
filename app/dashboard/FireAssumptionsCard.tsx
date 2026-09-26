"use client";

import { useState } from "react";
import { CITIES, STATE_TAX } from "@/lib/fire-data";
import { formatMoney } from "@/lib/money";
import { Button, SegmentedControl } from "@/components/ui";
import { RECOMMENDED_RETURN_PCT, RETURN_OPTIONS, RETURN_RECOMMENDATION } from "@/lib/fire-number";

/**
 * The assumptions a freedom date is computed from: age, where freedom gets
 * priced, how richly, and which tax home.
 *
 * This lived in Profile until 18 Sep 2026, which put every input that models
 * the future inside account settings. App-structure rule 2 is explicit — if it
 * models something that hasn't happened yet, it belongs in Plan — and the card
 * said so itself: "These assumptions personalize your freedom date across the
 * dashboard."
 *
 * The app had already grown around the misplacement rather than fixing it.
 * Plan carried a tile titled "Profile Assumptions" whose only job was a button
 * reading "Edit in Profile →", and Expat FIRE carried a second one. A tab
 * needing a permanent link out to account settings to edit its own inputs is
 * the structure telling on itself.
 *
 * The FIRE *type* stayed behind in Profile, deliberately: it is a personality
 * result rather than a projection input, and the onboarding rules place it
 * there rather than in the planning flow.
 */

interface Props {
  fireAge: number;
  onFireAgeChange: (age: number) => void;
  retirementCityName: string;
  retirementCityCol: number;
  onRetirementCityChange: (name: string, col: number) => void;
  lifestyleMultiplier: number;
  onLifestyleChange: (multiplier: number) => void;
  taxKey: string;
  onTaxKeyChange: (key: string) => void;
  displayCurrency: string;
  /** Growth after inflation, as a fraction (0.07). */
  growthRate: number;
  onGrowthRateChange: (rate: number) => void;
}

const LIFESTYLE_TIERS = [
  { label: "Frugal", multiplier: 0.7, icon: "\u{1F331}" },
  { label: "Standard", multiplier: 1.0, icon: "\u{1F3E1}" },
  { label: "Lavish", multiplier: 1.5, icon: "\u{1F48E}" },
];

const cardStyle: React.CSSProperties = {
  background: "var(--uf-card)",
  borderRadius: 12,
  border: "1px solid var(--uf-border)",
  padding: "24px 28px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--uf-border)",
  borderRadius: 8,
  fontSize: 14,
  color: "#1a1a2e",
  background: "var(--uf-card)",
  outline: "none",
  boxSizing: "border-box",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 50,
  background: "var(--uf-card)",
  border: "1px solid var(--uf-border)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
  maxHeight: 220,
  overflowY: "auto",
  marginTop: 4,
};

export default function FireAssumptionsCard({
  fireAge,
  onFireAgeChange,
  retirementCityName,
  retirementCityCol,
  onRetirementCityChange,
  lifestyleMultiplier,
  onLifestyleChange,
  taxKey,
  onTaxKeyChange,
  displayCurrency,
  growthRate,
  onGrowthRateChange,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [citySearch, setCitySearch] = useState(retirementCityName);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [taxSearch, setTaxSearch] = useState("");
  const [showTaxDropdown, setShowTaxDropdown] = useState(false);

  const trimmed = citySearch.trim();
  const matches = trimmed.length >= 2
    ? CITIES.filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 8)
    : [];
  const canUseTyped = trimmed.length >= 2
    && !matches.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  const selectedLifestyle = LIFESTYLE_TIERS.find((t) => t.multiplier === lifestyleMultiplier) ?? LIFESTYLE_TIERS[1];
  const targetAnnualSpend = retirementCityCol > 0 ? retirementCityCol * lifestyleMultiplier : 0;
  const targetFireNumber = targetAnnualSpend * 25;
  const showMoney = (n: number) => formatMoney(n, { currency: displayCurrency });
  const returnPct = Math.round(growthRate * 100);

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function pickCity(name: string, col: number) {
    onRetirementCityChange(name, col);
    setCitySearch(name);
    setShowCityDropdown(false);
    flash();
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: "0 0 6px" }}>Your assumptions</h3>
          <p style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.6, margin: 0 }}>
            Every freedom date on the dashboard is calculated from these.
          </p>
        </div>
        {saved && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>Saved &#10003;</span>}
      </div>

      <label style={labelStyle}>Current age</label>
      <input
        type="number"
        min={18}
        max={100}
        value={fireAge || ""}
        onChange={(e) => { onFireAgeChange(Number(e.target.value)); flash(); }}
        style={{ ...inputStyle, maxWidth: 140, marginBottom: 16 }}
        placeholder="30"
      />

      <label style={labelStyle}>Retirement target city</label>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input
          style={inputStyle}
          value={citySearch}
          onChange={(e) => { setCitySearch(e.target.value); setShowCityDropdown(true); }}
          onFocus={() => setShowCityDropdown(true)}
          placeholder="Where should freedom be priced?"
        />
        {showCityDropdown && trimmed.length >= 2 && (matches.length > 0 || canUseTyped) && (
          <div style={dropdownStyle}>
            {matches.map((c) => (
              <div
                key={c.key}
                onMouseDown={() => pickCity(c.name, c.col)}
                style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--uf-border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                {c.flag} {c.name}
              </div>
            ))}
            {canUseTyped && (
              <div
                onMouseDown={() => pickCity(trimmed, 0)}
                style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "#047857", fontWeight: 700 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                &#128205; Use &quot;{trimmed}&quot;
                <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontWeight: 500, marginTop: 2 }}>
                  We&apos;ll save the city name even if it is not in our estimate list yet.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <label style={labelStyle}>Lifestyle target</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {LIFESTYLE_TIERS.map((tier) => (
          <button
            key={tier.label}
            onClick={() => { onLifestyleChange(tier.multiplier); flash(); }}
            style={{
              padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              border: lifestyleMultiplier === tier.multiplier ? "1.5px solid #059669" : "1px solid #E2E8F0",
              background: lifestyleMultiplier === tier.multiplier ? "#F0FDF4" : "#fff",
              color: lifestyleMultiplier === tier.multiplier ? "#047857" : "#374151",
              fontWeight: 700,
            }}
          >
            <span style={{ display: "block", fontSize: 18 }}>{tier.icon}</span>
            <span style={{ fontSize: 12 }}>{tier.label}</span>
          </button>
        ))}
      </div>

      <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--uf-text-2)", marginBottom: 4 }}>Current target</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--uf-text)" }}>
          {retirementCityName ? `${retirementCityName} · ${selectedLifestyle.label}` : "Choose a city to price your freedom date"}
        </div>
        {targetFireNumber > 0 && (
          <div style={{ fontSize: 12, color: "var(--uf-text-2)", marginTop: 4 }}>
            Rough target: {showMoney(targetAnnualSpend)}/yr &times; 25 = {showMoney(targetFireNumber)}
          </div>
        )}
      </div>

      <label style={labelStyle}>Tax home</label>
      {taxKey && STATE_TAX[taxKey] && !taxSearch && (
        <p style={{ fontSize: 12, color: "var(--uf-text-2)", margin: "0 0 8px", lineHeight: 1.5 }}>
          {STATE_TAX[taxKey].label}
        </p>
      )}
      <div style={{ position: "relative" }}>
        <input
          style={inputStyle}
          value={taxSearch}
          onChange={(e) => { setTaxSearch(e.target.value); setShowTaxDropdown(true); }}
          onFocus={() => setShowTaxDropdown(true)}
          onBlur={() => setTimeout(() => setShowTaxDropdown(false), 150)}
          placeholder={taxKey && STATE_TAX[taxKey] ? `Change: ${STATE_TAX[taxKey].label}` : "Search city or state to set tax home…"}
        />
        {showTaxDropdown && taxSearch.trim().length >= 2 && (() => {
          const taxMatches = CITIES.filter((c) =>
            c.name.toLowerCase().includes(taxSearch.trim().toLowerCase()) && c.state && STATE_TAX[c.state]
          ).slice(0, 8);
          if (!taxMatches.length) return null;
          const seen = new Set<string>();
          const unique = taxMatches.filter((c) => { if (seen.has(c.state)) return false; seen.add(c.state); return true; });
          return (
            <div style={dropdownStyle}>
              {unique.map((c) => (
                <div
                  key={c.state}
                  onMouseDown={() => { onTaxKeyChange(c.state); setTaxSearch(""); setShowTaxDropdown(false); flash(); }}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--uf-border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  {c.flag} {c.name}
                  <span style={{ fontSize: 12, color: "var(--uf-text-2)", marginLeft: 6 }}>
                    &middot; {STATE_TAX[c.state]?.label}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Growth after inflation (D-24): the assumption that moves the date most. */}
      <div style={{ marginTop: 18 }}>
        <label style={labelStyle}>Growth after inflation</label>
        <p style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.6, margin: "0 0 8px" }}>
          How much your investments grow each year, beyond prices rising. Higher brings the date closer; lower is safer.
        </p>
        <SegmentedControl
          label="Growth after inflation"
          size="sm"
          value={String(returnPct)}
          onChange={(v) => { onGrowthRateChange(Number(v) / 100); flash(); }}
          options={RETURN_OPTIONS.map((v) => ({ value: String(v), label: `${v}%` }))}
        />
        <div style={{ marginTop: 10, background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 8, justifyItems: "start" }}>
          <p style={{ fontSize: 13, color: "var(--uf-ink)", lineHeight: 1.6, margin: 0 }}>
            <strong>Recommended: </strong>{RETURN_RECOMMENDATION}
          </p>
          {returnPct === RECOMMENDED_RETURN_PCT
            ? <span style={{ fontSize: 13, color: "var(--uf-ink-3)" }}>&#10003; Using the recommendation</span>
            : <Button variant="secondary" size="sm" onClick={() => { onGrowthRateChange(RECOMMENDED_RETURN_PCT / 100); flash(); }}>Use recommended</Button>}
        </div>
      </div>
    </div>
  );
}
