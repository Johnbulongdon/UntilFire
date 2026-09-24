"use client";

/**
 * This month's contribution, on Home.
 *
 * The contribution ladder recomputes itself every month from real spending and
 * real balances, but nothing told anyone to go and look — which made it a page
 * that happens to be current rather than a loop. This is the part that says
 * "this month, put it here", where the user already is.
 *
 * Read-only, per the Home rule in docs/design/app-structure.md: it reports the
 * plan and links to where the plan is edited. It holds no inputs of its own and
 * shares its derivation with the Contributions page (lib/contribution-ladder.ts)
 * so the two can never name different steps.
 */

import { useEffect, useState } from "react";
import { Button, Card, Money } from "@/components/ui";
import { ladderViewFromPlan, type AccountFacts } from "@/lib/contribution-ladder";
import { countdownLabel } from "@/lib/contribution-schedule";
import {
  loadCloudPlan, newerPlan, planHasContent, readLocalPlan,
} from "@/lib/contribution-store";
import type { StoredPlan } from "@/lib/contribution";

export interface NextContributionCardProps {
  facts: AccountFacts;
  /** Take the user to Plan → Contributions. */
  onOpenPlan: () => void;
}

const mono: React.CSSProperties = {
  fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums",
};
const fmtUsd = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`;

export default function NextContributionCard({ facts, onOpenPlan }: NextContributionCardProps) {
  const [plan, setPlan] = useState<StoredPlan | null>(null);

  /* The same two stores the Contributions page reads, resolved the same way:
     whichever copy was written later wins. Home only reads — it never writes
     back, so a stale account copy is corrected the next time the page itself
     is opened rather than from here. */
  useEffect(() => {
    let cancelled = false;
    const local = readLocalPlan();
    if (planHasContent(local)) setPlan(local);
    (async () => {
      const cloud = await loadCloudPlan();
      if (cancelled) return;
      const winner = newerPlan(local, cloud);
      if (planHasContent(winner)) setPlan(winner);
    })();
    return () => { cancelled = true; };
  }, []);

  /* No plan means nothing to report, and Home stays quiet rather than
     becoming a set-up prompt. But nothing safe to contribute is not the same
     as nothing to say: when the forecast shows the balance running short, a
     card that hid itself would go silent at exactly the moment it has a
     warning worth giving. */
  const view = ladderViewFromPlan(plan, facts);
  if (!view) return null;
  const f = view.available.forecast;
  const nothingSafe = !view.budgetIsCustom && view.budget <= 0;
  if (nothingSafe && !view.available.hasExpectedData) return null;
  if (!nothingSafe && !view.next) return null;
  /* Every step that takes money, including the headline one.
   *
   * Listing only the steps *below* the headline made the card misread at a
   * glance: with a £250 match ahead of £1,550 of card debt, the headline was
   * the smallest number on the card and the largest one sat in small type
   * underneath. The full list, with the amounts in one column and a total,
   * makes the month's shape readable without arithmetic. */
  const steps = view.waterfall.fills.filter((f) => f.amount > 0);
  const nextCycleLabel = (() => {
    const [y, m, d] = view.available.forecast.nextCycleIso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();
  const total = steps.reduce((sum, f) => sum + f.amount, 0);

  const dayLabel = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (nothingSafe) {
    const low = f.shortBefore && f.shortBefore.balance < f.lowest.balance ? f.shortBefore : f.lowest;
    return (
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s3)" }}>
          <span className="uf-t-label" style={{ color: "var(--uf-ink-2)" }}>
            Next contribution {countdownLabel(view.available.daysUntil)}
          </span>
          <span className="uf-t-h2" style={{ margin: 0 }}>Nothing safe to contribute this cycle</span>
          <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: 0, maxWidth: 560 }}>
            Your expected payments take your balance to{" "}
            <span style={{ ...mono, color: "var(--uf-neg-ink)" }}>{fmtUsd(low.balance)}</span> on {dayLabel(low.iso)}.
            Your plan shows every line — if a payment is wrong or already paid, fixing it there changes this.
          </p>
          <div>
            <Button variant="secondary" size="sm" onClick={onOpenPlan}>See how it&apos;s worked out</Button>
          </div>
        </div>
      </Card>
    );
  }
  if (!view.next) return null;

  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s3)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--uf-s3)", flexWrap: "wrap" }}>
          <span className="uf-t-label" style={{ color: "var(--uf-ink-2)" }}>
            Next contribution {countdownLabel(view.available.daysUntil)}
          </span>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-2)", ...mono }}>
            {view.available.nextDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--uf-s3)", flexWrap: "wrap" }}>
          <span className="uf-t-h2" style={{ margin: 0 }}>{view.next.label}</span>
          <span style={{ ...mono, fontSize: 24 }}><Money amount={view.next.amount} /></span>
        </div>

        <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: 0, maxWidth: 560 }}>
          {view.next.why}
        </p>

        {/* One step means the headline already said everything; a list and a
            total under it would state the same figure three times. */}
        {steps.length > 1 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--uf-border)" }}>
          {steps.map((f, i) => (
            <li key={f.kind}
                style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)",
                         padding: "var(--uf-s2) 0", borderBottom: "1px solid var(--uf-border)" }}>
              <span className="uf-t-small" style={{ color: i === 0 ? "var(--uf-ink)" : "var(--uf-ink-2)", minWidth: 0 }}>
                {i === 0 ? "Start here · " : ""}{f.label}
              </span>
              <span className="uf-t-small" style={{ ...mono, flex: "none", color: i === 0 ? "var(--uf-ink)" : "var(--uf-ink-2)" }}>
                <Money amount={f.amount} />
              </span>
            </li>
          ))}
          <li style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)", padding: "var(--uf-s2) 0" }}>
            <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Total</span>
            <span className="uf-t-small" style={{ ...mono }}><Money amount={total} /></span>
          </li>
        </ul>
        )}

        {/* Where the total came from. A figure that is only as good as the
            bills on record should say so rather than look certain. */}
        <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: 0 }}>
          {view.budgetIsCustom
            ? "An amount you set."
            : view.available.hasExpectedData
              ? `The lowest your balance gets before ${nextCycleLabel}, after your expected payments in and out. Every line is in your plan.`
              : `${fmtUsd(view.available.cash)} in cash outside your emergency fund. No expected payments are recorded, so nothing is subtracted.`}
        </p>

        <div>
          <Button variant="secondary" size="sm" onClick={onOpenPlan}>Open your plan</Button>
        </div>
      </div>
    </Card>
  );
}
