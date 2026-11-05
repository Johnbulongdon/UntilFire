"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { freedomAgeAt } from "@/lib/plan-settings";
import { rentAfterRenewal } from "@/lib/lease";
import { coastYear, resolveAndRun, toEngine, templateFor, type ChangeContext, type EngineChange, type LifeChangeItem, type LifeVersion } from "@/lib/life-changes";
import WhatIfChanges from "./WhatIfChanges";
import WhatIfChart, { type ChartMilestone } from "./WhatIfChart";
import { moneyMono } from "./MoneyCards";

/**
 * Plan → Compare (D-69): try changes on top of your plan. Your plan stays as
 * it is until you keep them; the chart shows it dashed under the changed one,
 * each change shows what it costs, and changes can follow your milestones.
 */
export type Full = { cashGrowthRate?: number; exactDate: Date | null; fireYear: number | null; fireTarget: number; data: Record<string, number>[];
  flows: { year: number; saved: number; withdrawn: number }[]; broke: { year: number; short: number } | null; withdrawn: number };
type Money = { money: (usd: number) => string; local: (usd: number) => number; toUsd: (n: number) => number; currency: string };

const YEAR_MS = 365.25 * 864e5;
const yearsTo = (d: Date | null) => (d ? (d.getTime() - Date.now()) / YEAR_MS : null);

/** The lease on the Rent bill, when there is one: its last day, the rent in USD and the expected rise. */
export type WhatIfLease = { endsOn: string; rentUsd: number; risePct: number | null };

/**
 * Renew or move at the lease's end, as the phone's What if offers them: new
 * spending from that year, one at a time since both set it. A try only; the
 * headline freedom date stays on real spending (lib/lease.ts).
 */
function leaseTries(lease: WhatIfLease, ctx: ChangeContext, money: (usd: number) => string): LifeChangeItem[] {
  const from = Math.max(ctx.thisYear, +lease.endsOn.slice(0, 4));
  const rise = rentAfterRenewal(lease.rentUsd, lease.risePct) - lease.rentUsd;
  const cut = Math.round((lease.rentUsd * 0.15) / 10) * 10;
  return [
    ...(rise > 0 ? [{ id: "lease-renew", kind: "move" as const, name: `Renew at +${lease.risePct}%`, on: true, from, monthly: ctx.spendMonthly + rise }] : []),
    ...(cut > 0 ? [{ id: "lease-move", kind: "move" as const, name: `Move, ${money(cut)} less rent`, on: true, from, monthly: Math.max(0, ctx.spendMonthly - cut) }] : []),
  ];
}

/** Something the plan is missing, asked for instead of guessing (John, 5 Nov 2026: never generic advice). */
/** A change built from the person's own months, offered as one tap (John, 5 Nov 2026). */
export interface WhatIfIdea { item: LifeChangeItem; icon: string; why: string }

export interface WhatIfNeed { key: string; title: string; why: string; button: string; onClick: () => void }

