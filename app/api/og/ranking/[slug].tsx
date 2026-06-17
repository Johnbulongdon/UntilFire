import { ImageResponse } from '@vercel/og';
import { getMostExpensiveCities, getCheapestCities, getNoIncomeTaxStates } from '@/lib/ranking-pages';

export const runtime = 'nodejs';
export const revalidate = 3600;

const rankings: Record<string, { title: string; subtitle: string; color: string }> = {
  'cheapest-cities': {
    title: 'Cheapest US Cities',
    subtitle: 'Retire early on $42k–$50k/year',
    color: '#22d3a5',
  },
  'most-expensive-cities': {
    title: 'Most Expensive Cities',
    subtitle: 'Know your FIRE target in high-cost hubs',
    color: '#f97316',
  },
  'no-income-tax-states': {
    title: 'No-Income-Tax States',
    subtitle: 'Keep more of your income invested',
    color: '#c4b5fd',
  },
  'best-states': {
    title: 'Best States for FIRE',
    subtitle: 'Ranked by tax efficiency + cost',
    color: '#22d3a5',
  },
  'fire-by-state': {
    title: 'FIRE by State',
    subtitle: 'Compare FIRE targets across all 50 states',
    color: '#22d3a5',
  },
  'region-northeast': { title: 'FIRE in the Northeast', subtitle: 'High cost, high income — can FIRE happen here?', color: '#c4b5fd' },
  'region-southeast': { title: 'FIRE in the Southeast', subtitle: 'Lower taxes, lower costs, warmer weather', color: '#22d3a5' },
  'region-midwest': { title: 'FIRE in the Midwest', subtitle: 'Underrated value. Quiet wealth-building.', color: '#22d3a5' },
  'region-southwest': { title: 'FIRE in the Southwest', subtitle: 'Sun, sprawl, and no-tax momentum.', color: '#f97316' },
  'region-mountain-west': { title: 'FIRE in the Mountain West', subtitle: 'Outdoor lifestyle, moderate cost, growing hubs.', color: '#22d3a5' },
  'region-west-coast': { title: 'FIRE on the West Coast', subtitle: 'High cost, but high income potential too.', color: '#f97316' },
};

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const config = rankings[slug];

  if (!config) {
    return new Response('Ranking not found', { status: 404 });
  }

  // Fetch count for the ranking
  let count = 20;
  if (slug === 'no-income-tax-states') count = 9;
  if (slug === 'best-states') count = 10;
  if (slug === 'fire-by-state') count = 50;
  if (slug.startsWith('region-')) count = 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #08080e 0%, #1a1a2e 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
            background: `linear-gradient(90deg, ${config.color}, #f97316)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            flex: 1,
            paddingTop: '12px',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              background: `${config.color}20`,
              color: config.color,
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              width: 'fit-content',
              letterSpacing: '0.05em',
            }}
          >
            {slug.startsWith('region-') ? 'US REGION GUIDE' : `RANKING: ${count} CITIES/STATES`}
          </div>

          {/* Main title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h1
              style={{
                fontSize: '60px',
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: '-1px',
                background: `linear-gradient(135deg, #fff, ${config.color})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {config.title}
            </h1>
            <p
              style={{
                fontSize: '24px',
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {config.subtitle}
            </p>
          </div>

          {/* CTA text */}
          <div
            style={{
              fontSize: '16px',
              color: '#64748b',
              marginTop: 'auto',
            }}
          >
            Compare and find your ideal FIRE location at untilfire.com
          </div>
        </div>

        {/* Accent element */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '300px',
            height: '300px',
            background: `radial-gradient(circle, ${config.color}15, transparent)`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

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
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              background: `linear-gradient(135deg, ${config.color}, #f97316)`,
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
