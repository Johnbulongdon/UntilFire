import * as Haptics from 'expo-haptics'

// One vocabulary for touch feedback, so the same kind of moment always feels the same.
export const haptic = {
  /** Picking an option. */
  select: () => { Haptics.selectionAsync().catch(() => {}) },
  /** Pressing a main button. */
  press: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}) },
  /** A light tick, for steppers and sliders. */
  tick: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  /** A big reveal landing. */
  success: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  /** Something that can't go ahead. */
  warn: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}) },
}
