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
import { Button, Card, InfoTip, Money } from "@/components/ui";
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

/* The same two stores the Contributions page reads, resolved the same way:
   whichever copy was written later wins. Home only reads — it never writes
   back, so a stale account copy is corrected the next time the page itself
   is opened rather than from here. Home's safety runway reads it too. */
export function useContributionPlan(): StoredPlan | null {
  const [plan, setPlan] = useState<StoredPlan | null>(null);
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
  return plan;
}

export default function NextContributionCard({ facts, onOpenPlan }: NextContributionCardProps) {
  const plan = useContributionPlan();

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
            Fix a wrong or paid payment in your plan to change this.
          </p>
          <div>
            <Button variant="secondary" size="sm" onClick={onOpenPlan}>See how it&apos;s worked out</Button>
          </div>
        </div>
      </Card>
    );
  }
  if (!view.next) return null;

  /* The month as a bar, not a paragraph (D-39): one segment per step, sized by
     its amount, the first one solid because it is where to start. It shows the
     split, not completion; nothing records a contribution as made yet, and a
     bar that never filled would be worse than none. */
  const source = view.budgetIsCustom
    ? "An amount you set."
    : view.available.hasExpectedData
      ? `The lowest your balance gets before ${nextCycleLabel}, after your expected payments in and out. Every line is in your plan.`
      : `${fmtUsd(view.available.cash)} in cash outside your emergency fund. No expected payments are recorded, so nothing is subtracted.`;
  const shown = steps.length > 0 ? steps : [{ kind: view.next.kind, label: view.next.label, amount: view.next.amount }];

  return (
    <Card style={{ display: "grid", gap: 12 }}>
      <div className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)", color: "var(--uf-ink-3)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          This month&apos;s contribution
          <InfoTip label="Where this amount comes from">{source}</InfoTip>
        </span>
        <span style={mono}>{countdownLabel(view.available.daysUntil)}</span>
      </div>

      <span style={{ ...mono, fontSize: 28, fontWeight: 600 }}><Money amount={shown.length > 1 ? total : view.next.amount} /></span>

      <div role="img" aria-label={shown.map((f, i) => `${i + 1}. ${f.label} ${fmtUsd(f.amount)}`).join(", ")} style={{ display: "flex", gap: 3 }}>
        {shown.map((f, i) => (
          <i key={f.kind} style={{ flex: `${Math.max(f.amount, 1)} 1 0`, height: 8, borderRadius: 4,
            background: "var(--uf-teal)", opacity: i === 0 ? 1 : 0.35 }} />
        ))}
      </div>

      <ol className="uf-t-small" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
        {shown.map((f, i) => (
          <li key={f.kind} style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)", color: i === 0 ? "var(--uf-ink)" : "var(--uf-ink-2)", fontWeight: i === 0 ? 700 : 400 }}>
            <span style={{ minWidth: 0 }}>{i + 1}. {f.label}{i === 0 && shown.length > 1 ? " · start here" : ""}</span>
            <span style={{ ...mono, flex: "none" }}><Money amount={f.amount} /></span>
          </li>
        ))}
      </ol>

      <div>
        <Button variant="primary" size="sm" onClick={onOpenPlan}>Open your plan</Button>
      </div>
    </Card>
  );
}
