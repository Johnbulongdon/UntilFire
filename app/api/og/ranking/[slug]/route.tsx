import { BRAND, BRAND_LOCKUP_DATA_URI } from '@/lib/brand'
import { brandOgFonts } from '@/lib/brand-og'
import { getRegion } from '@/lib/regions'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const revalidate = 86400 // Cache for 24 hours

const RANKINGS: Record<string, { title: string; line: string }> = {
  'cheapest-cities': { title: 'Cheapest US cities to retire early', line: '20 cities ranked by living costs' },
  'most-expensive-cities': { title: 'Most expensive US cities for FIRE', line: '20 cities ranked by living costs' },
  'no-income-tax-states': { title: 'FIRE in no-income-tax states', line: '9 states, living costs and targets' },
  'best-states': { title: 'Best states for FIRE', line: 'Ranked by living costs' },
  'fire-by-state': { title: 'FIRE number by state', line: 'Retirement targets across the US' },
}

/** Ranking and region guide share image: the yellow freedom card with the guide's title. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const region = slug.startsWith('region-') ? getRegion(slug.slice('region-'.length)) : null
  const config = region
    ? { title: `FIRE ${region.slug === 'west-coast' ? 'on' : 'in'} the ${region.name}`, line: region.tagline }
    : RANKINGS[slug]
  if (!config) return new Response('Ranking not found', { status: 404 })

  const fonts = await brandOgFonts()
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', background: BRAND.yellow, color: BRAND.ink,
          padding: '58px 70px', fontFamily: 'Inter',
        }}
      >
        <img src={BRAND_LOCKUP_DATA_URI} width={216} height={42} alt="UntilFire" />
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-4px', maxWidth: 1000 }}>
          {config.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700 }}>
          <span>{config.line}</span>
          <span>untilfire.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  )
}
