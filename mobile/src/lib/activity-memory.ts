import type { RangePreset } from '@/engine'
export type ActivityView = { preset: RangePreset; endMonth: string; category: string | null; query: string; offset: number }
let saved: { owner: string; context: string; view: ActivityView } | null = null

/** Visit-only UI state. Never persisted or reused for a different account/deep link. */
export function readActivity(owner: string | null, context: string, fallback: ActivityView): ActivityView {
  if (!owner) { saved = null; return { ...fallback } }
  if (saved?.owner === owner && saved.context === context) return { ...saved.view }
  saved = { owner, context, view: { ...fallback } }
  return { ...fallback }
}
export function rememberActivity(owner: string | null, context: string, view: ActivityView) {
  // A delayed cleanup from a previous screen/account cannot overwrite the new visit.
  if (!owner || saved?.owner !== owner || saved.context !== context) return
  saved.view = { ...view, offset: Number.isFinite(view.offset) ? Math.max(0, view.offset) : 0 }
}
