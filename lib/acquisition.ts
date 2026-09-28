export const ACQUISITION_SOURCE_KEY = 'uf_acquisition_source'

const SEARCH_ENGINES: Array<[RegExp, string]> = [
  [/(^|\.)google\./, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)search\.yahoo\.com$/, 'yahoo'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)ecosia\.org$/, 'ecosia'],
  [/(^|\.)search\.brave\.com$/, 'brave'],
]

export function normaliseAcquisitionSource(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || undefined
}

export function getAcquisitionSource() {
  if (typeof window === 'undefined') return undefined

  try {
    const detected = acquisitionSourceFromVisit(
      new URL(window.location.href),
      typeof document === 'undefined' ? undefined : document.referrer,
    )
    if (detected) {
      window.localStorage.setItem(ACQUISITION_SOURCE_KEY, detected)
      return detected
    }

    return normaliseAcquisitionSource(
      window.localStorage.getItem(ACQUISITION_SOURCE_KEY),
    )
  } catch {
    return undefined
  }
}

/**
 * Convert only non-sensitive campaign/referrer context into a stable source.
 * Search attribution used to depend entirely on our own `?source=` links, so
 * an organic visitor arriving from Google looked the same as a direct visit.
 * Hostnames and UTM labels are safe; full referrer URLs and search terms are
 * deliberately never stored or sent to analytics.
 */
export function acquisitionSourceFromVisit(
  url: URL,
  referrer?: string,
): string | undefined {
  const explicit = normaliseAcquisitionSource(url.searchParams.get('source'))
  if (explicit) return explicit

  const utmSource = normaliseAcquisitionSource(url.searchParams.get('utm_source'))
  const utmMedium = normaliseAcquisitionSource(url.searchParams.get('utm_medium'))
  if (utmSource) {
    return normaliseAcquisitionSource(
      ['utm', utmSource, utmMedium].filter(Boolean).join('-'),
    )
  }

  if (!referrer) return undefined

  try {
    const referrerUrl = new URL(referrer)
    const hostname = referrerUrl.hostname.toLowerCase().replace(/^www\./, '')
    const currentHostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!hostname || hostname === currentHostname) return undefined

    const engine = SEARCH_ENGINES.find(([pattern]) => pattern.test(hostname))
    if (engine) return `organic-${engine[1]}`

    return normaliseAcquisitionSource(`referral-${hostname}`)
  } catch {
    return undefined
  }
}

export function setAcquisitionSource(source?: string) {
  if (typeof window === 'undefined' || !source) return

  const normalized = normaliseAcquisitionSource(source)
  if (!normalized) return

  try {
    window.localStorage.setItem(ACQUISITION_SOURCE_KEY, normalized)
  } catch {}
}
