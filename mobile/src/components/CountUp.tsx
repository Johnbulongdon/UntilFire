import { useEffect, useState } from 'react'
import { type TextProps } from 'react-native'
import { Text } from './Text'

/** Rolls a whole number up from `from` to `to`, easing out, then rests on it. */
export function CountUp({ from, to, duration = 1200, ...rest }: TextProps & { from: number; to: number; duration?: number }) {
  const [shown, setShown] = useState(from)
  useEffect(() => {
    let frame = 0
    const start = Date.now()
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(from + (to - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [from, to, duration])
  return <Text {...rest}>{shown}</Text>
}
