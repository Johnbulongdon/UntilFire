"use client";

/**
 * Before you buy (D-42): a price field, then one sentence: "It moves your
 * freedom date 2 months later." The field used to sit mid-sentence, which
 * read as "A [$0] purchase…" before anything was typed. The money would have
 * grown until the freedom date, so the cost is time.
 */

import { useState, useMemo } from "react";
import { calcPurchaseImpact, formatDelay, formatFV } from "@/lib/purchase-impact";

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

export default function PurchaseImpactPanel({
  currentSavings,
  monthlyContribution,
  fireTarget,
  annualReturn = 0.07,
}: {
  currentSavings: number;
  monthlyContribution: number;
  fireTarget: number;
  annualReturn?: number;
}) {
  const [price, setPrice] = useState("");

  const result = useMemo(() => {
    const p = parseFloat(price.replace(/[^0-9.]/g, ""));
    if (!p || p <= 0) return null;
    return calcPurchaseImpact(p, currentSavings, monthlyContribution, fireTarget, annualReturn);
  }, [price, currentSavings, monthlyContribution, fireTarget, annualReturn]);

  const hasProfile = fireTarget > 0 && monthlyContribution > 0;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700, marginTop: 8 }}>Before you buy</div>
      <div style={{ background: "var(--uf-card)", borderRadius: 16, padding: 18, boxShadow: "var(--uf-e1)", display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="uf-t-body">Thinking of buying something?</span>
          <span style={{ position: "relative", maxWidth: 220 }}>
            <span aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", ...mono, color: "var(--uf-ink-3)" }}>$</span>
            <input type="text" inputMode="decimal" autoComplete="off" aria-label="Purchase price" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
              style={{ width: "100%", ...mono, fontSize: 18, padding: "10px 12px 10px 26px", borderRadius: 10, border: "1px solid var(--uf-border-2)", background: "var(--uf-bg)", color: "var(--uf-ink)", boxSizing: "border-box" }} />
          </span>
        </label>
        {result
          ? <p aria-live="polite" className="uf-t-body" style={{ margin: 0 }}>
              It moves your freedom date <b style={{ ...mono, color: "var(--uf-warn-ink)" }}>{formatDelay(result.delayDays)} later</b>.
            </p>
          : null}
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>
          {!hasProfile
            ? "Add income, savings and expenses for your own numbers."
            : result
              ? <>Invested instead, it would be worth <b style={{ ...mono, color: "var(--uf-ink-2)" }}>{formatFV(result.futureValue)}</b> by your freedom date, at {Math.round(annualReturn * 1000) / 10}% a year after inflation.</>
              : "Type a price to see what it costs you in time."}
        </span>
      </div>
    </div>
  );
}
