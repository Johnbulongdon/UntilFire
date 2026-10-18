"use client";

import { useState } from "react";
import { CITIES, STATE_TAX } from "@/lib/fire-data";
import { formatMoney } from "@/lib/money";
import { suggestPayByRank } from "@/lib/fire";
import GrowthSetting from "@/app/components/GrowthSetting";
import { MoneyList, MoneyRow } from "./MoneyCards";
import Flag from "@/app/components/Flag";

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
  /** Where they live now (D-82): the baseline a retirement city's prices are compared with. */
  currentCityName: string;
  onCurrentCityChange: (name: string) => void;
  retirementCityName: string;
  retirementCityCol: number;
  onRetirementCityChange: (name: string, col: number) => void;
  /** Monthly spending the FIRE number is priced on, in the display currency. */
  retirementMonthly: number;
  /** An earlier move (D-82): its calendar year and take-home a month there; both unset means moving when free. */
  moveYear?: number;
  movePayMonthly?: number;
  onMoveChange: (moveYear?: number, movePayMonthly?: number) => void;
  /** Today's take-home a month, ranked against where they live for "Suggest by rank" (D-82). */
  takeHomeMonthly: number;
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
  /** Spending once free is set (D-59): it is the target, so the city and lifestyle no longer price it. */
  spendGoalSet?: boolean;
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

