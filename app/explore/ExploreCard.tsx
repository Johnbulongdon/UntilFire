"use client";

/**
 * One city in Explore (D-58), Nomad List style: four corners and your value
 * as the badge. The backdrop is the place itself, its state or country outline
 * with the city pinned, so every card is specific without a photo to source.
 * The card is a picture surface, like a photo: deep green with white text in
 * both themes, so the theme tokens (which flip in dark mode) are not used here.
 */
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import stateTopology from "@/lib/geo/us-states.json";
import countryTopology from "@/lib/geo/countries-110m.json";
import { STATE_NAMES } from "@/lib/state-pages";
import Flag from "./Flag";
import { pinText, type Badges, type ExploreCity, type Freedom, type Metal, type PinMode } from "@/lib/explore";
import { MedalRow, METAL_MEANS, METAL_NAME, STAR_LIFE } from "./Medal";

type Named = { name: string };
const st = stateTopology as unknown as Topology<{ states: GeometryCollection<Named> }>;
const STATES = feature(st, st.objects.states) as FeatureCollection<Geometry, Named>;
const ct = countryTopology as unknown as Topology<{ countries: GeometryCollection<Named> }>;
const COUNTRIES = feature(ct, ct.objects.countries) as FeatureCollection<Geometry, Named>;
const ATLAS_NAME: Record<string, string> = { UK: "United Kingdom", UAE: "United Arab Emirates", "Czech Republic": "Czechia", "New York City": "New York" };
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const W = 330, H = 92;

function shapeFor(c: ExploreCity): Feature | undefined {
  const name = c.us ? STATE_NAMES[c.region] : c.place;
  const atlas = ATLAS_NAME[name] ?? name;
  return (c.us ? STATES : COUNTRIES).features.find(f => f.properties.name === atlas);
}

/** Outline and city point per city, worked out once: the list re-renders as the map moves. */
const OUTLINES = new Map<string, { d: string; x: number; y: number } | null>();
function outline(c: ExploreCity) {
  if (OUTLINES.has(c.key)) return OUTLINES.get(c.key)!;
  const shape = shapeFor(c);
  let out: { d: string; x: number; y: number } | null = null;
  if (shape) {
    const proj = geoMercator().fitExtent([[W * 0.45, 16], [W - 14, H - 16]], shape);
    const p = proj([c.lng, c.lat]);
    // A city far off the mainland (an island) would shrink the shape to nothing: frame the city instead.
    if (p && p[0] >= W * 0.4 && p[0] <= W && p[1] >= 0 && p[1] <= H) out = { d: geoPath(proj)(shape) ?? "", x: p[0], y: p[1] };
  }
  OUTLINES.set(c.key, out);
  return out;
}

/** The place's outline, fitted to the right of the card, with the city marked. */
function Place({ c }: { c: ExploreCity }) {
  const o = outline(c);
  if (!o) return null;
  const p = [o.x, o.y];
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
    <path d={o.d} fill="#ffffff1f" stroke="#ffffff66" strokeWidth={1} />
    <circle cx={p[0]} cy={p[1]} r={13} fill="#ffffff26" /><circle cx={p[0]} cy={p[1]} r={4} fill="#fff" />
  </svg>;
}

/** Effective income tax as a range ("21–29% tax"), or one figure where the data has one. */
function taxFact(c: ExploreCity) {
  if (!c.tax) return null;
  const lo = Math.round(c.tax.low), hi = Math.round(c.tax.high);
  return lo === hi ? `~${lo}% tax` : `${lo}–${hi}% tax`;
}

