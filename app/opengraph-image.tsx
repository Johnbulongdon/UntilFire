import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'UntilFire — Personal finance that sets you free'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a1a12',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background glow top-left */}
        <div style={{
          position: 'absolute', top: -120, left: -80,
          width: 560, height: 560, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(5,150,105,0.28) 0%, transparent 70%)',
          display: 'flex',
        }} />
        {/* Background glow bottom-right */}
        <div style={{
          position: 'absolute', bottom: -160, right: -80,
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', height: '100%',
          padding: '56px 72px',
          position: 'relative',
        }}>

          {/* Top: logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #059669, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 22, fontWeight: 800,
            }}>U</div>
            <span style={{ color: '#d1fae5', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
              UntilFire
            </span>
          </div>

          {/* Middle: headline + sub */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              fontSize: 72, fontWeight: 800, lineHeight: 1.05,
              letterSpacing: '-2.5px', color: '#f0fdf4',
              display: 'flex', flexDirection: 'column',
            }}>
              <span>Personal finance</span>
              <span style={{ color: '#34d399' }}>that sets you free.</span>
            </div>

            <div style={{
              fontSize: 26, color: '#86efac', lineHeight: 1.45,
              maxWidth: 680, display: 'flex', flexDirection: 'column',
            }}>
              <span>Start with your freedom date in 60 seconds.</span>
              <span>Then UntilFire gives you a plan to move it closer.</span>
            </div>
          </div>

          {/* Bottom: proof + domain */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 999, padding: '10px 20px',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#34d399', display: 'flex',
              }} />
              <span style={{ color: '#34d399', fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' }}>
                Free &middot; No login required
              </span>
            </div>
            <span style={{ color: '#4ade80', fontSize: 18, fontWeight: 600, opacity: 0.7 }}>
              untilfire.com
            </span>
          </div>

        </div>
      </div>
    ),
    { ...size }
  )
}
