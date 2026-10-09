"use client";

/**
 * The Explore map (D-58): one globe for every city, US and abroad, drawn from
 * outlines (not map tiles) so it is light and on brand. One pin per country
 * until you zoom in, then one per city, with US state lines once you are close.
 * Numbers only ever sit inside pins; a pin with no room becomes a dot you can
 * still tap.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import stateTopology from "@/lib/geo/us-states.json";
import countryTopology from "@/lib/geo/countries-110m.json";
import Flag from "./Flag";
import { countryPins, pinText, pinWidth, placePins, type ExploreCity, type Freedom, type PinMode } from "@/lib/explore";

type Named = { name: string };
const st = stateTopology as unknown as Topology<{ states: GeometryCollection<Named> }>;
const STATE_LINES = mesh(st, st.objects.states, (a, b) => a !== b);
const ct = countryTopology as unknown as Topology<{ countries: GeometryCollection<Named> }>;
const COUNTRIES = feature(ct, ct.objects.countries) as FeatureCollection<Geometry, Named>;
const BORDERS = mesh(ct, ct.objects.countries, (a, b) => a !== b);
/** Zoom past this and country pins split into cities. */
const CITY_ZOOM = 2.4;
/** Where each list filter turns the globe: the US close up, the world from the Atlantic. */
const FOCUS: Record<"all" | "us" | "world", { rotate: [number, number]; zoom: number }> = {
  all: { rotate: [45, -32], zoom: 1 },
  us: { rotate: [97, -38], zoom: 3.4 },
  world: { rotate: [-15, -28], zoom: 1 },
};
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

