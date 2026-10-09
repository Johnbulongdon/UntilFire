"use client";

import { useState } from "react";
import { CITIES, STATE_TAX } from "@/lib/fire-data";
import { formatMoney } from "@/lib/money";
import GrowthSetting from "@/app/components/GrowthSetting";
import { MoneyList } from "./MoneyCards";
import PillEditor from "@/components/ui/PillEditor";
import PlanAgePicker from "@/components/ui/PlanAgePicker";

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
  /** Growth after inflation, as a fraction (0.069). */
  growthRate: number;
  onGrowthRateChange: (rate: number) => void;
  /** The freedom date at these assumptions, shown under the growth picker so a choice visibly moves it. */
  freedomDateLabel?: string | null;
  /** Tax in retirement, as one more row; its editor is the tax card (D-42). */
  taxRow?: { on: boolean; summary: string; editor: React.ReactNode };
}

const LIFESTYLE_TIERS = [
  { label: "Frugal", multiplier: 0.7, icon: "\u{1F331}" },
  { label: "Standard", multiplier: 1.0, icon: "\u{1F3E1}" },
  { label: "Lavish", multiplier: 1.5, icon: "\u{1F48E}" },
];


const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--uf-ink-2)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--uf-border)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--uf-ink)",
  background: "var(--uf-card)",

  boxSizing: "border-box",
};

