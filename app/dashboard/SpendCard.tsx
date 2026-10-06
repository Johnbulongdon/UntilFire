"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, InfoTip } from "@/components/ui";
import { trackTxViewChanged } from "@/lib/analytics";
import { type DateRange, monthOf, netAmount, type RangeTx, usualForRange, usualToDay } from "@/lib/spend-range";
import { type Bill, budgetPath, daysOfMonths, everydayRate, forecastPath } from "@/lib/spend-forecast";
import { BarsView, CalendarView, calendarAllowed, type Daily, LineView } from "./SpendCharts";

type Tx = RangeTx & { id: string };
export type CatDisplay = { key: string; label: string; emoji: string; color: string };
type View = "line" | "bars" | "cal";
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const read = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const ICONS: Record<View, string> = { line: "M3 17l5-5 4 3 8-9", bars: "M5 20V10M12 20V4M19 20v-7", cal: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" };

/**
 * The summary above the transaction list (D-31): what went out (or came in)
 * over the chosen range, drawn three ways, and the categories that moved
 * against usual. Explanations sit in InfoTips; the card itself is numbers,
 * marks and labels.
 */
export default function SpendCard({ transactions, range, today, toUSD, fmt, expenseCats, incomeCats, selectedCategories, onToggleCategory, onClearFilters, selectedDay, onSelectDay, onZoomMonth, palette, onColor, budgets = {}, periodLabel, expectedIncome = 0, bills = [] }: {
  transactions: Tx[]; range: DateRange; today: string;
  toUSD: (amount: number, currency: string) => number; fmt: (usd: number) => string;
  expenseCats: CatDisplay[]; incomeCats: CatDisplay[];
  /** Categories picked on the bars; empty means all. Tapping a bar adds or removes it. */
  selectedCategories: string[]; onToggleCategory: (k: string) => void; onClearFilters: () => void;
  selectedDay: string | null; onSelectDay: (d: string | null) => void; onZoomMonth: (m: string) => void;
  palette: string[]; onColor: (key: string, color: string) => void;
  /** Monthly budget per category, USD (the Budget tab). Zero or missing means no budget. */
  budgets?: Record<string, number>; periodLabel: string;
  /** Monthly income from the Budget tab, USD; stands in for months with no income recorded. */
  expectedIncome?: number;
  /** Upcoming expense bills (USD, next due date), which date the forecast and budget line. */
  bills?: Bill[];
}) {
  const [picking, setPicking] = useState<string | null>(null);
  const [mode, setMode] = useState<"spent" | "earned">("spent");
  const [view, setView] = useState<View>("line");
  const [phone, setPhone] = useState(false);
  // One remembered choice for a single month (Line by default) and one for
  // longer ranges (Bars by default): a running line over a year is a long
  // ramp that hides each month, so longer ranges open on bars.
  const long = range.months.length > 1;
  const viewKey = long ? "uf.tx.view.long" : "uf.tx.view";
  useEffect(() => { setView(read(viewKey, long ? "bars" : "line") as View); }, [viewKey, long]);
  useEffect(() => {
    const q = matchMedia("(max-width: 600px)"); const set = () => setPhone(q.matches);
    set(); q.addEventListener("change", set); return () => q.removeEventListener("change", set);
  }, []);
  const calOk = calendarAllowed(range.months.length, phone);
  const shown: View = view === "cal" && !calOk ? "bars" : view;
  const pick = (v: View) => { setView(v); write(viewKey, v); trackTxViewChanged({ view: v, months: range.months.length }); };

  const entries = useMemo(() => transactions
    .filter((t) => t.transaction_type === (mode === "spent" ? "expense" : "income"))
    .map((t) => ({ date: t.date.slice(0, 10), category: t.category, description: t.description ?? "", usd: toUSD(mode === "spent" ? netAmount(t) : t.amount, t.currency) })),
  [transactions, mode, toUSD]);
  const inRange = (d: string) => d >= range.start && d <= range.end && d <= today;
  const picked = useMemo(() => new Set(selectedCategories), [selectedCategories]);
  const focus = useMemo(() => entries.filter((e) => !picked.size || picked.has(e.category)), [entries, picked]);

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

  // The period is still running when today falls inside it.
  const days = useMemo(() => daysOfMonths(range.months), [range]);
  const running = today >= range.start && today < range.end;
  const elapsed = Math.max(1, days.filter((d) => d <= today).length);
  const thisMonth = monthOf(today);

  // Income vs expenses, for the saved line. Expenses for a running period
  // are the forecast to its end, so "on track to save" compares like with
  // like: a whole month's income against a whole month's expenses. A month
  // with no income recorded (or only a stray refund) uses the expected income
  // from the Budget tab.
  const sum = (type: "expense" | "income") => transactions.filter((t) => t.transaction_type === type && inRange(t.date.slice(0, 10)))
    .reduce((s, t) => s + toUSD(type === "expense" ? netAmount(t) : t.amount, t.currency), 0);
  const allExpenses = useMemo(() => transactions.filter((t) => t.transaction_type === "expense")
    .map((t) => ({ date: t.date.slice(0, 10), category: t.category, description: t.description ?? "", usd: toUSD(netAmount(t), t.currency) })), [transactions, toUSD]);
  const spentSoFar = sum("expense");
  const allRate = useMemo(() => everydayRate(allExpenses, bills, thisMonth), [allExpenses, bills, thisMonth]);
  const spent = running ? forecastPath(days, today, spentSoFar, bills, allRate ?? spentSoFar / elapsed).at(-1)! : spentSoFar;
  let earned = 0, filled = 0;
  for (const m of range.months) {
    if (m > thisMonth) continue;
    const actual = transactions.filter((t) => t.transaction_type === "income" && t.date.startsWith(m)).reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
    if (expectedIncome > 0 && actual < expectedIncome * 0.25) { earned += expectedIncome; filled++; } else earned += actual;
  }
  const saved = earned - spent;
  const rawRate = earned > 0 ? Math.round((saved / earned) * 100) : null;
  const rate = rawRate != null && rawRate >= -100 && rawRate <= 100 ? rawRate : null;

  const cats = mode === "spent" ? expenseCats : incomeCats;
  // Monthly budget for what is on screen: one category when one is picked,
  // otherwise every budgeted category (less bills when they are hidden).
  const budgetMonth = useMemo(() => {
    if (mode !== "spent") return null;
    const keys = picked.size ? [...picked] : Object.keys(budgets);
    const total = keys.reduce((s, k) => s + Math.max(0, budgets[k] ?? 0), 0);
    return total > 0 ? total : null;
  }, [budgets, mode, picked]);

  // The chart's own forecast and budget line, for what is on screen.
  const focusBills = useMemo(() => picked.size ? bills.filter((b) => b.category && picked.has(b.category)) : bills, [bills, picked]);
  const focusRate = useMemo(() => everydayRate(focus, focusBills, thisMonth), [focus, focusBills, thisMonth]);
  const forecastLine = mode === "spent" && running ? forecastPath(days, today, total, focusBills, focusRate ?? total / elapsed) : null;
  const budgetLine = budgetMonth ? budgetPath(range.months, budgetMonth, focusBills) : null;

  const rows = useMemo(() => {
    const out = cats.map((c) => {
      const mine = entries.filter((e) => e.category === c.key);
      const now = mine.filter((e) => inRange(e.date)).reduce((s, e) => s + e.usd, 0);
      const b = mode === "spent" ? budgets[c.key] ?? 0 : 0;
      return { ...c, now, usual: usualForRange(mine, range, today), budget: b > 0 ? b * range.months.length : null };
    }).filter((r) => r.now > 0 || (r.usual ?? 0) > 0 || (r.budget ?? 0) > 0).sort((a, b) => b.now - a.now);
    return out.slice(0, 6);
  }, [cats, entries, range, today, budgets, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...rows.map((r) => Math.max(r.now, r.usual ?? 0, r.budget ?? 0)));

  const seg = (on: boolean): React.CSSProperties => ({ border: "none", borderRadius: 999, padding: "5px 12px", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700,
    background: on ? "var(--uf-card)" : "transparent", color: on ? "var(--uf-ink)" : "var(--uf-ink-3)", boxShadow: on ? "var(--uf-e1)" : "none" });

  return (
    <Card style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 24 }}>
      <div style={{ display: "grid", gap: 10, alignContent: "start", gridColumn: shown === "cal" && range.months.length > 3 ? "1 / -1" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div role="radiogroup" aria-label="Show money" style={{ display: "inline-flex", justifySelf: "start", background: "var(--uf-surface-2)", borderRadius: 999, padding: 3 }}>
              {(["spent", "earned"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); onClearFilters(); }} style={seg(mode === m)}>
                  {m === "spent" ? "Expenses" : "Income"}
                </button>
              ))}
            </div>
            <span style={{ ...mono, fontSize: 28, fontWeight: 600 }}>{fmt(total)}</span>
            <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", display: "inline-flex", alignItems: "center", gap: 2 }}>
              {mode === "spent"
                ? <>Income <b style={{ ...mono, color: "var(--uf-ink-2)", margin: "0 4px" }}>{fmt(earned)}{filled > 0 ? "*" : ""}</b></>
                : <>Expenses <b style={{ ...mono, color: "var(--uf-ink-2)", margin: "0 4px" }}>{fmt(spent)}</b></>}
              {earned > 0 && <>
                · {running ? "On track to save" : "Saved"} <b style={{ ...mono, color: saved < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink-2)", margin: "0 4px" }}>{saved < 0 ? "−" : ""}{fmt(Math.abs(saved))}{rate != null ? ` (${rate}%)` : ""}</b>
                <InfoTip label="About saved">Income minus expenses over this range; the percentage is your savings rate.{running ? " While the month is running, expenses are the forecast to its end." : ""}{filled > 0 ? ` *${filled === 1 ? "One month" : `${filled} months`} had no income recorded, so your expected income from the Budget tab stands in.` : ""}</InfoTip>
              </>}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
        {shown === "line" && <LineView range={range} today={today} daily={daily} usualByDay={usualByDay} usualMonth={usualByDay?.[31] ?? null} budgetLine={budgetLine} forecast={forecastLine} periodLabel={periodLabel} fmt={fmt} />}
        {shown === "bars" && <BarsView range={range} today={today} daily={daily} usualMonth={usualByDay?.[31] ?? null} budgetMonth={budgetMonth} fmt={fmt} valueLabel={mode === "spent" ? "Expenses" : "Income"} />}
        {shown === "cal" && <CalendarView range={range} today={today} daily={daily} fmt={fmt} selectedDay={selectedDay} onSelectDay={onSelectDay} onZoomMonth={onZoomMonth} />}
      </div>

      <div style={{ display: "grid", gap: 2, alignContent: "start" }}>
        {rows.map((r) => {
          const d = r.usual == null ? null : r.now - r.usual, near = d != null && Math.abs(d) <= Math.max(10, (r.usual ?? 0) * 0.08), on = picked.has(r.key);
          const over = r.budget != null && r.now > r.budget;
          const strong = r.budget != null ? over : d != null && d > 0 && !near;
          return (
            <div key={r.key} style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", alignItems: "center" }}>
                <button type="button" aria-label={`Colour for ${r.label}`} aria-expanded={picking === r.key} onClick={() => setPicking(picking === r.key ? null : r.key)}
                  style={{ width: 24, height: 24, display: "grid", placeItems: "center", border: "none", background: "none", padding: 0, cursor: "pointer" }}>
                  <i style={{ width: 12, height: 12, borderRadius: 999, background: r.color, boxShadow: "0 0 0 2px var(--uf-card), 0 0 0 3px var(--uf-border-2)" }} />
                </button>
                <button type="button" aria-pressed={on} onClick={() => onToggleCategory(r.key)} style={{
                  display: "grid", gridTemplateColumns: "minmax(0, 104px) 1fr 84px", alignItems: "center", gap: 10, padding: "7px 8px", border: "none", borderRadius: 8, cursor: "pointer",
                  font: "inherit", textAlign: "left", color: "var(--uf-ink)", background: on ? "var(--uf-surface-2)" : "transparent", opacity: picked.size && !on ? 0.45 : 1, transition: "opacity 200ms" }}>
                  <span className="uf-t-small" style={{ fontWeight: on || strong ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.emoji} {r.label}</span>
                  <span style={{ position: "relative", height: 18 }}>
                    {r.budget != null && <i title={`Budget ${fmt(r.budget)}`} style={{ position: "absolute", inset: "1px auto 1px 0", width: `${(r.budget / max) * 100}%`, borderRadius: 5,
                      background: `color-mix(in oklab, ${r.color} 30%, var(--uf-card))`, boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${r.color} 60%, var(--uf-card))` }} />}
                    <i style={{ position: "absolute", inset: "4px auto 4px 0", width: `${(r.now / max) * 100}%`, borderRadius: 4, background: r.color, transition: "width 400ms var(--uf-ease-spring)" }} />
                    {r.usual != null && <i title={`Past months ${fmt(r.usual)}`} style={{ position: "absolute", top: -1, bottom: -1, left: `calc(${(r.usual / max) * 100}% - 1.5px)`, width: 3, borderRadius: 2, background: "var(--uf-ink)", boxShadow: "0 0 0 1.5px var(--uf-card)" }} />}
                  </span>
                  <span className="uf-t-small" style={{ ...mono, textAlign: "right", color: strong ? "var(--uf-ink)" : "var(--uf-ink-3)", fontWeight: strong ? 700 : 400 }}>
                    {r.budget != null
                      ? over ? `${fmt(r.now - r.budget)} over` : `${fmt(r.budget - r.now)} left`
                      : d == null ? fmt(r.now) : near ? "≈ past" : `${d > 0 ? "▲" : "▼"} ${fmt(Math.abs(d))}`}
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
        {(picked.size > 0 || selectedDay) && (
          <button type="button" onClick={onClearFilters} className="uf-t-small" style={{ justifySelf: "start", display: "inline-flex", gap: 6, alignItems: "center",
            margin: "4px 0 4px 32px", border: "none", borderRadius: 999, padding: "6px 12px", cursor: "pointer", fontWeight: 600, background: "var(--uf-ink)", color: "var(--uf-card)" }}>
            {[...rows.filter((r) => picked.has(r.key)).map((r) => r.label), selectedDay].filter(Boolean).join(" + ")} · Clear <span aria-hidden>✕</span>
          </button>
        )}
        {rows.length > 0 && (
          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", paddingLeft: 8, display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <i style={{ display: "inline-block", width: 14, height: 8, borderRadius: 2, background: "var(--uf-ink-3)" }} />{mode === "spent" ? "Expenses" : "Income"}
            {rows.some((r) => r.budget != null) && <><i style={{ display: "inline-block", width: 16, height: 10, borderRadius: 3, marginLeft: 8, background: "var(--uf-surface-2)", boxShadow: "inset 0 0 0 1.5px var(--uf-border-2)" }} />Budget</>}
            <i style={{ display: "inline-block", width: 3, height: 11, marginLeft: 8, background: "var(--uf-ink)" }} />Past months
            <InfoTip label="About past months">Where a typical month of yours stood by this day: the middle of your previous months, so one unusual month doesn&apos;t skew it. It appears once you have 3 months of history. Budget comes from your Budget tab.</InfoTip>
          </span>
        )}
      </div>
    </Card>
  );
}
