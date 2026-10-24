import { useEffect, useState } from 'react'
import Svg, { Circle, ClipPath, Defs, G, Line, Rect } from 'react-native-svg'

/**
 * Progress to freedom as the logo's sun rising over the horizon: below the
 * line at 0%, half up at 50%, fully risen with its rays at 100%. The picture
 * says how far along you are, so the card doesn't have to.
 *
 * The rise is driven by plain React state, not Reanimated animated props on
 * SVG shapes, which crashed the iOS app (October 2026).
 */
export function Sunrise({ share, width = 320, height = 124, sun, horizon }: {
  share: number; width?: number; height?: number; sun: string; horizon: string; sky?: string
}) {
  const p = Math.max(0, Math.min(1, share))
  // Always show a little sun: the first sliver of progress should be visible.
  const shown = 0.18 + p * 0.82
  const r = height * 0.42
  const cx = width / 2
  const ground = height * 0.86
  // The sun's centre travels from one radius below the horizon to sitting on it.
  const cyAt = (v: number) => ground + r - v * r * 1.02

  const [t, setT] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const ms = 1400
    let raf = 0
    const step = () => {
      const k = Math.min(1, (Date.now() - start) / ms)
      setT(shown * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [shown])

  const rays = [-60, -30, 0, 30, 60].map(deg => {
    const a = ((deg - 90) * Math.PI) / 180
    const r1 = r + 12, r2 = r + 26
    return { x1: cx + Math.cos(a) * r1, y1: ground - r * 0.02 + Math.sin(a) * r1, x2: cx + Math.cos(a) * r2, y2: ground - r * 0.02 + Math.sin(a) * r2 }
  })

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel={`${Math.round(p * 100)}% of the way to freedom`}>
      <Defs>
        <ClipPath id="above"><Rect x={0} y={0} width={width} height={ground} /></ClipPath>
      </Defs>
      <G opacity={Math.max(0, (t - 0.55) / 0.45)}>
        {rays.map((l, i) => <Line key={i} {...l} stroke={sun} strokeWidth={6} strokeLinecap="round" />)}
      </G>
      <G clipPath="url(#above)">
        <Circle cx={cx} cy={cyAt(t)} r={r} fill={sun} />
      </G>
      <Rect x={width * 0.06} y={ground - 2} width={width * 0.88} height={5} rx={2.5} fill={horizon} />
    </Svg>
  )
}
