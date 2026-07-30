"use client";

import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Position } from "geojson";
import landTopo from "@/lib/geo/land-110m.json";

const TEAL = "#62FAE3";

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

// Land outline rings, decoded once from the bundled TopoJSON.
const LAND_RINGS: Position[][] = (() => {
  const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
  const fc = feature(topo, topo.objects.land) as FeatureCollection;
  const rings: Position[][] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (g.type === "Polygon") g.coordinates.forEach((r) => rings.push(r));
    else if (g.type === "MultiPolygon") g.coordinates.forEach((poly) => poly.forEach((r) => rings.push(r)));
  }
  return rings;
})();

/** Orthographic projection. Returns [x, y, visible] — visible=false on the far side. */
function project(lon: number, lat: number, rot: [number, number], cx: number, cy: number, r: number): [number, number, boolean] {
  const l = (lon + rot[0]) * Math.PI / 180;
  const p = lat * Math.PI / 180;
  const p0 = -rot[1] * Math.PI / 180;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  const x = cx + r * Math.cos(p) * Math.sin(l);
  const y = cy - r * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
  return [x, y, cosc >= 0];
}

export default function ExpatFireGlobe({ home, baseAge, cities }: ExpatFireGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState(0); // index into `cities`; cities.length === "stay"
  const stayIdx = cities.length;
  const isStay = sel >= stayIdx;
  const dest = isStay ? null : cities[Math.min(sel, cities.length - 1)];
  const shownAge = isStay || !dest ? baseAge : dest.age;
  const shownDelta = isStay || !dest ? 0 : dest.delta;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const draw = () => {
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = cv.clientWidth || 260;
      cv.width = Math.round(size * dpr);
      cv.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = size / 2, cy = size / 2, r = size / 2 * 0.94;
      const HOME: [number, number] = [home.lng, home.lat];
      const D: [number, number] | null = dest ? [dest.lng, dest.lat] : null;
      const mid: [number, number] = D ? [(HOME[0] + D[0]) / 2, (HOME[1] + D[1]) / 2] : HOME;
      const rot: [number, number] = [-mid[0], -mid[1]];

      ctx.clearRect(0, 0, size, size);

      // sphere
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(98,250,227,.05)";
      ctx.fill();
      ctx.lineWidth = size / 170;
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.stroke();

      // graticule
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(255,255,255,.09)";
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let started = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const q = project(lon, lat, rot, cx, cy, r);
          if (q[2]) { if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]); } else started = false;
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath(); let started = false;
        for (let lat = -90; lat <= 90; lat += 4) {
          const q = project(lon, lat, rot, cx, cy, r);
          if (q[2]) { if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]); } else started = false;
        }
        ctx.stroke();
      }

      // land
      ctx.fillStyle = "rgba(255,255,255,.14)";
      ctx.strokeStyle = "rgba(255,255,255,.24)";
      ctx.lineWidth = 0.6;
      for (const ring of LAND_RINGS) {
        ctx.beginPath(); let started = false;
        for (const [lon, lat] of ring) {
          const q = project(lon, lat, rot, cx, cy, r);
          if (q[2]) { if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]); }
        }
        if (started) { ctx.closePath(); ctx.fill(); ctx.stroke(); }
      }

      // relocation line (dashed, home → destination)
      if (D) {
        ctx.setLineDash([size / 50, size / 50]);
        ctx.lineWidth = size / 120;
        ctx.strokeStyle = TEAL;
        ctx.beginPath(); let first = true;
        for (let s = 0; s <= 1.001; s += 0.02) {
          const lon = HOME[0] + (D[0] - HOME[0]) * s;
          const lat = HOME[1] + (D[1] - HOME[1]) * s;
          const q = project(lon, lat, rot, cx, cy, r);
          if (q[2]) { if (first) { ctx.moveTo(q[0], q[1]); first = false; } else ctx.lineTo(q[0], q[1]); }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // markers
      const h = project(HOME[0], HOME[1], rot, cx, cy, r);
      if (h[2]) { ctx.beginPath(); ctx.arc(h[0], h[1], size / 26, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); }
      if (D) {
        const d = project(D[0], D[1], rot, cx, cy, r);
        if (d[2]) {
          ctx.beginPath(); ctx.arc(d[0], d[1], size / 22, 0, Math.PI * 2); ctx.fillStyle = TEAL; ctx.fill();
          ctx.beginPath(); ctx.arc(d[0], d[1], size / 22 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(98,250,227,.35)"; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [sel, home, dest]);

  const chips = [...cities.map((c) => ({ label: c.name, sub: c.country })), { label: `Stay in ${home.name}`, sub: "Your current plan" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(24px, 6vw, 52px)", flexWrap: "wrap" }}>
        <canvas ref={canvasRef} style={{ width: "min(260px, 66vw)", height: "min(260px, 66vw)", flex: "none" }} aria-hidden />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", position: "relative", minWidth: 180 }}>
          <div aria-hidden style={{ position: "absolute", top: "44%", left: "46%", width: 360, height: 360, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(98,250,227,.14), transparent 62%)", pointerEvents: "none" }} />
          <div style={{ fontSize: "clamp(88px, 20vw, 128px)", lineHeight: 0.82, fontWeight: 800, letterSpacing: "-0.05em", position: "relative" }}>{shownAge}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: TEAL, position: "relative", marginTop: 6 }}>
            {shownDelta > 0 ? `${shownDelta} year${shownDelta === 1 ? "" : "s"} sooner than staying` : "Right where you are now"}
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", position: "relative", marginTop: 2 }}>
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
              onClick={() => setSel(i)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
                padding: "11px 18px", borderRadius: 12, cursor: "pointer", transition: "all .15s ease",
                background: active ? TEAL : "rgba(255,255,255,0.06)",
                color: active ? "#003527" : "#fff",
                border: active ? `1px solid ${TEAL}` : "1px solid rgba(255,255,255,0.2)",
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
