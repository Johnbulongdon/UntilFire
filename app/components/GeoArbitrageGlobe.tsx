'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CITIES } from '@/lib/fire-data';
import { CITY_COORDS } from '@/lib/city-coords';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeoArbitrageGlobeProps {
  monthlySavings: number;
  portfolioBalance: number;
  currentAge?: number;
  currentCityKey: string;
  onCitySelect: (cityKey: string) => void;
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
// Orthographic projection
// ---------------------------------------------------------------------------

function project(
  lat: number,
  lng: number,
  rotLng: number,
  rotLat: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number; z: number } | null {
  const lngR = ((lng + rotLng) * Math.PI) / 180;
  const latR = ((lat + rotLat) * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  const x = cosLat * Math.sin(lngR);
  const y = Math.sin(latR);
  const z = cosLat * Math.cos(lngR);
  if (z < -0.05) return null;
  return { x: cx + radius * x, y: cy - radius * y, z };
}

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

// ---------------------------------------------------------------------------
// Build city list from CITIES + CITY_COORDS
// ---------------------------------------------------------------------------

const ALL_CITIES: PlottedCity[] = CITIES.flatMap((c) => {
  const coords = CITY_COORDS[c.key];
  if (!coords) return [];
  return [{ key: c.key, name: c.name, col: c.col, lat: coords.lat, lng: coords.lng, flag: c.flag }];
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeoArbitrageGlobe({
  monthlySavings: _monthlySavings,
  portfolioBalance,
  currentCityKey,
  onCitySelect,
}: GeoArbitrageGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Globe rotation state (mutable refs to avoid re-renders inside rAF)
  const rotLng = useRef(0);
  const rotLat = useRef(20);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const autoRotateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number>(0);
  const canvasSize = useRef(400);

  // React state for legend / hidden list / hover label
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  // Load hidden list once on mount
  useEffect(() => {
    setHiddenKeys(readHidden());
  }, []);

  // Sync hidden list to localStorage whenever it changes
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
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.44;

    ctx.clearRect(0, 0, size * dpr, size * dpr);

    // Globe background (ocean)
    ctx.beginPath();
    ctx.arc(cx * dpr, cy * dpr, radius * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#dbeafe';
    ctx.fill();

    // Globe edge
    ctx.beginPath();
    ctx.arc(cx * dpr, cy * dpr, radius * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(15,23,42,0.15)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    // Latitude/longitude grid lines (subtle)
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 0.8 * dpr;

    // Draw a few latitude rings
    for (const lat of [-60, -30, 0, 30, 60]) {
      const points: { x: number; y: number }[] = [];
      for (let lng = -180; lng <= 180; lng += 4) {
        const p = project(lat, lng, rotLng.current, rotLat.current, cx, cy, radius);
        if (p) points.push({ x: p.x * dpr, y: p.y * dpr });
      }
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      }
    }

    // Draw a few longitude lines
    for (let lng = -150; lng <= 180; lng += 30) {
      const points: { x: number; y: number }[] = [];
      for (let lat = -90; lat <= 90; lat += 4) {
        const p = project(lat, lng, rotLng.current, rotLat.current, cx, cy, radius);
        if (p) points.push({ x: p.x * dpr, y: p.y * dpr });
      }
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      }
    }

    // City dots
    const hiddenSet = new Set(hiddenKeys);

    for (const city of ALL_CITIES) {
      if (hiddenSet.has(city.key)) continue;

      const p = project(city.lat, city.lng, rotLng.current, rotLat.current, cx, cy, radius);
      if (!p) continue;

      const px = p.x * dpr;
      const py = p.y * dpr;

      if (city.key === currentCityKey) {
        // Current city: white filled dot with teal ring
        const outerR = 14 * dpr;
        const innerR = 10 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, outerR, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3a5';
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, innerR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        // Regular dot
        const dotR = 5 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fillStyle = dotColor(city.col, portfolioBalance);
        // Slightly lighten dots farther back
        ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, p.z);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }, [portfolioBalance, currentCityKey, hiddenKeys]);

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  const animate = useCallback(() => {
    if (!isDragging.current) {
      rotLng.current += 0.15;
    }
    draw();
    rafId.current = requestAnimationFrame(animate);
  }, [draw]);

  // Start/stop the loop when component mounts/unmounts
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
      const size = Math.min(entry.contentRect.width, 560);
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
  }, [draw]);

  // ---------------------------------------------------------------------------
  // Pointer helpers
  // ---------------------------------------------------------------------------

  function stopAutoRotate() {
    isDragging.current = true;
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
  }

  function resumeAutoRotate() {
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    autoRotateTimer.current = setTimeout(() => {
      isDragging.current = false;
    }, 1500);
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
    const pos = getEventXY(e.nativeEvent as MouseEvent | TouchEvent);
    lastPos.current = pos;
    stopAutoRotate();
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent) {
    // Hover label (mouse only)
    if (!isDragging.current && e.type === 'mousemove') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e as React.MouseEvent).clientX - rect.left;
        const my = (e as React.MouseEvent).clientY - rect.top;
        const size = canvasSize.current;
        const cx = size / 2;
        const cy = size / 2;
        const radius = size * 0.44;
        const hiddenSet = new Set(hiddenKeys);
        let found: string | null = null;
        let minDist = 20;
        for (const city of ALL_CITIES) {
          if (hiddenSet.has(city.key)) continue;
          const p = project(city.lat, city.lng, rotLng.current, rotLat.current, cx, cy, radius);
          if (!p) continue;
          const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
          if (dist < minDist) {
            minDist = dist;
            found = `${city.flag} ${city.name}`;
          }
        }
        setHoverLabel(found);
      }
    }

    if (!isDragging.current) return;

    const pos = getEventXY(e.nativeEvent as MouseEvent | TouchEvent);
    const dx = pos.x - lastPos.current.x;
    const dy = pos.y - lastPos.current.y;
    lastPos.current = pos;
    rotLng.current += dx * 0.4;
    rotLat.current = Math.max(-60, Math.min(60, rotLat.current - dy * 0.2));
  }

  function onPointerUp() {
    resumeAutoRotate();
  }

  // ---------------------------------------------------------------------------
  // Click to select city
  // ---------------------------------------------------------------------------

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const size = canvasSize.current;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.44;
    const hiddenSet = new Set(hiddenKeys);

    let bestKey: string | null = null;
    let minDist = 20; // px threshold

    for (const city of ALL_CITIES) {
      if (hiddenSet.has(city.key)) continue;
      const p = project(city.lat, city.lng, rotLng.current, rotLat.current, cx, cy, radius);
      if (!p) continue;
      const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
      if (dist < minDist) {
        minDist = dist;
        bestKey = city.key;
      }
    }

    if (bestKey) {
      onCitySelect(bestKey);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hiddenCount = hiddenKeys.length;

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      {/* Globe wrapper */}
      <div
        ref={wrapperRef}
        style={{ width: '100%', aspectRatio: '1', position: 'relative', cursor: 'grab' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          style={{ display: 'block', borderRadius: '50%' }}
        />
        {/* Hover label */}
        {hoverLabel && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15,23,42,0.85)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 99,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {hoverLabel}
          </div>
        )}
      </div>

      {/* Hidden cities button */}
      {hiddenCount > 0 && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
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

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          marginTop: 14,
          fontSize: 12,
          color: '#374151',
          flexWrap: 'wrap',
        }}
      >
        <span>
          <span style={{ color: '#22d3a5', fontSize: 14 }}>●</span> FIRE ready now
        </span>
        <span>
          <span style={{ color: '#fbbf24', fontSize: 14 }}>●</span> Barista FIRE
        </span>
        <span>
          <span style={{ color: '#f87171', fontSize: 14 }}>●</span> Not yet
        </span>
      </div>
    </div>
  );
}
