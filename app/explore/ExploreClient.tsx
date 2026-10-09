"use client";

/**
 * Explore (D-58): the map and the cards, side by side on a computer, stacked
 * on a phone. Your numbers come from the calculator when it has run in this
 * browser, or from two quick fields here; money shows in your currency (the
 * app's default currency, or the one you used in the calculator). Stars and
 * your numbers stay on this device; nothing is sent anywhere.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readExplorePlan, saveExplorePlan } from "@/lib/explore-store";
import { EXPLORE_CITIES, freedomIn, type ExplorePlan, type PinMode } from "@/lib/explore";
import { FALLBACK_RATES, getCurrencySymbol } from "@/lib/currency";
import { formatUSDInCurrency } from "@/lib/money";
import { trackExploreCityOpened, trackExploreModeChanged, trackExplorePlanStarted, trackExploreStarred, trackExploreViewed } from "@/lib/analytics";
import ExploreMap from "./ExploreMap";
import ExploreCard from "./ExploreCard";
import Flag from "./Flag";
import "./explore.css";

const STARS_KEY = "uf_explore_stars";
const read = <T,>(key: string): T | null => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; } };
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };
const chip = (on: boolean): React.CSSProperties => ({ fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 99, border: "1px solid var(--uf-border)", whiteSpace: "nowrap", cursor: "pointer",
  background: on ? "var(--uf-ink)" : "var(--uf-card)", color: on ? "var(--uf-card)" : "var(--uf-ink)" });

function PlanFields({ onDone, currency, rate }: { onDone: (p: ExplorePlan) => void; currency: string; rate: number }) {
  const [saved, setSaved] = useState(""), [monthly, setMonthly] = useState(""), [age, setAge] = useState("");
  const num = (s: string) => Number(s.replace(/[^\d.]/g, ""));
  const field = (label: string, value: string, set: (v: string) => void, ph: string) => <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700, minWidth: 0 }}>{label}
    <input inputMode="decimal" value={value} placeholder={ph} onChange={e => set(e.target.value)} style={{ font: "600 15px var(--uf-font-mono)", padding: "8px 10px", borderRadius: 10, border: "1px solid var(--uf-border-2)", background: "var(--uf-bg)", color: "var(--uf-ink)", width: "100%", boxSizing: "border-box" }} /></label>;
  const sym = getCurrencySymbol(currency);
  // Typed in your currency, kept in USD like every city cost.
  return <form onSubmit={e => { e.preventDefault(); if (monthly) onDone({ saved: num(saved) / rate, monthlySaving: num(monthly) / rate, age: age ? num(age) : undefined, currency }); }}
    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.6fr auto", gap: 8, alignItems: "end", background: "var(--uf-card)", borderRadius: 14, padding: 12 }}>
    {field(`Saved (${sym})`, saved, setSaved, "60,000")}{field(`Saving / mo (${sym})`, monthly, setMonthly, "2,000")}{field("Age", age, setAge, "34")}
    <button type="submit" disabled={!monthly} style={{ ...chip(true), background: "var(--uf-green)", border: 0, opacity: monthly ? 1 : 0.5 }}>Show my year</button>
  </form>;
}

export default function ExploreClient({ appPlan, onPlanFor, displayCurrency, displayRates }: {
  /** In the app: your default currency and its rates. Public: the calculator's currency, else USD. */
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  /** In the app (Plan → Explore): your plan's numbers, which replace the fields. */
  appPlan?: ExplorePlan;
  /** In the app: make a city the plan's retirement city instead of starting the calculator. */
  onPlanFor?: (key: string) => void;
} = {}) {
  const [view, setView] = useState<"all" | "us" | "world">("all");
  const [mode, setMode] = useState<PinMode>("monthly");
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [noTax, setNoTax] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [plan, setPlan] = useState<ExplorePlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [shown, setShown] = useState(24);
  const [mapHeight, setMapHeight] = useState(620);
  // On a computer the page fits the screen: the globe stays in view and only
  // the cards scroll, inside their own column. Null on a phone (it scrolls).
  const [boxHeight, setBoxHeight] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStarred(new Set(read<string[]>(STARS_KEY) ?? []));
    const p = readExplorePlan();
    if (p) { setPlan(p); setMode("year"); }
    trackExploreViewed({ has_plan: !!p });
    const phone = window.matchMedia("(max-width: 900px)");
    const fit = () => {
      if (phone.matches || !box.current) { setBoxHeight(null); setMapHeight(340); return; }
      // From where the page starts (below the site header or app bar) to the bottom of the window.
      const top = box.current.getBoundingClientRect().top + window.scrollY;
      const h = Math.max(520, window.innerHeight - top);
      setBoxHeight(h); setMapHeight(h - 48 - 40);
      // Padding below us (the app shell adds some) would still make the page
      // scroll: measure once laid out and give that back.
      requestAnimationFrame(() => {
        const extra = document.documentElement.scrollHeight - window.innerHeight;
        if (extra > 0 && h - extra >= 520) { setBoxHeight(h - extra); setMapHeight(h - extra - 48 - 40); }
      });
    };
    fit(); phone.addEventListener("change", fit); window.addEventListener("resize", fit);
    return () => { phone.removeEventListener("change", fit); window.removeEventListener("resize", fit); };
  }, []);
  // In the app, your plan's numbers win over anything saved in the browser.
  useEffect(() => { if (appPlan) { setPlan(appPlan); setMode(m => (m === "monthly" ? "year" : m)); } }, [appPlan]);

  const currency = displayCurrency ?? plan?.currency ?? "USD";
  const rates = displayRates ?? FALLBACK_RATES;
  const rate = currency === "USD" ? 1 : rates[currency] ?? 1;
  const money = useMemo(() => (n: number) => formatUSDInCurrency(n, currency, rates), [currency, rates]);
  const moneyShort = useMemo(() => (n: number) => formatUSDInCurrency(n, currency, rates, { compact: true }), [currency, rates]);
  const freedom = useMemo(() => new Map(EXPLORE_CITIES.map(c => [c.key, plan ? freedomIn(c, plan) : null])), [plan]);
  const list = useMemo(() => EXPLORE_CITIES
    .filter(c => (onlyStarred ? starred.has(c.key) : view === "all" || c.us === (view === "us")) && (!noTax || c.noIncomeTax))
    .sort((a, b) => a.monthlyUSD - b.monthlyUSD), [view, onlyStarred, starred, noTax]);
  const chosen = EXPLORE_CITIES.find(c => c.key === selected) ?? null;

  const toggleStar = (key: string) => setStarred(s => {
    const next = new Set(s); const on = !next.has(key); if (on) next.add(key); else next.delete(key);
    write(STARS_KEY, [...next]); trackExploreStarred({ starred: on }); return next;
  });
  const choose = (key: string) => { setSelected(key); trackExploreCityOpened({ mode }); };
  const changeMode = (m: PinMode) => { setMode(m); trackExploreModeChanged({ mode: m }); };
  const savePlan = (p: ExplorePlan) => { setPlan(p); setEditing(false); setMode("year"); saveExplorePlan(p); };

  const modes: [PinMode, string, boolean][] = [["monthly", `${getCurrencySymbol(currency)} / month`, true], ["year", "🏁 Year", !!plan], ["age", "🎂 Age", plan?.age != null]];
  return <div className="uf-explore" ref={box} style={boxHeight ? { height: boxHeight } : undefined}>
    <div className="uf-explore-head">
      {!appPlan && <h1 className="uf-t-display" style={{ margin: 0, fontSize: "clamp(26px, 4vw, 34px)" }}>Where could you retire?</h1>}
      <div role="radiogroup" aria-label="Pins show" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--uf-card)", justifySelf: "start" }}>
        {modes.map(([m, label, can]) => <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={!can} onClick={() => changeMode(m)}
          title={can ? undefined : m === "age" ? "Add your age below" : "Add your numbers below"}
          style={{ ...chip(mode === m), border: 0, opacity: can ? 1 : 0.45, cursor: can ? "pointer" : "default" }}>{label}</button>)}
      </div>
      {plan && !editing
        ? <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13, background: "var(--uf-card)", borderRadius: 12, padding: "8px 12px" }}>
            <b>Your numbers</b><span style={{ fontFamily: "var(--uf-font-mono)" }}>🏦 {money(plan.saved)}</span><span style={{ fontFamily: "var(--uf-font-mono)" }}>📥 {money(plan.monthlySaving)}/mo</span>{plan.age != null && <span style={{ fontFamily: "var(--uf-font-mono)" }}>🎂 {plan.age}</span>}
            {!appPlan && <button type="button" onClick={() => setEditing(true)} style={{ marginLeft: "auto", border: 0, background: "none", color: "var(--uf-green)", fontWeight: 700, cursor: "pointer" }}>Edit</button>}</div>
        : <><span style={{ fontSize: 13, color: "var(--uf-ink-2)" }}>Add two numbers to see the year each city sets you free.</span><PlanFields onDone={savePlan} currency={currency} rate={rate} /></>}
      <div className="uf-explore-chips">
        <button type="button" style={chip(view === "all" && !onlyStarred)} onClick={() => { setView("all"); setOnlyStarred(false); }}>🌐 All</button>
        <button type="button" style={chip(view === "us" && !onlyStarred)} onClick={() => { setView("us"); setOnlyStarred(false); }}><Flag emoji="🇺🇸" size={12} /> US</button>
        <button type="button" style={chip(view === "world" && !onlyStarred)} onClick={() => { setView("world"); setOnlyStarred(false); }}>🌍 Abroad</button>
        <button type="button" style={chip(onlyStarred)} onClick={() => setOnlyStarred(v => !v)}>★ Starred · {starred.size}</button>
        <button type="button" style={chip(noTax)} onClick={() => setNoTax(v => !v)}>🧾 No income tax</button>
      </div>
      {chosen && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {chosen.href && <Link href={chosen.href} className="uf-explore-action">{chosen.us || chosen.href.includes(chosen.key) ? `Open ${chosen.name}` : `Open ${chosen.place}`} →</Link>}
        {onPlanFor
          ? <button type="button" onClick={() => { onPlanFor(chosen.key); trackExplorePlanStarted(); }} className="uf-explore-action uf-explore-action-main" style={{ cursor: "pointer" }}>Plan for {chosen.name}</button>
          : <Link href={`/?start=onboarding&city=${encodeURIComponent(chosen.key)}&source=explore`} onClick={() => trackExplorePlanStarted()} className="uf-explore-action uf-explore-action-main">Plan {chosen.name} →</Link>}
      </div>}
    </div>
    <div className="uf-explore-cards">
        {list.length === 0 && <p style={{ color: "var(--uf-ink-2)" }}>{onlyStarred ? "Star a city to keep it here and on the map." : "No cities match."}</p>}
        {list.slice(0, shown).map((c, i) => <ExploreCard key={c.key} city={c} rank={i + 1} mode={mode} money={money} freedom={freedom.get(c.key) ?? null} star={starred.has(c.key)}
          onStar={() => toggleStar(c.key)} selected={selected === c.key} onSelect={() => choose(c.key)} />)}
        {list.length > shown && <button type="button" onClick={() => setShown(n => n + 48)} style={{ ...chip(false), justifySelf: "center" }}>Show {Math.min(48, list.length - shown)} more of {list.length}</button>}
    </div>
    <div className="uf-explore-mapwrap">
      <ExploreMap cities={onlyStarred || noTax ? list : EXPLORE_CITIES} focus={view} mode={mode} money={moneyShort} freedom={freedom} starred={starred} selected={selected} onSelect={choose} height={mapHeight} />
      <p style={{ fontSize: 12, color: "var(--uf-ink-2)", margin: "8px 2px 0" }}>Typical household spending, in {currency}. Your year keeps your savings as they are and retires on each city&apos;s cost at your way of spending.</p>
    </div>
  </div>;
}
