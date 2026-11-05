"use client";

import { Button } from "@/components/ui";

export type MoneyCheckFacts = { idle: number; cards: number; cardsCarried: number; retirement: boolean; linked: boolean };

/**
 * Accounts & tools, first (John, 5 Nov 2026): "Is your money in the right
 * place?" One thing found in your own accounts, the checks that came back
 * fine, and the full list behind "See all". Nothing generic: with no linked
 * accounts it asks for them instead. 4% is a round savings rate for the
 * example, not a quote from any provider.
 */
export default function MoneyCheck({ facts, money, retirementWord, onCompareSavings, onLinkBank, onSeeAll }: {
  facts: MoneyCheckFacts; money: (usd: number) => string; retirementWord: string;
  onCompareSavings: () => void; onLinkBank?: () => void; onSeeAll?: () => void;
}) {
  const fine = [
    ...(facts.cards > 0 && facts.cardsCarried === 0 ? [{ icon: "💳", text: "Cards paid in full" }] : []),
    ...(facts.retirement ? [{ icon: "🏛️", text: `${retirementWord} in use` }] : []),
    ...(facts.linked && facts.idle < 1000 ? [{ icon: "🏦", text: "No big cash pile sitting idle" }] : []),
  ];
  const card = { borderRadius: 18, padding: 16, display: "grid", gap: 8 } as const;
  return <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
    <b className="uf-t-h3" style={{ color: "var(--uf-ink)" }}>Is your money in the right place?</b>
    {!facts.linked ? <section style={{ ...card, background: "var(--uf-surface)" }}>
      <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Link your bank and we&apos;ll check where your money sits.</span>
      {onLinkBank && <span><Button size="sm" onClick={onLinkBank}>Link bank</Button></span>}
    </section> : facts.idle >= 1000 && <section aria-label="Found in your accounts" style={{ ...card, background: "var(--uf-yellow)", color: "#151719" }}>
      <span className="uf-t-small" style={{ color: "#5C5130", fontWeight: 700 }}>💡 Found in your accounts</span>
      <span style={{ font: "800 clamp(20px, 4vw, 26px)/1.15 var(--uf-font-display)" }}>{money(facts.idle)} earns almost nothing</span>
      <span className="uf-t-small" style={{ color: "#5C5130" }}>That&apos;s cash above one month of spending. At 4% a year it would earn about {money(facts.idle * 0.04)} a year.</span>
      <span><Button size="sm" onClick={onCompareSavings}>Compare savings accounts</Button></span>
    </section>}
    {fine.length > 0 && <section aria-label="Checked, all fine" style={{ ...card, background: "var(--uf-card)", border: "1px solid var(--uf-border)" }}>
      <b className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-ink)" }}>Checked, all fine</b>
      {fine.map((f) => <span key={f.text} className="uf-t-small" style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--uf-ink-2)" }}>
        <span aria-hidden>{f.icon}</span><span style={{ flex: 1 }}>{f.text}</span><b style={{ color: "var(--uf-pos-ink)" }}>✓</b></span>)}
    </section>}
    {onSeeAll && <span><Button size="sm" variant="secondary" onClick={onSeeAll}>See all accounts and tools</Button></span>}
    <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Some links pay UntilFire a referral fee. It never changes what we show you.</span>
  </div>;
}
