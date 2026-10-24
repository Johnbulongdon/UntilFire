"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import MoneyField from "@/components/ui/MoneyField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { inputStyle } from "@/components/ui/Field";
import { TEMPLATES, templateFor, newChange, summary, type ChangeContext, type ChangeKind, type LifeChangeItem } from "@/lib/life-changes";

/**
 * Compare's list of life changes (D-69): each with its own cost against your
 * plan, a switch to see the plan without it, and an editor where every number
 * is yours. Templates only start the numbers.
 */
type Money = { money: (usd: number) => string; local: (usd: number) => number; toUsd: (n: number) => number; currency: string };
const LASTING: ChangeKind[] = ["work-less", "college", "home", "side", "move", "custom"];

function Num({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return <input type="number" inputMode="numeric" aria-label={label} value={Number.isFinite(value) ? value : ""} min={min} max={max}
    onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) onChange(n); }} style={{ ...inputStyle(true), width: 96 }} />;
}

function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return <label style={{ display: "grid", gap: 4 }}>
    <span className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-ink-3)" }}>{label}</span>{children}
    {note && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{note}</span>}
  </label>;
}

function Editor({ c, set, ctx, m, coast }: { c: LifeChangeItem; set: (c: LifeChangeItem) => void; ctx: ChangeContext; m: Money; coast: boolean }) {
  const aged = ctx.currentAge > 0;
  const toShown = (year: number) => (aged ? Math.round(ctx.currentAge + year - ctx.thisYear) : year);
  const toYear = (n: number) => (aged ? Math.round(n - ctx.currentAge + ctx.thisYear) : n);
  const when = aged ? "Age" : "Year";
  const money = (label: string, key: "monthly" | "amount", note?: string) => (
    <Field label={`${label} (${m.currency})`} note={note}>
      <MoneyField label={label} style={inputStyle(true)} value={c[key] != null ? String(Math.round(m.local(Math.abs(c[key]!)))) : ""}
        onChange={(v) => set({ ...c, [key]: (key === "monthly" && c.kind === "custom" && (c.monthly ?? 0) < 0 ? -1 : 1) * m.toUsd(Number(v) || 0) })} />
    </Field>
  );
  const start = c.fromAt ?? "year";
  const end = c.toAt ?? (c.to != null ? "year" : "never");
  return (
    <div style={{ display: "grid", gap: 12, paddingTop: 12, borderTop: "1px solid var(--uf-border)" }}>
      <Field label="Name"><input type="text" value={c.name} onChange={(e) => set({ ...c, name: e.target.value })} aria-label="Name" style={inputStyle()} /></Field>
      {c.kind === "work-less" && <>
        {money("Take-home after the change, a month", "monthly", ctx.takeHomeMonthly > 0 ? `Now ${m.money(ctx.takeHomeMonthly)} · ${Math.round(((c.monthly ?? 0) / ctx.takeHomeMonthly) * 100)}%` : undefined)}
        <Field label="Pension contributions">
          <SegmentedControl size="sm" label="Pension contributions" value={c.pension ?? "same"} onChange={(v) => set({ ...c, pension: v })}
            options={[{ value: "same", label: "Same share of pay" }, { value: "stop", label: "Stop" }]} />
        </Field>
      </>}
      {c.kind === "break" && <Field label="Months off"><Num label="Months off" value={c.count ?? 12} min={1} max={120} onChange={(n) => set({ ...c, count: Math.max(1, n) })} /></Field>}
      {c.kind === "college" && <>{money("A year, per child", "amount")}
        <Field label="Children"><Num label="Children" value={c.count ?? 1} min={1} max={8} onChange={(n) => set({ ...c, count: Math.max(1, n) })} /></Field></>}
      {c.kind === "home" && <>{money("Down payment", "amount", "Paid once. The home's value isn't counted, so this leans cautious.")}{money("Costs more a month", "monthly")}</>}
      {c.kind === "side" && money("Side income a month", "monthly")}
      {(c.kind === "cost" || c.kind === "windfall") && money(c.kind === "cost" ? "Cost" : "Amount", "amount")}
      {c.kind === "move" && money("Spending there a month", "monthly", `Now ${m.money(ctx.spendMonthly)}`)}
      {c.kind === "custom" && <>
        <Field label="Each month">
          <SegmentedControl size="sm" label="In or out" value={(c.monthly ?? 0) < 0 ? "out" : "in"} onChange={(v) => set({ ...c, monthly: Math.abs(c.monthly ?? 0) * (v === "out" ? -1 : 1) })}
            options={[{ value: "in", label: "Money in" }, { value: "out", label: "Money out" }]} />
        </Field>
        {money("Amount a month", "monthly")}
      </>}

      <Field label={LASTING.includes(c.kind) ? "Starts" : "When"}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <SegmentedControl size="sm" label="Starts" value={start} onChange={(v) => set({ ...c, fromAt: v === "year" ? undefined : v })}
            options={[{ value: "year", label: aged ? "At an age" : "In a year" }, ...(coast ? [{ value: "coast" as const, label: "When I reach Coast" }] : []), { value: "free" as const, label: "When I'm free" }]} />
          {start === "year" && <Num label={`Starts, ${when.toLowerCase()}`} value={toShown(c.from)} onChange={(n) => set({ ...c, from: toYear(n) })} />}
        </div>
      </Field>
      {LASTING.includes(c.kind) && (
        <Field label="Ends" note={c.toAt === "free" ? "Moves with your plan: if freedom comes sooner, so does the end." : undefined}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <SegmentedControl size="sm" label="Ends" value={end} onChange={(v) => set({ ...c, toAt: v === "free" || v === "coast" ? v : undefined, to: v === "year" ? (c.to ?? c.from + 4) : undefined })}
              options={[{ value: "never", label: "Never" }, { value: "year", label: aged ? "At an age" : "In a year" }, { value: "free", label: "When I'm free" }]} />
            {end === "year" && <Num label={`Ends, ${when.toLowerCase()}`} value={toShown(c.to ?? c.from + 4)} onChange={(n) => set({ ...c, to: toYear(n) })} />}
          </div>
        </Field>
      )}
    </div>
  );
}

