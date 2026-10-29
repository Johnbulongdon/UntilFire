import { BRAND_LOCKUP_DATA_URI } from '@/lib/brand'
import {brandOgFonts} from '@/lib/brand-og'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { parseFreedomYear } from '@/lib/freedom-share'

export const runtime = 'nodejs'

// Next Horizon tokens as literals: the image renderer can't read CSS variables.
const GROUND = '#F8F8FB'
const INK = '#151719'
const INK_2 = '#5C6170'
const GREEN = '#151719'
const TEAL = '#151719'

/**
 * The preview image for a shared freedom year (D-98). It shows the year
 * only; anything it can't parse gets the generic question instead.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = parseFreedomYear(searchParams.get('y'))

  const fonts = await brandOgFonts()
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', background: GROUND, padding: '56px 72px',
          fontFamily: 'Inter', color: INK,
        }}
      >
        <img src={BRAND_LOCKUP_DATA_URI} width={216} height={42} alt="UntilFire" />

        {year ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: INK_2, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 12 }}>
              Free to stop working in
            </div>
            <div style={{ display: 'flex', fontSize: 200, fontWeight: 800, lineHeight: 1, letterSpacing: '-6px', color: TEAL }}>
              {year}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', maxWidth: 900 }}>
            When could you stop working?
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: INK_2 }}>
          <span>Free, no sign-up, about a minute</span>
          <span style={{ color: GREEN, fontWeight: 700 }}>When could you? →</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  )
}
