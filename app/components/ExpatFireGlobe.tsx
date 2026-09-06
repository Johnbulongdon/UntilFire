"use client";

import { useMemo, useState } from "react";
import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import landTopo from "@/lib/geo/land-110m.json";

const TEAL = "var(--uf-teal)";

export interface ExpatCity {
  key: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  /** Freedom age if you retired here. */
  age: number;
  /** Years sooner than staying (positive). */
  delta: number;
}

interface ExpatFireGlobeProps {
  home: { name: string; lat: number; lng: number };
  /** Freedom age if you stay put. */
  baseAge: number;
  cities: ExpatCity[];
}

// Decode the bundled land once; d3 clips polygons and routes at the horizon.
const LAND = feature(
  landTopo as unknown as Topology<{ land: GeometryCollection }>,
  (landTopo as unknown as Topology<{ land: GeometryCollection }>).objects.land,
) as FeatureCollection;
const GRATICULE = geoGraticule10();

export default function ExpatFireGlobe({ home, baseAge, cities }: ExpatFireGlobeProps) {
  const [sel, setSel] = useState(0);
  const isStay = sel >= cities.length;
  const dest = isStay ? null : cities[sel];
  const shownAge = dest?.age ?? baseAge;
  const shownDelta = dest?.delta ?? 0;
  const map = useMemo(() => {
    const from: [number, number] = [home.lng, home.lat];
    const to: [number, number] | null = dest ? [dest.lng, dest.lat] : null;
    const center = to ? geoInterpolate(from, to)(0.5) : from;
    const projection = geoOrthographic().translate([140, 140]).scale(130)
      .rotate([-center[0], -center[1]]).clipAngle(90);
    const path = geoPath(projection);
    const marker = (point: [number, number]) =>
      geoDistance(center, point) <= Math.PI / 2 + 1e-6 ? projection(point) : null;
    return {
      land: path(LAND) ?? undefined,
      grid: path(GRATICULE) ?? undefined,
      route: to ? path({ type: "LineString", coordinates: [from, to] }) ?? undefined : undefined,
      home: marker(from), dest: to ? marker(to) : null,
    };
  }, [home.lat, home.lng, dest]);

  const chips = [...cities.map((c) => ({ label: c.name, sub: c.country })), { label: `Stay in ${home.name}`, sub: "Your current plan" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(24px, 6vw, 52px)", flexWrap: "wrap" }}>
        <svg viewBox="0 0 280 280" role="img" aria-label={dest ? `Globe showing the route from ${home.name} to ${dest.name}` : `Globe centered on ${home.name}`} style={{ width: "min(260px, 66vw)", height: "auto", flex: "none" }}>
          <circle cx="140" cy="140" r="130" fill="var(--uf-surface)" stroke="var(--uf-border-2)" />
          <path d={map.grid} fill="none" stroke="var(--uf-border-2)" strokeWidth="0.6" />
          <path d={map.land} fill="var(--uf-green-100)" stroke="var(--uf-green)" strokeWidth="0.7" />
          <path d={map.route} fill="none" stroke={TEAL} strokeWidth="2" strokeDasharray="5 5" />
          {map.home && <circle cx={map.home[0]} cy={map.home[1]} r="5" fill="var(--uf-ink)" stroke="var(--uf-ground)" strokeWidth="2" />}
          {map.dest && <circle cx={map.dest[0]} cy={map.dest[1]} r="6" fill={TEAL} stroke="var(--uf-ground)" strokeWidth="2" />}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", position: "relative", minWidth: 180 }}>
          <div aria-hidden style={{ position: "absolute", top: "44%", left: "46%", width: 360, height: 360, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(98,250,227,.14), transparent 62%)", pointerEvents: "none" }} />
          <div style={{ fontSize: "clamp(88px, 20vw, 128px)", lineHeight: 0.82, fontWeight: 800, letterSpacing: "-0.05em", position: "relative" }}>{shownAge}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: TEAL, position: "relative", marginTop: 6 }}>
            {shownDelta > 0 ? `${shownDelta} year${shownDelta === 1 ? "" : "s"} sooner than staying` : "Right where you are now"}
          </div>
          <div style={{ fontSize: 16, color: "var(--uf-ink-2)", position: "relative", marginTop: 2 }}>
            {isStay || !dest ? `if you stay in ${home.name}` : `if you retire in ${dest.name}`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {chips.map((c, i) => {
          const active = i === sel;
          return (
            <button
              key={c.label}
              aria-pressed={active}
              onClick={() => setSel(i)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
                padding: "11px 18px", borderRadius: 12, cursor: "pointer", transition: "all .15s ease",
                background: active ? "var(--uf-green)" : "var(--uf-card)",
                color: active ? "#fff" : "var(--uf-ink)",
                border: "1px solid var(--uf-border-2)",
                font: "inherit",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700 }}>{c.label}</span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{c.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
