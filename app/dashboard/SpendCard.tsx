"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, InfoTip } from "@/components/ui";
import { trackTxViewChanged } from "@/lib/analytics";
import { type DateRange, monthOf, netAmount, type RangeTx, usualForRange, usualToDay } from "@/lib/spend-range";
import { BarsView, CalendarView, calendarAllowed, type Daily, LineView } from "./SpendCharts";

type Tx = RangeTx & { id: string };
export type CatDisplay = { key: string; label: string; emoji: string; color: string };
type View = "line" | "bars" | "cal";
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const BILLS = new Set(["housing", "utilities", "subscriptions"]);
const read = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const ICONS: Record<View, string> = { line: "M3 17l5-5 4 3 8-9", bars: "M5 20V10M12 20V4M19 20v-7", cal: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" };

/**
 * The summary above the transaction list (D-31): what went out (or came in)
 * over the chosen range, drawn three ways, and the categories that moved
 * against usual. Explanations sit in InfoTips; the card itself is numbers,
 * marks and labels.
 */
export default function SpendCard({ transactions, range, today, toUSD, fmt, expenseCats, incomeCats, selectedCategory, onSelectCategory, selectedDay, onSelectDay, onZoomMonth, palette, onColor }: {
  transactions: Tx[]; range: DateRange; today: string;
  toUSD: (amount: number, currency: string) => number; fmt: (usd: number) => string;
  expenseCats: CatDisplay[]; incomeCats: CatDisplay[];
  selectedCategory: string | null; onSelectCategory: (k: string | null) => void;
  selectedDay: string | null; onSelectDay: (d: string | null) => void; onZoomMonth: (m: string) => void;
  palette: string[]; onColor: (key: string, color: string) => void;
}) {
  const [picking, setPicking] = useState<string | null>(null);
  const [mode, setMode] = useState<"spent" | "earned">("spent");
  const [view, setView] = useState<View>("line");
  const [hideBills, setHideBills] = useState(false);
  const [phone, setPhone] = useState(false);
  useEffect(() => { setView(read("uf.tx.view", "line") as View); }, []);
  useEffect(() => {
    const q = matchMedia("(max-width: 600px)"); const set = () => setPhone(q.matches);
    set(); q.addEventListener("change", set); return () => q.removeEventListener("change", set);
  }, []);
  const calOk = calendarAllowed(range.months.length, phone);
  const shown: View = view === "cal" && !calOk ? "bars" : view;
  const pick = (v: View) => { setView(v); write("uf.tx.view", v); trackTxViewChanged({ view: v, months: range.months.length }); };

  const entries = useMemo(() => transactions
    .filter((t) => t.transaction_type === (mode === "spent" ? "expense" : "income"))
    .map((t) => ({ date: t.date.slice(0, 10), category: t.category, usd: toUSD(mode === "spent" ? netAmount(t) : t.amount, t.currency) })),
  [transactions, mode, toUSD]);
  const inRange = (d: string) => d >= range.start && d <= range.end && d <= today;
  const focus = useMemo(() => entries.filter((e) => (!selectedCategory || e.category === selectedCategory)
    && !(hideBills && mode === "spent" && BILLS.has(e.category))), [entries, selectedCategory, hideBills, mode]);

  const daily = useMemo(() => {
    const m: Daily = new Map();
    for (const e of focus) if (inRange(e.date)) m.set(e.date, (m.get(e.date) ?? 0) + e.usd);
    return m;
  }, [focus, range, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const usualByDay = useMemo(() => {
    const thisMonth = monthOf(today);
    const out: number[] = [];
    for (let d = 0; d <= 31; d++) { const u = usualToDay(focus, thisMonth, d); if (!u) return null; out.push(u.value); }
    return out;
  }, [focus, today]);
  const total = [...daily.values()].reduce((a, b) => a + b, 0);

  // Earned vs spent over the same range, for the saved line.
  const sum = (type: "expense" | "income") => transactions.filter((t) => t.transaction_type === type && inRange(t.date.slice(0, 10)))
    .reduce((s, t) => s + toUSD(type === "expense" ? netAmount(t) : t.amount, t.currency), 0);
  const earned = sum("income"), spent = sum("expense"), saved = earned - spent;
  const rate = earned > 0 ? Math.round((saved / earned) * 100) : null;

  const cats = mode === "spent" ? expenseCats : incomeCats;
  const rows = useMemo(() => {
    const out = cats.map((c) => {
      const mine = entries.filter((e) => e.category === c.key);
      const now = mine.filter((e) => inRange(e.date)).reduce((s, e) => s + e.usd, 0);
      return { ...c, now, usual: usualForRange(mine, range, today) };
    }).filter((r) => r.now > 0 || (r.usual ?? 0) > 0).sort((a, b) => b.now - a.now);
    return out.slice(0, 6);
  }, [cats, entries, range, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...rows.map((r) => Math.max(r.now, r.usual ?? 0)));

  const seg = (on: boolean): React.CSSProperties => ({ border: "none", borderRadius: 999, padding: "5px 12px", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700,
    background: on ? "var(--uf-card)" : "transparent", color: on ? "var(--uf-ink)" : "var(--uf-ink-3)", boxShadow: on ? "var(--uf-e1)" : "none" });

  return (
    <Card style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 24 }}>
      <div style={{ display: "grid", gap: 10, alignContent: "start", gridColumn: shown === "cal" && range.months.length > 3 ? "1 / -1" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div role="radiogroup" aria-label="Show money" style={{ display: "inline-flex", justifySelf: "start", background: "var(--uf-surface-2)", borderRadius: 999, padding: 3 }}>
              {(["spent", "earned"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); onSelectCategory(null); }} style={seg(mode === m)}>
                  {m === "spent" ? "Spent" : "Earned"}
                </button>
              ))}
            </div>
            <span style={{ ...mono, fontSize: 28, fontWeight: 600 }}>{fmt(total)}</span>
            <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", display: "inline-flex", alignItems: "center", gap: 2 }}>
              {mode === "spent" ? <>Earned <b style={{ ...mono, color: "var(--uf-ink-2)", margin: "0 4px" }}>{fmt(earned)}</b></> : <>Spent <b style={{ ...mono, color: "var(--uf-ink-2)", margin: "0 4px" }}>{fmt(spent)}</b></>}
              {earned > 0 && <>
                · Saved <b style={{ ...mono, color: saved < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink-2)", margin: "0 4px" }}>{saved < 0 ? "−" : ""}{fmt(Math.abs(saved))}{rate != null ? ` (${rate}%)` : ""}</b>
                <InfoTip label="About saved">Earned minus spent over this range. The percentage is your savings rate, the number that moves your freedom date most.</InfoTip>
              </>}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {mode === "spent" && (
              <label className="uf-t-small" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--uf-ink-2)" }}>
                <button type="button" role="switch" aria-checked={hideBills} aria-label="Hide bills" onClick={() => setHideBills(!hideBills)}
                  style={{ position: "relative", width: 36, height: 20, borderRadius: 999, border: "none", cursor: "pointer", background: hideBills ? "var(--uf-green)" : "var(--uf-border-2)" }}>
                  <i style={{ position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: 999, background: "#fff", transform: `translateX(${hideBills ? 16 : 0}px)`, transition: "transform 260ms var(--uf-ease-spring)" }} />
                </button>
                Bills
                <InfoTip label="About hiding bills">Hides housing, utilities and subscriptions so the chart shows everyday spending.</InfoTip>
              </label>
            )}
            <div role="radiogroup" aria-label="Chart" style={{ position: "relative", display: "flex", background: "var(--uf-surface-2)", borderRadius: 999, padding: 3 }}>
              <span aria-hidden className="uf-switch-handle" style={{ position: "absolute", top: 3, left: 3, width: 36, height: 30, borderRadius: 999, background: "var(--uf-ink)",
                transform: `translateX(${(["line", "bars", "cal"] as View[]).indexOf(shown) * 36}px)` }} />
              {(["line", "bars", "cal"] as View[]).map((v) => {
                const off = v === "cal" && !calOk;
                return (
                  <button key={v} type="button" role="radio" aria-checked={shown === v} disabled={off} onClick={() => pick(v)}
                    aria-label={v === "line" ? "Running total" : v === "bars" ? "Bars" : off ? "Calendar shows up to 6 months on a phone" : "Calendar"}
                    title={off ? "Calendar shows up to 6 months on a phone" : undefined}
                    style={{ position: "relative", width: 36, height: 30, border: "none", background: "transparent", cursor: off ? "not-allowed" : "pointer", display: "grid", placeItems: "center", opacity: off ? 0.35 : 1 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                      style={{ color: shown === v ? "var(--uf-card)" : "var(--uf-ink-3)", transition: "color 200ms" }}><path d={ICONS[v]} /></svg>
                  </button>
                );
              })}
              <style>{`.uf-switch-handle{transition:transform 320ms var(--uf-ease-spring)}@media (prefers-reduced-motion: reduce){.uf-switch-handle{transition:none}}`}</style>
            </div>
          </div>
        </div>
        {shown === "line" && <LineView range={range} today={today} daily={daily} usualByDay={usualByDay} usualMonth={usualByDay?.[31] ?? null} fmt={fmt} />}
        {shown === "bars" && <BarsView range={range} today={today} daily={daily} usualMonth={usualByDay?.[31] ?? null} fmt={fmt} />}
        {shown === "cal" && <CalendarView range={range} today={today} daily={daily} fmt={fmt} selectedDay={selectedDay} onSelectDay={onSelectDay} onZoomMonth={onZoomMonth} />}
      </div>

      <div style={{ display: "grid", gap: 2, alignContent: "start" }}>
        {rows.map((r) => {
          const d = r.usual == null ? null : r.now - r.usual, near = d != null && Math.abs(d) <= Math.max(10, (r.usual ?? 0) * 0.08), on = selectedCategory === r.key;
          return (
            <div key={r.key} style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", alignItems: "center" }}>
                <button type="button" aria-label={`Colour for ${r.label}`} aria-expanded={picking === r.key} onClick={() => setPicking(picking === r.key ? null : r.key)}
                  style={{ width: 24, height: 24, display: "grid", placeItems: "center", border: "none", background: "none", padding: 0, cursor: "pointer" }}>
                  <i style={{ width: 12, height: 12, borderRadius: 999, background: r.color, boxShadow: "0 0 0 2px var(--uf-card), 0 0 0 3px var(--uf-border-2)" }} />
                </button>
                <button type="button" aria-pressed={on} onClick={() => onSelectCategory(on ? null : r.key)} style={{
                  display: "grid", gridTemplateColumns: "minmax(0, 104px) 1fr 72px", alignItems: "center", gap: 10, padding: "7px 8px", border: "none", borderRadius: 8, cursor: "pointer",
                  font: "inherit", textAlign: "left", color: "var(--uf-ink)", background: on ? "var(--uf-surface-2)" : "transparent", opacity: selectedCategory && !on ? 0.45 : 1, transition: "opacity 200ms" }}>
                  <span className="uf-t-small" style={{ fontWeight: on || (d != null && d > 0 && !near) ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.emoji} {r.label}</span>
                  <span style={{ position: "relative", height: 16 }}>
                    <i style={{ position: "absolute", inset: "3px auto 3px 0", width: `${(r.now / max) * 100}%`, borderRadius: 4, background: r.color, transition: "width 400ms var(--uf-ease-spring)" }} />
                    {r.usual != null && <i title={`Usual ${fmt(r.usual)}`} style={{ position: "absolute", top: -1, bottom: -1, left: `calc(${(r.usual / max) * 100}% - 1.5px)`, width: 3, borderRadius: 2, background: "var(--uf-ink)", boxShadow: "0 0 0 1.5px var(--uf-card)" }} />}
                  </span>
                  <span className="uf-t-small" style={{ ...mono, textAlign: "right", color: d != null && d > 0 && !near ? "var(--uf-ink)" : "var(--uf-ink-3)", fontWeight: d != null && d > 0 && !near ? 700 : 400 }}>
                    {d == null ? fmt(r.now) : near ? "≈ usual" : `${d > 0 ? "▲" : "▼"} ${fmt(Math.abs(d))}`}
                  </span>
                </button>
              </div>
              {picking === r.key && (
                <div role="radiogroup" aria-label={`Colour for ${r.label}`} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 4px 28px", padding: "8px 10px", borderRadius: 10, background: "var(--uf-surface-2)" }}>
                  {palette.map((c) => {
                    const taken = rows.some((o) => o.key !== r.key && o.color === c);
                    return (
                      <button key={c} type="button" role="radio" aria-checked={r.color === c} aria-label={taken ? `${c}, used by another category` : c}
                        onClick={() => { onColor(r.key, c); setPicking(null); }}
                        style={{ width: 26, height: 26, borderRadius: 999, padding: 0, cursor: "pointer", background: c, opacity: taken && r.color !== c ? 0.35 : 1,
                          border: r.color === c ? "3px solid var(--uf-ink)" : "2px solid var(--uf-card)" }} />
                    );
                  })}
                  <InfoTip label="About colours">Faded colours are already used by a category shown here. Picking one is fine; it just makes the two harder to tell apart.</InfoTip>
                </div>
              )}
            </div>
          );
        })}
        {rows.length > 0 && (
          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", paddingLeft: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ display: "inline-block", width: 3, height: 11, background: "var(--uf-ink)" }} />usual
            <InfoTip label="About usual">The middle of your past months up to the same day, so one unusual month doesn&apos;t skew it. It appears once you have 3 months of history.</InfoTip>
          </span>
        )}
      </div>
    </Card>
  );
}
