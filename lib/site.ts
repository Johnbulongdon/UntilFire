export const SITE_URL = 'https://www.untilfire.com'

export function siteUrl(path = '') {
  if (!path || path === '/') return SITE_URL
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Profiles identifying UntilFire, for schema.org sameAs.
 * Verify ownership and the canonical profile URL before changing this list.
 * A directory backlink is not automatically an identity profile. sameAs helps
 * describe the entity; it does not merge rankings, prevent directory results
 * from appearing, or guarantee that the homepage wins a brand query.
 */
export const BRAND_PROFILES: string[] = [
  'https://twitter.com/untilfire',
  'https://www.linkedin.com/company/untilfire',
]
