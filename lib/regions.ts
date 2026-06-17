import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data'
import { STATE_NAMES } from '@/lib/state-pages'

export interface RegionData {
  slug: string
  name: string
  tagline: string
  description: string
  stateKeys: string[]
  canonicalUrl: string
}

const REGION_DEFINITIONS: RegionData[] = [
  {
    slug: 'northeast',
    name: 'Northeast',
    tagline: 'High cost, high income — can FIRE happen here?',
    description:
      'The Northeast packs the highest salaries and some of the highest costs in the US. From Manhattan ($120k/year) to smaller cities in Vermont ($48k/year), the spread is enormous. Taxes are significant in most states — but so are earning opportunities.',
    stateKeys: ['me', 'vt', 'nh', 'ma', 'ct', 'ri', 'ny', 'nyc', 'nj', 'pa', 'md', 'dc'],
    canonicalUrl: 'https://www.untilfire.com/fire-number/regions/northeast',
  },
  {
    slug: 'southeast',
    name: 'Southeast',
    tagline: 'Lower taxes, lower costs, warmer weather.',
    description:
      'The Southeast is one of the most FIRE-friendly regions in the US. States like Florida and Tennessee have no income tax, while cities like Memphis and Birmingham offer FIRE targets under $1M. Warm weather and a lower cost of living make this a top pick for early retirees.',
    stateKeys: ['va', 'nc', 'sc', 'ga', 'fl', 'al', 'ms', 'tn', 'la', 'ar_us'],
    canonicalUrl: 'https://www.untilfire.com/fire-number/regions/southeast',
  },
  {
    slug: 'midwest',
    name: 'Midwest',
    tagline: 'Underrated value. Quiet wealth-building.',
    description:
      'The Midwest offers some of the lowest FIRE targets in the country. Cities like Columbus, Indianapolis, and Kansas City combine moderate incomes with low costs. If you can live on $45k–$55k per year, a $1.1M–$1.4M portfolio covers full FIRE.',
    stateKeys: ['oh', 'mi', 'in_us', 'il', 'wi', 'mn', 'ia', 'mo', 'nd', 'ne', 'ks'],
    canonicalUrl: 'https://www.untilfire.com/fire-number/regions/midwest',
  },
  {
    slug: 'southwest',
    name: 'Southwest',
    tagline: 'Sun, sprawl, and no-tax momentum.',
    description:
      'Texas and Florida both have no income tax — and the Southwest leans into that advantage. Cities like Austin and Phoenix have seen costs rise, but they still compare favorably to coastal metros. Arizona and New Mexico offer excellent affordability for desert-lifestyle FIRE.',
    stateKeys: ['tx', 'ok', 'nm', 'az'],
    canonicalUrl: 'https://www.untilfire.com/fire-number/regions/southwest',
  },
  {
    slug: 'mountain-west',
    name: 'Mountain West',
    tagline: 'Outdoor lifestyle, moderate cost, growing hubs.',
    description:
      'Colorado, Utah, and Nevada offer a compelling mix: outdoor access, growing tech scenes, and moderate living costs. Denver and Salt Lake City are rising but still under $80k/year. Nevada has no income tax. Wyoming and Montana offer near-zero cost for those willing to trade density for space.',
    stateKeys: ['co', 'wy', 'mt', 'id', 'ut', 'nv'],
    canonicalUrl: 'https://www.untilfire.com/fire-number/regions/mountain-west',
  },
  {
    slug: 'west-coast',
    name: 'West Coast',
    tagline: 'High cost, but high income potential too.',
    description:
      'California, Oregon, and Washington combine the highest tech salaries with some of the highest living costs in the US. San Francisco demands $2.75M+ for FIRE, while smaller Oregon cities are closer to $1.3M. Washington has no income tax — a major advantage for high earners in Seattle.',
    stateKeys: ['ca', 'or', 'wa', 'ak', 'hm'],
    canonicalUrl: 'https://www.untilfire.com/fire-number/regions/west-coast',
  },
]

const REGION_BY_SLUG: Record<string, RegionData> = Object.fromEntries(
  REGION_DEFINITIONS.map((r) => [r.slug, r])
)

export const regionSlugs = REGION_DEFINITIONS.map((r) => r.slug)

export function getRegion(slug: string): RegionData | null {
  return REGION_BY_SLUG[slug] ?? null
}

export interface RegionCity {
  key: string
  name: string
  state: string
  stateName: string
  col: number
  fireTarget: number
  taxRate: number
  noIncomeTax: boolean
}

export function getRegionCities(stateKeys: string[]): RegionCity[] {
  const stateSet = new Set(stateKeys)
  return CITIES.filter((c) => isUS(c.state) && stateSet.has(c.state))
    .map((c) => {
      const taxInfo = STATE_TAX[c.state]
      return {
        key: c.key,
        name: c.name,
        state: c.state,
        stateName: STATE_NAMES[c.state] ?? c.state.toUpperCase(),
        col: c.col,
        fireTarget: Math.round(c.col * 25),
        taxRate: taxInfo?.rate ?? 0,
        noIncomeTax: (taxInfo?.rate ?? 0) === 0,
      }
    })
    .sort((a, b) => a.col - b.col)
}

export function getRegionStats(cities: RegionCity[]) {
  if (cities.length === 0) return { avgCost: 0, avgFire: 0, cheapest: null, mostExpensive: null }
  const avgCost = Math.round(cities.reduce((s, c) => s + c.col, 0) / cities.length)
  return {
    avgCost,
    avgFire: avgCost * 25,
    cheapest: cities[0],
    mostExpensive: cities[cities.length - 1],
  }
}
