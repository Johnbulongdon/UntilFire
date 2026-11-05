"use client";

import { Button } from "@/components/ui";
import Flag from "@/app/components/Flag";
import { EXPLORE_CITIES, freedomIn, type ExploreCity, type ExplorePlan } from "@/lib/explore";

/**
 * Explore in the app, first (John, 5 Nov 2026): where your own saving sets you
 * free sooner than home. Your home city, your best three, and one to try in
 * your plan; the full globe, list and badges sit behind "See all".
 * Best three come from cities with their own page, one a country, so each
 * is a place people actually look at, not just the cheapest dot on the map.
 */
export default function ExploreBest({ plan, homeKey, money, onTry, onSeeAll }: {
  plan: ExplorePlan; homeKey?: string | null; money: (usd: number) => string;
  onTry?: (key: string) => void; onSeeAll: () => void;
}) {
  const home = EXPLORE_CITIES.find((c) => c.key === homeKey) ?? null;
  const homeFree = home ? freedomIn(home, plan) : null;
  const when = (f: { at: number; age: number | null }) => (f.age != null ? `Free at ${f.age} in ${Math.floor(f.at)}` : `Free in ${Math.floor(f.at)}`);
  const best = EXPLORE_CITIES
    .filter((c) => c.href && c.key !== home?.key)
    .map((c) => ({ c, f: freedomIn(c, plan) }))
    .filter((x): x is { c: ExploreCity; f: NonNullable<typeof x.f> } => x.f !== null && (!homeFree || x.f.years < homeFree.years - 0.05))
    .sort((a, b) => a.f.years - b.f.years)
    // One a country, so the three are three different choices.
    .filter((x, i, all) => all.findIndex((y) => y.c.flag === x.c.flag) === i).slice(0, 3);
  const card = { borderRadius: 18, padding: 16, display: "grid", gap: 8 } as const;

  return <div style={{ display: "grid", gap: 14, maxWidth: 640 }}>
    <div><h2 className="uf-t-h2" style={{ margin: 0 }}>Where you&apos;d be free sooner</h2>
      <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "4px 0 0" }}>From your saving of {money(plan.monthlySaving)} a month and {money(plan.saved)} saved.</p></div>

    {home && homeFree && <section aria-label="Your city" style={{ ...card, background: "var(--uf-yellow)", color: "#151719" }}>
      <span className="uf-t-small" style={{ color: "#5C5130", fontWeight: 700 }}><Flag emoji={home.flag} size={12} /> {home.name}, where you plan now</span>
      <span style={{ font: "800 clamp(24px, 5vw, 32px)/1.1 var(--uf-font-display)" }}>{when(homeFree)}</span>
    </section>}

    <section aria-label="Your best 3" style={{ ...card, background: "var(--uf-card)", border: "1px solid var(--uf-border)" }}>
      <b className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-ink)" }}>{best.length ? `Your best ${best.length}` : "Your city is already one of the soonest"}</b>
      {best.map(({ c, f }) => {
        const lower = home ? Math.round((1 - c.annualUSD / home.annualUSD) * 100) : null;
        return <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Flag emoji={c.flag} size={18} />
          <span style={{ flex: 1, minWidth: 0 }}><b className="uf-t-small" style={{ fontWeight: 700, display: "block", color: "var(--uf-ink)" }}>{c.name}{c.place && <span style={{ color: "var(--uf-ink-3)", fontWeight: 500 }}>, {c.place}</span>}</b>
            {lower !== null && lower > 0 && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Living costs {lower}% lower</span>}</span>
          <span className="uf-t-small" style={{ textAlign: "right", flexShrink: 0 }}>
            {homeFree && <b style={{ display: "block", color: "var(--uf-pos-ink)" }}>{(homeFree.years - f.years).toFixed(1)} yrs sooner</b>}
            <span style={{ color: "var(--uf-ink-3)" }}>{f.age != null ? `free at ${f.age}` : `free in ${Math.floor(f.at)}`}</span></span>
        </div>;
      })}
    </section>

    {best[0] && onTry && <section aria-label="Try one in your plan" style={{ ...card, background: "var(--uf-blue)", color: "var(--uf-ink)" }}>
      <b className="uf-t-small" style={{ fontWeight: 700 }}>Try one in your plan</b>
      <span className="uf-t-small">Your plan and freedom date will use {best[0].c.name}&apos;s living costs. You can switch back any time.</span>
      <span><Button size="sm" onClick={() => onTry(best[0].c.key)}>Try {best[0].c.name}</Button></span>
    </section>}

    <span><Button size="sm" variant="secondary" onClick={onSeeAll}>See all cities, badges and map</Button></span>
  </div>;
}
