/**
 * A shareable net worth result: the age group and the share of households
 * with less. Never the amount — a link someone posts should say where they
 * stand, not what they have.
 *
 * Share links look like /calculators/net-worth-by-age/share?a=25_29&p=72
 * (p=top for "more than 99%"). Anything else in them is ignored.
 */
import { AGE_BANDS, ageBandLabel, type AgeBand, type NetWorthComparison } from './net-worth-compare.ts'

export const SHARE_PATH = '/calculators/net-worth-by-age/share'

export interface NetWorthShare {
  band: AgeBand
  /** 1–99, or null for "more than 99%". */
  pct: number | null
}

const BANDS: readonly string[] = ['all', ...AGE_BANDS]

/** Read a share from query values; null unless both are ones we write. */
export function parseNetWorthShare(a: unknown, p: unknown): NetWorthShare | null {
  if (typeof a !== 'string' || !BANDS.includes(a)) return null
  if (p === 'top') return { band: a as AgeBand, pct: null }
  if (typeof p !== 'string' || !/^\d{1,2}$/.test(p)) return null
  const pct = Number(p)
  if (pct < 1 || pct > 99) return null
  return { band: a as AgeBand, pct }
}

/** The share for a comparison, or null when there is nothing to share. */
export function shareFromComparison(c: NetWorthComparison): NetWorthShare | null {
  if (c.aboveTop) return { band: c.band, pct: null }
  if (c.aheadOfPct < 1) return null
  return { band: c.band, pct: c.aheadOfPct }
}

export function sharePath(share: NetWorthShare): string {
  return `${SHARE_PATH}?a=${share.band}&p=${share.pct ?? 'top'}`
}

/** "72%" or "more than 99%". */
export function sharePct(share: NetWorthShare): string {
  return share.pct === null ? 'more than 99%' : `${share.pct}%`
}

/** "US households aged 25–29" / "US households of all ages". */
export function shareWho(share: NetWorthShare): string {
  return `US households ${ageBandLabel(share.band)}`
}
