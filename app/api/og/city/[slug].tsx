import { ImageResponse } from '@vercel/og';
import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data';

export const runtime = 'nodejs';
export const revalidate = 86400; // Cache for 24 hours

const US_CITIES = CITIES.filter(c => isUS(c.state));
const SORTED_BY_COST = [...US_CITIES].sort((a, b) => b.col - a.col);

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const city = CITIES.find(c => c.key === slug);

  if (!city) {
    return new Response('City not found', { status: 404 });
  }

  const fireTarget = city.col * 25;
  const taxInfo = STATE_TAX[city.state];
  const taxRate = taxInfo?.rate ?? 0;
  const taxLabel = taxRate === 0 ? 'No state tax' : `${(taxRate * 100).toFixed(1)}% state tax`;
  const rank = SORTED_BY_COST.findIndex(c => c.key === slug) + 1;
  const rankLabel = rank > 0 ? `#${rank} of ${US_CITIES.length} US cities by cost` : '';

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #08080e 0%, #0d1f1a 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          padding: '48px 56px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #22d3a5, #f97316)',
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(34,211,165,0.08), transparent)',
            borderRadius: '50%',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', flex: 1, paddingTop: '8px' }}>

          {/* Badge */}
          {rankLabel ? (
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(34,211,165,0.12)',
                color: '#22d3a5',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                width: 'fit-content',
                letterSpacing: '0.04em',
              }}
            >
              {rankLabel}
            </div>
          ) : null}

          {/* City name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em' }}>
              FIRE NUMBER
            </div>
            <h1
              style={{
                fontSize: city.name.length > 20 ? '52px' : '62px',
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: '-1.5px',
                background: 'linear-gradient(135deg, #fff 30%, #22d3a5)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {city.name}
            </h1>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            {/* FIRE Target */}
            <div
              style={{
                flex: 1,
                background: 'rgba(34,211,165,0.08)',
                border: '1px solid rgba(34,211,165,0.2)',
                borderRadius: '14px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.1em' }}>
                FIRE TARGET (25×)
              </div>
              <div style={{ fontSize: '34px', fontWeight: 800, color: '#22d3a5', letterSpacing: '-0.5px' }}>
                {fmt(fireTarget)}
              </div>
            </div>

            {/* Annual cost */}
            <div
              style={{
                flex: 1,
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: '14px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.1em' }}>
                ANNUAL COST
              </div>
              <div style={{ fontSize: '34px', fontWeight: 800, color: '#f97316', letterSpacing: '-0.5px' }}>
                {fmt(city.col)}
              </div>
            </div>

            {/* Tax */}
            <div
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.1em' }}>
                STATE TAX
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: taxRate === 0 ? '#22d3a5' : '#94a3b8',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
                {taxLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
          }}
        >
          <div
            style={{
              width: '7px',
              height: '7px',
              background: 'linear-gradient(135deg, #22d3a5, #f97316)',
              borderRadius: '50%',
            }}
          />
          untilfire.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
