'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { geoOrthographic, geoPath, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection } from 'geojson';
import { CITIES } from '@/lib/fire-data';
import { CITY_COORDS } from '@/lib/city-coords';
import landTopo from '@/lib/geo/land-110m.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeoArbitrageGlobeProps {
  monthlySavings: number;
  portfolioBalance: number;
  currentAge?: number;
  currentCityKey: string;
  onCitySelect: (cityKey: string) => void;
  fillContainer?: boolean;
}

interface PlottedCity {
  key: string;
  name: string;
  col: number;
  lat: number;
  lng: number;
  flag: string;
}

// ---------------------------------------------------------------------------
// Land geometry (converted once from bundled TopoJSON)
// ---------------------------------------------------------------------------

const _topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const LAND: FeatureCollection = feature(_topo, _topo.objects.land) as FeatureCollection;

// ---------------------------------------------------------------------------
// City list from CITIES + CITY_COORDS
// ---------------------------------------------------------------------------

const ALL_CITIES: PlottedCity[] = CITIES.flatMap((c) => {
  const coords = CITY_COORDS[c.key];
  if (!coords) return [];
  return [{ key: c.key, name: c.name, col: c.col, lat: coords.lat, lng: coords.lng, flag: c.flag }];
});

// ---------------------------------------------------------------------------
// Static decoration data (computed once)
// ---------------------------------------------------------------------------

// Faint dot grid across the sphere (ocean texture; land is painted on top)
const GRATICULE_POINTS: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let lat = -78; lat <= 78; lat += 7) {
    for (let lng = -180; lng < 180; lng += 7) {
      pts.push([lng, lat]);
    }
  }
  return pts;
})();

// Halo: a fuzzy band of dots hugging the globe, plus a crisp dotted outline ring
const HALO_DOTS: { angle: number; rf: number; alpha: number; r: number }[] = (() => {
  const dots: { angle: number; rf: number; alpha: number; r: number }[] = [];
  // Several faint concentric bands of dots
  const bands = [
    { rf: 1.03, count: 200, alpha: 0.22, r: 0.7 },
    { rf: 1.07, count: 180, alpha: 0.16, r: 0.7 },
    { rf: 1.12, count: 150, alpha: 0.10, r: 0.6 },
    { rf: 1.18, count: 120, alpha: 0.06, r: 0.5 },
  ];
  for (const b of bands) {
    for (let i = 0; i < b.count; i++) {
      const angle = (i / b.count) * Math.PI * 2;
      // jitter so it reads as a soft cloud, not a perfect ring
      const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      dots.push({ angle, rf: b.rf + jitter * 0.015, alpha: b.alpha, r: b.r });
    }
  }
  return dots;
})();

// ---------------------------------------------------------------------------
// Readiness colour
// ---------------------------------------------------------------------------

