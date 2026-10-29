"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import type { StarterBudget } from "@/lib/starter-budget";

type Cat = { key: string; label: string };

const mono: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * The 50/30/20 starter (D-116): shown on Budget while no category has a
 * budget. Only a suggestion until "Use this" or a changed number; then the
 * limits are saved like any budget. No spending yet: the three totals only.
 */
export default function StarterBudgetCard({ takeHome, starter, cats, fmt, amountInput, onUse, onOwn }: {
  /** Monthly take-home pay, USD. */
  takeHome: number;
  starter: StarterBudget;
  cats: Cat[];
  fmt: (usd: number) => string;
  /** The page's amount box (USD in, USD out, shown in the display currency). */
  amountInput: (value: number, onChange: (usd: number) => void, label: string) => React.ReactNode;
  onUse: (limits: Record<string, number>) => void;
  onOwn: () => void;
}) {
  const [edits, setEdits] = useState<Record<string, number>>({});
  const labelOf = (k: string) => cats.find((c) => c.key === k)?.label ?? k;
  const limitOf = (k: string, base: number) => edits[k] ?? base;
  const rows = starter.limits.map((l) => ({ ...l, limit: limitOf(l.key, l.limit) }));
  // Totals follow edits: a category's need part stays a need, anything else is a want.
  const needs = rows.reduce((s, r) => s + Math.min(r.limit, Math.round(r.need)), 0);
  const total = rows.reduce((s, r) => s + r.limit, 0);
  const shown = starter.hasData ? { needs, wants: total - needs, saving: takeHome - total } : starter;
  const groups = [
    { name: "Needs", value: shown.needs, bg: "var(--uf-mint)", goal: 50,
      note: starter.hasData ? (shown.needs > takeHome / 2 ? "over 50%, kept as is" : "fits") : "Rent, bills, groceries, getting to work" },
    { name: "Wants", value: shown.wants, bg: "var(--uf-lilac)", goal: 30,
      note: starter.hasData ? (starter.wantsUsual > shown.wants ? `you usually spend ${fmt(starter.wantsUsual)}` : "fits") : "Eating out, shopping, fun" },
    { name: "Saving", value: Math.max(0, shown.saving), bg: "var(--uf-blue)", goal: 20, note: "goes to your Contributions plan" },
  ];
  const side = (need: boolean) => rows.filter((r) => (r.need >= r.want) === need).sort((a, b) => b.usual - a.usual);
  const use = () => onUse(Object.fromEntries(rows.map((r) => [r.key, r.limit])));

  const list = (title: string, items: typeof rows, foot?: React.ReactNode) => items.length > 0 && (
    <div style={{ flex: "1 1 280px", minWidth: 0, border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-card)", padding: 20, display: "grid", gap: 4, alignContent: "start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8 }}>
        <span className="uf-t-label" style={{ color: "var(--uf-ink-2)" }}>{title}</span>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>usual → limit</span>
      </div>
      {items.map((r) => (
        <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--uf-border)" }}>
          <span style={{ flex: 1, minWidth: 0, display: "grid" }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{labelOf(r.key)}</span>
            <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{r.bill ? "Bill · from Calendar" : r.need > 0 && r.want > 0 ? "Need and want" : "Day-to-day"}</span>
          </span>
          <span className="uf-t-small" style={{ ...mono, color: "var(--uf-ink-2)" }}>{fmt(r.usual)}</span>
          <span style={{ width: 120 }}>
            {r.bill
              ? <span style={{ ...mono, display: "block", textAlign: "right", fontWeight: 700 }}>{fmt(r.limit)}</span>
              : amountInput(r.limit, (v) => setEdits((e) => ({ ...e, [r.key]: Math.max(0, v) })), `${labelOf(r.key)} monthly limit`)}
          </span>
        </div>
      ))}
      {foot}
    </div>
  );

  return (
    <Card style={{ padding: "clamp(18px, 4vw, 28px)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ display: "grid", gap: 6, maxWidth: 560 }}>
          <Badge tone="freedom" style={{ justifySelf: "start" }}>{starter.hasData ? "Suggestion" : "Guide"}</Badge>
          <h2 className="uf-t-h2" style={{ margin: 0 }}>{starter.hasData ? "A starting budget for you" : `A simple way to split ${fmt(takeHome)}`}</h2>
          <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
            {starter.hasData
              ? <>Based on your <strong style={{ color: "var(--uf-ink)" }}>{fmt(takeHome)}</strong> monthly take-home pay and what you usually spend. No limit is higher than what you spend now.</>
              : <>Half for needs, under a third for wants, the rest for your future. Once a month of spending comes in, this turns into a limit for each category.</>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {starter.hasData ? (
            <>
              <Button variant="secondary" onClick={onOwn}>Set my own</Button>
              <Button variant="primary" onClick={use}>Use this</Button>
            </>
          ) : <Button variant="primary" onClick={onOwn}>Set my own</Button>}
        </div>
      </div>

      <div role="img" aria-label={groups.map((g) => `${g.name} ${pct(g.value, takeHome)} percent`).join(", ")}
        style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", gap: 3 }}>
        {groups.map((g) => <div key={g.name} style={{ flex: Math.max(1, g.value), background: g.bg, border: "1px solid var(--uf-border)", borderRadius: 999 }} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
        {groups.map((g) => (
          <div key={g.name} style={{ background: g.bg, borderRadius: "var(--uf-r-card)", padding: 20, display: "grid", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</span>
            <span style={{ ...mono, fontSize: 30, fontWeight: 800 }}>{fmt(g.value)}</span>
            <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{pct(g.value, takeHome)}% · goal {g.goal}% · {g.note}</span>
          </div>
        ))}
      </div>

      {starter.hasData && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {list("NEEDS", side(true))}
          {list("WANTS", side(false), starter.trim > 0.005 && (
            <p className="uf-t-small" style={{ margin: "8px 0 0", color: "var(--uf-ink-2)" }}>
              Each want that isn&apos;t a bill is trimmed by the same share (about {Math.round(starter.trim * 100)}%), so wants fit.
            </p>
          ))}
        </div>
      )}

      <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
        {starter.hasData
          ? "Bills come from Calendar and stay as they are. Until you tap Use this, nothing is saved and your freedom date doesn't move."
          : "This is only a guide. It isn't saved and doesn't change your freedom date."}
      </p>
    </Card>
  );
}
