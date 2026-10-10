"use client";

/**
 * The Explore map (D-58): one globe for every city, US and abroad, drawn from
 * outlines (not map tiles) so it is light and on brand. One pin per country
 * until you zoom in, then one per city: zooming adds the name to the flag and
 * value, never swaps them. State and province lines show once you are close.
 * Numbers only ever sit inside pins; a pin with no room becomes a dot you can
 * still tap.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection, GeometryObject } from "topojson-specification";
import type { FeatureCollection, Geometry, MultiLineString, Position } from "geojson";
import stateTopology from "@/lib/geo/us-states.json";
import countryTopology from "@/lib/geo/countries-110m.json";
import Flag from "./Flag";
import { countryPins, pinText, pinWidth, placePins, type Badges, type ExploreCity, type Freedom, type PinMode } from "@/lib/explore";

type Named = { name: string };
const st = stateTopology as unknown as Topology<{ states: GeometryCollection<Named> }>;
const STATE_LINES: MultiLineString = mesh(st, st.objects.states, (a, b) => a !== b);
const ct = countryTopology as unknown as Topology<{ countries: GeometryCollection<Named> }>;
const COUNTRIES = feature(ct, ct.objects.countries) as FeatureCollection<Geometry, Named>;
const BORDERS = mesh(ct, ct.objects.countries, (a, b) => a !== b);
const GRATICULE = geoGraticule10();
/** Border lines split into pieces with a centre and reach, so a frame only projects what can be seen. */
type Piece = { coords: Position[]; c: [number, number]; r: number };
function piecesOf(lines: MultiLineString): Piece[] {
  return lines.coordinates.map(coords => {
    const c: [number, number] = [coords.reduce((s, p) => s + p[0], 0) / coords.length, coords.reduce((s, p) => s + p[1], 0) / coords.length];
    return { coords, c, r: Math.max(...coords.map(p => geoDistance(c, p as [number, number]))) };
  });
}
const STATE_PIECES = piecesOf(STATE_LINES);
const SPHERE = { type: "Sphere" } as const;
/** Zoom past this and country pins split into cities. */
const CITY_ZOOM = 2.4;
/** Close enough to pull apart neighbouring cities (Dallas and Fort Worth, Tampa and St. Petersburg). */
const MAX_ZOOM = 40;
/** Where each list filter turns the globe: the US close up, the world from the Atlantic. */
const FOCUS: Record<"all" | "us" | "world", { rotate: [number, number]; zoom: number }> = {
  all: { rotate: [45, -32], zoom: 1 },
  us: { rotate: [97, -38], zoom: 3.4 },
  world: { rotate: [-15, -28], zoom: 1 },
};
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

