'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CITY_MAP_HEIGHT, fitCityMap, type CityComparison } from '@/lib/city-comparisons';
import { formatMoney } from '@/lib/money';

export default function CityComparisonMap({ cities }: { cities: CityComparison[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedKey, setSelectedKey] = useState(cities[0]?.key);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const resize = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    resize.observe(el);
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(el);
    return () => { resize.disconnect(); observer.disconnect(); };
  }, []);
  const geometry = useMemo(() => cities.length && width > 160 ? fitCityMap(cities, width) : null, [cities, width]);
  if (!cities.length) return null;
  const current = cities.find(c => c.key === selectedKey) ?? cities[0];
  const delta = (current.annualUSD - cities[0].annualUSD) * 25;
  const select = (city: CityComparison) => setSelectedKey(city.key);
  return <section className="city-guide-comparison" aria-labelledby="city-map-heading">
    <h2 id="city-map-heading">How does {cities[0].name.split(',')[0]} compare?</h2>
    <p className="city-guide-muted">{cities.length > 1 ? 'Explore other cities in the same country. Tap a pin to compare estimated FIRE targets.' : 'Explore the city location. No other city baseline is available in this country group.'}</p>
    <div className="city-guide-map" ref={container} style={{ height: CITY_MAP_HEIGHT }} aria-label="City comparison map">
      {visible && geometry && !failed && <>
        {geometry.tiles.map(tile => <img key={tile.url} src={tile.url} alt="" width={256} height={256} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" onError={() => setFailed(true)} style={{ position: 'absolute', left: tile.left, top: tile.top, maxWidth: 'none' }} />)}
        <svg className="city-guide-map-leaders" width={width} height={CITY_MAP_HEIGHT} aria-hidden="true">{geometry.pins.map((pin,i) => <g key={cities[i].key}><line x1={pin.x} y1={pin.y} x2={geometry.labels[i].x} y2={geometry.labels[i].y} /><circle cx={pin.x} cy={pin.y} r="4" /></g>)}</svg>
        {cities.map((city, i) => <button key={city.key} className="city-guide-pin" aria-label={`Compare ${city.name}`} aria-pressed={city.key === current.key} onClick={() => select(city)} style={{ left: geometry.labels[i].x, top: geometry.labels[i].y }}>
          <span>{city.name.split(',')[0]}</span><strong>{formatMoney(city.annualUSD * 25, { style: 'compact' })}</strong>
        </button>)}
      </>}
      {failed && <p className="city-guide-map-error" role="status">The map is unavailable. You can still compare cities below.</p>}
      <a className="city-guide-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
    <div className="city-guide-selected" aria-live="polite" aria-atomic="true">
      <span>{current.name} · USD</span><strong>{formatMoney(current.annualUSD * 25)}</strong>
      <p>{delta === 0 ? 'Reference city' : `${formatMoney(Math.abs(delta))} ${delta < 0 ? 'lower' : 'higher'} than ${cities[0].name}`} · {formatMoney(current.annualUSD / 12)}/month baseline</p>
    </div>
    <div className="city-guide-city-list">
      {cities.map(city => <div key={city.key}>
        <button aria-pressed={city.key === current.key} onClick={() => select(city)}>{city.name}<span>{formatMoney(city.annualUSD * 25, { style: 'compact' })} USD target</span></button>
        <Link href={city.href}>Read city guide →</Link>
      </div>)}
    </div>
    <p className="city-guide-note">City-center locations are approximate. These are city-level planning estimates, not neighborhood prices. All comparisons use USD and the same 25× guideline.</p>
  </section>;
}