export default function WhatIfChanges({ items, onChange, costs, ctx, m, coast }: {
  items: LifeChangeItem[];
  onChange: (items: LifeChangeItem[]) => void;
  /** Years each change costs against the plan without it; null when it can't be said (no date either way). */
  costs: Record<string, number | null>;
  ctx: ChangeContext;
  m: Money;
  /** Coast needs an age. */
  coast: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const q = matchMedia("(max-width: 700px)"); const set = () => setPhone(q.matches);
    set(); q.addEventListener("change", set); return () => q.removeEventListener("change", set);
  }, []);
  const put = (c: LifeChangeItem) => onChange(items.map((x) => (x.id === c.id ? c : x)));
  const add = (kind: ChangeKind) => { const c = newChange(kind, ctx); onChange([...items, c]); setOpen(c.id); setAdding(false); };

  const grid = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
      {TEMPLATES.map((t) => (
        <button key={t.kind} type="button" onClick={() => add(t.kind)}
          style={{ display: "grid", gap: 4, justifyItems: "start", textAlign: "left", padding: 12, borderRadius: 14, border: "1px solid var(--uf-border)", background: "var(--uf-card)", color: "var(--uf-ink)", cursor: "pointer" }}>
          <span aria-hidden style={{ fontSize: 20 }}>{t.icon}</span><b style={{ fontSize: 13 }}>{t.title}</b>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{t.hint}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((c) => {
        const t = templateFor(c.kind), d = costs[c.id], isOpen = open === c.id;
        return (
          <div key={c.id} style={{ background: "var(--uf-card)", border: `1px solid ${isOpen ? "var(--uf-ink)" : "var(--uf-border)"}`, borderRadius: 16, padding: "11px 12px", opacity: c.on ? 1 : 0.62 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}
                style={{ flex: 1, minWidth: 0, display: "flex", gap: 10, alignItems: "center", background: "none", border: 0, padding: 0, textAlign: "left", color: "var(--uf-ink)", cursor: "pointer" }}>
                <span aria-hidden style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--uf-surface)", flex: "none" }}>{t.icon}</span>
                <span style={{ minWidth: 0 }}><b style={{ fontSize: 14 }}>{c.name}</b>
                  <span style={{ display: "block", fontFamily: "var(--uf-font-mono)", fontSize: 11.5, color: "var(--uf-ink-3)" }}>{summary(c, ctx, m.money)}</span></span>
              </button>
              {c.on && d != null && Math.abs(d) >= 0.05 && <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap",
                background: d > 0 ? "var(--uf-warn-bg)" : "var(--uf-teal-soft)", color: d > 0 ? "var(--uf-warn-ink)" : "var(--uf-teal-deep)" }}>{d > 0 ? "+" : "−"}{Math.abs(d).toFixed(1)} yrs</span>}
              {!c.on && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>off</span>}
              <button type="button" role="switch" aria-checked={c.on} aria-label={`Count ${c.name}`} onClick={() => put({ ...c, on: !c.on })}
                style={{ width: 36, height: 22, borderRadius: 99, border: 0, padding: 2, flex: "none", cursor: "pointer", background: c.on ? "var(--uf-teal)" : "var(--uf-border-2)", display: "flex", justifyContent: c.on ? "flex-end" : "flex-start" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--uf-card)" }} />
              </button>
            </div>
            {isOpen && <>
              <Editor c={c} set={put} ctx={ctx} m={m} coast={coast} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <Button variant="ghost" size="sm" onClick={() => { onChange(items.filter((x) => x.id !== c.id)); setOpen(null); }}>Remove</Button>
                <Button variant="primary" size="sm" onClick={() => setOpen(null)}>Done</Button>
              </div>
            </>}
          </div>
        );
      })}
      {!adding && <button type="button" onClick={() => setAdding(true)} className="uf-t-small"
        style={{ justifySelf: "start", padding: "8px 14px", borderRadius: 99, border: "1.5px dashed var(--uf-border-2)", background: "transparent", color: "var(--uf-ink)", fontWeight: 700, cursor: "pointer" }}>+ Add a change</button>}
      {adding && !phone && <div style={{ display: "grid", gap: 8 }}>{grid}<Button variant="ghost" size="sm" onClick={() => setAdding(false)} style={{ justifySelf: "start" }}>Cancel</Button></div>}
      {adding && phone && (
        <div role="dialog" aria-modal aria-label="Add a change" onClick={() => setAdding(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "#00000059", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "var(--uf-bg)", borderRadius: "22px 22px 0 0", padding: "14px 16px 24px", display: "grid", gap: 12 }}>
            <span aria-hidden style={{ justifySelf: "center", width: 40, height: 4, borderRadius: 9, background: "var(--uf-border-2)" }} />
            <h3 className="uf-t-h3" style={{ margin: 0 }}>Add a change</h3>{grid}
          </div>
        </div>
      )}
      {items.filter((c) => c.on).length > 1 && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Changes interact, so their costs don&apos;t add up exactly to the total.</span>}
    </div>
  );
}