function dotColor(col: number, portfolioBalance: number): string {
  if (portfolioBalance >= col * 25) return '#22d3a5'; // FIRE ready
  if (portfolioBalance >= col * 12.5) return '#fbbf24'; // Barista FIRE
  return '#f87171'; // Not yet
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'uf_geo_hidden';

function readHidden(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function writeHidden(keys: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(keys));
}

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 4;

// ---------------------------------------------------------------------------
// Theme palettes — dark globe in dark mode, light globe in light mode
// ---------------------------------------------------------------------------

interface Palette {
  panelBg: string;
  panelBorder: string;
  oceanStops: [string, string, string];
  oceanDot: string;
  land: string;
  landStroke: string | null;
  limbShade: string;
  haloRGB: string;
  haloRing: string;
  legend: string;
  btnBg: string;
  btnBorder: string;
  btnText: string;
  labelBg: string;
  labelText: string;
  labelBorder: string;
}

function getPalette(dark: boolean): Palette {
  if (dark) {
    return {
      panelBg: 'radial-gradient(circle at 50% 45%, #0d0d15 0%, #08080e 70%)',
      panelBorder: 'rgba(148,163,184,0.12)',
      oceanStops: ['#1a1b24', '#0e0e15', '#090910'],
      oceanDot: 'rgba(148,163,184,0.10)',
      land: '#b8bdc8',
      landStroke: null,
      limbShade: 'rgba(0,0,0,0.45)',
      haloRGB: '203,213,225',
      haloRing: 'rgba(226,232,240,0.28)',
      legend: '#94a3b8',
      btnBg: 'rgba(20,20,28,0.85)',
      btnBorder: 'rgba(148,163,184,0.3)',
      btnText: '#e2e8f0',
      labelBg: 'rgba(8,8,14,0.9)',
      labelText: '#ffffff',
      labelBorder: 'rgba(148,163,184,0.25)',
    };
  }
  return {
    panelBg: 'radial-gradient(circle at 50% 40%, #ffffff 0%, #eef2f7 78%)',
    panelBorder: '#e2e8f0',
    oceanStops: ['#ffffff', '#eaeff5', '#d7dfe9'],
    oceanDot: 'rgba(100,116,139,0.16)',
    land: '#1e293b',
    landStroke: 'rgba(15,23,42,0.3)',
    limbShade: 'rgba(51,65,85,0.20)',
    haloRGB: '100,116,139',
    haloRing: 'rgba(71,85,105,0.22)',
    legend: '#475569',
    btnBg: 'rgba(255,255,255,0.92)',
    btnBorder: '#cbd5e1',
    btnText: '#334155',
    labelBg: 'rgba(255,255,255,0.95)',
    labelText: '#0f172a',
    labelBorder: '#cbd5e1',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeoArbitrageGlobe({
  portfolioBalance,
  currentCityKey,
  onCitySelect,
  fillContainer = false,
}: GeoArbitrageGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Globe state (mutable refs to avoid re-renders inside rAF)
  const rotLng = useRef(70); // bring the Americas to the front initially
  const rotLat = useRef(-12);
  const zoom = useRef(1);
  const spinningRef = useRef(true);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pinchDist = useRef<number | null>(null);
  const rafId = useRef<number>(0);
  const canvasSize = useRef(420);
  const movedRef = useRef(false); // distinguish drag from tap

  // Reusable projection instance
  const projection = useMemo(() => geoOrthographic().clipAngle(90), []);

  // React state for legend / hidden list / hover label / spin pill
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Track app theme (dark globe in dark mode, light globe in light mode)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark')),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setHiddenKeys(readHidden());
  }, []);

  useEffect(() => {
    writeHidden(hiddenKeys);
  }, [hiddenKeys]);

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvasSize.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const baseR = size * 0.40;
    const R = baseR * zoom.current;

    projection
      .scale(R)
      .translate([cx, cy])
      .rotate([rotLng.current, rotLat.current]);

    const center: [number, number] = [-rotLng.current, -rotLat.current];
    const P = getPalette(isDark);

    // ── Atmosphere halo (behind the globe) ──
    for (const d of HALO_DOTS) {
      const rr = R * d.rf;
      const x = cx + rr * Math.cos(d.angle);
      const y = cy + rr * Math.sin(d.angle);
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${P.haloRGB},${d.alpha})`;
      ctx.fill();
    }
    // Crisp dotted outline ring
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.16, 0, Math.PI * 2);
    ctx.strokeStyle = P.haloRing;
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Ocean disc (sphere with subtle radial sheen) ──
    const oceanGrad = ctx.createRadialGradient(
      cx - R * 0.3, cy - R * 0.3, R * 0.1,
      cx, cy, R,
    );
    oceanGrad.addColorStop(0, P.oceanStops[0]);
    oceanGrad.addColorStop(0.7, P.oceanStops[1]);
    oceanGrad.addColorStop(1, P.oceanStops[2]);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = oceanGrad;
    ctx.fill();

    // ── Faint dot texture on the ocean ──
    ctx.fillStyle = P.oceanDot;
    for (const [lng, lat] of GRATICULE_POINTS) {
      if (geoDistance([lng, lat], center) > Math.PI / 2) continue;
      const p = projection([lng, lat]);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Land masses ──
    const path = geoPath(projection, ctx);
    ctx.beginPath();
    path(LAND);
    ctx.fillStyle = P.land;
    ctx.fill();
    if (P.landStroke) {
      ctx.strokeStyle = P.landStroke;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // ── Spherical shading: darken the limb for a 3D feel ──
    const shade = ctx.createRadialGradient(
      cx - R * 0.35, cy - R * 0.35, R * 0.2,
      cx, cy, R,
    );
    const shadeColor = P.limbShade.replace(/[\d.]+\)$/, '0)');
    shade.addColorStop(0, shadeColor);
    shade.addColorStop(0.75, shadeColor);
    shade.addColorStop(1, P.limbShade);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = shade;
    ctx.fill();

    // ── City markers ──
    const hiddenSet = new Set(hiddenKeys);
    for (const cityItem of ALL_CITIES) {
      if (hiddenSet.has(cityItem.key)) continue;
      if (geoDistance([cityItem.lng, cityItem.lat], center) > Math.PI / 2) continue;
      const p = projection([cityItem.lng, cityItem.lat]);
      if (!p) continue;
      const px = p[0];
      const py = p[1];

      if (cityItem.key === currentCityKey) {
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3a5';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = dotColor(cityItem.col, portfolioBalance);
        ctx.fill();
      }
    }
  }, [projection, portfolioBalance, currentCityKey, hiddenKeys, isDark]);

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  const animate = useCallback(() => {
    if (spinningRef.current && !isDragging.current) {
      rotLng.current -= 0.18;
    }
    draw();
    rafId.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [animate]);

  // ---------------------------------------------------------------------------
  // Resize observer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const size = fillContainer
        ? Math.min(width, height)
        : Math.min(width, 560);
      canvasSize.current = size;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      draw();
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [draw, fillContainer]);

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  function stopSpin() {
    if (spinningRef.current) {
      spinningRef.current = false;
      setSpinning(false);
    }
  }

  function resumeSpin() {
    spinningRef.current = true;
    setSpinning(true);
  }

  function setZoom(next: number) {
    zoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
  }

  function getEventXY(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('clientX' in e) {
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    }
    return { x: 0, y: 0 };
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    const native = e.nativeEvent as MouseEvent | TouchEvent;
    // Two-finger pinch start
    if ('touches' in native && native.touches.length === 2) {
      const dx = native.touches[0].clientX - native.touches[1].clientX;
      const dy = native.touches[0].clientY - native.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
      stopSpin();
      return;
    }
    lastPos.current = getEventXY(native);
    isDragging.current = true;
    movedRef.current = false;
    stopSpin(); // touching the globe stops the auto-spin
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent) {
    const native = e.nativeEvent as MouseEvent | TouchEvent;

    // Pinch-to-zoom
    if ('touches' in native && native.touches.length === 2 && pinchDist.current != null) {
      const dx = native.touches[0].clientX - native.touches[1].clientX;
      const dy = native.touches[0].clientY - native.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setZoom(zoom.current * (dist / pinchDist.current));
      pinchDist.current = dist;
      return;
    }

    // Hover label (mouse only, when not dragging)
    if (!isDragging.current && e.type === 'mousemove') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e as React.MouseEvent).clientX - rect.left;
        const my = (e as React.MouseEvent).clientY - rect.top;
        const found = pickCity(mx, my);
        setHoverLabel(found ? `${found.flag} ${found.name}` : null);
      }
    }

    if (!isDragging.current) return;

    const pos = getEventXY(native);
    const dx = pos.x - lastPos.current.x;
    const dy = pos.y - lastPos.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;
    lastPos.current = pos;
    const speed = 0.32 / zoom.current; // slower when zoomed in
    rotLng.current += dx * speed;
    rotLat.current = Math.max(-80, Math.min(80, rotLat.current - dy * speed));
  }

  function onPointerUp() {
    isDragging.current = false;
    pinchDist.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    stopSpin();
    setZoom(zoom.current * (e.deltaY < 0 ? 1.12 : 0.89));
  }

  // ---------------------------------------------------------------------------
  // Picking (hover + click)
  // ---------------------------------------------------------------------------

  function pickCity(mx: number, my: number): PlottedCity | null {
    const center: [number, number] = [-rotLng.current, -rotLat.current];
    const hiddenSet = new Set(hiddenKeys);
    let best: PlottedCity | null = null;
    let minDist = 18;
    for (const cityItem of ALL_CITIES) {
      if (hiddenSet.has(cityItem.key)) continue;
      if (geoDistance([cityItem.lng, cityItem.lat], center) > Math.PI / 2) continue;
      const p = projection([cityItem.lng, cityItem.lat]);
      if (!p) continue;
      const dist = Math.hypot(p[0] - mx, p[1] - my);
      if (dist < minDist) {
        minDist = dist;
        best = cityItem;
      }
    }
    return best;
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (movedRef.current) return; // ignore drags
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const found = pickCity(e.clientX - rect.left, e.clientY - rect.top);
    if (found) onCitySelect(found.key);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hiddenCount = hiddenKeys.length;
  const P = getPalette(isDark);

  const zoomBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: P.btnBg,
    border: `1px solid ${P.btnBorder}`,
    color: P.btnText,
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    backdropFilter: 'blur(4px)',
  };

  if (fillContainer) {
    return (
      <div
        ref={wrapperRef}
        style={{ width: '100%', height: '100%', position: 'relative', cursor: 'grab', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} onClick={onCanvasClick} style={{ display: 'block', flexShrink: 0 }} />

        {/* Hover label */}
        {hoverLabel && (
          <div style={{
            position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,8,14,0.88)', color: '#fff',
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
            pointerEvents: 'none', whiteSpace: 'nowrap',
            border: '1px solid rgba(148,163,184,0.25)',
            backdropFilter: 'blur(8px)',
          }}>
            {hoverLabel}
          </div>
        )}

        {/* Legend bottom-center */}
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 16, fontSize: 11, color: 'rgba(148,163,184,0.75)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          <span><span style={{ color: '#22d3a5' }}>●</span> FIRE ready</span>
          <span><span style={{ color: '#fbbf24' }}>●</span> Barista</span>
          <span><span style={{ color: '#f87171' }}>●</span> Not yet</span>
        </div>

        {/* Zoom controls */}
        <div style={{ position: 'absolute', right: 16, bottom: 56, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button aria-label="Zoom in" style={zoomBtnStyle} onClick={() => { stopSpin(); setZoom(zoom.current * 1.25); }}>+</button>
          <button aria-label="Zoom out" style={zoomBtnStyle} onClick={() => { stopSpin(); setZoom(zoom.current * 0.8); }}>−</button>
        </div>

        {/* Spin pill */}
        {!spinning && (
          <button onClick={resumeSpin} style={{
            position: 'absolute', left: 16, bottom: 56,
            background: P.btnBg, border: `1px solid ${P.btnBorder}`, color: P.btnText,
            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 99,
            cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(4px)',
          }}>
            ↻ Spin
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      {/* Showcase panel (themed) */}
      <div
        style={{
          background: P.panelBg,
          borderRadius: 20,
          border: `1px solid ${P.panelBorder}`,
          padding: '12px 12px 16px',
        }}
      >
        <div
          ref={wrapperRef}
          style={{ width: '100%', aspectRatio: '1', position: 'relative', cursor: 'grab', touchAction: 'none' }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
          onWheel={onWheel}
        >
          <canvas ref={canvasRef} onClick={onCanvasClick} style={{ display: 'block' }} />

          {/* Hover label */}
          {hoverLabel && (
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: P.labelBg,
                color: P.labelText,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 99,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                border: `1px solid ${P.labelBorder}`,
              }}
            >
              {hoverLabel}
            </div>
          )}

          {/* Zoom controls */}
          <div
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <button aria-label="Zoom in" style={zoomBtnStyle} onClick={() => { stopSpin(); setZoom(zoom.current * 1.25); }}>+</button>
            <button aria-label="Zoom out" style={zoomBtnStyle} onClick={() => { stopSpin(); setZoom(zoom.current * 0.8); }}>−</button>
          </div>

          {/* Resume spin pill */}
          {!spinning && (
            <button
              onClick={resumeSpin}
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                background: P.btnBg,
                border: `1px solid ${P.btnBorder}`,
                color: P.btnText,
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 99,
                cursor: 'pointer',
                fontFamily: 'inherit',
                backdropFilter: 'blur(4px)',
              }}
            >
              ↻ Spin
            </button>
          )}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            marginTop: 4,
            fontSize: 12,
            color: P.legend,
            flexWrap: 'wrap',
          }}
        >
          <span><span style={{ color: '#22d3a5', fontSize: 14 }}>●</span> FIRE ready now</span>
          <span><span style={{ color: '#fbbf24', fontSize: 14 }}>●</span> Barista FIRE</span>
          <span><span style={{ color: '#f87171', fontSize: 14 }}>●</span> Not yet</span>
        </div>
      </div>

      {/* Hidden cities button */}
      {hiddenCount > 0 && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            onClick={() => setHiddenKeys([])}
            style={{
              background: 'none',
              border: '1px solid #CBD5E1',
              borderRadius: 99,
              padding: '4px 14px',
              fontSize: 12,
              color: '#374151',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {hiddenCount} {hiddenCount === 1 ? 'city' : 'cities'} hidden · Show all
          </button>
        </div>
      )}
    </div>
  );
}
