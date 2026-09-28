"use client";

import { useState } from "react";
import { freedomPath, quickFreedom } from "@/lib/quick-freedom";
import { formatMoney } from "@/lib/money";
import { REFERRED_TRIAL_LABEL } from "@/lib/pricing";
import { Slider } from "@/components/ui";

const compact = (v: number) => formatMoney(v, { style: "compact" });

/**
 * Three sliders, the freedom year, and the curve that gets there (D-27).
 * Sliders because readers play with an embed rather than fill it in; the
 * exact numbers live in the full plan one click away.
 */
export default function EmbedCalculator({ code }: { code: string | null }) {
  const [income, setIncome] = useState(5000);
  const [spending, setSpending] = useState(3000);
  const [invested, setInvested] = useState(25000);
  const input = { monthlyIncome: income, monthlySpending: spending, invested };
  const r = quickFreedom(input);
  // Every way out credits the creator; without a valid code it is plain UntilFire.
  const out = code ? `https://www.untilfire.com/r/${code}` : "https://www.untilfire.com/?source=embed";

  return (
    <main style={{ background: "var(--uf-card)", color: "var(--uf-ink)", padding: "var(--uf-s4)", minHeight: "100vh", boxSizing: "border-box", display: "grid", gap: "var(--uf-s3)", alignContent: "start" }}>
      <div aria-live="polite" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--uf-s3)" }}>
        <div>
          <div className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>Work becomes optional in</div>
          <div className="uf-t-display" style={{ color: "var(--uf-teal)", lineHeight: 1.05 }}>{r.year ?? "—"}</div>
        </div>
        <div className="uf-t-small" style={{ textAlign: "right", color: "var(--uf-ink-2)" }}>
          {r.year === null ? "Not within 65 years" : r.years === 0 ? "You're there already" : `${Math.ceil(r.years ?? 0)} years`}
          <br />target <span className="uf-t-data">{compact(r.target)}</span>
        </div>
      </div>

      <GrowthCurve points={freedomPath(input)} target={r.target} endLabel={r.year === null ? "65+ yrs" : String(r.year)} />

      <Slider label="Take-home a month" value={income} min={1000} max={30000} step={250} onChange={setIncome} format={compact} exact={false} />
      <Slider label="Spending a month" value={spending} min={500} max={20000} step={250} onChange={setSpending} format={compact} exact={false} />
      <Slider label="Invested now" value={invested} min={0} max={2000000} step={5000} onChange={setInvested} format={compact} exact={false} />

      <div>
        <a
          href={out}
          target="_blank"
          rel="noopener"
          style={{ display: "block", textAlign: "center", background: "var(--uf-green)", color: "var(--uf-card)", padding: "var(--uf-s3) var(--uf-s4)", borderRadius: 999, fontWeight: 700, textDecoration: "none" }}
        >
          See your full plan →
        </a>
        <div className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s2)", marginTop: "var(--uf-s2)", color: "var(--uf-ink-3)" }}>
          <span style={{ fontWeight: 700, color: "var(--uf-ink-2)" }}>{code ? `Pro ${REFERRED_TRIAL_LABEL}` : "Free, no sign-up"}</span>
          <span>
            <a href={out} target="_blank" rel="noopener" style={{ color: "var(--uf-ink-3)" }}>by UntilFire</a>
            {" · "}
            <abbr title="Estimate, not advice: 25× yearly spending, grown at the long-run US stock return after inflation." style={{ textDecoration: "none", cursor: "help" }}>estimate</abbr>
          </span>
        </div>
      </div>
    </main>
  );
}

/**
 * Invested money year by year, rising to the dashed target line. A fixed
 * height, stretched to any width, so a wide blog column can't push the
 * button out of the 520px frame; labels and the end dot sit outside the
 * stretched drawing so they never distort.
 */
function GrowthCurve({ points, target, endLabel }: { points: number[]; target: number; endLabel: string }) {
  const W = 100, H = 80;
  const max = Math.max(target, points[points.length - 1], 1) * 1.08;
  const x = (i: number) => (points.length > 1 ? i / (points.length - 1) : 1) * W;
  const y = (v: number) => H - (v / max) * H;
  const line = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const last = points.length - 1;
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: "relative", height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Invested money growing from ${compact(points[0])} to the ${compact(target)} target by ${endLabel}`} style={{ width: "100%", height: H, display: "block", overflow: "visible" }}>
          <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--uf-ink-3)" strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="var(--uf-teal-soft)" />
          <path d={line} fill="none" stroke="var(--uf-teal)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span aria-hidden style={{ position: "absolute", right: -4, top: y(points[last]) - 4, width: 9, height: 9, borderRadius: 99, background: "var(--uf-teal)" }} />
      </div>
      <figcaption className="uf-t-data" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--uf-ink-3)", marginTop: 4 }}>
        <span>{new Date().getFullYear()}</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  );
}
