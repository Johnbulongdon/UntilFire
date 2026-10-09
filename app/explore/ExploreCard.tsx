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
import { pinText, type ExploreCity, type Freedom, type PinMode } from "@/lib/explore";

type Named = { name: string };
const st = stateTopology as unknown as Topology<{ states: GeometryCollection<Named> }>;
const STATES = feature(st, st.objects.states) as FeatureCollection<Geometry, Named>;
const ct = countryTopology as unknown as Topology<{ countries: GeometryCollection<Named> }>;
const COUNTRIES = feature(ct, ct.objects.countries) as FeatureCollection<Geometry, Named>;
const ATLAS_NAME: Record<string, string> = { UK: "United Kingdom", UAE: "United Arab Emirates", "Czech Republic": "Czechia", "New York City": "New York" };
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const W = 330, H = 160;

function shapeFor(c: ExploreCity): Feature | undefined {
  const name = c.us ? STATE_NAMES[c.region] : c.place;
  const atlas = ATLAS_NAME[name] ?? name;
  return (c.us ? STATES : COUNTRIES).features.find(f => f.properties.name === atlas);
}

/** The place's outline, fitted to the right of the card, with the city marked. */
function Place({ c }: { c: ExploreCity }) {
  const shape = shapeFor(c);
  if (!shape) return null;
  const proj = geoMercator().fitExtent([[W * 0.45, 16], [W - 14, H - 16]], shape);
  const p = proj([c.lng, c.lat]);
  // A city far off the mainland (an island) would shrink the shape to nothing: frame the city instead.
  if (!p || p[0] < W * 0.4 || p[0] > W || p[1] < 0 || p[1] > H) return null;
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
    <path d={geoPath(proj)(shape) ?? ""} fill="#ffffff1f" stroke="#ffffff66" strokeWidth={1} />
    <circle cx={p[0]} cy={p[1]} r={13} fill="#ffffff26" /><circle cx={p[0]} cy={p[1]} r={4} fill="#fff" />
  </svg>;
}

/** Effective income tax as a range ("21–29% tax"), or one figure where the data has one. */
function taxFact(c: ExploreCity) {
  if (!c.tax) return null;
  const lo = Math.round(c.tax.low), hi = Math.round(c.tax.high);
  return lo === hi ? `~${lo}% tax` : `${lo}–${hi}% tax`;
}

export default function ExploreCard({ city, rank, mode, money, freedom, star, onStar, selected, onSelect }: {
  city: ExploreCity; rank: number; mode: PinMode; freedom: Freedom | null; star: boolean;
  /** A USD amount in your currency, in full. */
  money: (usd: number) => string;
  onStar: () => void; selected: boolean; onSelect: () => void;
}) {
  const corner: React.CSSProperties = { position: "absolute", fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px #0008" };
  const badge = mode === "monthly" ? money(city.monthlyUSD) : `${mode === "year" ? "🏁" : "🎂"} ${pinText(city, mode, freedom)}`;
  const other = mode === "monthly" ? (freedom ? `🏁 ${Math.floor(freedom.at)}` : "") : `${money(city.monthlyUSD)}/mo`;
  const fact = taxFact(city);
  return <div className="uf-explore-card" style={{ position: "relative", height: H, borderRadius: 16, overflow: "hidden", color: "#fff",
    background: "linear-gradient(150deg, #2B5A41, #15291F)", boxShadow: selected ? "0 0 0 3px var(--uf-teal)" : "0 1px 4px #203e3022" }}>
    <Place c={city} />
    <button type="button" onClick={onSelect} aria-label={`${city.name}, ${city.place}: ${badge}`} aria-pressed={selected}
      style={{ position: "absolute", inset: 0, border: 0, background: "transparent", cursor: "pointer" }} />
    <button type="button" onClick={onStar} aria-label={star ? `Unstar ${city.name}` : `Star ${city.name}`} aria-pressed={star}
      style={{ ...corner, top: 4, left: 4, border: 0, background: "transparent", padding: 6, cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
      <span aria-hidden style={{ fontSize: 18, lineHeight: 1, color: star ? "var(--uf-sun)" : "#fff" }}>{star ? "★" : "☆"}</span>#{rank}
    </button>
    {fact && <span style={{ ...corner, top: 10, right: 12 }}>🧾 {fact}</span>}
    <div style={{ position: "absolute", left: 14, top: 44, pointerEvents: "none", textShadow: "0 1px 4px #0009" }}>
      <div style={{ font: "600 22px var(--uf-font-display, Fraunces), Georgia, serif" }}>{city.name}</div>
      <div style={{ fontSize: 12, opacity: 0.95 }}><Flag emoji={city.flag} size={11} /> {city.place}</div>
    </div>
    <span style={{ ...corner, bottom: 10, left: 12, pointerEvents: "none", ...mono }}>{other}</span>
    <span style={{ position: "absolute", bottom: 8, right: 10, pointerEvents: "none", ...mono, fontSize: 15, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "#087D69", color: "#fff" }}>{badge}{mode === "monthly" && <span style={{ fontSize: 11, opacity: 0.85 }}>/mo</span>}</span>
  </div>;
}
