import { Redirect, router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { ConfettiBurst } from '@/components/ConfettiBurst'
import { Icon } from '@/components/Icon'
import { ICONS } from '@/components/icon-set'
import { ShapeMoment } from '@/components/ShapeMoment'
import { Sunny, type Mood } from '@/components/Sunny'
import { Text } from '@/components/Text'
import { colors } from '@/theme/colors'

const MOMENTS: { mood: Mood; label: string; where: string }[] = [
  { mood: 'hello', label: 'Hello', where: 'Opening the app, the welcome screen' },
  { mood: 'think', label: 'Thinking', where: 'Working out your date, loading' },
  { mood: 'done', label: 'Day done', where: '"All caught up" in Today' },
  { mood: 'quiet', label: 'Quiet day', where: 'Nothing to do today, empty screens' },
  { mood: 'win', label: 'Big win', where: 'A goal reached, the date moves closer' },
  { mood: 'rise', label: 'Sunrise', where: 'The reveal of your freedom year' },
]

/** Temporary: compare character directions A and C, moving, on the phone. */
export default function CharacterLab() {
  // A design comparison: never reachable, by link or otherwise, outside development.
  if (!__DEV__) return <Redirect href="/" />
  return <Lab />
}

function Lab() {
  const [option, setOption] = useState<'A' | 'C' | 'icons'>('A')
  const [mood, setMood] = useState<Mood>('hello')
  const [run, setRun] = useState(0)
  const moment = MOMENTS.find(m => m.mood === mood)!
  const play = (m: Mood) => { setMood(m); setRun(r => r + 1) }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View className="flex-row gap-3">
          <Button style={{ flex: 1 }} kind={option === 'A' ? 'primary' : 'quiet'} label="A · Sunny" onPress={() => { setOption('A'); setRun(r => r + 1) }} />
          <Button style={{ flex: 1 }} kind={option === 'C' ? 'primary' : 'quiet'} label="C · Shapes" onPress={() => { setOption('C'); setRun(r => r + 1) }} />
        </View>

        <Button kind={option === 'icons' ? 'primary' : 'quiet'} label="Icon set" onPress={() => setOption('icons')} />
        {option === 'icons' ? (
          <View className="flex-row flex-wrap gap-3">
            {Object.keys(ICONS).map(n => (
              <View key={n} style={{ width: 92, alignItems: 'center', gap: 4 }}>
                <View style={{ width: 80, height: 80, borderRadius: 22, backgroundColor: colors.tealDeep, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={n as 'plus'} size={48} color="#FFFFFF" />
                </View>
                <Icon name={n as 'plus'} size={22} color={colors.ink} />
                <Text numberOfLines={1} className="text-[9px] text-ink-3">{n}</Text>
              </View>
            ))}
          </View>
        ) : <>
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 300, borderRadius: 28, backgroundColor: colors.surface }}>
          {option === 'A' ? <Sunny key={run} mood={mood} size={220} /> : <ShapeMoment key={run} mood={mood} size={220} />}
        </View>
        <View className="items-center gap-1">
          <Text className="font-display text-[24px] font-bold text-ink">{moment.label}</Text>
          <Text className="text-center text-[14px] text-ink-2">{moment.where}</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {MOMENTS.map(m => (
            <Button key={m.mood} small kind={m.mood === mood ? 'primary' : 'quiet'} label={m.label} onPress={() => play(m.mood)} />
          ))}
        </View>
        <Button kind="quiet" label="Play again" onPress={() => setRun(r => r + 1)} />
        </>}
        <Button kind="quiet" label="Close" onPress={() => router.back()} />
      </ScrollView>
      {option !== 'icons' && mood === 'win' && <ConfettiBurst key={run} />}
    </SafeAreaView>
  )
}
