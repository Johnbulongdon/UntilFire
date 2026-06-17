import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data'

export const STATE_NAMES: Record<string, string> = {
  ca: 'California',
  ny: 'New York',
  nyc: 'New York City',
  tx: 'Texas',
  fl: 'Florida',
  wa: 'Washington',
  or: 'Oregon',
  co: 'Colorado',
  il: 'Illinois',
  ma: 'Massachusetts',
  ga: 'Georgia',
  nc: 'North Carolina',
  az: 'Arizona',
  nv: 'Nevada',
  tn: 'Tennessee',
  mi: 'Michigan',
  pa: 'Pennsylvania',
  oh: 'Ohio',
  mn: 'Minnesota',
  ut: 'Utah',
  in_us: 'Indiana',
  mo: 'Missouri',
  wi: 'Wisconsin',
  ne: 'Nebraska',
  dc: 'Washington D.C.',
  md: 'Maryland',
  ct: 'Connecticut',
  ri: 'Rhode Island',
  va: 'Virginia',
  la: 'Louisiana',
  id: 'Idaho',
  nm: 'New Mexico',
  sc: 'South Carolina',
  al: 'Alabama',
  ar_us: 'Arkansas',
  ia: 'Iowa',
  nd: 'North Dakota',
  ok: 'Oklahoma',
  ks: 'Kansas',
  vt: 'Vermont',
  me: 'Maine',
  nj: 'New Jersey',
  nh: 'New Hampshire',
  ms: 'Mississippi',
  wy: 'Wyoming',
  ak: 'Alaska',
  mt: 'Montana',
  hm: 'Hawaii',
}

const STATE_SLUG_MAP: Record<string, string> = {
  california: 'ca',
  texas: 'tx',
  florida: 'fl',
  newyork: 'ny',
  washington: 'wa',
  oregon: 'or',
  colorado: 'co',
  illinois: 'il',
  massachusetts: 'ma',
  georgia: 'ga',
  northcarolina: 'nc',
  arizona: 'az',
  nevada: 'nv',
  tennessee: 'tn',
  michigan: 'mi',
  pennsylvania: 'pa',
  ohio: 'oh',
  minnesota: 'mn',
  utah: 'ut',
  indiana: 'in_us',
  missouri: 'mo',
  wisconsin: 'wi',
  nebraska: 'ne',
  maryland: 'md',
  connecticut: 'ct',
  rhodeisland: 'ri',
  virginia: 'va',
  louisiana: 'la',
  idaho: 'id',
  newmexico: 'nm',
  southcarolina: 'sc',
  alabama: 'al',
  arkansas: 'ar_us',
  iowa: 'ia',
  northdakota: 'nd',
  oklahoma: 'ok',
  kansas: 'ks',
  vermont: 'vt',
  maine: 'me',
  newjersey: 'nj',
  newhampshire: 'nh',
  mississippi: 'ms',
  wyoming: 'wy',
  alaska: 'ak',
  montana: 'mt',
  hawaii: 'hm',
}

function slugToState(slug: string): string | null {
  return STATE_SLUG_MAP[slug.toLowerCase()] || null
}

function stateToSlug(stateKey: string): string {
  const name = STATE_NAMES[stateKey]
  if (!name) return stateKey
  return name.toLowerCase().replace(/\s+/g, '').replace(/\./g, '')
}

export function getStatePageSlug(stateKey: string): string {
  return stateToSlug(stateKey)
}

export function getCitiesForState(stateKey: string): typeof CITIES {
  return CITIES.filter((c) => isUS(stateKey) && c.state === stateKey)
}

export interface StatePage {
  stateKey: string
  slug: string
  stateName: string
  cities: typeof CITIES
  fireTarget: number
  avgCityColAccross: number
  noIncomeTax: boolean
  title: string
  description: string
  canonicalUrl: string
  heroTitle: string
}

// Generate all state pages
const allStates = new Set(CITIES.filter((c) => isUS(c.state)).map((c) => c.state))

export const statePages: StatePage[] = Array.from(allStates)
  .map((stateKey) => {
    const cities = getCitiesForState(stateKey)
    if (cities.length === 0) return null

    const slug = getStatePageSlug(stateKey)
    const stateName = STATE_NAMES[stateKey] || stateKey
    const avgCol = Math.round(cities.reduce((sum, c) => sum + c.col, 0) / cities.length)
    const fireTarget = avgCol * 25
    const taxInfo = STATE_TAX[stateKey]
    const noIncomeTax = taxInfo?.rate === 0

    return {
      stateKey,
      slug,
      stateName,
      cities: cities.sort((a, b) => b.col - a.col),
      fireTarget,
      avgCityColAccross: avgCol,
      noIncomeTax,
      title: `FIRE Number in ${stateName}: ${cities.length} Cities & Tax Guide | UntilFire`,
      description: `Compare FIRE baselines across ${cities.length} cities in ${stateName}. Local cost of living, state tax context (${noIncomeTax ? 'no income tax' : taxInfo?.label || 'state taxes apply'}), and retirement target for each city.`,
      canonicalUrl: `https://www.untilfire.com/fire-number/states/${slug}`,
      heroTitle: `FIRE Number & Cost of Living in ${stateName}`,
    }
  })
  .filter((p): p is StatePage => p !== null)

export function getStatePage(slug: string): StatePage | null {
  return statePages.find((p) => p.slug === slug) || null
}
