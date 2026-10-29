'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CITIES } from '@/lib/fire-data';
import { calcFIRE } from '@/lib/fire';
import { formatMoney } from "@/lib/money";
import Flag from '@/app/components/Flag';

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


function fmtYears(y: number | null): string {
  return y === null ? 'Not reached within 65 years' : y.toFixed(1) + ' yrs';
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
  if (portfolioBalance >= col * 25) return pill('FIRE ready', 'var(--uf-pos-ink)', 'var(--uf-mint)');
  if (portfolioBalance >= col * 12.5) return pill('Barista FIRE', 'var(--uf-warn-ink)', 'var(--uf-warn-bg)');
  return pill('Not yet', 'var(--uf-neg-ink)', 'var(--uf-neg-bg)');
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
          background: 'var(--uf-ground)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'Inter, sans-serif',
          color: 'var(--uf-ink)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 16 }}>🌍</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
          Complete the free calculator first
        </h1>
        <p style={{ fontSize: 14, color: 'var(--uf-ink-2)', marginBottom: 28 }}>
          Enter your income and savings to see how your FIRE date changes in different cities.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'var(--uf-ink)',
            color: 'var(--uf-card)',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 999,
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
          background: 'var(--uf-ground)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'Inter, sans-serif',
          color: 'var(--uf-ink)',
        }}
      >
        <p style={{ color: 'var(--uf-ink-2)' }}>City not found.</p>
        <button
          onClick={() => router.back()}
          style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--uf-ink)', textDecoration: 'underline', cursor: 'pointer', fontSize: 14 }}
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
          background: 'var(--uf-ground)',
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
  const yearDiff = currentYears !== null && targetYears !== null ? Math.abs(currentYears - targetYears) : null;
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
          borderBottom: '1px solid var(--uf-border)',
          fontSize: 13,
          alignItems: 'center',
        }}
      >
        <div style={{ color: 'var(--uf-ink-2)', fontWeight: 500 }}>{label}</div>
        <div style={{ color: 'var(--uf-ink)', fontWeight: 700, textAlign: 'center' }}>{current}</div>
        <div style={{ color: 'var(--uf-ink)', fontWeight: 700, textAlign: 'center' }}>{target}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--uf-ground)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'var(--uf-card)',
          borderBottom: '1px solid var(--uf-border)',
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
            color: 'var(--uf-ink)',
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
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--uf-ink)',
            margin: '0 0 4px',
          }}
        >
          <Flag emoji={targetCity!.flag} size={14} /> {targetCity!.name}
        </h1>
        <div style={{ marginBottom: 24 }}>{readinessPill(targetCol, portfolioBalance)}</div>

        {/* Hero stat */}
        {isFireNow ? (
          <div
            style={{
              textAlign: 'center',
              background: 'var(--uf-yellow)',
              color: 'var(--uf-on-accent)',
              borderRadius: 28,
              padding: '24px 20px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: 'var(--uf-on-accent)',
              }}
            >
              You could FIRE here NOW
            </div>
            <div style={{ fontSize: 14, color: 'var(--uf-on-accent)', marginTop: 8 }}>
              Your portfolio covers {targetCity!.name} expenses at the 4% rule.
            </div>
          </div>
        ) : yearDiff === null ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <strong>{targetYears === null ? "Not reached under these assumptions" : "Target reached within the projection"}</strong>
            <p>At least one location does not reach FIRE within 65 years, so a years-saved comparison is unavailable.</p>
          </div>
        ) : targetYears !== null && currentYears !== null && targetYears < currentYears ? (
          <div
            style={{
              textAlign: 'center',
              background: 'var(--uf-yellow)',
              color: 'var(--uf-on-accent)',
              borderRadius: 28,
              padding: '24px 20px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: 'var(--uf-on-accent)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {yearDiff.toFixed(1)} years sooner
            </div>
            <div style={{ fontSize: 14, color: 'var(--uf-on-accent)', marginTop: 8 }}>
              by moving to {targetCity!.name}
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              background: 'var(--uf-neg-bg)',
              border: '1px solid var(--uf-neg)',
              borderRadius: 28,
              padding: '24px 20px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: 'var(--uf-neg-ink)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {yearDiff.toFixed(1)} years later
            </div>
            <div style={{ fontSize: 14, color: 'var(--uf-ink)', marginTop: 8 }}>
              {targetCity!.name} has a higher cost of living than your current city
            </div>
          </div>
        )}

        {/* Comparison table */}
        <div
          style={{
            background: 'var(--uf-card)',
            borderRadius: 24,
            border: '1px solid var(--uf-border)',
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
              borderBottom: '2px solid var(--uf-border)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--uf-ink-2)' }}>
              Metric
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--uf-ink-2)', textAlign: 'center' }}>
              Current
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--uf-ink)', textAlign: 'center' }}>
              <Flag emoji={targetCity!.flag} size={11} /> Target
            </div>
          </div>

          {/* City name row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              padding: '12px 0',
              borderBottom: '1px solid var(--uf-border)',
              fontSize: 13,
              alignItems: 'center',
            }}
          >
            <div style={{ color: 'var(--uf-ink-2)', fontWeight: 500 }}>City</div>
            <div style={{ color: 'var(--uf-ink)', fontWeight: 700, textAlign: 'center', fontSize: 12 }}>
              {currentCityName}
            </div>
            <div style={{ color: 'var(--uf-ink)', fontWeight: 700, textAlign: 'center', fontSize: 12 }}>
              {targetCity!.name}
            </div>
          </div>

          {row(
            'Annual cost of living',
            `${formatMoney(currentCol)}/yr`,
            `${formatMoney(targetCol)}/yr`,
          )}
          {row(
            'FIRE number',
            formatMoney(currentFire.fireTarget),
            formatMoney(targetFire.fireTarget),
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
            background: 'var(--uf-card)',
            borderRadius: 24,
            border: '1px solid var(--uf-border)',
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--uf-ink-2)', marginBottom: 4 }}>
              Monthly cost impact
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: monthlyDiff >= 0 ? 'var(--uf-pos-ink)' : 'var(--uf-neg-ink)',
              }}
            >
              {monthlyDiff >= 0
                ? `Moving saves $${Math.abs(monthlyDiff).toLocaleString()}/mo`
                : `Moving costs $${Math.abs(monthlyDiff).toLocaleString()}/mo more`}
            </div>
          </div>
          <div><Flag emoji={targetCity!.flag} size={21} /></div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={removeFromGlobe}
            style={{
              background: 'none',
              border: '1px solid var(--uf-border-2)',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--uf-ink-2)',
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
              background: 'var(--uf-ink)',
              border: 'none',
              borderRadius: 999,
              padding: '14px 20px',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--uf-card)',
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
