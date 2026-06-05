"use client";

import { useState, useMemo } from "react";
import { calcPurchaseImpact, formatDelay, formatFV } from "@/lib/purchase-impact";

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
    <div style={{
      background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16,
      padding: "28px 24px",
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>
          What would this cost your freedom?
        </div>
        <div style={{ fontSize: 14, color: "var(--uf-text-2)", lineHeight: 1.6 }}>
          Enter a purchase price to see its compound value at your freedom date and how many days it delays you.
        </div>
      </div>

      {!hasProfile && (
        <div style={{
          background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
          borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#f97316",
          fontWeight: 600, marginBottom: 16,
        }}>
          Complete your FIRE profile (income, savings, expenses) to get personalised results.
        </div>
      )}

      {/* Price input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Purchase price
        </label>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 20, fontWeight: 700, color: "var(--uf-text-2)",
          }}>$</span>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0"
            min="0"
            style={{
              width: "100%", padding: "14px 16px 14px 34px",
              fontSize: 24, fontWeight: 800, fontFamily: "Manrope, sans-serif",
              border: "1.5px solid var(--uf-border)", borderRadius: 12,
              background: "var(--uf-card)", color: "var(--uf-text)",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#001f3f", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
              Worth at freedom date
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#62FAE3", fontFamily: "Manrope, sans-serif", letterSpacing: "-1px" }}>
              {formatFV(result.futureValue)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              compounded at {Math.round(annualReturn * 100)}%/yr
            </div>
          </div>
          <div style={{ background: "#3b0000", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
              Freedom delayed by
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#FCA5A5", fontFamily: "Manrope, sans-serif", letterSpacing: "-1px" }}>
              {formatDelay(result.delayDays)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              based on your FIRE profile
            </div>
          </div>
        </div>
      )}

      {!result && price && parseFloat(price) > 0 && (
        <div style={{ fontSize: 13, color: "var(--uf-text-3)", textAlign: "center", padding: "16px 0" }}>
          Add your FIRE profile data to calculate the delay.
        </div>
      )}
    </div>
  );
}
