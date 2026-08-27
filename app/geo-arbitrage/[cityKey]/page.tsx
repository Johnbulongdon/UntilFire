'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CITIES } from '@/lib/fire-data';
import { calcFIRE } from '@/lib/fire';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalcPrefill = {
  monthlyIncome?: number;
  monthlySavings?: number;
  cityName?: string;
  stateKey?: string;
  fireTarget?: number;
  annualCost?: number;
  retireYear?: number;
  currentAge?: number;
  portfolioBalance?: number;
};

const LS_PREFILL_KEY = 'uf_calc_prefill';
const LS_HIDDEN_KEY = 'uf_geo_hidden';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${Math.round(n)}`;
}

function fmtYears(y: number): string {
  return y.toFixed(1) + ' yrs';
}

function pill(
  label: string,
  color: string,
  bg: string,
): React.ReactElement {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        color,
        background: bg,
      }}
    >
      {label}
    </span>
  );
}

function readinessPill(col: number, portfolioBalance: number): React.ReactElement {
  if (portfolioBalance >= col * 25) return pill('FIRE ready', '#003527', '#A7F3D0');
  if (portfolioBalance >= col * 12.5) return pill('Barista FIRE', '#78350F', '#FEF3C7');
  return pill('Not yet', '#991B1B', '#FEE2E2');
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GeoArbitragePage() {
  const router = useRouter();
  const params = useParams();
  const cityKey = params?.cityKey as string | undefined;

  const [prefill, setPrefill] = useState<CalcPrefill | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PREFILL_KEY);
      if (raw) setPrefill(JSON.parse(raw) as CalcPrefill);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Look up target city
  const targetCity = CITIES.find((c) => c.key === cityKey);

  // ── No prefill ──
  if (loaded && !prefill) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#08080e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'Manrope, sans-serif',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 16 }}>🌍</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
          Complete the free calculator first
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 28 }}>
          Enter your income and savings to see how your FIRE date changes in different cities.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#22d3a5',
            color: '#003527',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          Go to calculator →
        </Link>
      </div>
    );
  }

  // ── City not found ──
  if (loaded && !targetCity) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#08080e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'Manrope, sans-serif',
          color: '#fff',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>City not found.</p>
        <button
          onClick={() => router.back()}
          style={{ marginTop: 16, background: 'none', border: 'none', color: '#22d3a5', cursor: 'pointer', fontSize: 14 }}
        >
          ← Back
        </button>
      </div>
    );
  }

  // ── Loading ──
  if (!loaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#08080e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }

  // ── Calculations ──
  const monthlySavings = prefill?.monthlySavings ?? 1500;
  const portfolioBalance = prefill?.portfolioBalance ?? 0;
  const currentAge = prefill?.currentAge;
  const currentCol = prefill?.annualCost ?? 60000;
  const targetCol = targetCity!.col;

  const currentFire = calcFIRE(monthlySavings, currentCol, currentAge, portfolioBalance);
  const targetFire = calcFIRE(monthlySavings, targetCol, currentAge, portfolioBalance);

  const currentYears = currentFire.years;
  const targetYears = targetFire.years;
  const yearDiff = Math.abs(currentYears - targetYears);
  const isFireNow = portfolioBalance >= targetCol * 25;
  const monthlyDiff = Math.round((currentCol - targetCol) / 12);

  const currentCityName = prefill?.cityName ?? 'Your city';

  // ── Remove from globe ──
  function removeFromGlobe() {
    if (!cityKey) return;
    try {
      const raw = localStorage.getItem(LS_HIDDEN_KEY);
      const existing: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      if (!existing.includes(cityKey)) {
        localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify([...existing, cityKey]));
      }
    } catch {
      // ignore
    }
    router.back();
  }

  // ── Row helper ──
  function row(label: string, current: string, target: string) {
    return (
      <div
        key={label}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          padding: '12px 0',
          borderBottom: '1px solid #E2E8F0',
          fontSize: 13,
          alignItems: 'center',
        }}
      >
        <div style={{ color: '#6B7280', fontWeight: 500 }}>{label}</div>
        <div style={{ color: '#0F172A', fontWeight: 700, textAlign: 'center' }}>{current}</div>
        <div style={{ color: '#0F172A', fontWeight: 700, textAlign: 'center' }}>{target}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'Manrope, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          ← Globe
        </button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Title */}
        <h1
          style={{
            fontFamily: 'Bricolage Grotesque, Manrope, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            color: '#0F172A',
            margin: '0 0 4px',
          }}
        >
          {targetCity!.flag} {targetCity!.name}
        </h1>
        <div style={{ marginBottom: 24 }}>{readinessPill(targetCol, portfolioBalance)}</div>

        {/* Hero stat */}
        {isFireNow ? (
          <div
            style={{
              textAlign: 'center',
              background: '#F0FDF4',
              border: '1px solid #A7F3D0',
              borderRadius: 16,
              padding: '24px 20px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#059669',
                fontFamily: 'Bricolage Grotesque, Manrope, sans-serif',
              }}
            >
              You could FIRE here NOW
            </div>
            <div style={{ fontSize: 14, color: '#065F46', marginTop: 8 }}>
              Your portfolio covers {targetCity!.name} expenses at the 4% rule.
            </div>
          </div>
        ) : targetYears < currentYears ? (
          <div
            style={{
              textAlign: 'center',
              background: '#F0FDF4',
              border: '1px solid #A7F3D0',
              borderRadius: 16,
              padding: '24px 20px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: '#22d3a5',
                fontFamily: 'Bricolage Grotesque, Manrope, sans-serif',
                lineHeight: 1,
              }}
            >
              {yearDiff.toFixed(1)} years sooner
            </div>
            <div style={{ fontSize: 14, color: '#374151', marginTop: 8 }}>
              by moving to {targetCity!.name}
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              background: '#FFF5F5',
              border: '1px solid #FECACA',
              borderRadius: 16,
              padding: '24px 20px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: '#ef4444',
                fontFamily: 'Bricolage Grotesque, Manrope, sans-serif',
                lineHeight: 1,
              }}
            >
              {yearDiff.toFixed(1)} years later
            </div>
            <div style={{ fontSize: 14, color: '#374151', marginTop: 8 }}>
              {targetCity!.name} has a higher cost of living than your current city
            </div>
          </div>
        )}

        {/* Comparison table */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            padding: '0 20px',
            marginBottom: 20,
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              padding: '14px 0 10px',
              borderBottom: '2px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>
              Metric
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', textAlign: 'center' }}>
              Current
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22d3a5', textAlign: 'center' }}>
              {targetCity!.flag} Target
            </div>
          </div>

          {/* City name row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              padding: '12px 0',
              borderBottom: '1px solid #E2E8F0',
              fontSize: 13,
              alignItems: 'center',
            }}
          >
            <div style={{ color: '#6B7280', fontWeight: 500 }}>City</div>
            <div style={{ color: '#0F172A', fontWeight: 700, textAlign: 'center', fontSize: 12 }}>
              {currentCityName}
            </div>
            <div style={{ color: '#0F172A', fontWeight: 700, textAlign: 'center', fontSize: 12 }}>
              {targetCity!.name}
            </div>
          </div>

          {row(
            'Annual cost of living',
            `${fmtUSD(currentCol)}/yr`,
            `${fmtUSD(targetCol)}/yr`,
          )}
          {row(
            'FIRE number',
            fmtUSD(currentFire.fireTarget),
            fmtUSD(targetFire.fireTarget),
          )}
          {row(
            'Years to FIRE',
            fmtYears(currentYears),
            fmtYears(targetYears),
          )}
          {row(
            'Freedom year',
            String(currentFire.retireYear ?? '—'),
            String(targetFire.retireYear ?? '—'),
          )}
        </div>

        {/* Monthly impact */}
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 4 }}>
              Monthly cost impact
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: monthlyDiff >= 0 ? '#059669' : '#ef4444',
              }}
            >
              {monthlyDiff >= 0
                ? `Moving saves $${Math.abs(monthlyDiff).toLocaleString()}/mo`
                : `Moving costs $${Math.abs(monthlyDiff).toLocaleString()}/mo more`}
            </div>
          </div>
          <div style={{ fontSize: 28 }}>{targetCity!.flag}</div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={removeFromGlobe}
            style={{
              background: 'none',
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: '#6B7280',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          >
            Remove {targetCity!.name} from globe
          </button>
          <button
            onClick={() => router.back()}
            style={{
              background: '#22d3a5',
              border: 'none',
              borderRadius: 10,
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: 700,
              color: '#003527',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          >
            ← Back to globe
          </button>
        </div>
      </div>
    </div>
  );
}
