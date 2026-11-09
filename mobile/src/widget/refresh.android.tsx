import { requestWidgetUpdate } from 'react-native-android-widget'

import { readSnapshot, WIDGET_NAME } from './snapshot'
import { TodayWidget } from './TodayWidget'

/** Redraws every placed widget from the saved snapshot. */
export async function refreshWidget() {
  const snap = await readSnapshot()
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: info => ({ light: <TodayWidget snap={snap} width={info.width} dark={false} />, dark: <TodayWidget snap={snap} width={info.width} dark /> }),
  })
}
