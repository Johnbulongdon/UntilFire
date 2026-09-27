"use client";

import { useState } from "react";
import { quickFreedom } from "@/lib/quick-freedom";
import { formatMoney } from "@/lib/money";
import { REFERRED_TRIAL_LABEL } from "@/lib/pricing";
import { Field, Input } from "@/components/ui";

const num = (v: string) => Number(v.replace(/[^0-9.]/g, "")) || 0;

export default function EmbedCalculator({ code }: { code: string | null }) {
  const [income, setIncome] = useState("5000");
  const [spending, setSpending] = useState("3000");
  const [invested, setInvested] = useState("25000");
  const r = quickFreedom({ monthlyIncome: num(income), monthlySpending: num(spending), invested: num(invested) });
  // Every way out credits the creator; without a valid code it is plain UntilFire.
  const out = code ? `https://www.untilfire.com/r/${code}` : "https://www.untilfire.com/?source=embed";

  return (
    <main style={{ background: "var(--uf-card)", color: "var(--uf-ink)", padding: "var(--uf-s4)", minHeight: "100vh", boxSizing: "border-box" }}>
      <h1 className="uf-t-h3" style={{ margin: "0 0 var(--uf-s4)" }}>When could work become optional?</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--uf-s3)" }}>
        <Field label="Take-home a month" htmlFor="e-income">
          <Input id="e-income" inputMode="decimal" numeric value={income} onChange={(e) => setIncome(e.target.value)} />
        </Field>
        <Field label="Spending a month" htmlFor="e-spend">
          <Input id="e-spend" inputMode="decimal" numeric value={spending} onChange={(e) => setSpending(e.target.value)} />
        </Field>
        <Field label="Invested now" htmlFor="e-invested">
          <Input id="e-invested" inputMode="decimal" numeric value={invested} onChange={(e) => setInvested(e.target.value)} />
        </Field>
      </div>

      <div aria-live="polite" style={{ margin: "var(--uf-s5) 0 var(--uf-s4)" }}>
        {r.year !== null ? (
          <>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>Your freedom year</div>
            <div className="uf-t-display" style={{ color: "var(--uf-teal)", lineHeight: 1.1 }}>{r.year}</div>
            <p className="uf-t-small" style={{ margin: "var(--uf-s2) 0 0", color: "var(--uf-ink-2)" }}>
              {r.years === 0 ? "You're there already" : `About ${Math.ceil(r.years ?? 0)} years`} · target {formatMoney(r.target, { style: "compact" })} · saving {Math.round(r.savingsRate * 100)}%
            </p>
          </>
        ) : (
          <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
            Not within 65 years at this pace. Saving a little more changes it fast.
          </p>
        )}
      </div>

      <a
        href={out}
        target="_blank"
        rel="noopener"
        style={{ display: "inline-block", background: "var(--uf-green)", color: "var(--uf-card)", padding: "var(--uf-s2) var(--uf-s4)", borderRadius: 999, fontWeight: 700, textDecoration: "none" }}
      >
        See your full plan free →
      </a>
      <p className="uf-t-small" style={{ margin: "var(--uf-s3) 0 0", color: "var(--uf-ink-3)" }}>
        {code ? `Pro ${REFERRED_TRIAL_LABEL} from here · ` : ""}
        <a href={out} target="_blank" rel="noopener" style={{ color: "var(--uf-ink-3)" }}>UntilFire</a> · 6.9% real growth, 4% rule · Not advice
      </p>
    </main>
  );
}
