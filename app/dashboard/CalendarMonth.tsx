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
  const span = isThisMonth ? `to ${new Date(y, m, daysInMonth).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : monthWord;

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

  // Option B (D-63): each day tinted by its closing cash against a month of
  // going out, so "Plenty" means the same thing for any income. The figure
  // and the level are also in each day's label: colour never says it alone.
  const monthOut = Math.max(1, bills + (forecast?.dailyAllowance ?? 0) * daysInMonth);
  const level = (v: number) => (v < 0 ? 0 : v < monthOut * 0.25 ? 1 : v < monthOut * 0.5 ? 2 : v < monthOut ? 3 : 4);
  const LEVELS = [
    { name: "Tight", bg: "color-mix(in srgb, var(--uf-neg-ink) 20%, var(--uf-card))" },
    { name: "Low", bg: "color-mix(in srgb, var(--uf-warn) 22%, var(--uf-card))" },
    { name: "OK", bg: "color-mix(in srgb, var(--uf-teal) 10%, var(--uf-card))" },
    { name: "Good", bg: "color-mix(in srgb, var(--uf-teal) 22%, var(--uf-card))" },
    { name: "Plenty", bg: "color-mix(in srgb, var(--uf-teal) 36%, var(--uf-card))" },
  ];
  const tiles: [string, string, string, string, string][] = [
    ["↓", `Coming in · ${span}`, `+${fmt(comingIn)}`, "var(--uf-pos-ink)", "color-mix(in srgb, var(--uf-pos-ink) 14%, var(--uf-card))"],
    ["↑", `Going out · ${span}`, `−${fmt(bills + dayToDay)}`, "var(--uf-ink)", "var(--uf-surface-2)"],
    ["◔", `Lowest cash${lowIso ? ` · ${dayLabel(lowIso)}` : ""}${intoReserve ? " · uses emergency fund" : ""}`, low ? `${lowCash < 0 ? "−" : ""}${fmt(Math.abs(lowCash))}` : "—", lowCash < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)", "var(--uf-warn-bg)"],
    ["◆", done ? "Invested this cycle" : `Safe to invest${investIso ? ` · ${dayLabel(investIso)}` : ""}`, done ? `${fmt(done.amount)} ✓` : fmt(safe), "var(--uf-teal-deep)", "var(--uf-teal-soft)"],
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {forecast && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {tiles.map(([icon, k, v, tone, tint]) => (
            <div key={k} style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16, padding: "14px 16px", display: "grid", gap: 6 }}>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-2)", fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                <span aria-hidden style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center", background: tint, color: tone, flexShrink: 0 }}>{icon}</span>{k}
              </span>
              <span style={{ ...moneyMono, fontSize: 22, fontWeight: 500, color: tone }}>{v}</span>
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Button variant="ghost" size="sm" onClick={() => step(-1)} aria-label="Previous month">‹</Button>
          <span className="uf-t-h3" style={{ margin: 0, minWidth: 150, textAlign: "center" }}>{monthName}</span>
          <Button variant="ghost" size="sm" onClick={() => step(1)} aria-label="Next month">›</Button>
        </div>
        {forecast && (
          <div className="uf-t-small" aria-label="Cash at day end, from tight to plenty" style={{ display: "flex", gap: 10, flexWrap: "wrap", color: "var(--uf-ink-2)", alignItems: "center" }}>
            <span style={{ color: "var(--uf-ink-3)" }}>Cash at day end</span>
            {LEVELS.map((l) => (
              <span key={l.name} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <i style={{ width: 12, height: 12, borderRadius: 4, background: l.bg, border: "1px solid var(--uf-border)" }} />{l.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div role="grid" aria-label={monthName} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d} className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700, paddingLeft: 4 }}>{d.slice(0, 1)}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`lead${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = isoDay(new Date(y, m, i + 1));
          const evs = byDay.get(iso) ?? [];
          const bal = balanceOn(iso);
          const past = iso < todayIso, isToday = iso === todayIso, invest = iso === investIso, isLow = iso === lowIso;
          const lv = bal !== null ? LEVELS[level(bal)] : null;
          const label = [isToday ? `Today, ${dayLabel(iso)}` : dayLabel(iso), ...evs.map((e) => `${e.label} ${e.income ? "+" : "−"}${fmt(e.amount)}`),
            ...(invest ? [done ? `Invested ${fmt(done.amount)}` : `Invest day, ${fmt(safe)} safe`] : []),
            ...(bal !== null && lv ? [`cash ${fmt(bal)}, ${lv.name.toLowerCase()}`] : []), ...(isLow ? ["lowest point"] : [])].join(", ");
          const ring = invest ? "var(--uf-green)" : isToday ? "var(--uf-ink)" : null;
          return (
            <button key={iso} type="button" aria-label={label} title={label} disabled={past} onClick={() => onAddOn(iso)}
              style={{ position: "relative", minHeight: 84, padding: "7px 6px 6px", borderRadius: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 4, overflow: "hidden",
                cursor: past ? "default" : "pointer", color: "var(--uf-ink)", opacity: past ? 0.5 : 1,
                background: past ? "var(--uf-surface)" : lv?.bg ?? "var(--uf-card)",
                border: isLow && !ring ? "1.5px dashed var(--uf-ink-3)" : `1px solid ${lv ? "transparent" : "var(--uf-border)"}`,
                boxShadow: ring ? `inset 0 0 0 2px ${ring}` : undefined }}>
              <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{i + 1}</span>
              {/* Today and invest day carry a ring; the corner mark says which,
                  small enough to fit a phone's narrow cell. */}
              {(invest || isToday) && (
                <span aria-hidden style={{ position: "absolute", top: 6, right: 6 }}>
                  {invest
                    ? <i style={{ display: "block", width: 8, height: 8, borderRadius: done ? 99 : 1.5, transform: done ? undefined : "rotate(45deg)", background: "var(--uf-green)" }} />
                    : <i style={{ display: "block", width: 7, height: 7, borderRadius: 99, background: "var(--uf-ink)" }} />}
                </span>
              )}
              {evs.length > 0 && (
                <span aria-hidden style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {evs.slice(0, 5).map((e, k) => <i key={k} style={{ width: 7, height: 7, borderRadius: 99, background: e.income ? "var(--uf-pos-ink)" : "var(--uf-ink-2)" }} />)}
                </span>
              )}
              {bal !== null && (
                <span style={{ ...moneyMono, marginTop: "auto", fontSize: "clamp(10px, 2.9vw, 13px)", fontWeight: 500, whiteSpace: "nowrap", color: bal < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>
                  {bal < 0 ? "−" : ""}{compact(Math.abs(bal))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {forecast && investIso && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: "12px 16px", borderRadius: 16, background: "var(--uf-surface)" }}>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>
            {done
              ? <>Marked as invested on {dayLabel(done.iso)}. Nothing more is safe to invest until {dayLabel(forecast.nextCycleIso)}.</>
              : <>{dayLabel(investIso)} · invest <b style={{ ...moneyMono, color: "var(--uf-ink)" }}>{fmt(safe)}</b>{low && <>, and your cash stays above <b style={{ ...moneyMono, color: "var(--uf-ink)" }}>{fmt(Math.max(0, forecast.lowest.balance + reserve))}</b> until {dayLabel(forecast.nextCycleIso)}</>}. Dots are payments, ◆ is your invest day; tap a day to add one.</>}
          </span>
          {onMarkDone && (done
            ? <Button variant="ghost" size="sm" onClick={() => onMarkDone(null)}>Undo</Button>
            : safe > 0 && <Button size="sm" onClick={() => onMarkDone({ iso: investIso, amount: Math.round(safe) })}>Mark as done</Button>)}
        </div>
      )}
      {!forecast && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Set when you invest in Plan → Contributions to see your cash day by day.</span>}
    </div>
  );
}