export default function ExploreMap({ cities, focus, mode, money, freedom, starred, selected, onSelect, height }: {
  cities: ExploreCity[];
  /** Turns the globe when the list filter changes; you can drag and zoom from there. */
  focus: "all" | "us" | "world";
  /** Money in your currency, compact. */
  money: (usd: number) => string;
  mode: PinMode;
  freedom: Map<string, Freedom | null>;
  starred: Set<string>;
  selected: string | null;
  onSelect: (key: string) => void;
  height: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [rotate, setRotate] = useState<[number, number]>(FOCUS[focus].rotate);
  const [zoom, setZoom] = useState(FOCUS[focus].zoom);
  useEffect(() => { setRotate(FOCUS[focus].rotate); setZoom(FOCUS[focus].zoom); }, [focus]);
  const drag = useRef<{ x: number; y: number; r: [number, number] } | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const projection = useMemo(() => {
    if (!width) return null;
    const base = Math.min(width, height) / 2 - 12;
    return geoOrthographic().rotate(rotate).translate([width / 2, height / 2]).scale(base * zoom).clipAngle(90);
  }, [width, height, rotate, zoom]);

  const pins = useMemo(() => {
    if (!projection) return [];
    const points = zoom >= CITY_ZOOM
      ? cities.map(c => ({ key: c.key, lat: c.lat, lng: c.lng, label: pinText(c, mode, freedom.get(c.key) ?? null, money), flag: null as string | null, city: c }))
      : countryPins(cities).map(g => ({ key: `country:${g.region}`, lat: g.lat, lng: g.lng, label: pinText(g.mid, mode, freedom.get(g.mid.key) ?? null, money), flag: g.flag as string | null, city: g.mid }));
    // Selected first, then starred, then everything else in list order.
    const rank = (k: string) => (k === selected ? 0 : starred.has(k) ? 1 : 2);
    const visible = points.flatMap(p => {
      const xy = projection([p.lng, p.lat]);
      if (!xy || xy[0] < 0 || xy[0] > width || xy[1] < 0 || xy[1] > height) return [];
      // On the globe, skip the far side.
      if (geoDistance([p.lng, p.lat], [-rotate[0], -rotate[1]]) > Math.PI / 2 - 0.05) return [];
      return [{ ...p, x: xy[0], y: xy[1] }];
    }).sort((a, b) => rank(a.city.key) - rank(b.city.key));
    const placed = placePins(visible.map(p => ({ key: p.key, x: p.x, y: p.y, width: pinWidth(p.label) + (p.flag ? 20 : 0) })), { width, height }, new Set([...starred, ...(selected ? [selected] : [])]));
    return placed.map((pl, i) => ({ ...pl, ...visible[i] }));
  }, [projection, cities, mode, money, freedom, starred, selected, zoom, width, height, rotate]);

  const path = projection ? geoPath(projection) : null;
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, r: rotate }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const k = 0.35 / zoom;
    setRotate([d.r[0] + (e.clientX - d.x) * k, Math.max(-70, Math.min(70, d.r[1] - (e.clientY - d.y) * k))]);
  };
  const tap = (key: string, lng: number, lat: number) => {
    // A country pin zooms into its cities; a city pin selects it.
    if (key.startsWith("country:")) { setRotate([-lng, -lat]); setZoom(z => Math.max(z, CITY_ZOOM * 1.4)); return; }
    onSelect(key);
  };

  return <div ref={box} className="uf-explore-map" style={{ position: "relative", height, borderRadius: 16, overflow: "hidden", touchAction: "none",
    background: "var(--uf-surface)", cursor: "grab" }}
    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    {path && <svg width={width} height={height} style={{ position: "absolute", inset: 0 }} aria-hidden>
      <path d={path({ type: "Sphere" }) ?? ""} fill="color-mix(in srgb, var(--uf-teal) 12%, var(--uf-surface-2))" />
      <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="var(--uf-border)" strokeWidth={0.4} />
      {COUNTRIES.features.map((f, i) => <path key={i} d={path(f) ?? ""} fill="var(--uf-card)" />)}
      <path d={path(BORDERS) ?? ""} fill="none" stroke="var(--uf-border-2)" strokeWidth={0.5} strokeOpacity={0.7} />
      {zoom >= CITY_ZOOM && <path d={path(STATE_LINES) ?? ""} fill="none" stroke="var(--uf-border)" strokeWidth={0.6} />}
    </svg>}
    {pins.map(p => {
      const sel = p.city.key === selected, star = starred.has(p.city.key);
      if (!p.side) return <button key={p.key} type="button" aria-label={`${p.city.name} ${p.label}`} onClick={() => tap(p.key, p.lng, p.lat)}
        style={{ position: "absolute", left: p.x, top: p.y, width: 9, height: 9, padding: 0, transform: "translate(-50%,-50%)", borderRadius: 99, border: "1.5px solid var(--uf-card)", background: sel ? "var(--uf-ink)" : "var(--uf-ink-2)", cursor: "pointer" }} />;
      const shift = { up: "translate(-50%, calc(-100% - 6px))", down: "translate(-50%, 6px)", right: "translate(6px, -50%)", left: "translate(calc(-100% - 6px), -50%)" }[p.side];
      return <button key={p.key} type="button" aria-label={`${p.city.name}${p.key.startsWith("country:") ? ` and ${p.city.place}` : ""}: ${p.label}`} aria-pressed={sel}
        onClick={() => tap(p.key, p.lng, p.lat)}
        style={{ position: "absolute", left: p.x, top: p.y, transform: shift, zIndex: sel ? 3 : star ? 2 : 1, ...mono, fontSize: 11, fontWeight: 700, padding: "3px 7px", borderRadius: 7, whiteSpace: "nowrap", cursor: "pointer",
          background: sel || star ? "var(--uf-ink)" : "var(--uf-card)", color: sel || star ? "var(--uf-card)" : "var(--uf-ink)", border: sel || star ? "1px solid transparent" : "1px solid var(--uf-border-2)", boxShadow: "0 1px 3px #203e3033" }}>
        {star && <span aria-hidden style={{ color: "var(--uf-sun)" }}>★ </span>}{p.flag && <><Flag emoji={p.flag} size={11} />{" "}</>}{p.label}
      </button>;
    })}
    <div style={{ position: "absolute", right: 10, bottom: 10, display: "grid", gap: 6, zIndex: 4 }}>
      {[["+", 1.6], ["−", 1 / 1.6]].map(([l, k]) => <button key={l as string} type="button" aria-label={l === "+" ? "Zoom in" : "Zoom out"} onClick={() => setZoom(z => Math.max(1, Math.min(12, z * (k as number))))}
        style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", color: "var(--uf-ink)", fontSize: 18, cursor: "pointer" }}>{l}</button>)}
    </div>
  </div>;
}
