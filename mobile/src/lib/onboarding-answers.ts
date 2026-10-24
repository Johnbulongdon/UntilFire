/**
 * Answers that shape a question but aren't part of the plan itself: how often
 * pay arrives and whether people know their spending or their saving. Kept for
 * the length of onboarding only.
 */
export type PayEvery = 'month' | 'twice' | 'two-weeks' | 'week'
export const PAY_EVERY: { key: PayEvery; label: string; perYear: number; unit: string }[] = [
  { key: 'month', label: 'Once a month', perYear: 12, unit: 'each month' },
  { key: 'twice', label: 'Twice a month', perYear: 24, unit: 'each paycheck' },
  { key: 'two-weeks', label: 'Every two weeks', perYear: 26, unit: 'each paycheck' },
  { key: 'week', label: 'Every week', perYear: 52, unit: 'each paycheck' },
]

export const answers: { pay: PayEvery; know: 'spend' | 'save' } = { pay: 'month', know: 'spend' }
