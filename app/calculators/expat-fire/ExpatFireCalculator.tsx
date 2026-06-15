'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { CITIES } from '@/lib/fire-data';
import { calcFIRE } from '@/lib/fire';

const GeoArbitrageGlobe = dynamic(
  () => import('@/app/components/GeoArbitrageGlobe'),
  { ssr: false },
);

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function ExpatFireCalculator() {
  const router = useRouter();
  const [savings, setSavings] = useState(2000);
  const [portfolio, setPortfolio] = useState(50000);
  const [age, setAge] = useState<number | ''>('');
  const [cityKey, setCityKey] = useState('nyc');
  const [citySearch, setCitySearch] = useState('New York City, NY');
  const [showDropdown, setShowDropdown] = useState(false);

  const currentCity = CITIES.find(c => c.key === cityKey) ?? CITIES[0];
  const result = calcFIRE(savings, currentCity.col, age || undefined, portfolio);

  const filtered = citySearch.length > 0
    ? CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 8)
    : CITIES.slice(0, 8);

  const handleCitySelect = useCallback((key: string) => {
    router.push(`/geo-arbitrage/${key}?from=expat&savings=${savings}&portfolio=${portfolio}&age=${age}&cityKey=${cityKey}`);
  }, [router, savings, portfolio, age, cityKey]);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #065f46 100%)', padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(34,211,165,0.15)', border: '1px solid rgba(34,211,165,0.3)', borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#22d3a5', marginBottom: 16, textTransform: 'uppercase' }}>
            Geo-Arbitrage Calculator
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, color: '#ffffff', margin: '0 0 14px', lineHeight: 1.15 }}>
            Expat FIRE
          </h1>
          <p style={{ color: '#a7f3d0', fontSize: 17, margin: 0, lineHeight: 1.65 }}>
            Spin the globe to find cities where your savings rate unlocks early retirement.
            Green = FIRE ready now. Yellow = Barista FIRE. Red = not yet.
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 0' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          {/* Current city */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
              Your current city
            </label>
            <input
              value={citySearch}
              onChange={e => { setCitySearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search city…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#f8fafc', boxSizing: 'border-box' }}
            />
            {showDropdown && filtered.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', maxHeight: 220, overflowY: 'auto' }}>
                {filtered.map(c => (
                  <button
                    key={c.key}
                    onMouseDown={() => { setCityKey(c.key); setCitySearch(c.name); setShowDropdown(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 14, color: '#0f172a', background: c.key === cityKey ? '#f0fdf4' : 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    {c.flag} {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Monthly savings */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
              Monthly savings (USD)
            </label>
            <input
              type="number"
              min={0}
              value={savings}
              onChange={e => setSavings(Math.max(0, Number(e.target.value)))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#f8fafc', boxSizing: 'border-box' }}
            />
          </div>

          {/* Portfolio */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
              Current portfolio (USD)
            </label>
            <input
              type="number"
              min={0}
              value={portfolio}
              onChange={e => setPortfolio(Math.max(0, Number(e.target.value)))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#f8fafc', boxSizing: 'border-box' }}
            />
          </div>

          {/* Age */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
              Current age <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <input
              type="number"
              min={18}
              max={80}
              value={age}
              onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 32"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#f8fafc', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Current city result summary */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>Staying in {currentCity.name.split(',')[0]}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#064E3B', fontFamily: 'Syne, sans-serif' }}>
              {result.years <= 0 ? 'FIRE ready now 🎉' : `${result.years.toFixed(1)} years to FIRE`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>FIRE NUMBER</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{fmt(result.fireTarget)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>FREEDOM YEAR</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{result.retireYear ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>ANNUAL COL</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{fmt(currentCity.col)}/yr</div>
            </div>
          </div>
        </div>

        {/* Globe */}
        <div style={{ marginTop: 32, marginBottom: 8 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Tap a city to compare
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
            Drag to spin · 🟢 FIRE ready now · 🟡 Barista FIRE · 🔴 Not yet
          </p>
          <GeoArbitrageGlobe
            monthlySavings={savings}
            portfolioBalance={portfolio}
            currentAge={age || undefined}
            currentCityKey={cityKey}
            onCitySelect={handleCitySelect}
          />
        </div>
      </div>
    </div>
  );
}
