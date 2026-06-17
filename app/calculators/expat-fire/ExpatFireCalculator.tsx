'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { CITIES } from '@/lib/fire-data';
import { CITY_COORDS } from '@/lib/city-coords';
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

  // ── Freedom timeline ───────────────────────────────────────────────
  // Fast-forward the projected portfolio and watch each city flip to green.
  const [timelineYears, setTimelineYears] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Per-city unlock schedule, computed with the same engine as the headline so
  // a city's "turns green" year matches its years-to-FIRE exactly. Sorted by
  // the soonest to unlock — i.e. which cities turn green first.
  const cityUnlocks = useMemo(() => {
    return CITIES
      .filter(c => CITY_COORDS[c.key])
      .map(c => {
        const r = calcFIRE(savings, c.col, age || undefined, portfolio);
        return { key: c.key, name: c.name, flag: c.flag, col: c.col, years: r.years, age: r.age, year: r.retireYear };
      })
      .sort((a, b) => a.years - b.years || a.col - b.col);
  }, [savings, portfolio, age]);

  // Run the bar from today to roughly when the bulk of cities have unlocked
  // (95th percentile, so one very expensive outlier doesn't stretch it out).
  const sliderMax = useMemo(() => {
    const ys = cityUnlocks.map(c => c.years).filter(y => y < 60).sort((a, b) => a - b);
    if (!ys.length) return 5;
    const p95 = ys[Math.floor(0.95 * (ys.length - 1))];
    return Math.min(50, Math.max(5, Math.ceil(p95)));
  }, [cityUnlocks]);

  // Keep the playhead inside range if the schedule shifts under it.
  useEffect(() => {
    if (timelineYears > sliderMax) setTimelineYears(sliderMax);
  }, [sliderMax, timelineYears]);

  // Auto-play advances the playhead one year at a time.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTimelineYears(y => {
        if (y >= sliderMax) { setPlaying(false); return sliderMax; }
        return y + 1;
      });
    }, 600);
    return () => clearInterval(id);
  }, [playing, sliderMax]);

  const t = Math.min(timelineYears, sliderMax);
  const annualContribution = Math.max(0, savings) * 12;
  const projectedPortfolio = (portfolio + annualContribution / 0.10) * Math.pow(1.10, t) - annualContribution / 0.10;
  const readyCount = cityUnlocks.filter(c => c.years <= t + 1e-9).length;
  const projAge = age ? Number(age) + t : undefined;
  const thisYear = new Date().getFullYear();

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

        {/* Freedom timeline — scrub forward to watch cities turn green */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 20px 22px', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Freedom timeline
              </h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '2px 0 0', lineHeight: 1.5 }}>
                Fast-forward to watch cities turn green — and see which unlock first{age ? ', and at what age' : ''}.
              </p>
            </div>
            <button
              onClick={() => setPlaying(p => !p)}
              style={{ flexShrink: 0, background: playing ? '#ffffff' : '#059669', color: playing ? '#059669' : '#ffffff', border: '1.5px solid #059669', borderRadius: 99, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>
          </div>

          {/* Scrubber */}
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={1}
            value={t}
            onChange={e => { setPlaying(false); setTimelineYears(Number(e.target.value)); }}
            aria-label="Years from today"
            style={{ width: '100%', accentColor: '#059669', marginTop: 16, cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
            <span>Today</span>
            <span>+{sliderMax} yrs</span>
          </div>

          {/* Readout */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', fontFamily: 'Syne, sans-serif' }}>
              {t === 0 ? 'Today' : projAge ? `Age ${projAge}` : `In ${t} ${t === 1 ? 'year' : 'years'}`}
            </span>
            {t > 0 && (
              <span style={{ fontSize: 13, color: '#64748b' }}>
                {projAge ? `· ${thisYear + t}` : `· ${thisYear}`}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#059669' }}>
              🟢 {readyCount} of {cityUnlocks.length} cities FIRE-ready
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Projected portfolio ~{fmt(projectedPortfolio)}
            {annualContribution > 0 ? ` · assumes you keep saving ${fmt(annualContribution)}/yr` : ''}
          </div>

          {/* Ordered milestone strip — which cities turn green first */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginTop: 16 }}>
            {cityUnlocks.slice(0, 18).map(c => {
              const unlocked = c.years <= t + 1e-9;
              const badge = c.years < 0.5 ? 'now' : projAge ? `age ${c.age}` : `${c.year}`;
              return (
                <div
                  key={c.key}
                  style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '8px 12px', borderRadius: 12, minWidth: 82,
                    background: unlocked ? '#ecfdf5' : '#f8fafc',
                    border: `1.5px solid ${unlocked ? '#6ee7b7' : '#e2e8f0'}`,
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{c.flag}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: unlocked ? '#047857' : '#334155', whiteSpace: 'nowrap' }}>
                    {c.name.split(',')[0]}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: unlocked ? '#059669' : '#94a3b8', whiteSpace: 'nowrap' }}>
                    {unlocked ? '🟢 ' : ''}{badge}
                  </span>
                </div>
              );
            })}
            {cityUnlocks.length > 18 && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                +{cityUnlocks.length - 18} more
              </div>
            )}
          </div>
        </div>

        {/* Globe */}
        <div style={{ marginTop: 32, marginBottom: 8 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Tap a city to compare
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
            Drag to spin · {t === 0 ? '🟢 FIRE ready now' : `🟢 ${projAge ? `at age ${projAge}` : `in ${t} ${t === 1 ? 'yr' : 'yrs'}`}`} · 🟡 Barista FIRE · 🔴 Not yet
          </p>
          <GeoArbitrageGlobe
            monthlySavings={savings}
            portfolioBalance={Math.round(projectedPortfolio)}
            currentAge={age || undefined}
            currentCityKey={cityKey}
            onCitySelect={handleCitySelect}
          />
        </div>
      </div>
    </div>
  );
}
