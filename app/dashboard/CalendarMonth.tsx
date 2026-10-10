"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { expandExpected, isoDay, type CashflowForecast, type ExpectedItem } from "@/lib/cashflow-forecast";
import { moneyMono } from "./MoneyCards";

/**
 * Calendar, the month (D-61, D-62): every payment in and out on its day, and the
 * cash left at the end of each day up to the next contribution. Balances are
 * all cash, savings included, and never investments: investing moves money out
 * of day-to-day reach, so the invest day is a marker, never a dip. What is safe
 * to invest still keeps the emergency fund aside. Marking it done means
 * nothing more is safe to invest until the next one.
 */
export default function CalendarMonth({ items, forecast, reserve = 0, accounts = [], allowanceFrom = null, safe, done, onMarkDone, onAddOn, fmt, compact }: {
  /** Pending items, in USD. */
  items: ExpectedItem[];
  /** The cash forecast to the next contribution, or null with no plan. */
  forecast: CashflowForecast | null;
  /** Cash kept as the emergency fund. The forecast leaves it out of what is
   *  safe to invest; the day balances add it back, since it is still cash. */
  reserve?: number;
  /** Where today's cash is, for the starting line. */
  accounts?: { name: string; balance: number; reserve: boolean }[];
  /** Where the day-to-day figure comes from (D-62). */
  allowanceFrom?: "budget" | "needs" | null;
  safe: number;
  done: { iso: string; amount: number } | null;
  onMarkDone?: (done: { iso: string; amount: number } | null) => void;
  /** Open the add form on a day. */
  onAddOn: (iso: string) => void;
  fmt: (usd: number) => string;
  compact: (usd: number) => string;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const { y, m } = cursor;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const todayIso = isoDay(today);

  const byDay = useMemo(() => {
    const map = new Map<string, { label: string; amount: number; income: boolean }[]>();
    const from = new Date(y, m, 1) < today ? today : new Date(y, m, 1);
    for (const e of expandExpected(items, from, new Date(y, m, daysInMonth))) {
      if (!map.has(e.iso)) map.set(e.iso, []);
      map.get(e.iso)!.push({ label: e.description, amount: Math.abs(e.amount), income: e.type === "income" });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- today only matters by day
  }, [items, y, m, daysInMonth, todayIso]);

  // The closing balance on a day inside the forecast: the last line on or
  // before it, less the day-to-day spending of the days since that line.
  const lines = forecast?.days ?? [];
  const lastIso = forecast ? forecast.days[forecast.days.length - 1]?.iso ?? todayIso : todayIso;
  const endIso = forecast ? isoDay(new Date(new Date(`${forecast.nextCycleIso}T00:00:00`).getTime() - 86_400_000)) : todayIso;
  const balanceOn = (iso: string): number | null => {
    if (!forecast || iso < todayIso || iso > (endIso > lastIso ? endIso : lastIso)) return null;
    let at = lines[0];
    for (const l of lines) { if (l.iso <= iso) at = l; else break; }
    if (!at) return null;
    const gap = Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${at.iso}T00:00:00`).getTime()) / 86_400_000);
    return reserve + at.balance - forecast.dailyAllowance * Math.max(0, gap);
  };

  // This month's totals, from today on: one month, not the whole cycle, so a
  // salary that lands once a month is counted once.
  const monthEnd = isoDay(new Date(y, m, daysInMonth));
  const restDays = monthEnd < todayIso ? 0
    : Math.round((new Date(y, m, daysInMonth).getTime() - (new Date(y, m, 1) < today ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : new Date(y, m, 1)).getTime()) / 86_400_000) + 1;
  let comingIn = 0, bills = 0;
  for (const evs of byDay.values()) for (const e of evs) { if (e.income) comingIn += e.amount; else bills += e.amount; }
  const dayToDay = (forecast?.dailyAllowance ?? 0) * restDays;
  const isThisMonth = y === today.getFullYear() && m === today.getMonth();
  const monthWord = new Date(y, m, 1).toLocaleDateString(undefined, { month: "long" });
  const span = isThisMonth ? `rest of ${monthWord}` : monthWord;

  const investIso = forecast?.contributionIso;
  // A dip below zero before payday is the low that matters, even though it
  // does not limit what is safe to invest after it.
  const low = forecast ? forecast.shortBefore ?? (Number.isFinite(forecast.lowest.balance) ? forecast.lowest : null) : null;
  const lowCash = low ? low.balance + reserve : 0;
  // Spending money runs out but savings cover it: say so, rather than show red.
  const intoReserve = !!low && low.balance < 0 && lowCash >= 0 && reserve > 0;
  const lowIso = low?.iso ?? null;
  const monthName = new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const step = (d: number) => setCursor(({ y, m }) => ({ y: new Date(y, m + d, 1).getFullYear(), m: new Date(y, m + d, 1).getMonth() }));
  const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {forecast && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[
            [`Coming in · ${span}`, `+${fmt(comingIn)}`, "var(--uf-pos-ink)"],
            [`Going out · ${span}`, `−${fmt(bills + dayToDay)}`, undefined],
            [`Lowest cash${lowIso ? ` · ${dayLabel(lowIso)}` : ""}${intoReserve ? " · uses emergency fund" : ""}`, low ? `${lowCash < 0 ? "−" : ""}${fmt(Math.abs(lowCash))}` : "—", lowCash < 0 ? "var(--uf-neg-ink)" : undefined],
            [done ? "Invested this cycle" : `Safe to invest${investIso ? ` · ${dayLabel(investIso)}` : ""}`, done ? `${fmt(done.amount)} ✓` : fmt(safe), "var(--uf-teal-deep)"],
          ].map(([k, v, tone]) => (
            <div key={k} style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "10px 12px", display: "grid", gap: 2 }}>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{k}</span>
              <span style={{ ...moneyMono, fontSize: 18, fontWeight: 700, color: tone ?? "var(--uf-ink)" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      {forecast && (
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>
          Cash today <b style={{ ...moneyMono, color: "var(--uf-ink-2)" }}>{fmt(reserve + forecast.opening)}</b>
          {accounts.length > 0 && <>: {accounts.map((a) => `${a.name} ${fmt(a.balance)}${a.reserve ? " (emergency fund)" : ""}`).join(", ")}</>}.
          {forecast.dailyAllowance > 0 && <>{" "}Going out includes day-to-day spending of {fmt(forecast.dailyAllowance)} a day, {allowanceFrom === "needs" ? "from last month's needs (set a budget to use it instead)" : "from your budget less listed bills"}.</>}
        </span>
      )}
      {forecast && investIso && onMarkDone && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {done ? (
            <>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Marked as invested on {dayLabel(done.iso)}. Nothing more is safe to invest until {dayLabel(forecast.nextCycleIso)}.</span>
              <Button variant="ghost" size="sm" onClick={() => onMarkDone(null)}>Undo</Button>
            </>
          ) : safe > 0 ? (
            <>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Invested {fmt(safe)}? Mark it so the same money is not counted again.</span>
              <Button size="sm" onClick={() => onMarkDone({ iso: investIso, amount: Math.round(safe) })}>Mark as done</Button>
            </>
          ) : null}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button variant="ghost" size="sm" onClick={() => step(-1)} aria-label="Previous month">‹</Button>
        <span className="uf-t-h3" style={{ margin: 0 }}>{monthName}</span>
        <Button variant="ghost" size="sm" onClick={() => step(1)} aria-label="Next month">›</Button>
      </div>

      <div role="grid" aria-label={monthName} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="uf-t-small" style={{ textAlign: "center", color: "var(--uf-ink-3)" }}>{d}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`lead${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = isoDay(new Date(y, m, i + 1));
          const evs = byDay.get(iso) ?? [];
          const bal = balanceOn(iso);
          const past = iso < todayIso, isToday = iso === todayIso, invest = iso === investIso, isLow = iso === lowIso;
          const label = [dayLabel(iso), ...evs.map((e) => `${e.label} ${e.income ? "+" : "−"}${fmt(e.amount)}`),
            ...(invest ? [done ? `Invested ${fmt(done.amount)}` : `Invest day, ${fmt(safe)} safe`] : []),
            ...(bal !== null ? [`cash ${fmt(bal)}`] : [])].join(", ");
          return (
            <button key={iso} type="button" aria-label={label} title={label} disabled={past} onClick={() => onAddOn(iso)}
              style={{ minHeight: 64, padding: 4, borderRadius: 8, textAlign: "left", display: "flex", flexDirection: "column", gap: 2, cursor: past ? "default" : "pointer", overflow: "hidden",
                background: invest ? "var(--uf-teal-soft)" : past ? "transparent" : "var(--uf-card)",
                border: isLow ? "1.5px dashed var(--uf-ink-3)" : isToday ? "1.5px solid var(--uf-ink)" : "1px solid var(--uf-border)",
                color: past ? "var(--uf-ink-3)" : "var(--uf-ink)", opacity: past ? 0.6 : 1 }}>
              <span style={{ ...moneyMono, fontSize: 11, fontWeight: isToday ? 800 : 600 }}>{i + 1}</span>
              {evs.slice(0, 2).map((e, k) => (
                <span key={k} style={{ ...moneyMono, fontSize: 10, lineHeight: 1.2, whiteSpace: "nowrap", color: e.income ? "var(--uf-pos-ink)" : "var(--uf-ink-2)" }}>
                  {e.income ? "+" : "−"}{compact(e.amount)}
                </span>
              ))}
              {evs.length > 2 && <span style={{ fontSize: 10, color: "var(--uf-ink-3)" }}>+{evs.length - 2} more</span>}
              {invest && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--uf-ink)" }}>{done ? "Invested ✓" : "Invest ◆"}</span>}
              {bal !== null && (
                <span style={{ ...moneyMono, marginTop: "auto", fontSize: 10, fontWeight: 700, color: bal < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink-3)" }}>
                  {bal < 0 ? "−" : ""}{compact(Math.abs(bal))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="uf-t-small" style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--uf-ink-3)" }}>
        <span>Bottom figure = all your cash at day end</span>
        <span>◆ invest day</span>
        <span>Dashed = lowest point</span>
        <span>Tap a day to add a payment</span>
      </div>
      {!forecast && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Set when you invest in Plan → Contributions to see your cash day by day.</span>}
    </div>
  );
}
