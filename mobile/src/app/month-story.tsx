import { router } from 'expo-router'
import { useMemo } from 'react'

import { MonthStoryPages } from '@/components/MonthStoryPages'
import { freeDays } from '@/engine'
import { phoneMonthStory } from '@/lib/month-story'
import { useAccount } from '@/state/account'
import { useFreedom } from '@/state/freedom'

/** Last month's story (D-151), opened from Today: the account's own numbers, and Home's free days. */
export default function MonthStoryScreen() {
  const { data } = useAccount()
  const freedom = useFreedom()
  const story = useMemo(() => (data ? phoneMonthStory(data, freedom?.target ?? 0) : null), [data, freedom?.target])
  const free = useMemo(() => (freedom ? freeDays(freedom.invested, freedom.target, freedom.series.map(s => s.invested)) : null), [freedom])
  // The same label Home's hero gives the freedom date.
  const freedomLabel = !freedom || freedom.year == null ? null : freedom.date ? freedom.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : String(freedom.year)
  return <MonthStoryPages story={story} free={free} freedomLabel={freedomLabel} onClose={() => router.back()} />
}