export default function WhatIf({ run, ctx, growth, retireAge, lease, m, saved, onSave, onDelete, onUse, onTrack, needs = [], pensionWord = "pension", ideas = [] }: {
  /** Changes from the person's own data: wants spending, extra paydays. */
  ideas?: WhatIfIdea[];
  /** What retirement money is called where you live: "retirement accounts" in the US, "pension" elsewhere. */
  pensionWord?: string;
  run: (changes: EngineChange[]) => Full;
  lease?: WhatIfLease | null;
  ctx: ChangeContext; growth: number; retireAge: number; m: Money;
  saved: LifeVersion[];
  onSave: (v: LifeVersion) => void;
  onDelete: (id: string) => void;
  /** Make these changes your plan (W4); without it the button is hidden. */
  onUse?: (items: LifeChangeItem[]) => void;
  onTrack: (action: "added" | "saved" | "used" | "discarded") => void;
  /** Missing data to ask for first: income, or months of real spending. */
  needs?: WhatIfNeed[];
}) {
  const [items, setItems] = useState<LifeChangeItem[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [years, setYears] = useState(false);
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const q = matchMedia("(max-width: 1000px)"); const set = () => setWide(!q.matches);
    set(); q.addEventListener("change", set); return () => q.removeEventListener("change", set);
  }, []);
  const aged = ctx.currentAge > 0;
  const label = (y: number) => (aged ? freedomAgeAt(ctx.currentAge, y) : ctx.thisYear + Math.round(y));

  // One run per distinct set of changes, until the plan itself changes.
  const cache = useMemo(() => ({ run, map: new Map<string, Full>() }), [run]);
  const full = useCallback((ch: EngineChange[]) => {
    const k = JSON.stringify(ch); let r = cache.map.get(k);
    if (!r) { r = cache.run(ch); cache.map.set(k, r); }
    return r;
  }, [cache]);
  const rctx = useMemo(() => ({ ...ctx, growth, retireAge }), [ctx, growth, retireAge]);
  const lite = useCallback((ch: EngineChange[]) => { const r = full(ch); return { fireYear: r.fireYear, invested: r.data.map((d) => d["Investable"] ?? 0), target: r.fireTarget, cash: r.data.map(d => d["Cash"] ?? 0), cashGrowthRate: r.cashGrowthRate }; }, [full]);
  const solve = useCallback((list: LifeChangeItem[]) => {
    const s = resolveAndRun(list, rctx, lite);
    return { items: s.items, out: full(s.items.flatMap((c) => toEngine(c, ctx))) };
  }, [rctx, lite, full, ctx]);

  const base = full([]);
  const next = useMemo(() => solve(items), [solve, items]);
  // Each change's cost: the changed plan against the same plan without it.
  const costs = useMemo(() => Object.fromEntries(items.filter((c) => c.on).map((c) => {
    const without = solve(items.map((x) => (x.id === c.id ? { ...x, on: false } : x))).out;
    const a = yearsTo(next.out.exactDate), b = yearsTo(without.exactDate);
    return [c.id, a !== null && b !== null ? a - b : null];
  })), [items, solve, next]);

  // Each idea alone against the plan, most helpful first; ones that change nothing are left out.
  const tries = useMemo(() => {
    const leaseIdeas = lease ? leaseTries(lease, ctx, m.money).map((item) => ({ item, icon: "🏠",
      why: `Your lease ends ${new Date(`${lease.endsOn}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` })) : [];
    const b = yearsTo(base.exactDate);
    return [...ideas, ...leaseIdeas].map((i) => {
      const a = yearsTo(solve([i.item]).out.exactDate);
      return { ...i, effect: a !== null && b !== null ? a - b : null };
    }).filter((i) => i.effect !== null && Math.abs(i.effect) >= 0.05).sort((x, y) => (x.effect ?? 0) - (y.effect ?? 0));
  }, [ideas, lease, ctx, m.money, base, solve]);

  const by = yearsTo(base.exactDate), ny = yearsTo(next.out.exactDate);
  const delta = by !== null && ny !== null ? ny - by : null;
  const pension = aged ? retireAge - ctx.currentAge : null;
  const inv = (r: Full) => r.data.map((d) => d["Investable"] ?? 0);
  const coastBase = coastYear(inv(base), base.fireTarget, growth, ctx.currentAge, retireAge, base.data.map(d => d["Cash"] ?? 0), base.cashGrowthRate);
  const coastNext = coastYear(inv(next.out), next.out.fireTarget, growth, ctx.currentAge, retireAge, next.out.data.map(d => d["Cash"] ?? 0), next.out.cashGrowthRate);
  const drawn = next.out.flows.filter((f) => f.withdrawn > 0).map((f) => f.year);
  const low = drawn.length ? drawn.reduce((a, y) => ((next.out.data[y]?.["Reachable"] ?? 0) < (next.out.data[a]?.["Reachable"] ?? 0) ? y : a), drawn[0]) : null;
  const changed = items.some((c) => c.on);

  // Coast: the point where what you have grows to enough on its own, so saving can stop.
  const stopSaving = aged ? "Can stop saving at" : "Can stop saving in";
  const opens = pensionWord.endsWith("s") ? "open" : "opens";
  const milestones: ChartMilestone[] = [
    ...(coastNext !== null ? [{ key: "coast", icon: "🧭", label: coastBase !== coastNext && coastBase !== null ? `${stopSaving} ${label(coastBase)}→${label(coastNext)}` : `${stopSaving} ${label(coastNext)}`, at: coastNext, moved: changed && coastBase !== coastNext }] : []),
    ...(by !== null && changed && delta !== null && Math.abs(delta) >= 0.05 ? [{ key: "plan", icon: "🔥", label: `Your plan ${label(by)}`, at: by, moved: false }] : []),
    ...(ny !== null ? [{ key: "free", icon: "🔥", label: `Free ${label(ny)}`, at: ny, moved: changed && delta !== null && Math.abs(delta) >= 0.05 }] : []),
    ...(pension !== null && pension > 0 ? [{ key: "pension", icon: "🏛️", label: `${pensionWord[0].toUpperCase()}${pensionWord.slice(1)} ${label(pension)}`, at: pension, moved: false }] : []),
  ];
  const spans = next.items.filter((c) => c.on).map((c) => ({ key: c.id, icon: templateFor(c.kind).icon, label: c.name,
    from: Math.max(0, c.from - ctx.thisYear),
    // A one-off is a thin band in its year; something lasting is a band to its end, or a line from its start.
    to: c.to != null ? c.to - ctx.thisYear : c.kind === "cost" || c.kind === "windfall" ? c.from - ctx.thisYear + 0.4 : null }));

  const status = next.out.broke ? `Runs out of money you can reach at ${label(next.out.broke.year)}.`
    : ny === null ? "Not free within the plan's years."
    : pension !== null && ny > pension ? `Free after your ${pensionWord} ${opens}.` : `✓ Never runs out before your ${pensionWord} ${opens}.`;
  const name = (list: LifeChangeItem[]) => list.filter((c) => c.on).map((c) => c.name).join(" + ") || "No changes";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div><h2 className="uf-t-h2" style={{ margin: 0 }}>What if…</h2>
          <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "4px 0 0" }}>Try changes in your own numbers and see what they do to your freedom date.</p></div>
        {saved.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Saved:</span>
          {saved.map((v) => <span key={v.id} style={{ display: "inline-flex", alignItems: "center", borderRadius: 99, border: `1px solid ${loaded === v.id ? "var(--uf-ink)" : "var(--uf-border)"}`, background: "var(--uf-card)" }}>
            <button type="button" onClick={() => { setItems(v.changes); setLoaded(v.id); }} className="uf-t-small" style={{ background: "none", border: 0, padding: "6px 4px 6px 12px", fontWeight: 700, color: "var(--uf-ink)", cursor: "pointer" }}>{v.name}</button>
            <button type="button" aria-label={`Delete ${v.name}`} onClick={() => onDelete(v.id)} style={{ background: "none", border: 0, padding: "6px 10px 6px 4px", color: "var(--uf-ink-3)", cursor: "pointer" }}>×</button>
          </span>)}
        </div>}
      </div>
      {changed && <div className="uf-t-small" style={{ padding: "10px 14px", borderRadius: 14, background: "var(--uf-surface)", color: "var(--uf-ink-2)" }}>
        ✏️ <b style={{ color: "var(--uf-ink)" }}>Trying out changes.</b> Your plan stays as it is until you keep them.</div>}

      <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          <section aria-label="Result" style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 18, padding: 18, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <div>
                <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{changed ? "With these changes" : "Your plan"}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ font: "600 clamp(34px, 6vw, 46px)/1.05 var(--uf-font-display)", color: "var(--uf-teal-deep)" }}>{ny !== null ? `Free at ${label(ny)}` : "Not free yet"}</span>
                  {changed && delta !== null && Math.abs(delta) >= 0.05 && <span style={{ padding: "3px 10px", borderRadius: 99, fontWeight: 800, fontSize: 13, background: delta > 0 ? "var(--uf-warn-bg)" : "var(--uf-teal-soft)", color: delta > 0 ? "var(--uf-warn-ink)" : "var(--uf-teal-deep)" }}>{delta > 0 ? "+" : "−"}{Math.abs(delta).toFixed(1)} yrs</span>}
                </div>
                <p className="uf-t-small" style={{ margin: "4px 0 0", color: "var(--uf-ink-2)" }}>
                  {changed && by !== null && <>Your plan: <span style={moneyMono}>{label(by)} · {base.exactDate!.getFullYear()}</span>. </>}{status}</p>
              </div>
              {changed && next.out.withdrawn > 0 && <div style={{ display: "flex", gap: 16 }}>
                <div><span className="uf-t-small" style={{ color: "var(--uf-ink-3)", display: "block" }}>From savings</span><b style={{ ...moneyMono, fontSize: 17 }}>{m.money(next.out.withdrawn)}</b></div>
                {low !== null && <div><span className="uf-t-small" style={{ color: "var(--uf-ink-3)", display: "block" }}>Lowest within reach</span><b style={{ ...moneyMono, fontSize: 17 }}>{m.money(next.out.data[low]?.["Reachable"] ?? 0)} at {label(low)}</b></div>}
              </div>}
            </div>
            <WhatIfChart base={inv(base)} next={inv(next.out)} target={next.out.fireTarget} milestones={milestones} spans={spans} ageAt={(y) => label(y)} width={wide ? 560 : 380} height={wide ? 250 : 220} />
            <div className="uf-t-small" style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--uf-ink-3)" }}>
              <span>┅ Your plan</span><span style={{ color: "var(--uf-teal-deep)" }}>━ With changes</span><span>Lit milestones moved</span>
            </div>
          </section>
          <section aria-label="Year by year" style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 18, padding: "12px 16px" }}>
            <button type="button" aria-expanded={years} onClick={() => setYears((v) => !v)} className="uf-t-small" style={{ background: "none", border: 0, padding: 0, fontWeight: 800, color: "var(--uf-ink)", cursor: "pointer" }}>{years ? "▾" : "▸"} Year by year</button>
            {years && <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 8, display: "grid", gridTemplateColumns: "auto repeat(4, minmax(0, 1fr))", gap: "6px 12px", fontSize: 12.5 }}>
              {[aged ? "Age" : "Year", "Saved", "Taken out", "Invested", "vs your plan"].map((h) => <b key={h} style={{ color: "var(--uf-ink-3)", textAlign: h === "Age" || h === "Year" ? "left" : "right" }}>{h}</b>)}
              {next.out.flows.slice(0, Math.min(next.out.flows.length, Math.ceil(Math.max(ny ?? 0, by ?? 0, pension ?? 0)) + 2)).map((f) => {
                const d = (next.out.data[f.year]?.["Investable"] ?? 0) - (base.data[f.year]?.["Investable"] ?? 0);
                return <span key={f.year} style={{ display: "contents" }}>
                  <span style={moneyMono}>{label(f.year)}</span>
                  <span style={{ ...moneyMono, textAlign: "right" }}>{f.saved > 0 ? m.money(f.saved) : "—"}</span>
                  <span style={{ ...moneyMono, textAlign: "right", color: f.withdrawn > 0 ? "var(--uf-neg-ink)" : undefined }}>{f.withdrawn > 0 ? m.money(f.withdrawn) : "—"}</span>
                  <span style={{ ...moneyMono, textAlign: "right" }}>{m.money(next.out.data[f.year]?.["Investable"] ?? 0)}</span>
                  <span style={{ ...moneyMono, textAlign: "right", color: d < -0.5 ? "var(--uf-warn-ink)" : undefined }}>{Math.abs(d) < 1 ? "—" : `${d > 0 ? "+" : "−"}${m.money(Math.abs(d))}`}</span>
                </span>;
              })}
            </div>}
          </section>
        </div>
        <section aria-label="Your changes" style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {tries.length > 0 && <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 16, background: "var(--uf-surface)" }}>
            <span><b className="uf-t-small" style={{ fontWeight: 700, display: "block", color: "var(--uf-ink)" }}>Changes that help you most</b>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>From your last months. Tap to try.</span></span>
            {tries.map((t) => {
              const added = items.some((c) => c.id === t.item.id);
              const e = t.effect ?? 0;
              return <button key={t.item.id} type="button" disabled={added} aria-pressed={added}
                onClick={() => { setItems([...items.filter((c) => c.id !== t.item.id && !(t.item.id.startsWith("lease-") && c.id.startsWith("lease-"))), t.item]); onTrack("added"); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid var(--uf-border)", background: "var(--uf-card)", color: "var(--uf-ink)", textAlign: "left", cursor: added ? "default" : "pointer", font: "inherit" }}>
                <span aria-hidden style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}><b className="uf-t-small" style={{ fontWeight: 700, display: "block" }}>{t.item.name}</b>
                  <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{t.why}</span></span>
                <span className="uf-t-small" style={{ flexShrink: 0, padding: "3px 10px", borderRadius: 99, fontWeight: 800, background: added ? "transparent" : e < 0 ? "var(--uf-teal-soft)" : "var(--uf-warn-bg)", color: added ? "var(--uf-ink-3)" : e < 0 ? "var(--uf-teal-deep)" : "var(--uf-warn-ink)" }}>
                  {added ? "✓ Added" : `${Math.abs(e).toFixed(1)} yrs ${e < 0 ? "sooner" : "later"}`}</span>
              </button>;
            })}
          </div>}
          {needs.length > 0 && <div style={{ display: "grid", gap: 10, padding: 14, borderRadius: 16, background: "var(--uf-surface)" }}>
            <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}><b style={{ color: "var(--uf-ink)" }}>Add your real numbers first.</b> What if only works from your own money.</span>
            {needs.map((n) => <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ minWidth: 0 }}><b className="uf-t-small" style={{ fontWeight: 700, display: "block", color: "var(--uf-ink)" }}>{n.title}</b>
                <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{n.why}</span></span>
              <Button size="sm" variant="secondary" onClick={n.onClick}>{n.button}</Button>
            </div>)}
          </div>}
          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>Your changes</span>
          <WhatIfChanges items={items} onChange={(list) => { if (list.length > items.length) onTrack("added"); setItems(list); }} costs={costs} ctx={ctx} m={m} coast={aged} />
        </section>
      </div>

      {items.length > 0 && <div style={{ position: "sticky", bottom: 0, zIndex: 5, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", padding: "12px 16px", background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16, boxShadow: "0 -10px 30px -22px #00000080" }}>
        <Button variant="ghost" size="sm" onClick={() => { setItems([]); setLoaded(null); onTrack("discarded"); }}>Discard</Button>
        <Button variant="secondary" size="sm" onClick={() => { const v = { id: loaded ?? `v${Date.now().toString(36)}`, name: name(items), changes: items, savedAt: Date.now() }; onSave(v); setLoaded(v.id); onTrack("saved"); }}>{loaded ? "Update saved" : "Save as a what-if"}</Button>
        {onUse && <Button variant="primary" size="sm" onClick={() => { onUse(items); onTrack("used"); }}>Use as my plan…</Button>}
      </div>}
    </div>
  );
}
