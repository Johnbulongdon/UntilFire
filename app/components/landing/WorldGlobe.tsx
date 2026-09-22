"use client";

import { useEffect, useRef } from "react";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import landTopo from "@/lib/geo/land-110m.json";

/* The same construction as ExpatFireGlobe: d3-geo's orthographic projection,
   real land geometry, a graticule. Drawn to a 2D canvas rather than SVG so it
   can turn at 60fps without re-rendering a few thousand path nodes each frame.
   No WebGL anywhere, which retires the whole failure class the cobe version
   kept running into — no context to lose, no texture to decode. */

const LAND = feature(
  landTopo as unknown as Topology<{ land: GeometryCollection }>,
  (landTopo as unknown as Topology<{ land: GeometryCollection }>).objects.land,
) as FeatureCollection;
const GRATICULE = geoGraticule10();
const SPHERE = { type: "Sphere" } as const;

const CITIES: { name: string; coords: [number, number] }[] = [
  { name: "Chiang Mai",    coords: [98.98, 18.79] },
  { name: "Mexico City",   coords: [-99.13, 19.43] },
  { name: "Lisbon",        coords: [-9.14, 38.72] },
  { name: "Tokyo",         coords: [139.69, 35.68] },
  { name: "London",        coords: [-0.13, 51.51] },
  { name: "San Francisco", coords: [-122.42, 37.77] },
];

const START_LAMBDA = 30;   // degrees; where the globe faces on first paint
const TILT = -12;          // a little north-up, so the land reads as a globe
const DEG_PER_SEC = 5;     // slow enough to be calm, fast enough to notice

export default function WorldGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let lambda = START_LAMBDA;
    let last = performance.now();
    let onscreen = true;
    let size = 0;

    // Canvas cannot resolve var(), so the tokens are read out and refreshed
    // when the theme class flips.
    let palette = readPalette();
    function readPalette() {
      const cs = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
      return {
        sphere: v("--uf-surface", "#F7EFE3"),
        edge: v("--uf-border-2", "#DFCDB4"),
        landFill: v("--uf-green-100", "#CDEBE1"),
        landLine: v("--uf-green", "#12856A"),
        marker: v("--uf-teal", "#0E9C86"),
        ring: v("--uf-ground", "#FDF8F1"),
      };
    }
    const themeWatcher = new MutationObserver(() => { palette = readPalette(); });
    themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const k = size / 280;                       // ExpatFireGlobe's proportions
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, size, size);

      const projection = geoOrthographic()
        .translate([size / 2, size / 2])
        .scale(size * 0.464)
        .rotate([lambda, TILT])
        .clipAngle(90);
      const path = geoPath(projection, ctx!);

      ctx!.beginPath(); path(SPHERE);
      ctx!.fillStyle = palette.sphere; ctx!.fill();
      ctx!.lineWidth = 1 * k; ctx!.strokeStyle = palette.edge; ctx!.stroke();

      ctx!.beginPath(); path(GRATICULE);
      ctx!.lineWidth = 0.6 * k; ctx!.strokeStyle = palette.edge; ctx!.stroke();

      ctx!.beginPath(); path(LAND);
      ctx!.fillStyle = palette.landFill; ctx!.fill();
      ctx!.lineWidth = 0.7 * k; ctx!.strokeStyle = palette.landLine; ctx!.stroke();

      // Markers ride the sphere: anything past 90° from the centre is around
      // the back and must not be drawn on top of the near face.
      const centre: [number, number] = [-lambda, -TILT];
      for (const city of CITIES) {
        if (geoDistance(centre, city.coords) > Math.PI / 2) continue;
        const p = projection(city.coords);
        if (!p) continue;
        ctx!.beginPath(); ctx!.arc(p[0], p[1], 5 * k, 0, Math.PI * 2);
        ctx!.fillStyle = palette.marker; ctx!.fill();
        ctx!.lineWidth = 2 * k; ctx!.strokeStyle = palette.ring; ctx!.stroke();
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size = rect.width;
      canvas!.width = Math.round(size * dpr);
      canvas!.height = Math.round(size * dpr);
      draw();
    }

    const frame = (now: number) => {
      const dt = Math.min(now - last, 100);       // a backgrounded tab must not lurch
      last = now;
      if (onscreen) { lambda = (lambda + (DEG_PER_SEC * dt) / 1000) % 360; draw(); }
      raf = requestAnimationFrame(frame);
    };

    const sizeWatcher = new ResizeObserver(resize);
    sizeWatcher.observe(canvas);
    resize();

    // Reduced motion gets the globe drawn in full and then held — the point
    // is to stop the movement, not to leave an empty canvas.
    let visWatcher: IntersectionObserver | null = null;
    if (!reduceMotion) {
      visWatcher = new IntersectionObserver((entries) => {
        entries.forEach((e) => { onscreen = e.isIntersecting; });
        last = performance.now();
      });
      visWatcher.observe(canvas);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      sizeWatcher.disconnect();
      visWatcher?.disconnect();
      themeWatcher.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="A slowly turning globe marking Chiang Mai, Mexico City, Lisbon, Tokyo, London and San Francisco."
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
