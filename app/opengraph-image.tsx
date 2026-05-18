import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'UntilFire - Know When You Can Stop Working'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logoData = await fetch('https://untilfire.com/logo/horizon-color.svg')
    .then(r => r.arrayBuffer())
    .catch(() => null)
  const logoSrc = logoData
    ? `data:image/svg+xml;base64,${Buffer.from(logoData).toString('base64')}`
    : null

  return new ImageResponse(
    (
      <div
        style={{
          background: '#f6fbf7',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(5,150,105,0.16) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          {logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} width={64} height={64} style={{ borderRadius: 14 }} alt="" />
          )}
          <span style={{ color: '#163127', fontSize: 36, fontWeight: 800, letterSpacing: '-2px' }}>
            UntilFire
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#163127',
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: '-2px',
            maxWidth: 900,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span>Most people don’t know</span>
          <span style={{ color: '#047857' }}>when they can stop working</span>
        </div>

        {/* Subheading */}
        <div
          style={{
            marginTop: 24,
            fontSize: 24,
            color: '#6b7f76',
            textAlign: 'center',
            maxWidth: 680,
            display: 'flex',
          }}
        >
          See your FIRE number, retirement timeline, and monthly moves in 60 seconds. Free, no login.
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 48,
            marginTop: 48,
          }}
        >
          {[
            { value: '263', label: 'cities covered' },
            { value: '60s', label: 'to your FIRE date' },
            { value: 'Free', label: 'no login required' },
          ].map(({ value, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 700, color: '#059669' }}>{value}</span>
              <span style={{ fontSize: 16, color: '#6b7f76' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 48,
            fontSize: 18,
            color: '#6b7f76',
            display: 'flex',
          }}
        >
          untilfire.com
        </div>
      </div>
    ),
    { ...size }
  )
}
