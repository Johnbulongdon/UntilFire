/**
 * A shareable freedom year: the calendar year work could become optional.
 * Never an amount, an age or a city — a link someone posts should say when,
 * not what they earn or have (D-22's rule, applied to the calculator, D-98).
 *
 * Share links look like /share/freedom?y=2041. Anything else in them is ignored.
 */
export const FREEDOM_SHARE_PATH = '/share/freedom'

/** The farthest year a share may name: a result can sit decades out, never a century. */
const MAX_YEARS_AHEAD = 80

/** Read a year from a query value; null unless it is one we would write. */
export function parseFreedomYear(y: unknown, now = new Date()): number | null {
  if (typeof y !== 'string' || !/^\d{4}$/.test(y)) return null
  const year = Number(y)
  const thisYear = now.getFullYear()
  if (year < thisYear || year > thisYear + MAX_YEARS_AHEAD) return null
  return year
}

export function freedomSharePath(year: number): string {
  return `${FREEDOM_SHARE_PATH}?y=${year}`
}

/** What the share sheet or the copied link says alongside the URL. */
export function freedomShareText(year: number): string {
  return `I could be free to stop working in ${year}. When could you?`
}
