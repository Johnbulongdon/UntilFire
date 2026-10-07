"use client";

/**
 * Before you buy (D-42): one sentence. "A $3,000 purchase today moves your
 * date 2 months later." The money would have grown until the freedom date, so
 * the cost is time; the dark two-box result it replaced said the same thing in
 * two colours that meant nothing elsewhere.
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
      <div style={{ background: "var(--uf-card)", borderRadius: 16, padding: 18, boxShadow: "var(--uf-e1)", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="uf-t-body">A</span>
          <span style={{ position: "relative" }}>
            <span aria-hidden style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", ...mono, color: "var(--uf-ink-3)" }}>$</span>
            <input type="number" min="0" inputMode="decimal" aria-label="Purchase price" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)}
              style={{ width: 120, ...mono, fontSize: 18, padding: "6px 10px 6px 22px", borderRadius: 10, border: "1px solid var(--uf-border-2)", background: "var(--uf-bg)", color: "var(--uf-ink)", boxSizing: "border-box" }} />
          </span>
          <span className="uf-t-body">purchase today moves your freedom date</span>
          {result
            ? <b aria-live="polite" style={{ ...mono, fontSize: 18, color: "var(--uf-warn-ink)" }}>{formatDelay(result.delayDays)} later</b>
            : <span className="uf-t-body" style={{ color: "var(--uf-ink-3)" }}>…</span>}
        </div>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>
          {!hasProfile
            ? "Add income, savings and expenses for your own numbers."
            : result
              ? <>Invested instead, it would be worth <b style={{ ...mono, color: "var(--uf-ink-2)" }}>{formatFV(result.futureValue)}</b> by your freedom date, at {Math.round(annualReturn * 1000) / 10}% a year after inflation.</>
              : "Type a price to see what it costs in time."}
        </span>
      </div>
    </div>
  );
}
