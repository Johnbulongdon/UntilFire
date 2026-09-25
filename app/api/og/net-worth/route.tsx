import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { parseNetWorthShare, sharePct, shareWho } from '@/lib/net-worth-share'

export const runtime = 'edge'

// v3 Warm tokens as literals: the image renderer can't read CSS variables.
const GROUND = '#FDF8F1'
const INK = '#221B12'
const INK_2 = '#6B5C48'
const GREEN = '#12856A'
const TEAL = '#0E9C86'
const TRACK = '#EFE2D0'

/**
 * The preview image for a shared net worth result. It shows the age group
 * and the share of households with less, never an amount; anything it
 * can't parse gets the generic question instead.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const share = parseNetWorthShare(searchParams.get('a'), searchParams.get('p'))
  const position = share ? (share.pct ?? 99.5) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', background: GROUND, padding: '56px 72px',
          fontFamily: 'sans-serif', color: INK,
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>
          <span>Until</span>
          <span style={{ color: GREEN }}>Fire</span>
        </div>

        {share && position !== null ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: INK_2, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 18 }}>
              Net worth by age
            </div>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px' }}>
              <span>Ahead of&nbsp;</span>
              <span style={{ color: TEAL }}>{sharePct(share)}</span>
            </div>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, marginTop: 8 }}>
              of {shareWho(share)}
            </div>
            <div style={{ display: 'flex', position: 'relative', width: 1056, height: 84, marginTop: 44 }}>
              <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: 16, height: 16, borderRadius: 8, background: TRACK }} />
              <div style={{ display: 'flex', position: 'absolute', left: 0, top: 16, height: 16, borderRadius: 8, width: `${position}%`, background: TEAL }} />
              <div style={{ display: 'flex', position: 'absolute', left: 527, top: 6, width: 3, height: 36, background: INK_2 }} />
              <div style={{ display: 'flex', position: 'absolute', left: 488, top: 50, width: 80, justifyContent: 'center', fontSize: 22, color: INK_2 }}>median</div>
              <div style={{ display: 'flex', position: 'absolute', left: `${position}%`, top: 8, width: 32, height: 32, marginLeft: -16, borderRadius: 16, background: TEAL, border: `6px solid ${GROUND}` }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', maxWidth: 900 }}>
            How does your net worth compare with people your age?
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: INK_2 }}>
          <span>Federal Reserve Survey of Consumer Finances, in today&apos;s dollars</span>
          <span style={{ color: GREEN, fontWeight: 700 }}>How do you compare? →</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
