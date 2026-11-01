"use client";

import { useMemo, useState } from "react";
import { Button, InfoTip } from "@/components/ui";
import CalendarDayPanel, { type DayLine } from "./CalendarDayPanel";
import { expandExpected, isoDay, type CashflowForecast, type ExpectedItem } from "@/lib/cashflow-forecast";
import { markedCalendarEntries, type ScheduledCalendarItem } from "@/lib/marked-calendar";
import MarkedMonth, { type MarkedEvent } from "./MarkedMonth";
import { moneyMono } from "./MoneyCards";

/**
 * Calendar, the month (D-61, D-62): every payment in and out on its day, and the
 * cash left at the end of each day up to the next contribution. Balances are
 * all cash, savings included, and never investments: investing moves money out
 * of day-to-day reach, so the invest day is a marker, never a dip. What is safe
 * to invest still keeps the emergency fund aside. Marking it done means
 * nothing more is safe to invest until the next one.
 */
export default function CalendarMonth({ items, forecast, reserve = 0, accounts = [], allowanceFrom = null, safe, done, onMarkDone,
  selected, onSelect, scheduledItems = items, addForm, onAdd, onEdit, onOpenTransactions, emojiFor, fmt, compact }: {
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
  /** Selected day. Details stay below the marked month at every browser width. */
  selected: string | null;
  onSelect: (iso: string | null) => void;
  /** Complete scheduled rows, including completed one-offs; never transaction history. */
  scheduledItems?: ScheduledCalendarItem[];
  /** The add form while it is open, shown in the day panel. */
  addForm: React.ReactNode;
  /** Open the add form on a day. */
  onAdd: (iso: string) => void;
  /** Open a saved bill or payday's Edit form. */
  onEdit?: (id: string) => void;
  onOpenTransactions?: () => void;
  emojiFor: (category: string | null | undefined, income: boolean) => string;
  fmt: (usd: number) => string;
  compact: (usd: number) => string;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const { y, m } = cursor;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayIso = isoDay(today);

  const byDay = useMemo(() => {
    const map = new Map<string, DayLine[]>();
    const from = new Date(y, m, 1) < today ? today : new Date(y, m, 1);

    for (const e of expandExpected(items, from, new Date(y, m, daysInMonth))) {
      if (!map.has(e.iso)) map.set(e.iso, []);
      if(e.overdue && (y !== today.getFullYear() || m !== today.getMonth())) continue;
      map.get(e.iso)!.push({ label: e.description, amount: Math.abs(e.amount), income: e.type === "income", category: e.category, repeats: e.recurring });
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
  const monthKey = String(y)+'-'+String(m+1).padStart(2,'0');
  const scheduled = useMemo(()=>markedCalendarEntries({start:monthKey+'-01',end:monthKey+'-'+String(daysInMonth).padStart(2,'0'),today:todayIso,items:scheduledItems}),[monthKey,daysInMonth,todayIso,scheduledItems]);
  const markedEvents = new Map<string, MarkedEvent[]>();
  for(const entry of scheduled)markedEvents.set(entry.iso,[...(markedEvents.get(entry.iso)??[]),entry]);
  const linesOn = (iso:string)=>markedEvents.get(iso)??[];
  const day = selected?.startsWith(monthKey+'-') ? selected : todayIso.startsWith(monthKey+'-') ? todayIso : monthKey+'-01';
  const scheduledBills = scheduled.filter(e=>!e.income).reduce((sum,e)=>sum+e.amount,0);
  const scheduledIncome = scheduled.filter(e=>e.income).reduce((sum,e)=>sum+e.amount,0);

  const tiles: [string, string, string, string, string][] = [
    ["↓", `In · ${span}`, `+${fmt(comingIn)}`, "var(--uf-pos-ink)", "color-mix(in srgb, var(--uf-pos-ink) 14%, var(--uf-card))"],
    ["↑", `Out · ${span}`, `−${fmt(bills + dayToDay)}`, "var(--uf-ink)", "var(--uf-surface-2)"],
    ["◔", `Lowest${lowIso ? ` · ${dayLabel(lowIso)}` : ""}${intoReserve ? " · uses savings" : ""}`, low ? `${lowCash < 0 ? "−" : ""}${fmt(Math.abs(lowCash))}` : "—", lowCash < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)", "var(--uf-warn-bg)"],
    ["◆", done ? "Invested this cycle" : `Safe to invest${investIso ? ` · ${dayLabel(investIso)}` : ""}`, done ? `${fmt(done.amount)} ✓` : fmt(safe), "var(--uf-teal-deep)", "var(--uf-teal-soft)"],
  ];

  const panel = day && (
    <CalendarDayPanel iso={day} todayIso={todayIso} lines={linesOn(day)} cash={balanceOn(day)} sheet={false} scheduled
      invest={day === investIso ? (done ? `Invested ${fmt(done.amount)}` : `Invest day · ${fmt(safe)} safe`) : null}
      addForm={addForm} onAdd={() => onAdd(day)} onEdit={onEdit} onClose={() => onSelect(null)} onOpenTransactions={onOpenTransactions}
      emojiFor={emojiFor} fmt={fmt} />
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {forecast && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {tiles.map(([icon, k, v, tone, tint], i) => (
            <div key={k} style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16, padding: "12px 14px", display: "grid", gap: 4 }}>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-2)", fontWeight: 700, display: "flex", gap: 7, alignItems: "center" }}>
                <span aria-hidden style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", background: tint, color: tone, flexShrink: 0 }}>{icon}</span>{k}
                {i === 2 && (
                  <InfoTip label="About your cash">
                    Cash today {fmt(reserve + forecast.opening)}{accounts.length > 0 ? `: ${accounts.map((a) => `${a.name} ${fmt(a.balance)}${a.reserve ? " (emergency fund)" : ""}`).join(", ")}` : ""}.
                    {forecast.dailyAllowance > 0 ? ` Each day also takes ${fmt(forecast.dailyAllowance)} of day-to-day spending, ${allowanceFrom === "needs" ? "from last month's needs" : "from your budget less listed bills"}.` : ""}
                  </InfoTip>
                )}
              </span>
              <span style={{ ...moneyMono, fontSize: 21, fontWeight: 500, color: tone }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'grid',gap:16,minWidth:0,background:'var(--uf-card)',border:'1px solid var(--uf-border)',borderRadius:24,padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <Button variant="ghost" size="sm" onClick={()=>{step(-1);onSelect(null)}} aria-label="Previous month">‹</Button>
            <h2 style={{fontSize:20,margin:0}}>{monthName}</h2>
            <Button variant="ghost" size="sm" onClick={()=>{step(1);onSelect(null)}} aria-label="Next month">›</Button>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:13,fontWeight:700,color:'#151719'}}>
            <span style={{background:'#EEE9FA',borderRadius:12,padding:'9px 12px'}}>{fmt(scheduledBills)} scheduled bills</span>
            <span style={{background:'#FFE58A',borderRadius:12,padding:'9px 12px'}}>+{fmt(scheduledIncome)} scheduled income</span>
          </div>
        </div>
        <MarkedMonth month={monthKey} today={todayIso} events={markedEvents} selected={day} onSelect={onSelect} fmt={fmt} compact={compact} showDetails={false}
          marker={investIso?{iso:investIso,label:done?'Invested':'Invest day'}:undefined}/>
          {forecast && investIso && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: "10px 14px", borderRadius: 14, background: "var(--uf-teal-soft)" }}>
              <span className="uf-t-small" style={{ color: "var(--uf-teal-deep)", fontWeight: 800 }}>
                {done ? <>✓ Invested <span style={moneyMono}>{fmt(done.amount)}</span> · nothing more until {dayLabel(forecast.nextCycleIso)}</>
                  : <>◆ {dayLabel(investIso)} · invest <span style={moneyMono}>{fmt(safe)}</span></>}
              </span>
              {onMarkDone && (done
                ? <Button variant="ghost" size="sm" onClick={() => onMarkDone(null)}>Undo</Button>
                : safe > 0 && <Button size="sm" onClick={() => onMarkDone({ iso: investIso, amount: Math.round(safe) })}>Mark as done</Button>)}
            </div>
          )}
          {!forecast && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Set when you invest in Plan → Contributions to see your cash day by day.</span>}
        {panel}
      </div>
    </div>
  );
}
