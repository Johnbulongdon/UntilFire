import { BRAND_LOCKUP_DATA_URI } from '@/lib/brand'
import {brandOgFonts} from '@/lib/brand-og'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const rawCity = searchParams.get('city') ?? 'Your City'
  const city = rawCity.slice(0, 40)
  const year = searchParams.get('year') ?? String(new Date().getFullYear() + 15)
  const rawYears = parseInt(searchParams.get('years') ?? '15', 10)
  const years = Math.max(1, Math.min(40, rawYears))

  const fonts = await brandOgFonts()
  return new ImageResponse(
    (
      <div
        style={{
          background: '#FFE58A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
          padding: '52px 72px',
        }}
      >
        <img src={BRAND_LOCKUP_DATA_URI} width={216} height={42} alt="UntilFire" />

        {/* Main content -left-aligned */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#6b7f76',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              display: 'flex',
            }}
          >
            Freedom date
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#151719',
              lineHeight: 1,
              display: 'flex',
            }}
          >
            {city}
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: '#151719',
              lineHeight: 1,
              letterSpacing: '-3px',
              display: 'flex',
            }}
          >
            around {year}
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#6b7f76',
              marginTop: 12,
              display: 'flex',
            }}
          >
            {years} year{years !== 1 ? 's' : ''} away · work optional timeline
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#151719',
                display: 'flex',
              }}
            />
            <span style={{ color: '#151719', fontSize: 20 }}>
              Find your freedom date
            </span>
          </div>
          <span style={{ color: '#151719', fontSize: 20, fontWeight: 600 }}>
            untilfire.com →
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  )
}
