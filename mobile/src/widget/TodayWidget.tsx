import { FlexWidget, TextWidget } from 'react-native-android-widget'

import { isoDay } from '@/engine'

import type { WidgetRow, WidgetSnapshot } from './snapshot'

type Hex = `#${string}`
const LIGHT = { card: '#FFFFFF', ink: '#151719', ink2: '#5C6170', ink3: '#686D7C', soft: '#EFEDF4', pos: '#17684B', pill: '#151719', pillInk: '#FFFFFF' } as const
const DARK = { card: '#202226', ink: '#FAFAFD', ink2: '#C3C6D0', ink3: '#A9ADBA', soft: '#32353D', pos: '#8FD8B9', pill: '#FAFAFD', pillInk: '#151719' } as const
type Palette = { [K in keyof typeof LIGHT]: Hex }
const YELLOW: Hex = '#FFE58A'

const TODAY = { clickAction: 'OPEN_URI', clickActionData: { uri: 'untilfire://today' } }
const APP = { clickAction: 'OPEN_APP' }

/** The widget (D-145): small = Safe to spend; medium (250dp and wider) adds Today's first two items. */
export function TodayWidget({ snap, width, dark }: { snap: WidgetSnapshot | null; width: number; dark: boolean }) {
  const c: Palette = dark ? DARK : LIGHT
  const medium = width >= 250
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.card, borderRadius: 24, padding: 14, flexDirection: 'row', flexGap: 12 }}>
      <SafeColumn snap={snap} c={c} />
      {medium && snap && snap.day === isoDay(new Date()) ? <TodayColumn snap={snap} c={c} /> : null}
    </FlexWidget>
  )
}

function Label({ text, c }: { text: string; c: Palette }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
      <FlexWidget style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: YELLOW }} />
      <TextWidget text={text} style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: c.ink2 }} />
    </FlexWidget>
  )
}

function SafeColumn({ snap, c }: { snap: WidgetSnapshot | null; c: Palette }) {
  const col = { flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between' } as const
  const big = (text: string) => <TextWidget text={text} style={{ fontSize: 34, fontFamily: 'Inter_800ExtraBold', color: c.ink }} />
  const small = (text: string, color: Hex = c.ink3) => <TextWidget text={text} maxLines={2} style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color }} />
  const headline = (text: string) => <TextWidget text={text} maxLines={3} style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: c.ink }} />
  const pill = (text: string) => (
    <FlexWidget style={{ backgroundColor: c.pill, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
      <TextWidget text={text} style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: c.pillInk }} />
    </FlexWidget>
  )

  // Never a made-up or out-of-date number: no snapshot, or one from an earlier day, asks to open the app.
  if (!snap) return <FlexWidget style={col} {...APP}><Label text="UntilFire" c={c} />{headline("See what's safe to spend")}{pill('Open app')}</FlexWidget>
  if (snap.day !== isoDay(new Date())) return <FlexWidget style={col} {...APP}><Label text="Safe to spend" c={c} />{headline('Tap to update today')}{small('Opens UntilFire')}</FlexWidget>
  if (snap.hidden) return <FlexWidget style={col} {...APP}><Label text="Safe to spend" c={c} />{big('••••')}{small('Hidden · tap to see')}</FlexWidget>
  if (snap.safe == null) {
    return snap.hasBank
      ? <FlexWidget style={col} {...APP}><Label text="Safe to spend" c={c} />{headline('Set a budget to see it')}{pill('Open app')}</FlexWidget>
      : <FlexWidget style={col} {...APP}><Label text="UntilFire" c={c} />{headline("See what's safe to spend")}{pill('Add your bank')}</FlexWidget>
  }
  const foot = snap.safeIsZero && snap.paydayInDays != null
    ? `Payday in ${snap.paydayInDays} ${snap.paydayInDays === 1 ? 'day' : 'days'}`
    : snap.untilPayday ? `${snap.untilPayday} until payday` : ''
  return (
    <FlexWidget style={col} {...APP} accessibilityLabel={`Safe to spend today ${snap.safe}`}>
      <Label text="Safe to spend" c={c} />
      <FlexWidget style={{ flexDirection: 'column' }}>{big(snap.safe)}{small('today')}</FlexWidget>
      {small(foot)}
    </FlexWidget>
  )
}

function TodayColumn({ snap, c }: { snap: WidgetSnapshot; c: Palette }) {
  const col = { flex: 1.3, height: 'match_parent', flexDirection: 'column', flexGap: 8 } as const
  if (snap.left === 0) {
    return (
      <FlexWidget style={{ ...col, justifyContent: 'space-between' }} {...TODAY}>
        <Label text="Today" c={c} />
        <TextWidget text="✓ All done" style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: c.pos }} />
        <TextWidget text={`${snap.daysThisMonth} days checked this month`} style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: c.ink3 }} />
      </FlexWidget>
    )
  }
  // Hidden amounts hide the rows too: they name shops and prices.
  if (snap.hidden) {
    return (
      <FlexWidget style={{ ...col, justifyContent: 'space-between' }} {...TODAY}>
        <Label text="Today" c={c} />
        <TextWidget text={snap.left === 1 ? '1 thing to check' : `${snap.left} things to check`} style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: c.ink }} />
        <TextWidget text="Tap to open" style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: c.ink3 }} />
      </FlexWidget>
    )
  }
  return (
    <FlexWidget style={col}>
      <FlexWidget {...TODAY}><Label text={`Today · ${snap.left} left`} c={c} /></FlexWidget>
      {snap.rows.map(r => <Row key={r.key} row={r} c={c} />)}
    </FlexWidget>
  )
}

function Row({ row, c }: { row: WidgetRow; c: Palette }) {
  const tap = row.accept ? { clickAction: 'ACCEPT', clickActionData: { key: row.key } } : TODAY
  return (
    <FlexWidget {...tap} accessibilityLabel={row.accept ? `${row.title}, file as ${row.ask}` : row.title}
      style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 8, backgroundColor: c.soft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 }}>
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget text={row.title} maxLines={1} truncate="END" style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: c.ink }} />
        <TextWidget text={row.ask} maxLines={1} style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: c.ink3 }} />
      </FlexWidget>
      <FlexWidget style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.pill, alignItems: 'center', justifyContent: 'center' }}>
        <TextWidget text={row.accept ? '✓' : '›'} style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: c.pillInk }} />
      </FlexWidget>
    </FlexWidget>
  )
}
