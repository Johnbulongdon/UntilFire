import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import { fileTransactions } from '@/lib/mutations'

import { readSnapshot, writeSnapshot, type WidgetSnapshot } from './snapshot'
import { TodayWidget } from './TodayWidget'

const draw = (props: WidgetTaskHandlerProps, snap: WidgetSnapshot | null) => props.renderWidget({
  light: <TodayWidget snap={snap} width={props.widgetInfo.width} dark={false} />,
  dark: <TodayWidget snap={snap} width={props.widgetInfo.width} dark />,
})

/**
 * Runs in the background when Android adds, resizes, refreshes or taps the
 * widget. A ✓ on a row files that payment as suggested, as the Today screen's
 * first choice does; the row leaves at once and comes back if the save fails.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const snap = await readSnapshot()
  if (props.widgetAction === 'WIDGET_DELETED') return
  if (props.widgetAction !== 'WIDGET_CLICK' || props.clickAction !== 'ACCEPT' || !snap) { draw(props, snap); return }

  const key = props.clickActionData?.key
  const row = snap.rows.find(r => r.key === key)
  if (!row?.accept) { draw(props, snap); return }
  const after = { ...snap, rows: snap.rows.filter(r => r.key !== key), left: Math.max(0, snap.left - 1) }
  draw(props, after)
  const problem = await fileTransactions([row.accept]).catch(() => 'failed')
  if (problem) { draw(props, snap); return }
  await writeSnapshot(after)
}
