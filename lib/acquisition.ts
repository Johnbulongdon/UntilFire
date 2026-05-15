export const ACQUISITION_SOURCE_KEY = 'uf_acquisition_source'

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
    return normaliseAcquisitionSource(
      window.localStorage.getItem(ACQUISITION_SOURCE_KEY),
    )
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
