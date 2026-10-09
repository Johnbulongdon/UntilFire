"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import MoneyField from "@/components/ui/MoneyField";
import { convertUSDAmount } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import { PAY_GROWTH_PRESETS, ageLabel, pensionFor, type PlanSettings } from "@/lib/plan-settings";
import { MoneyList, MoneyRow } from "./MoneyCards";

/**
 * Your goal (D-59): what you plan to spend once free, how your pay grows, and
 * when pension money opens. The first is the goal itself (the FIRE number is
 * that spending over the withdrawal rate); the last makes sure the date is one
 * you can actually live on, with money you can reach before the pension opens.
 */
export default function PlanGoalCard({ plan, onChange, currentAnnualSpend, withdrawalRate, fireAge, freeYears, totalYears, bridge, usTaxHome, displayCurrency, displayRates }: {
  plan: PlanSettings;
  onChange: (next: PlanSettings) => void;
  /** Today's spending a year, in USD. */
  currentAnnualSpend: number;
  withdrawalRate: number;
  fireAge: number;
  /** Years to freedom, and years until the total alone reaches the target. */
  freeYears: number | null;
  totalYears: number | null;
  bridge: { needed: number; reachable: number; years: number } | null;
  usTaxHome: boolean;
  displayCurrency: string;
  displayRates: Record<string, number>;
}) {
  const [open, setOpen] = useState<null | "spend" | "growth" | "access">(null);
  const toggle = (k: NonNullable<typeof open>) => setOpen((o) => (o === k ? null : k));
  const local = (usd: number) => Math.round(convertUSDAmount(usd, displayCurrency, displayRates));
  const toUsd = (n: number) => (displayCurrency === "USD" ? n : n / (displayRates[displayCurrency] || 1));
  const money = (usd: number) => formatMoney(local(usd), { currency: displayCurrency });
  const set = (patch: Partial<PlanSettings>) => onChange({ ...plan, ...patch });

  const spend = plan.retirementAnnualSpend ?? 0;
  const growth = plan.payGrowth ?? 0;
  const pension = pensionFor(displayCurrency, usTaxHome);
  const suggested = pension.age;
  const [ageDraft, setAgeDraft] = useState(String(plan.accessAge ?? suggested ?? ""));

  const accessMeta = !suggested ? "Can be drawn at any age, so nothing to bridge"
    : !plan.accessAge ? `Usually ${ageLabel(suggested)}. Confirm to check you can reach enough before then`
    : !fireAge ? "Add your age to check the years before it opens"
    : freeYears !== null && totalYears !== null && freeYears > totalYears
      ? `Short of money you can reach before ${ageLabel(plan.accessAge)}, so ${freeYears - totalYears} ${freeYears - totalYears === 1 ? "year" : "years"} later`
    : bridge ? `${formatMoney(local(bridge.reachable), { currency: displayCurrency, style: "compact" })} to reach covers ${Math.ceil(bridge.years)} years ✓`
    : "Free after it opens, so nothing to bridge";

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700, marginTop: 8 }}>Your goal</span>
      <MoneyList>
        <MoneyRow dot="var(--uf-teal)" icon="🏖️" name="Spend once free"
          meta={spend > 0 ? `Needs ${money(spend / withdrawalRate)} at ${+(withdrawalRate * 100).toFixed(1)}%` : `Today ${money(currentAnnualSpend)} a year`}
          value={spend > 0 ? `${money(spend)} a year ›` : "Set ›"} onClick={() => toggle("spend")}
          after={open === "spend" && (
            <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
              <MoneyField label={`A year once free (${displayCurrency})`} placeholder={String(local(currentAnnualSpend))}
                value={spend > 0 ? String(local(spend)) : ""}
                onChange={(v) => set({ retirementAnnualSpend: v === "" ? undefined : Math.max(0, toUsd(Number(v) || 0)) })} />
              {spend > 0 && <Button variant="ghost" size="sm" onClick={() => set({ retirementAnnualSpend: undefined })}>Use today&apos;s spending</Button>}
            </div>
          )} />
        <MoneyRow dot="#2a78d6" icon="📈" name="Pay growth" meta="Above inflation. Your spending stays put, so raises are saved"
          value={growth > 0 ? `${+(growth * 100).toFixed(1)}% a year ›` : "Off ›"} onClick={() => toggle("growth")}
          after={open === "growth" && (
            <div role="radiogroup" aria-label="Pay growth" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {PAY_GROWTH_PRESETS.map((p) => {
                const on = Math.abs(growth - p.rate) < 1e-9;
                return <button key={p.key} type="button" role="radio" aria-checked={on} onClick={() => set({ payGrowth: p.rate || undefined })}
                  style={{ padding: "6px 12px", borderRadius: 99, border: `1px solid ${on ? "var(--uf-ink)" : "var(--uf-border-2)"}`, cursor: "pointer",
                    background: on ? "var(--uf-ink)" : "var(--uf-card)", color: on ? "var(--uf-card)" : "var(--uf-ink)", fontWeight: 700, fontSize: 13 }}>
                  {p.label} · {+(p.rate * 100).toFixed(1)}%
                </button>;
              })}
              <label className="uf-t-small" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--uf-ink-2)" }}>
                Own
                <input type="number" step={0.5} min={0} max={10} aria-label="Pay growth, percent a year" value={growth ? +(growth * 100).toFixed(1) : ""}
                  onChange={(e) => { const v = Number(e.target.value); set({ payGrowth: v > 0 ? Math.min(10, v) / 100 : undefined }); }}
                  style={{ width: 72, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--uf-border)", background: "var(--uf-card)", color: "var(--uf-ink)" }} />
                %
              </label>
            </div>
          )} />
        <MoneyRow dot="#c58a4a" icon="🔒" name={`${pension.name} opens`} meta={accessMeta}
          value={!suggested ? "Any age" : plan.accessAge ? `${ageLabel(plan.accessAge)} ›` : "Confirm ›"} valueTone={!plan.accessAge && suggested ? "var(--uf-green)" : undefined}
          strong={!plan.accessAge && !!suggested} onClick={suggested ? () => toggle("access") : undefined}
          after={open === "access" && suggested && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label className="uf-t-small" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--uf-ink-2)" }}>
                Opens at
                <input type="number" step={0.5} min={40} max={80} aria-label="Age the pension opens" value={ageDraft}
                  onChange={(e) => setAgeDraft(e.target.value)}
                  style={{ width: 80, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--uf-border)", background: "var(--uf-card)", color: "var(--uf-ink)" }} />
              </label>
              <Button size="sm" onClick={() => { const a = Number(ageDraft); if (a >= 40 && a <= 80) { set({ accessAge: a }); setOpen(null); } }}>Confirm</Button>
              {plan.accessAge && <Button variant="ghost" size="sm" onClick={() => { set({ accessAge: undefined }); setOpen(null); }}>Don&apos;t check</Button>}
            </div>
          )} />
      </MoneyList>
    </div>
  );
}
