import AsyncStorage from '@react-native-async-storage/async-storage'
import * as StoreReview from 'expo-store-review'

const KEY = 'rating-asked-at'
const MIN_DAYS_DONE = 3
const GAP_MS = 120 * 864e5

/**
 * Apple's own rating sheet, asked at a good moment: just after a Today is
 * finished, once three days are done, and at most every 120 days. iOS decides
 * whether it actually shows (at most three times a year), and in Expo Go it
 * never does. No prompt of our own, so it stays one tap and never a nag.
 */
export async function maybeAskForRating(daysDone: number): Promise<void> {
  if (daysDone < MIN_DAYS_DONE) return
  try {
    const last = Number(await AsyncStorage.getItem(KEY)) || 0
    if (Date.now() - last < GAP_MS) return
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return
    await AsyncStorage.setItem(KEY, String(Date.now()))
    // After the finish sound and confetti, not over them.
    setTimeout(() => { StoreReview.requestReview().catch(() => {}) }, 1800)
  } catch { /* a rating is never worth an error */ }
}
