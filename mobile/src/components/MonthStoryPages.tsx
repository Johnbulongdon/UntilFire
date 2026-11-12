import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, Share, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { FreeDaysDots } from '@/components/FreeDaysDots'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { FREE_DAYS_SHARE_URL, freeDaysLabel, freeDaysShareText, freeNextLabel, freeTimeMore, storyChangeLine, storyFlowLine, storyKeptLine, storyPages, type FreeDays, type MonthStory, type StoryPage } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf } from '@/lib/money-data'
import { useAppearance } from '@/state/appearance'
import { brand, colors } from '@/theme/colors'

/** One colour per page: the same four as the website's story. Yellow keeps its dark ink in both themes. */
const GROUND: Record<'light' | 'dark', Record<StoryPage, string>> = {
  light: { kept: brand.mint, change: brand.blue, hours: brand.yellow, free: brand.lilac },
  dark: { kept: '#213F35', change: '#26384D', hours: brand.yellow, free: '#363048' },
}

/** The three lines of a page: a few words, the big one, a few words. */
function lines(page: StoryPage, story: MonthStory, free: FreeDays | null): { eyebrow: string; big: string; sub: string } {
  if (page === 'kept') return { eyebrow: story.monthName, big: storyKeptLine(story, money), sub: storyFlowLine(story, money) }
  if (page === 'change') return { eyebrow: 'Biggest change', big: categoryOf(story.change!.key).label, sub: storyChangeLine(story.change!, money) }
  if (page === 'hours') return { eyebrow: 'Put into savings, it pays for', big: freeTimeMore(story.hours)!, sub: 'of every year' }
  return { eyebrow: 'Your money already pays for', big: freeDaysLabel(free!), sub: 'of every year' }
}

/**
 * Month story (D-151, lib/month-story): last month in a few short pages, one
 * idea a page. Opened from Today (app/month-story). The last page shares the free days, never
 * an amount (D-22, D-98).
 */
export function MonthStoryPages({ story, free, freedomLabel, onClose }: {
  /** Null when there is no finished month to tell. */
  story: MonthStory | null
  /** Home's free days (D-149); null without a freedom number, which leaves the last page out. */
  free: FreeDays | null
  /** "Mar 2041", for the last of the 365 days. */
  freedomLabel: string | null
  onClose: () => void
}) {
  const { scheme } = useAppearance()
  const pages = useMemo(() => (story ? storyPages(story, !!free) : []), [story, free])
  const [at, setAt] = useState(0)
  const page = pages[Math.min(at, pages.length - 1)]

  // Each page comes in with a short rise, so a tap feels like turning a page.
  const enter = useRef(new Animated.Value(0)).current
  useEffect(() => {
    enter.setValue(0)
    Animated.timing(enter, { toValue: 1, duration: 320, useNativeDriver: true }).start()
  }, [at, enter])

  const close = () => { haptic.tick(); onClose() }
  if (!story || !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 10 }}>
          <Text className="font-display text-[28px] font-bold leading-9 text-ink">No story yet</Text>
          <Text className="text-[16px] leading-6 text-ink-2">Your story needs one finished month with money coming in and money going out. Add your income and spending and it will be ready next month.</Text>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}><Button label="Done" onPress={close} /></View>
      </SafeAreaView>
    )
  }

  const onYellow = page === 'hours'
  const dark = scheme === 'dark' && !onYellow
  const ink = dark ? '#FAFAFD' : '#151719'
  const ink2 = dark ? 'rgba(250,250,253,0.74)' : onYellow ? '#5C5130' : 'rgba(21,23,25,0.68)'
  const faint = dark ? 'rgba(250,250,253,0.22)' : 'rgba(21,23,25,0.16)'
  const last = at >= pages.length - 1
  const { eyebrow, big, sub } = lines(page, story, free)
  const next = () => { if (!last) { haptic.tick(); setAt(at + 1) } }
  const back = () => { if (at > 0) { haptic.tick(); setAt(at - 1) } }
  const share = async () => {
    if (!free) return
    haptic.tick()
    await Share.share({ message: `${freeDaysShareText(freeDaysLabel(free))} ${FREE_DAYS_SHARE_URL}` }).catch(() => {})
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND[scheme][page] }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityRole="progressbar" accessibilityLabel={`Page ${at + 1} of ${pages.length}`}>
          {pages.map((p, i) => <View key={p} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= at ? ink : faint }} />)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: ink2 }} className="text-[15px] font-bold">Your {story.monthName} story</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close the story" hitSlop={14} onPress={close}>
            <Icon name="xmark" fallback="✕" size={20} color={ink} />
          </Pressable>
        </View>
      </View>

      {/* The page itself: a tap anywhere on it turns to the next one. */}
      <Pressable style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }} onPress={next} accessible accessibilityLabel={`${eyebrow}. ${big}. ${sub}.`}>
        <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <Text style={{ color: ink2 }} className="text-[18px] font-bold">{eyebrow}</Text>
          <Text style={{ color: ink }} className="mt-2 font-display text-[46px] font-bold leading-[52px] tracking-tight">{big}</Text>
          <Text style={{ color: ink }} className="mt-3 text-[19px] font-semibold leading-7">{sub}</Text>
          {page === 'free' && free && (
            <>
              <View style={{ marginTop: 10 }}><FreeDaysDots days={free.days} ink={ink} ring={dark ? '#363048' : '#FFFFFF'} empty={faint} /></View>
              <View className="mt-4 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: ink }}>
                <Text style={{ color: dark ? '#151719' : '#FFFFFF' }} className="font-mono text-[13px] font-bold">{freeNextLabel(free, money, freedomLabel)}</Text>
              </View>
            </>
          )}
        </Animated.View>
      </Pressable>

      <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 10 }}>
        {last && page === 'free' && free && (
          <>
            <Button kind={dark ? 'onDark' : 'onAccent'} label={`Share my ${freeDaysLabel(free)}`} onPress={share} />
            <Text style={{ color: ink2, textAlign: 'center' }} className="text-[13px]">Shares your days only, never your money.</Text>
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {at > 0 && <Button style={{ flex: 1 }} kind={dark ? 'onDarkQuiet' : 'quiet'} label="Back" onPress={back} />}
          {last
            ? <Button style={{ flex: 1 }} kind={page === 'free' && free ? (dark ? 'onDarkQuiet' : 'quiet') : dark ? 'onDark' : 'onAccent'} label="Done" onPress={close} />
            : <Button style={{ flex: 1 }} kind={dark ? 'onDark' : 'onAccent'} label="Next" onPress={next} />}
        </View>
      </View>
    </SafeAreaView>
  )
}
