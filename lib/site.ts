export const SITE_URL = 'https://www.untilfire.com'

export function siteUrl(path = '') {
  if (!path || path === '/') return SITE_URL
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Every profile that is unmistakably UntilFire, for schema.org sameAs.
 *
 * This is the fix for a brand query the site does not win. Searching
 * "untilfire.com" returned directory listings above untilfire.com itself,
 * which is what happens when those directories carry more authority than a
 * four-month-old domain and Google has not been told the profiles and the site
 * are the same entity. sameAs is that statement. It consolidates the listings
 * into one brand rather than leaving them to compete with the thing they point
 * at.
 *
 * ADD EVERY DIRECTORY SUBMISSION HERE. The list is only as useful as it is
 * complete, and a listing left out keeps competing for its own brand's name.
 * Only add pages that are genuinely this product's own profile — sameAs is a
 * claim of identity, and a mistaken entry claims someone else's.
 */
export const BRAND_PROFILES: string[] = [
  'https://twitter.com/untilfire',
  'https://www.linkedin.com/company/untilfire',
]
