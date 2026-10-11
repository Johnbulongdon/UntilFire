import type { ReactNode } from 'react'
import { View } from 'react-native'

import { haptic } from '@/lib/haptics'

import { Bouncy } from './Bouncy'
import { Card, Label } from './Screen'
import { Text } from './Text'

/** A hub card: a label, one number or summary, and a tap through to its page. */
export function HubCard({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Bouncy accessibilityRole="button" accessibilityLabel={label} onPress={() => { haptic.tick(); onPress() }} scaleTo={0.98}>
      <Card>
        <View className="flex-row items-center justify-between">
          <Label>{label}</Label>
          <Text className="text-[18px] text-ink-3">›</Text>
        </View>
        {children}
      </Card>
    </Bouncy>
  )
}

/** The short list at the bottom of a hub, for pages people open less often. */
export function MoreList({ rows }: { rows: { label: string; note: string; onPress: () => void; external?: boolean }[] }) {
  return (
    <Card>
      {rows.map((r, i) => (
        <Bouncy key={r.label} accessibilityRole="button" onPress={() => { haptic.tick(); r.onPress() }} scaleTo={0.98}>
          <View className={`flex-row items-center justify-between py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="flex-1 pr-3">
              <Text className="text-[16px] font-semibold text-ink">{r.label}</Text>
              <Text className="mt-0.5 text-[13px] text-ink-3">{r.note}</Text>
            </View>
            <Text className="text-[14px] text-ink-3">{r.external ? 'untilfire.com ↗' : '›'}</Text>
          </View>
        </Bouncy>
      ))}
    </Card>
  )
}
