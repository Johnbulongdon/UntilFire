import { ImageResponse } from '@vercel/og';
import { CITIES, STATE_TAX } from '@/lib/fire-data';
import { STATE_NAMES } from '@/lib/state-pages';

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

export async function GET(req: Request, { params }: { params: { state: string } }) {
  const { state } = params;

  // Find state by slug
  const stateKey = Object.entries(STATE_NAMES).find(
    ([, name]) => name.toLowerCase().replace(/\s+/g, '').replace(/\./g, '') === state.toLowerCase()
  )?.[0];

  if (!stateKey) {
    return new Response('State not found', { status: 404 });
  }

  const stateName = STATE_NAMES[stateKey];
  const citiesInState = CITIES.filter(c => c.state === stateKey);
  const avgCol = Math.round(citiesInState.reduce((sum, c) => sum + c.col, 0) / citiesInState.length);
  const fireTarget = avgCol * 25;
  const taxInfo = STATE_TAX[stateKey];
  const taxRate = taxInfo?.rate ?? 0;
  const taxLabel = taxRate === 0 ? '0% — No tax' : `${(taxRate * 100).toFixed(1)}%`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #08080e 0%, #1a1a2e 100%)',
          color: '#fff',
          fontFamily: 'Fraunces, Georgia, serif',
          position: 'relative',
          padding: '48px',
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
            height: '8px',
            background: 'linear-gradient(90deg, #22d3a5, #f97316)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            flex: 1,
            paddingTop: '12px',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(34, 211, 165, 0.15)',
              color: '#22d3a5',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              width: 'fit-content',
              letterSpacing: '0.05em',
            }}
          >
            FIRE STATE GUIDE
          </div>

          {/* Main title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <h1
              style={{
                fontSize: '64px',
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: '-1px',
                background: 'linear-gradient(135deg, #fff, #22d3a5)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {stateName}
            </h1>
            <p
              style={{
                fontSize: '20px',
                color: '#94a3b8',
                margin: 0,
              }}
            >
              Your FIRE numbers by the data
            </p>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '24px',
              marginTop: '16px',
            }}
          >
            {/* Average cost */}
            <div
              style={{
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                AVG ANNUAL COST
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f97316' }}>
                ${avgCol.toLocaleString()}
              </div>
            </div>

            {/* FIRE target */}
            <div
              style={{
                background: 'rgba(34, 211, 165, 0.1)',
                border: '1px solid rgba(34, 211, 165, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                FIRE TARGET (25×)
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#22d3a5' }}>
                ${fireTarget.toLocaleString()}
              </div>
            </div>

            {/* Tax rate */}
            <div
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                STATE TAX
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#c4b5fd' }}>
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
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              background: 'linear-gradient(135deg, #22d3a5, #f97316)',
              borderRadius: '50%',
            }}
          />
          untilfire.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
