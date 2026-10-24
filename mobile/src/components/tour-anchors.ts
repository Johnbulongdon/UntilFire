import { useCallback, useRef, useSyncExternalStore } from 'react'
import { Dimensions, type View } from 'react-native'

/**
 * Places the Home tour points at (GuidedTour): a screen part registers itself
 * by name, and the tour measures it on screen when its stop comes up. A part
 * can be mounted more than once (the Today bar is on every tab), so the tour
 * uses whichever copy is actually on screen.
 */
export type TourAnchor = 'hero' | 'actions' | 'today'
export type Rect = { x: number; y: number; width: number; height: number }

const views = new Map<TourAnchor, Set<View>>()

// Whether the tour is on screen, so a part that is sometimes hidden (the Today
// bar when all caught up) can show itself for its stop.
let showing = false
const listeners = new Set<() => void>()
export function setTourShowing(on: boolean) {
  if (on === showing) return
  showing = on
  listeners.forEach(l => l())
}
export function useTourShowing() {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l) } }, () => showing)
}

/** Spread on the View the tour should point at: `<View {...useTourAnchor('hero')}>`. */
export function useTourAnchor(name: TourAnchor) {
  const ref = useRef<View | null>(null)
  const set = useCallback((v: View | null) => {
    const all = views.get(name) ?? new Set<View>()
    if (ref.current) all.delete(ref.current)
    ref.current = v
    if (v) all.add(v)
    views.set(name, all)
  }, [name])
  return { ref: set, collapsable: false }
}

const measure = (v: View) => new Promise<Rect | null>(resolve => {
  try { v.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null)) } catch { resolve(null) }
})

/** Where a registered part is on screen right now, or null if no copy of it is showing. */
export async function measureAnchor(name: TourAnchor): Promise<Rect | null> {
  const { width, height } = Dimensions.get('window')
  for (const v of views.get(name) ?? []) {
    const r = await measure(v)
    if (r && r.x >= 0 && r.x < width && r.y >= 0 && r.y < height) return r
  }
  return null
}
