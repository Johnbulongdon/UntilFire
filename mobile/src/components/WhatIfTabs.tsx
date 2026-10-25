import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { haptic } from '@/lib/haptics'

import { Text } from './Text'

type WhatIfPage = 'what-if' | 'compare' | 'scenarios'

const PAGES: { key: WhatIfPage; label: string; subtitle: string }[] = [
  { key: 'what-if', label: 'Changes', subtitle: 'Try a change and watch your date move' },
  { key: 'compare', label: 'Life', subtitle: 'Try life changes on your plan' },
  { key: 'scenarios', label: 'Investing', subtitle: 'Compare investment mixes side by side' },
]

/** The subtitle under "What if" for each of its three parts. */
export const whatIfSubtitle = (page: WhatIfPage) => PAGES.find(p => p.key === page)!.subtitle

/**
 * What if, Compare and Scenarios as one place (choice overload, Oct 2026):
 * three ways to try a different future, so Plan shows one tile and the page
 * switches between them. Each part keeps its own screen; switching replaces
 * rather than stacks, so Back still goes to Plan.
 */
export function WhatIfTabs({ current }: { current: WhatIfPage }) {
  return (
    <View accessibilityRole="tablist" className="flex-row gap-1 rounded-control bg-surface-2 p-1">
      {PAGES.map(p => {
        const on = p.key === current
        return (
          <Pressable key={p.key} accessibilityRole="tab" accessibilityState={{ selected: on }}
            onPress={() => { if (on) return; haptic.select(); router.replace(`/plan/${p.key}`) }}
            className={`min-h-[40px] flex-1 items-center justify-center rounded-[10px] ${on ? 'bg-card' : ''}`}>
            <Text className={`text-[14px] font-bold ${on ? 'text-ink' : 'text-ink-2'}`}>{p.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
