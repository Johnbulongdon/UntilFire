import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import type { LearnStageId } from '@/engine'

const READ_KEY = 'untilfire.learn.read'

/** Articles opened on this phone. A convenience, not a record, as on the website. */
export function useReadArticles() {
  const [read, setRead] = useState<string[]>([])
  // Re-read on focus, so ticks appear when you come back from an article.
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(READ_KEY).then(raw => { if (raw) setRead(JSON.parse(raw)) }).catch(() => {})
  }, []))
  // Reads what is stored before adding, so opening an article before the list has loaded never wipes it.
  const markRead = useCallback((slug: string) => {
    AsyncStorage.getItem(READ_KEY).then(raw => {
      const stored: string[] = raw ? JSON.parse(raw) : []
      if (stored.includes(slug)) { setRead(stored); return }
      const next = [...stored, slug]
      setRead(next)
      return AsyncStorage.setItem(READ_KEY, JSON.stringify(next))
    }).catch(() => {})
  }, [])
  return { read, markRead }
}

/** Where you are on the path, by the website's rule (learnPlace in app/dashboard/page.tsx). */
export function stageFor(invested: number, target: number, years: number | null, hasNumbers: boolean): LearnStageId {
  const progress = target > 0 ? (invested / target) * 100 : 0
  if (progress >= 85 || (years !== null && years <= 5)) return 'living-in-fire'
  if (progress >= 45 || (years !== null && years <= 12)) return 'approaching-fire'
  if (hasNumbers) return 'building-momentum'
  return 'starting-out'
}

export const CATEGORY_LOOK: Record<string, { icon: string; color: string }> = {
  'FIRE Basics': { icon: 'leaf.fill', color: '#1baf7a' },
  Investing: { icon: 'chart.line.uptrend.xyaxis', color: '#6b5bd2' },
  Planning: { icon: 'safari.fill', color: '#2a78d6' },
  'Risk & Strategy': { icon: 'shield.lefthalf.filled', color: '#eda100' },
  'Tax & Accounts': { icon: 'doc.text.fill', color: '#e34948' },
}
