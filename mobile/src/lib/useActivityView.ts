import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import type { NativeScrollEvent, NativeSyntheticEvent, SectionList } from 'react-native'
import type { RangePreset } from '@/engine'
import { readActivity, rememberActivity, type ActivityView } from './activity-memory'

/** Restore after list content exists; native scrolling clamps offsets after a row disappears. */
export function useActivityView<T>(owner: string | null, context: string, defaults: ActivityView, ready: boolean) {
  const [initial] = useState(() => readActivity(owner, context, defaults))
  const [preset, setPreset] = useState<RangePreset>(initial.preset)
  const [endMonth, setEndMonth] = useState(initial.endMonth)
  const [category, setCategory] = useState<string | null>(initial.category)
  const [query, setQuery] = useState(initial.query)
  const list = useRef<SectionList<T>>(null)
  const position = useRef(initial.offset)
  const restorePending = useRef(true)
  const focused = useRef(false)
  const layoutReady = useRef(false)
  const contentReady = useRef(false)
  const frame = useRef<number | null>(null)
  const view = useRef<ActivityView>({ ...initial })
  view.current = { preset, endMonth, category, query, offset: position.current }
  const cancelRestore = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
  }, [])
  const restore = useCallback(() => {
    if (!ready || !restorePending.current || !layoutReady.current || !contentReady.current) return
    cancelRestore()
    frame.current = requestAnimationFrame(() => {
      const scroll = list.current?.getScrollResponder()
      if (!scroll) { frame.current = null; return }
      scroll.scrollTo({ y: position.current, animated: false })
      // Ignore initial layout scroll events until the requested offset has been applied.
      frame.current = requestAnimationFrame(() => { restorePending.current = false; frame.current = null })
    })
  }, [ready, cancelRestore])
  useEffect(() => cancelRestore, [cancelRestore])
  useEffect(() => { rememberActivity(owner, context, view.current) }, [owner, context, preset, endMonth, category, query])
  useFocusEffect(useCallback(() => {
    focused.current = true
    restorePending.current = true
    restore()
    return () => { focused.current = false; cancelRestore(); rememberActivity(owner, context, { ...view.current, offset: position.current }) }
  }, [owner, context, restore, cancelRestore]))
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!focused.current || restorePending.current) return
    position.current = Math.max(0, event.nativeEvent.contentOffset.y)
    rememberActivity(owner, context, { ...view.current, offset: position.current })
  }
  return { preset, endMonth, category, query, setPreset, setEndMonth, setCategory, setQuery, list, onScroll,
    onLayout: () => { layoutReady.current = true; restore() },
    onContentSizeChange: () => { contentReady.current = true; restore() },
    onScrollBeginDrag: () => { cancelRestore(); restorePending.current = false } }
}
