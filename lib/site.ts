export const SITE_URL = 'https://www.untilfire.com'

export function siteUrl(path = '') {
  if (!path || path === '/') return SITE_URL
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
