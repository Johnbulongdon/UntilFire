"use client";

import PercentileTrack from "@/app/components/PercentileTrack";
import { compareNetWorth } from "@/lib/net-worth-compare";
import { NET_WORTH_BENCHMARKS } from "@/lib/net-worth-benchmarks";

/**
 * Home: net worth against US households of the same age.
 *
 * The same comparison the free result shows, from the account's real
 * numbers: the net worth figure Home already shows, and the age set in
 * Plan → Freedom Date. Home only interprets; the age is changed in Plan.
 */
export default function CompareCard({ netWorthUsd, age, currency, onOpenAssumptions }: {
  netWorthUsd: number;
  /** Age from the plan's assumptions; 0 when not set. */
  age: number;
  currency: string;
  onOpenAssumptions?: () => void;
}) {
  const eyebrow = (
    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--uf-text-2)", fontFamily: "Manrope, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
      How you compare
    </div>
  );
  const comparison = compareNetWorth(
    { netWorthUsd, age: age > 0 ? age : null, ageAssumed: !(age > 0), currency },
    NET_WORTH_BENCHMARKS,
  );

  // In US dollars, no comparison means no data table yet: show nothing
  // rather than the wrong reason.
  if (!comparison && currency === "USD") return null;
  if (!comparison) {
    return (
      <div className="uf-card">
        {eyebrow}
        <p style={{ margin: 0, fontSize: 14, color: "var(--uf-ink-2)", lineHeight: 1.55 }}>
          This compares your net worth with US households, so it shows when your currency is US dollars.
          Other countries aren&apos;t covered yet.
        </p>
      </div>
    );
  }

  const who = `US households ${comparison.bandLabel}`;
  const headline = comparison.aboveTop
    ? <>Your net worth is ahead of <span style={{ color: "var(--uf-teal)" }}>more than 99%</span> of {who}</>
    : comparison.aheadOfPct >= 1
      ? <>Your net worth is ahead of <span style={{ color: "var(--uf-teal)" }}>{comparison.aheadOfPct}%</span> of {who}</>
      : <>Your net worth is at the start line for {who}</>;

  return (
    <div className="uf-card">
      {eyebrow}
      <div className="uf-t-h3" style={{ margin: "0 0 12px", lineHeight: 1.3 }}>{headline}</div>
      <PercentileTrack
        position={comparison.aboveTop ? 99.5 : comparison.aheadOfPct}
        label={comparison.aboveTop ? `Ahead of more than 99% of ${who}` : `Ahead of ${comparison.aheadOfPct}% of ${who}`}
        width="100%"
      />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "4px 12px", marginTop: 10, fontSize: 12, color: "var(--uf-ink-2)", lineHeight: 1.5 }}>
        <span>
          {comparison.allAges ? "Add your age in your plan to compare with people your age." : `Using age ${age} from your plan.`}
          {onOpenAssumptions && (
            <>
              {" "}
              <button
                type="button"
                onClick={onOpenAssumptions}
                style={{ background: "none", border: "none", padding: 0, color: "var(--uf-ink)", font: "inherit", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
              >
                {comparison.allAges ? "Add age" : "Change"}
              </button>
            </>
          )}
        </span>
        <span>Federal Reserve Survey of Consumer Finances, {comparison.surveyYear}</span>
      </div>
    </div>
  );
}