function AssumptionRow({ name, meta, value, icon, onClick, after, onClose }: { name: string; meta?: React.ReactNode; value: string; icon?: React.ReactNode; dot?: string; onClick: () => void; after?: React.ReactNode; onClose: () => void }) {
  return <PillEditor label={name} description={meta} value={value.replace(/\s*›$/, '')} icon={icon} open={!!after} onOpen={onClick} onClose={onClose}>{after}</PillEditor>;
}

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
  freedomDateLabel,
  taxRow,
}: Props) {
  const [saved, setSaved] = useState(false);
  // One focused editor at a time: desktop dialog or phone sheet.
  const [open, setOpen] = useState<null | "age" | "city" | "lifestyle" | "taxhome" | "growth" | "tax">(null);
  const toggle = (k: NonNullable<typeof open>) => setOpen((o) => (o === k ? null : k));
  const [citySearch, setCitySearch] = useState(retirementCityName);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [taxSearch, setTaxSearch] = useState("");
  const [showTaxDropdown, setShowTaxDropdown] = useState(false);

  const trimmed = citySearch.trim();
  const matches = CITIES.filter((c) => !trimmed || c.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 8);
  const canUseTyped = trimmed.length >= 2
    && !matches.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  const selectedLifestyle = LIFESTYLE_TIERS.find((t) => t.multiplier === lifestyleMultiplier) ?? LIFESTYLE_TIERS[1];
  const targetAnnualSpend = retirementCityCol > 0 ? retirementCityCol * lifestyleMultiplier : 0;
  const showMoney = (n: number) => formatMoney(n, { currency: displayCurrency });
  const returnPct = Math.round(growthRate * 1000) / 10;

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function pickCity(name: string, col: number) {
    onRetirementCityChange(name, col);
    setCitySearch(name);
    setShowCityDropdown(false);
    setOpen(null);
    flash();
  }

  const growthEditor = (
    <div>
      <GrowthSetting value={returnPct} onChange={(v) => { onGrowthRateChange(v / 100); flash(); }} />
      {freedomDateLabel !== undefined && (
        <p aria-live="polite" style={{ margin: "10px 0 0", fontSize: 14, color: "var(--uf-ink)", fontWeight: 700 }}>
          {freedomDateLabel
            ? <>At {returnPct.toFixed(1)}%, your freedom date is {freedomDateLabel}.</>
            : <>At {returnPct.toFixed(1)}%, your freedom date isn&apos;t reached yet.</>}
        </p>
      )}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700 }}>Your assumptions · every date here comes from these</span>
        {saved && <span role="status" className="uf-t-small" style={{ color: "var(--uf-pos-ink)", fontWeight: 700 }}>Updated ✓</span>}
      </div>
      <MoneyList>
        <AssumptionRow onClose={() => setOpen(null)} dot="var(--uf-ink-3)" icon="🎂" name="Age" meta="Your starting point" value={fireAge ? `${fireAge} ›` : "Add ›"} onClick={() => toggle("age")}
          after={open === "age" && (
            <PlanAgePicker value={fireAge} onChange={(age) => { onFireAgeChange(age); flash(); }} />
          )} />
        <AssumptionRow onClose={() => setOpen(null)} dot="#2a78d6" icon="🌍" name="Retire in" meta={retirementCityCol > 0 ? `Prices your FIRE number at about ${showMoney(targetAnnualSpend)} a year` : "Skip it and your own spending sets the target"}
          value={retirementCityName ? `${retirementCityName} ›` : "Choose ›"} onClick={() => { setCitySearch(""); setShowCityDropdown(true); toggle("city"); }}
          after={open === "city" && (
            <div>
              <label htmlFor="plan-retirement-city" style={labelStyle}>Retirement target city</label>
              <div style={{ position: "relative" }}>
                <input
                  id="plan-retirement-city"
                  type="search"
                  autoComplete="off"
                  style={inputStyle}
                  value={citySearch}
                  onChange={(e) => { setCitySearch(e.target.value); setShowCityDropdown(true); }}
                  onFocus={() => setShowCityDropdown(true)}
                  placeholder="Where should freedom be priced?"
                />
                {showCityDropdown && (matches.length > 0 || canUseTyped) && (
                  <div className="uf-pill-search-results">
                    {matches.map((c) => (
                      <button type="button" className="uf-pill-choice" key={c.key} onClick={() => pickCity(c.name, c.col)}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--uf-border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                        {c.flag} {c.name}
                      </button>
                    ))}
                    {canUseTyped && (
                      <button type="button" className="uf-pill-choice" onClick={() => pickCity(trimmed, 0)}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "var(--uf-pos-ink)", fontWeight: 700 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                        &#128205; Use &quot;{trimmed}&quot;
                        <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontWeight: 500, marginTop: 2 }}>
                          Not in our list? We&apos;ll still save it.
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )} />
        <AssumptionRow onClose={() => setOpen(null)} dot="#eda100" icon={selectedLifestyle.icon} name="Lifestyle" meta="Spending in retirement, against today's" value={`${selectedLifestyle.label} ›`} onClick={() => toggle("lifestyle")}
          after={open === "lifestyle" && (
            <div role="radiogroup" aria-label="Lifestyle" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LIFESTYLE_TIERS.map((tier) => {
                const on = lifestyleMultiplier === tier.multiplier;
                return (
                  <button key={tier.label} type="button" role="radio" aria-checked={on} onClick={() => { onLifestyleChange(tier.multiplier); setOpen(null); flash(); }}
                    style={{ border: "none", borderRadius: 999, minHeight: 44, padding: "6px 14px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: on ? "var(--uf-ink)" : "var(--uf-surface-2)", color: on ? "var(--uf-card)" : "var(--uf-ink-2)" }}>
                    {tier.icon} {tier.label} · {Math.round(tier.multiplier * 100)}%
                  </button>
                );
              })}
            </div>
          )} />
        <AssumptionRow onClose={() => setOpen(null)} dot="#e34948" icon="🏛️" name="Tax home" meta="Where income tax is worked out" value={taxKey && STATE_TAX[taxKey] ? `${STATE_TAX[taxKey].label} ›` : "Choose ›"} onClick={() => { setTaxSearch(""); setShowTaxDropdown(true); toggle("taxhome"); }}
          after={open === "taxhome" && (
            <div style={{ position: "relative" }}>
              <input
                style={inputStyle}
                aria-label="Tax home"
                value={taxSearch}
                onChange={(e) => { setTaxSearch(e.target.value); setShowTaxDropdown(true); }}
                onFocus={() => setShowTaxDropdown(true)}
                placeholder={taxKey && STATE_TAX[taxKey] ? `Change: ${STATE_TAX[taxKey].label}` : "Search city or state to set tax home…"}
              />
              {showTaxDropdown && (() => {
                const taxMatches = CITIES.filter((c) =>
                  c.name.toLowerCase().includes(taxSearch.trim().toLowerCase()) && c.state && STATE_TAX[c.state]
                ).slice(0, 8);
                if (!taxMatches.length) return null;
                const seen = new Set<string>();
                const unique = taxMatches.filter((c) => { if (seen.has(c.state)) return false; seen.add(c.state); return true; });
                return (
                  <div className="uf-pill-search-results">
                    {unique.map((c) => (
                      <button type="button" className="uf-pill-choice" key={c.state}
                        onClick={() => { onTaxKeyChange(c.state); setTaxSearch(""); setShowTaxDropdown(false); setOpen(null); flash(); }}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--uf-border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                        {c.flag} {c.name}
                        <span style={{ fontSize: 12, color: "var(--uf-text-2)", marginLeft: 6 }}>&middot; {STATE_TAX[c.state]?.label}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )} />
        {/* Growth after inflation (D-24): the assumption that moves the date most. */}
        <AssumptionRow onClose={() => setOpen(null)} dot="#008300" icon="📊" name="Growth after inflation" meta="The assumption that moves the date most" value={`${returnPct.toFixed(1)}% ›`} onClick={() => toggle("growth")}
          after={open === "growth" && growthEditor} />
        {taxRow && (
          <AssumptionRow onClose={() => setOpen(null)} dot="var(--uf-ink-3)" icon="🧾" name="Tax in retirement" meta={taxRow.summary} value={taxRow.on ? "On ›" : "Off ›"} onClick={() => toggle("tax")}
            after={open === "tax" && taxRow.editor} />
        )}
      </MoneyList>
    </div>
  );
}
