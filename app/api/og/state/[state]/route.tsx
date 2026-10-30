import { BRAND, BRAND_LOCKUP_DATA_URI } from '@/lib/brand'
import { brandOgFonts } from '@/lib/brand-og'
import { formatMoney } from '@/lib/money'
import { getStatePage } from '@/lib/state-pages'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const revalidate = 86400 // Cache for 24 hours

/** State guide share image: the same yellow freedom card as the city guides, with the state's 25× target. */
export async function GET(_req: Request, { params }: { params: Promise<{ state: string }> }) {
  const { state } = await params
  const page = getStatePage(state)
  if (!page) return new Response('State not found', { status: 404 })

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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, marginBottom: 12 }}>
            Retire in {page.stateName}
          </div>
          <div style={{ display: 'flex', fontSize: 136, fontWeight: 800, lineHeight: 1, letterSpacing: '-5px' }}>
            {formatMoney(page.fireTarget)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700 }}>
          <span>Average of {page.cityCountLabel} · 25× spending · USD</span>
          <span>untilfire.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  )
}
