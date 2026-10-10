"use client";

/**
 * Explore (D-58): the map and the cards, side by side on a computer, stacked
 * on a phone. Your numbers come from the calculator when it has run in this
 * browser, or from two quick fields here; money shows in your currency (the
 * app's default currency, or the one you used in the calculator). Stars and
 * your numbers stay on this device; nothing is sent anywhere.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readExplorePlan, saveExplorePlan } from "@/lib/explore-store";
import { BADGE_RETIRE_AGE, EXPLORE_CITIES, bestBadge, freedomBadges, freedomIn, MEDAL, type ExplorePlan, type PinMode } from "@/lib/explore";
import { ageLabel } from "@/lib/plan-settings";
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
  const [saved, setSaved] = useState(""), [monthly, setMonthly] = useState(""), [age, setAge] = useState(""), [income, setIncome] = useState("");
  const num = (s: string) => Number(s.replace(/[^\d.]/g, ""));
  const field = (label: string, value: string, set: (v: string) => void, ph: string) => <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700, minWidth: 0 }}>{label}
    <input inputMode="decimal" value={value} placeholder={ph} onChange={e => set(e.target.value)} style={{ font: "600 15px var(--uf-font-mono)", padding: "8px 10px", borderRadius: 10, border: "1px solid var(--uf-border-2)", background: "var(--uf-bg)", color: "var(--uf-ink)", width: "100%", boxSizing: "border-box" }} /></label>;
  const sym = getCurrencySymbol(currency);
  // Typed in your currency, kept in USD like every city cost.
  return <form onSubmit={e => { e.preventDefault(); if (monthly) onDone({ saved: num(saved) / rate, monthlySaving: num(monthly) / rate, age: age ? num(age) : undefined, monthlyIncome: income ? num(income) / rate : undefined, currency }); }}
    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, alignItems: "end", background: "var(--uf-card)", borderRadius: 14, padding: 12 }}>
    {field(`Saved (${sym})`, saved, setSaved, "")}{field(`Saving / mo (${sym})`, monthly, setMonthly, "")}{field("Age (optional)", age, setAge, "")}{field(`Take-home / mo (${sym}, optional)`, income, setIncome, "")}
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
  // Start in a region, not the whole world sorted cheapest-first (D-58): the US,
  // or everywhere for someone whose money is in another currency.
  const [view, setView] = useState<"all" | "us" | "world">(displayCurrency && displayCurrency !== "USD" ? "all" : "us");
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; n: number } | null>(null);
  // Zoomed in, the list shows what the globe shows; "Show all" sets that aside until the view changes.
  const [inView, setInView] = useState<string[] | null>(null);
  const [allAnyway, setAllAnyway] = useState(false);
  const onView = useCallback((keys: string[] | null) => { setInView(keys); setAllAnyway(false); }, []);
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
    if (p) { setPlan(p); setMode("year"); if (!displayCurrency && p.currency && p.currency !== "USD") setView("all"); }
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
    // Once, on arrival: the starting view shouldn't jump if the currency changes later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // In the app, your plan's numbers win over anything saved in the browser.
  // In the app with an age, open on the badges (D-67); otherwise on the year.
  useEffect(() => { if (appPlan) { setPlan(appPlan); setMode(m => (m === "monthly" ? (appPlan.age != null ? "badge" : "year") : m)); } }, [appPlan]);

  const currency = displayCurrency ?? plan?.currency ?? "USD";
  const rates = displayRates ?? FALLBACK_RATES;
  const rate = currency === "USD" ? 1 : rates[currency] ?? 1;
  const money = useMemo(() => (n: number) => formatUSDInCurrency(n, currency, rates), [currency, rates]);
  const moneyShort = useMemo(() => (n: number) => formatUSDInCurrency(n, currency, rates, { compact: true }), [currency, rates]);
  const freedom = useMemo(() => new Map(EXPLORE_CITIES.map(c => [c.key, plan ? freedomIn(c, plan) : null])), [plan]);
  // Freedom badges (D-67): judged by the same age for everyone, so they need yours.
  const badges = useMemo(() => new Map(EXPLORE_CITIES.map(c => [c.key, plan ? freedomBadges(c, plan) : null])), [plan]);
  const retireAge = ageLabel(plan?.retireAge ?? BADGE_RETIRE_AGE);
  const best = useMemo(() => {
    let top: { key: string; rank: number } | null = null;
    for (const c of EXPLORE_CITIES) { const b = bestBadge(badges.get(c.key) ?? null); if (!b) continue;
      const rank = ({ bronze: 0, silver: 3, gold: 6 } as const)[b.metal] + b.stars; if (!top || rank > top.rank) top = { key: c.key, rank }; }
    if (!top) return null;
    const badge = bestBadge(badges.get(top.key) ?? null)!;
    // Many cities share the top badge: say how many, and name the cheapest as an example.
    const same = EXPLORE_CITIES.filter(c => { const b = bestBadge(badges.get(c.key) ?? null); return b && b.metal === badge.metal && b.stars === badge.stars; });
    return { city: same.sort((a, b) => a.annualUSD - b.annualUSD)[0], badge, count: same.length };
  }, [badges]);
  const filtered = useMemo(() => EXPLORE_CITIES
    .filter(c => (onlyStarred ? starred.has(c.key) : view === "all" || c.us === (view === "us")) && (!noTax || c.noIncomeTax))
    .sort((a, b) => a.monthlyUSD - b.monthlyUSD), [view, onlyStarred, starred, noTax]);
  const following = inView != null && !allAnyway && !onlyStarred;
  const list = useMemo(() => {
    if (!following) return filtered;
    const seen = new Set(inView);
    return filtered.filter(c => seen.has(c.key) || c.key === selected);
  }, [filtered, following, inView, selected]);
  const chosen = EXPLORE_CITIES.find(c => c.key === selected) ?? null;

  const toggleStar = (key: string) => setStarred(s => {
    const next = new Set(s); const on = !next.has(key); if (on) next.add(key); else next.delete(key);
    write(STARS_KEY, [...next]); trackExploreStarred({ starred: on }); return next;
  });
  const cardsRef = useRef<HTMLDivElement>(null);
  // From the map: bring its card into view. From a card: turn the globe to it.
  const choose = (key: string, from: "map" | "list" = "map") => {
    setSelected(key); trackExploreCityOpened({ mode });
    const c = EXPLORE_CITIES.find(x => x.key === key);
    if (from === "list" && c) setFlyTo(f => ({ lng: c.lng, lat: c.lat, n: (f?.n ?? 0) + 1 }));
    if (from === "map") { const i = list.findIndex(x => x.key === key); if (i >= shown) setShown(i + 12); }
  };
  useEffect(() => {
    if (!selected) return;
    const card = cardsRef.current?.querySelector(`[data-city="${selected}"]`);
    card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected, shown]);
  const changeMode = (m: PinMode) => { setMode(m); trackExploreModeChanged({ mode: m }); };
  const savePlan = (p: ExplorePlan) => { setPlan(p); setEditing(false); setMode("year"); saveExplorePlan(p); };

  const actions = chosen && <>
    {chosen.href && <Link href={chosen.href} className="uf-explore-action">{chosen.us || chosen.href.includes(chosen.key) ? `Open ${chosen.name}` : `Open ${chosen.place}`} →</Link>}
    {onPlanFor
      ? <button type="button" onClick={() => { onPlanFor(chosen.key); trackExplorePlanStarted(); }} className="uf-explore-action uf-explore-action-main" style={{ cursor: "pointer" }}>Plan for {chosen.name}</button>
      : <Link href={`/?start=onboarding&city=${encodeURIComponent(chosen.key)}&source=explore`} onClick={() => trackExplorePlanStarted()} className="uf-explore-action uf-explore-action-main">Plan {chosen.name} →</Link>}
  </>;
  const modes: [PinMode, string, boolean][] = [["monthly", `${getCurrencySymbol(currency)} / month`, true], ["year", "🏁 Year", !!plan], ["age", "🎂 Age", plan?.age != null], ["badge", "🏅 Badges", plan?.age != null]];
  return <div className="uf-explore" ref={box} style={boxHeight ? { height: boxHeight } : undefined}>
    <div className="uf-explore-head">
      {!appPlan && <h1 className="uf-t-display" style={{ margin: 0, fontSize: "clamp(26px, 4vw, 34px)" }}>Where could you retire?</h1>}
      <div role="radiogroup" aria-label="Pins show" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--uf-card)", justifySelf: "start" }}>
        {modes.map(([m, label, can]) => <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={!can} onClick={() => changeMode(m)}
          title={can ? undefined : m === "age" || m === "badge" ? "Add your age below" : "Add your numbers below"}
          style={{ ...chip(mode === m), border: 0, opacity: can ? 1 : 0.45, cursor: can ? "pointer" : "default" }}>{label}</button>)}
      </div>
      {plan && !editing
        ? <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13, background: "var(--uf-card)", borderRadius: 12, padding: "8px 12px" }}>
            <b>Your numbers</b><span style={{ fontFamily: "var(--uf-font-mono)" }}>🏦 {money(plan.saved)}</span><span style={{ fontFamily: "var(--uf-font-mono)" }}>📥 {money(plan.monthlySaving)}/mo</span>{plan.age != null && <span style={{ fontFamily: "var(--uf-font-mono)" }}>🎂 {plan.age}</span>}
            {!appPlan && <button type="button" onClick={() => setEditing(true)} style={{ marginLeft: "auto", border: 0, background: "none", color: "var(--uf-green)", fontWeight: 700, cursor: "pointer" }}>Edit</button>}</div>
        : editing || plan
          ? <PlanFields onDone={savePlan} currency={currency} rate={rate} />
          : <button type="button" onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", border: "1px solid var(--uf-border)", borderRadius: 12, background: "var(--uf-card)", color: "var(--uf-ink)", padding: "10px 12px", font: "inherit", fontSize: 14, cursor: "pointer" }}>
              <span aria-hidden>🏁</span><span style={{ flex: 1 }}>Add your numbers to see the year each city sets you free</span><b style={{ color: "var(--uf-green)" }}>Add →</b></button>}
      {mode === "badge" && best && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13, background: "var(--uf-card)", borderRadius: 12, padding: "8px 12px" }}>
        <b>Best badge</b><span>{MEDAL[best.badge.metal]}{"★".repeat(best.badge.stars)}</span><span>{best.count > 1 ? `in ${best.count} cities, like ${best.city.name}` : `in ${best.city.name}`}</span>
        <span style={{ color: "var(--uf-ink-3)", marginLeft: "auto" }}>by {retireAge} · hover a medal to read it</span></div>}
      <div className="uf-explore-chips">
        <button type="button" style={chip(view === "all" && !onlyStarred)} onClick={() => { setView("all"); setOnlyStarred(false); }}>🌐 All</button>
        <button type="button" style={chip(view === "us" && !onlyStarred)} onClick={() => { setView("us"); setOnlyStarred(false); }}><Flag emoji="🇺🇸" size={12} /> US</button>
        <button type="button" style={chip(view === "world" && !onlyStarred)} onClick={() => { setView("world"); setOnlyStarred(false); }}>🌍 Abroad</button>
        <button type="button" style={chip(onlyStarred)} onClick={() => setOnlyStarred(v => !v)}>★ Starred · {starred.size}</button>
        <button type="button" style={chip(noTax)} onClick={() => setNoTax(v => !v)}>🧾 No income tax</button>
      </div>
    </div>
    <div className="uf-explore-cards" ref={cardsRef}>
        {following && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--uf-ink-2)" }}>
          <span>{list.length} {list.length === 1 ? "city" : "cities"} in view</span>
          <button type="button" onClick={() => setAllAnyway(true)} style={{ border: 0, background: "none", color: "var(--uf-green)", fontWeight: 700, cursor: "pointer", font: "inherit" }}>Show all</button></div>}
        {list.length === 0 && <p style={{ color: "var(--uf-ink-2)" }}>{onlyStarred ? "Star a city to keep it here and on the map." : "No cities match."}</p>}
        {list.slice(0, shown).map((c, i) => <ExploreCard key={c.key} city={c} rank={i + 1} mode={mode} money={money} freedom={freedom.get(c.key) ?? null} badges={badges.get(c.key) ?? null} retireAge={retireAge} star={starred.has(c.key)}
          onStar={() => toggleStar(c.key)} selected={selected === c.key} onSelect={() => choose(c.key, "list")} actions={actions} />)}
        {list.length > shown && <button type="button" onClick={() => setShown(n => n + 48)} style={{ ...chip(false), justifySelf: "center" }}>Show {Math.min(48, list.length - shown)} more of {list.length}</button>}
    </div>
    <div className="uf-explore-mapwrap">
      <ExploreMap cities={onlyStarred || noTax ? filtered : EXPLORE_CITIES} focus={view} mode={mode} money={moneyShort} freedom={freedom} badges={badges} starred={starred} selected={selected} onSelect={choose} height={mapHeight} flyTo={flyTo} onView={onView} />
      <p title="Typical household spending per city. Your year keeps your savings as they are and retires on each city's cost at your way of spending." style={{ fontSize: 12, color: "var(--uf-ink-2)", margin: "8px 2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Typical household spending, in {currency}, at your way of spending.</p>
    </div>
  </div>;
}
