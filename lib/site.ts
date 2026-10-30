export const SITE_URL = 'https://www.untilfire.com'

export function siteUrl(path = '') {
  if (!path || path === '/') return SITE_URL
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * The site-wide share card (app/opengraph-image.tsx). A page that sets its own
 * openGraph replaces the inherited one, image included, so it must list this.
 */
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: 'UntilFire — See beyond your balance. Open up your life.',
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