export default function ExploreMap({ cities, focus, mode, money, freedom, badges, starred, selected, onSelect, height, flyTo, onView }: {
  /** Turn to a city chosen in the list; `n` changes on every request, so the same city can be asked for twice. */
  flyTo?: { lng: number; lat: number; n: number } | null;
  /** Zoomed in: the keys of the cities in view, so the list can follow the map. Zoomed out: null. */
  onView?: (keys: string[] | null) => void;
  cities: ExploreCity[];
  /** Turns the globe when the list filter changes; you can drag and zoom from there. */
  focus: "all" | "us" | "world";
  /** Money in your currency, compact. */
  money: (usd: number) => string;
  mode: PinMode;
  freedom: Map<string, Freedom | null>;
  /** Freedom badges per city (D-67), for badge mode. */
  badges?: Map<string, Badges | null>;
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
  // State and province borders beyond the US: about 150 KB, so fetched only once you zoom in.
  const [provinces, setProvinces] = useState<Piece[] | null>(null);
  useEffect(() => {
    if (zoom < CITY_ZOOM || provinces) return;
    import("@/lib/geo/admin1-lines.json").then(m => {
      const t = (m.default ?? m) as unknown as Topology<{ lines: GeometryObject }>;
      setProvinces(piecesOf(mesh(t, t.objects.lines)));
    }).catch(() => {});
  }, [zoom, provinces]);
  useEffect(() => { if (flyTo) { setRotate([-flyTo.lng, -flyTo.lat]); setZoom(z => Math.max(z, CITY_ZOOM * 1.4)); } }, [flyTo]);
  // The wheel listener lives outside React, so it reads the view through refs.
  const view = useRef({ rotate, zoom, height });
  view.current = { rotate, zoom, height };
  const drag = useRef<{ x: number; y: number; r: [number, number] } | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    // Scroll to zoom. Listened for directly, not through React, so the page
    // itself doesn't scroll while the pointer is over the globe.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const { rotate: r, zoom: z, height: h } = view.current, w = el.clientWidth;
      const next = Math.max(1, Math.min(MAX_ZOOM, z * Math.exp(-e.deltaY * 0.0015)));
      // Zooming in leans the globe toward the point under the pointer, like a map app.
      if (next > z) {
        const box = el.getBoundingClientRect();
        const at = geoOrthographic().rotate(r).translate([w / 2, h / 2]).scale((Math.min(w, h) / 2 - 12) * z).clipAngle(90)
          .invert?.([e.clientX - box.left, e.clientY - box.top]);
        if (at && Number.isFinite(at[0])) {
          const t = 1 - z / next, dLng = ((-at[0] - r[0] + 540) % 360) - 180;
          setRotate([r[0] + dLng * t, r[1] + (-at[1] - r[1]) * t]);
        }
      }
      setZoom(next);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener("wheel", wheel); };
  }, []);

  const projection = useMemo(() => {
    if (!width) return null;
    const base = Math.min(width, height) / 2 - 12;
    // No adaptive resampling: the outlines are dense enough, and resampling every edge each frame was the slow part.
    return geoOrthographic().rotate(rotate).translate([width / 2, height / 2]).scale(base * zoom).clipAngle(90).precision(0);
  }, [width, height, rotate, zoom]);

  const pins = useMemo(() => {
    if (!projection) return [];
    const points = zoom >= CITY_ZOOM
      ? cities.map(c => ({ key: c.key, lat: c.lat, lng: c.lng, label: pinText(c, mode, freedom.get(c.key) ?? null, money, badges?.get(c.key)), flag: c.flag as string | null, name: c.name as string | null, city: c }))
      : countryPins(cities).map(g => ({ key: `country:${g.region}`, lat: g.lat, lng: g.lng, label: pinText(g.mid, mode, freedom.get(g.mid.key) ?? null, money, badges?.get(g.mid.key)), flag: g.flag as string | null, name: null as string | null, city: g.mid }));
    // Selected first, then starred, then everything else in list order.
    const rank = (k: string) => (k === selected ? 0 : starred.has(k) ? 1 : 2);
    const visible = points.flatMap(p => {
      const xy = projection([p.lng, p.lat]);
      if (!xy || xy[0] < 0 || xy[0] > width || xy[1] < 0 || xy[1] > height) return [];
      // On the globe, skip the far side.
      if (geoDistance([p.lng, p.lat], [-rotate[0], -rotate[1]]) > Math.PI / 2 - 0.05) return [];
      return [{ ...p, x: xy[0], y: xy[1] }];
    }).sort((a, b) => rank(a.city.key) - rank(b.city.key));
    const placed = placePins(visible.map(p => ({ key: p.key, x: p.x, y: p.y, width: pinWidth(p.label) + (p.flag ? 20 : 0) + (p.name ? p.name.length * 6.4 + 6 : 0) })), { width, height }, new Set([...starred, ...(selected ? [selected] : [])]));
    return placed.map((pl, i) => ({ ...pl, ...visible[i] }));
  }, [projection, cities, mode, money, freedom, badges, starred, selected, zoom, width, height, rotate]);
  const inView = zoom >= CITY_ZOOM ? pins.filter(p => !p.key.startsWith("country:")).map(p => p.key).sort().join(",") : null;
  // The list follows once the globe settles, not on every frame of a drag.
  useEffect(() => {
    const t = setTimeout(() => onView?.(inView == null ? null : inView ? inView.split(",") : []), 180);
    return () => clearTimeout(t);
  }, [inView, onView]);

  // The land is drawn on a canvas: hundreds of SVG paths re-laid out on every frame made dragging stutter.
  const canvas = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(t => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => mo.disconnect();
  }, []);
  // Theme colours, read once per theme rather than on every frame.
  const colors = useMemo(() => {
    if (typeof window === "undefined") return {} as Record<string, string>;
    const css = getComputedStyle(document.documentElement);
    return Object.fromEntries(["--uf-surface-2", "--uf-teal", "--uf-border", "--uf-border-2", "--uf-card", "--uf-green", "--uf-ink-2"].map(n => [n, css.getPropertyValue(n).trim()]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  useEffect(() => {
    const cv = canvas.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx || !projection) return;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(width * dpr) || cv.height !== Math.round(height * dpr)) { cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const token = (n: string) => colors[n] ?? "";
    const draw = geoPath(projection, ctx);
    const paint = (g: Parameters<typeof draw>[0], how: "fill" | "stroke", color: string, alpha = 1, w = 1) => {
      ctx.beginPath(); draw(g); ctx.globalAlpha = alpha;
      if (how === "fill") { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); }
      ctx.globalAlpha = 1;
    };
    const close = zoom >= CITY_ZOOM;
    // How far from the centre of view the frame reaches, in radians, on the globe.
    const reach = Math.asin(Math.min(1, Math.hypot(width, height) / 2 / projection.scale()));
    const centre: [number, number] = [-rotate[0], -rotate[1]];
    const seen = (ps: Piece[]): MultiLineString => ({ type: "MultiLineString", coordinates: ps.filter(p => geoDistance(p.c, centre) - p.r < reach).map(p => p.coords) });
    paint(SPHERE, "fill", token("--uf-surface-2")); paint(SPHERE, "fill", token("--uf-teal"), 0.12);
    paint(GRATICULE, "stroke", token("--uf-border"), 1, 0.4);
    paint(COUNTRIES, "fill", token("--uf-card")); paint(COUNTRIES, "fill", token("--uf-green"), 0.05);
    // Up close, state and province lines under firmer country borders, like a road map.
    if (close) { paint(seen(STATE_PIECES), "stroke", token("--uf-border-2"), 1, 0.8); if (provinces) paint(seen(provinces), "stroke", token("--uf-border-2"), 1, 0.8); }
    paint(BORDERS, "stroke", token(close ? "--uf-ink-2" : "--uf-border-2"), close ? 0.45 : 0.7, close ? 1.1 : 0.5);
  }, [projection, width, height, zoom, rotate, provinces, colors]);
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, r: rotate }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  // Pointer events can outpace the screen: apply the latest one once per frame.
  const frame = useRef(0);
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const k = 0.35 / zoom, x = e.clientX, y = e.clientY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setRotate([d.r[0] + (x - d.x) * k, Math.max(-70, Math.min(70, d.r[1] - (y - d.y) * k))]));
  };
  const tap = (key: string, lng: number, lat: number) => {
    // A country pin zooms into its cities; a city pin selects it.
    if (key.startsWith("country:")) { setRotate([-lng, -lat]); setZoom(z => Math.max(z, CITY_ZOOM * 1.4)); return; }
    onSelect(key);
  };

  return <div ref={box} className="uf-explore-map" style={{ position: "relative", height, borderRadius: 16, overflow: "hidden", touchAction: "none",
    background: "var(--uf-surface)", cursor: "grab" }}
    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    <canvas ref={canvas} style={{ position: "absolute", inset: 0, width, height }} aria-hidden />
    {pins.map(p => {
      const sel = p.city.key === selected, star = starred.has(p.city.key);
      if (!p.side) return <button key={p.key} type="button" aria-label={`${p.city.name} ${p.label}`} onClick={() => tap(p.key, p.lng, p.lat)}
        style={{ position: "absolute", left: p.x, top: p.y, width: 9, height: 9, padding: 0, transform: "translate(-50%,-50%)", borderRadius: 99, border: "1.5px solid var(--uf-card)", background: sel ? "var(--uf-ink)" : "var(--uf-ink-2)", cursor: "pointer" }} />;
      const shift = { up: "translate(-50%, calc(-100% - 6px))", down: "translate(-50%, 6px)", right: "translate(6px, -50%)", left: "translate(calc(-100% - 6px), -50%)" }[p.side];
      return <button key={p.key} type="button" aria-label={`${p.city.name}${p.key.startsWith("country:") ? ` and ${p.city.place}` : ""}: ${p.label}`} aria-pressed={sel}
        onClick={() => tap(p.key, p.lng, p.lat)}
        style={{ position: "absolute", left: p.x, top: p.y, transform: shift, zIndex: sel ? 3 : star ? 2 : 1, ...mono, fontSize: 11, fontWeight: 700, padding: "3px 7px", borderRadius: 7, whiteSpace: "nowrap", cursor: "pointer",
          background: sel || star ? "var(--uf-ink)" : "var(--uf-card)", color: sel || star ? "var(--uf-card)" : "var(--uf-ink)", border: sel || star ? "1px solid transparent" : "1px solid var(--uf-border-2)", boxShadow: "0 1px 3px #203e3033" }}>
        {star && <span aria-hidden style={{ color: "var(--uf-sun)" }}>★ </span>}{p.flag && <><Flag emoji={p.flag} size={11} />{" "}</>}{p.name && <span style={{ fontFamily: "var(--uf-font-body)", fontWeight: 600 }}>{p.name} </span>}{p.label}
      </button>;
    })}
    <div style={{ position: "absolute", right: 10, bottom: 10, display: "grid", gap: 6, zIndex: 4 }}>
      {[["+", 1.6], ["−", 1 / 1.6]].map(([l, k]) => <button key={l as string} type="button" aria-label={l === "+" ? "Zoom in" : "Zoom out"} onClick={() => setZoom(z => Math.max(1, Math.min(MAX_ZOOM, z * (k as number))))}
        style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", color: "var(--uf-ink)", fontSize: 18, cursor: "pointer" }}>{l}</button>)}
    </div>
  </div>;
}