export default function ExploreCard({ city, rank, mode, money, freedom, badges = null, retireAge = "59½", star, onStar, selected, onSelect, actions }: {
  city: ExploreCity; rank: number; mode: PinMode; freedom: Freedom | null; star: boolean;
  /** Freedom badges for this city (D-67), shown in badge mode. */
  badges?: Badges | null; retireAge?: string;
  /** A USD amount in your currency, in full. */
  money: (usd: number) => string;
  onStar: () => void; selected: boolean; onSelect: () => void;
  /** Shown inside the card once it is chosen: open its page, plan for it. */
  actions?: React.ReactNode;
}) {
  const badge = mode === "monthly" ? money(city.monthlyUSD) : mode === "badge" ? pinText(city, mode, freedom, undefined, badges) : `${mode === "year" ? "🏁" : "🎂"} ${pinText(city, mode, freedom)}`;
  const other = mode === "monthly" ? (freedom ? `🏁 ${Math.floor(freedom.at)}` : null) : `${money(city.monthlyUSD)}/mo`;
  const fact = taxFact(city);
  // Compact (D-58): name and badge on one line, the facts on the next, so a column shows six or seven places.
  return <div className="uf-explore-card" data-city={city.key} style={{ position: "relative", borderRadius: 14, overflow: "hidden", color: "#fff",
    background: "linear-gradient(150deg, #2B5A41, #15291F)", boxShadow: selected ? "0 0 0 3px var(--uf-teal)" : "0 1px 4px #203e3022" }}>
    <div style={{ position: "relative", height: H }}>
      <Place c={city} />
      <button type="button" onClick={onSelect} aria-label={`${city.name}, ${city.place}: ${badge}`} aria-pressed={selected}
        style={{ position: "absolute", inset: 0, border: 0, background: "transparent", cursor: "pointer" }} />
      <div style={{ position: "absolute", left: 12, right: 12, top: 10, display: "flex", alignItems: "center", gap: 8, pointerEvents: "none", textShadow: "0 1px 4px #0009" }}>
        <button type="button" onClick={onStar} aria-label={star ? `Unstar ${city.name}` : `Star ${city.name}`} aria-pressed={star}
          style={{ pointerEvents: "auto", border: 0, background: "transparent", padding: 0, cursor: "pointer", fontSize: 18, lineHeight: 1, color: star ? "var(--uf-sun)" : "#fff" }}>{star ? "★" : "☆"}</button>
        <span style={{ font: "600 20px var(--uf-font-display, Fraunces), Georgia, serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{city.name}</span>
        {mode === "badge" && badges
          ? <span style={{ marginLeft: "auto", pointerEvents: "auto", textShadow: "none" }}><MedalRow badges={badges} size={22} retireAge={retireAge} /></span>
          : <span style={{ marginLeft: "auto", ...mono, fontSize: 15, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "#087D69", color: "#fff", whiteSpace: "nowrap", textShadow: "none" }}>{badge}{mode === "monthly" && <span style={{ fontSize: 11, opacity: 0.85 }}>/mo</span>}</span>}
      </div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 12, pointerEvents: "none", textShadow: "0 1px 3px #0008" }}>
        <span style={{ opacity: 0.8, ...mono }}>#{rank}</span>
        <span><Flag emoji={city.flag} size={11} /> {city.place}</span>
        {other && <span style={mono}>{other}</span>}
        {fact && <span style={{ opacity: 0.9 }}>🧾 {fact}</span>}
      </div>
    </div>
    {/* Opened in badge mode: the medals in words (D-67). */}
    {selected && mode === "badge" && badges && <div style={{ display: "grid", gap: 6, padding: "0 12px 10px", fontSize: 12.5 }}>
      {(["bronze", "silver", "gold"] as Metal[]).map((m) => <div key={m} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <b style={{ minWidth: 92, color: `var(--uf-${m})` }}>{METAL_NAME[m]} {"★".repeat(badges[m]) || "—"}</b>
        <span style={{ opacity: 0.92 }}>{METAL_MEANS[m]}: {m === "gold" && !badges.goldJudged ? "add your take-home to see it" : badges[m] ? `${STAR_LIFE[badges[m]].toLowerCase()} by ${retireAge}` : `not by ${retireAge}`}</span>
      </div>)}
      <span style={{ opacity: 0.75, fontSize: 11.5 }}>★ frugal 75% · ★★ medium · ★★★ wealthy 150% of the typical cost. Taxes, healthcare, visas and currency there are not counted.</span>
    </div>}
    {selected && actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 12px 12px" }}>{actions}</div>}
  </div>;
}