/** Search-as-you-type city input with a typed fallback, shared by "Live in" and "Retire in". */
function CityPicker({ label, placeholder, initial, onPick }: {
  label: string; placeholder: string; initial: string; onPick: (name: string, col: number) => void;
}) {
  const [citySearch, setCitySearch] = useState(initial);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const trimmed = citySearch.trim();
  const matches = trimmed.length >= 2
    ? CITIES.filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 8)
    : [];
  const canUseTyped = trimmed.length >= 2
    && !matches.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  function pickCity(name: string, col: number) {
    onPick(name, col);
    setCitySearch(name);
    setShowCityDropdown(false);
  }
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          style={inputStyle}
          aria-label={label}
          value={citySearch}
          onChange={(e) => { setCitySearch(e.target.value); setShowCityDropdown(true); }}
          onFocus={() => setShowCityDropdown(true)}
          placeholder={placeholder}
        />
        {showCityDropdown && trimmed.length >= 2 && (matches.length > 0 || canUseTyped) && (
          <div style={dropdownStyle}>
            {matches.map((c) => (
              <div key={c.key} onMouseDown={() => pickCity(c.name, c.col)}
                style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--uf-border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <Flag emoji={c.flag} size={11} /> {c.name}
              </div>
            ))}
            {canUseTyped && (
              <div onMouseDown={() => pickCity(trimmed, 0)}
                style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "var(--uf-pos-ink)", fontWeight: 700 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                &#128205; Use &quot;{trimmed}&quot;
                <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontWeight: 500, marginTop: 2 }}>
                  Not in our list? We&apos;ll still save it.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FireAssumptionsCard({
  fireAge,
  onFireAgeChange,
  currentCityName,
  onCurrentCityChange,
  retirementCityName,
  retirementCityCol,
  onRetirementCityChange,
  retirementMonthly,
  moveYear,
  movePayMonthly,
  onMoveChange,
  takeHomeMonthly,
  lifestyleMultiplier,
  onLifestyleChange,
  taxKey,
  onTaxKeyChange,
  displayCurrency,
  growthRate,
  onGrowthRateChange,
  freedomDateLabel,
  spendGoalSet,
  taxRow,
}: Props) {
  const [saved, setSaved] = useState(false);
  // One editor open at a time, under its row (D-42).
  const [open, setOpen] = useState<null | "age" | "home" | "city" | "lifestyle" | "taxhome" | "growth" | "tax">(null);
  const toggle = (k: NonNullable<typeof open>) => setOpen((o) => (o === k ? null : k));
  const [taxSearch, setTaxSearch] = useState("");
  const [showTaxDropdown, setShowTaxDropdown] = useState(false);

  const selectedLifestyle = LIFESTYLE_TIERS.find((t) => t.multiplier === lifestyleMultiplier) ?? LIFESTYLE_TIERS[1];
  const showMoney = (n: number) => formatMoney(n, { currency: displayCurrency });
  // A retirement city scales your own spending by how its prices compare with home (D-82).
  const currentCityCol = CITIES.find((c) => c.name === currentCityName)?.col ?? 0;
  const priceChange = currentCityCol > 0 && retirementCityCol > 0 ? Math.round((retirementCityCol / currentCityCol - 1) * 100) : null;
  const homeShort = currentCityName.split(",")[0];
  const thisYear = new Date().getFullYear();
  // Pay at the same income rank in the new city (D-82), only where Census measured both.
  const homeCity = CITIES.find((c) => c.name === currentCityName);
  const retireCity = CITIES.find((c) => c.name === retirementCityName);
  const byRank = homeCity && retireCity ? suggestPayByRank({ takeHomeMonthly, fromKey: homeCity.key, toKey: retireCity.key, fromState: homeCity.state, toState: retireCity.state }) : null;
  const usingRank = !!byRank && movePayMonthly === byRank.takeHomeMonthly;
  const retireMeta = spendGoalSet ? "Not used: your goal sets the spending"
    : !retirementCityName ? "Same as now: your own spending sets the target"
    : retirementCityCol <= 0 ? "Not in our list, so your own spending sets the target"
    : priceChange === null ? `Priced at the city's typical ${showMoney(retirementMonthly * 12)} a year. Add where you live to use your own spending`
    : priceChange === 0 ? `Your spending there: about ${showMoney(retirementMonthly * 12)} a year, the same prices as ${homeShort}`
    : `Your spending there: about ${showMoney(retirementMonthly * 12)} a year, prices ${Math.abs(priceChange)}% ${priceChange > 0 ? "higher" : "lower"} than ${homeShort}`;
  const returnPct = Math.round(growthRate * 1000) / 10;

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        {saved && <span className="uf-t-small" style={{ color: "var(--uf-pos-ink)", fontWeight: 700 }}>Saved ✓</span>}
      </div>
      <MoneyList>
        <MoneyRow dot="var(--uf-ink-3)" icon="🎂" name="Age" meta="Turns the date into an age" value={fireAge ? `${fireAge} ›` : "Add ›"} onClick={() => toggle("age")}
          after={open === "age" && (
            <input type="number" min={18} max={100} aria-label="Current age" value={fireAge || ""} placeholder="30"
              onChange={(e) => { onFireAgeChange(Number(e.target.value)); flash(); }} style={{ ...inputStyle, maxWidth: 140 }} />
          )} />
        <MoneyRow dot="var(--uf-ink-3)" icon="🏠" name="Live in" meta={currentCityCol > 0 ? "Your prices today, the baseline for a move" : currentCityName ? "Not in our list, so a move can't be priced against it" : "Add it so a retirement city can scale your spending"}
          value={currentCityName ? `${currentCityName} ›` : "Add ›"} onClick={() => toggle("home")}
          after={open === "home" && (
            <CityPicker label="Where you live now" placeholder="Search your city" initial={currentCityName}
              onPick={(name) => { onCurrentCityChange(name); flash(); }} />
          )} />
        <MoneyRow dot="#2a78d6" icon="🌍" name="Retire in" meta={retireMeta}
          value={retirementCityName ? `${retirementCityName} ›` : "Same as now ›"} onClick={() => toggle("city")}
          after={open === "city" && (
            <div style={{ display: "grid", gap: 8 }}>
              <CityPicker label="Retirement target city" placeholder="Where should freedom be priced?" initial={retirementCityName}
                onPick={(name, col) => { onRetirementCityChange(name, col); flash(); }} />
              {priceChange !== null && (
                <div role="radiogroup" aria-label="When do you move?" style={{ display: "grid", gap: 8 }}>
                  <span style={labelStyle}>When do you move?</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[{ label: "When I'm free", on: !moveYear, pick: () => onMoveChange(undefined, undefined) },
                      { label: "Earlier", on: !!moveYear, pick: () => onMoveChange(moveYear ?? thisYear + 1, movePayMonthly) }].map((o) => (
                      <button key={o.label} type="button" role="radio" aria-checked={o.on} onClick={() => { o.pick(); flash(); }}
                        style={{ border: "none", borderRadius: 999, padding: "6px 14px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          background: o.on ? "var(--uf-ink)" : "var(--uf-surface-2)", color: o.on ? "var(--uf-card)" : "var(--uf-ink-2)" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {moveYear ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Year
                        <input type="number" min={thisYear} max={thisYear + 60} value={moveYear}
                          onChange={(e) => { const y = Number(e.target.value); if (y > 0) { onMoveChange(y, movePayMonthly); flash(); } }}
                          style={{ ...inputStyle, maxWidth: 110, marginTop: 4 }} />
                      </label>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Take-home there a month
                        <input type="number" min={0} value={movePayMonthly ?? ""} placeholder="Same as now"
                          onChange={(e) => { const v = Number(e.target.value); onMoveChange(moveYear, v > 0 ? v : undefined); flash(); }}
                          style={{ ...inputStyle, maxWidth: 160, marginTop: 4 }} />
                      </label>
                      {byRank && !usingRank && (
                        <button type="button" onClick={() => { onMoveChange(moveYear, byRank.takeHomeMonthly); flash(); }}
                          style={{ alignSelf: "flex-end", border: "1px solid var(--uf-border)", borderRadius: 999, padding: "8px 14px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--uf-surface-2)", color: "var(--uf-ink)" }}>
                          Suggest by rank: {showMoney(byRank.takeHomeMonthly)}
                        </button>
                      )}
                      {usingRank && (
                        <span className="uf-t-small" style={{ color: "var(--uf-ink-2)", flexBasis: "100%" }}>
                          Suggested: about the {ordinal(byRank.percentile)} percentile of household income in {homeShort}{byRank.aboveMeasured ? " (Census stops at $250k, so a lower rank was compared)" : ""}, at the same rank in {retirementCityName.split(",")[0]}, after its taxes. Census figures, not a job offer: change it if you know your pay.
                        </span>
                      )}
                      <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", flexBasis: "100%" }}>
                        From {moveYear}, your spending follows {retirementCityName.split(",")[0]} prices{movePayMonthly ? " and your pay switches to this" : " and your pay stays as it is"}.
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
              {retirementCityName && (
                <button type="button" onClick={() => { onRetirementCityChange("", 0); onMoveChange(undefined, undefined); flash(); }}
                  style={{ justifySelf: "start", border: "none", background: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 700, color: "var(--uf-ink-2)", cursor: "pointer", textDecoration: "underline" }}>
                  Retire where I live
                </button>
              )}
            </div>
          )} />
        <MoneyRow dot="#eda100" icon={selectedLifestyle.icon} name="Lifestyle" meta={spendGoalSet ? "Not used: your goal sets the spending" : "Spending in retirement, against today's"} value={`${selectedLifestyle.label} ›`} onClick={() => toggle("lifestyle")}
          after={open === "lifestyle" && (
            <div role="radiogroup" aria-label="Lifestyle" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LIFESTYLE_TIERS.map((tier) => {
                const on = lifestyleMultiplier === tier.multiplier;
                return (
                  <button key={tier.label} type="button" role="radio" aria-checked={on} onClick={() => { onLifestyleChange(tier.multiplier); flash(); }}
                    style={{ border: "none", borderRadius: 999, padding: "6px 14px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: on ? "var(--uf-ink)" : "var(--uf-surface-2)", color: on ? "var(--uf-card)" : "var(--uf-ink-2)" }}>
                    {tier.icon} {tier.label} · {Math.round(tier.multiplier * 100)}%
                  </button>
                );
              })}
            </div>
          )} />
        <MoneyRow dot="#e34948" icon="🏛️" name="Tax home" meta="Where income tax is worked out" value={taxKey && STATE_TAX[taxKey] ? `${STATE_TAX[taxKey].label} ›` : "Choose ›"} onClick={() => toggle("taxhome")}
          after={open === "taxhome" && (
            <div style={{ position: "relative" }}>
              <input
                style={inputStyle}
                aria-label="Tax home"
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
                      <div key={c.state}
                        onMouseDown={() => { onTaxKeyChange(c.state); setTaxSearch(""); setShowTaxDropdown(false); flash(); }}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--uf-border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uf-surface)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                        <Flag emoji={c.flag} size={11} /> {c.name}
                        <span style={{ fontSize: 12, color: "var(--uf-text-2)", marginLeft: 6 }}>&middot; {STATE_TAX[c.state]?.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )} />
        {/* Growth after inflation (D-24): the assumption that moves the date most. */}
        <MoneyRow dot="#008300" icon="📊" name="Growth after inflation" meta="The assumption that moves the date most" value={`${returnPct.toFixed(1)}% ›`} onClick={() => toggle("growth")}
          after={open === "growth" && growthEditor} />
        {taxRow && (
          <MoneyRow dot="var(--uf-ink-3)" icon="🧾" name="Tax in retirement" meta={taxRow.summary} value={taxRow.on ? "On ›" : "Off ›"} onClick={() => toggle("tax")}
            after={open === "tax" && taxRow.editor} />
        )}
      </MoneyList>
    </div>
  );
}

/** 47 → "47th", 21 → "21st". */
function ordinal(n: number): string {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${tail}`;
}
