import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data'

const US_CITIES = CITIES.filter((c) => isUS(c.state))
const SORTED_BY_COST = [...US_CITIES].sort((a, b) => b.col - a.col)
const CHEAPEST_CITIES = [...US_CITIES].sort((a, b) => a.col - b.col).slice(0, 20)
const MOST_EXPENSIVE = SORTED_BY_COST.slice(0, 20)

export interface RankingPage {
  slug: string
  title: string
  description: string
  canonicalUrl: string
  heroTitle: string
  heroDesc: string
  pageType: 'cheapest' | 'expensive' | 'no-income-tax' | 'by-state'
}

const RANKING_PAGES: Record<string, RankingPage> = {
  'cheapest-cities': {
    slug: 'cheapest-cities',
    title: 'Cheapest US Cities for Early Retirement | FIRE Number | UntilFire',
    description:
      'Explore the 20 cheapest US cities for FIRE. See local cost of living, FIRE targets, state tax context, and retirement timelines for budget-conscious early retirees.',
    canonicalUrl: 'https://www.untilfire.com/fire-number/cheapest-cities',
    heroTitle: 'The Cheapest US Cities to Retire Early',
    heroDesc:
      'Lower cost of living means a smaller portfolio can sustain you. Here are the 20 cheapest US cities for FIRE, ranked by annual spending, with tax context and retirement targets.',
    pageType: 'cheapest',
  },
  'most-expensive-cities': {
    slug: 'most-expensive-cities',
    title: 'Most Expensive US Cities for FIRE | Cost of Living Guide | UntilFire',
    description:
      'Compare the 20 most expensive US cities: San Francisco, New York, LA, and more. See exact FIRE targets, tax rates, and realistic retirement costs for each city.',
    canonicalUrl: 'https://www.untilfire.com/fire-number/most-expensive-cities',
    heroTitle: 'The Most Expensive US Cities & Their FIRE Numbers',
    heroDesc:
      'High-cost cities like San Francisco and NYC require larger portfolios. See the 20 most expensive US cities ranked by annual cost, with state tax context and savings timelines.',
    pageType: 'expensive',
  },
  'no-income-tax-states': {
    slug: 'no-income-tax-states',
    title: 'Best No-Income-Tax States for FIRE | Early Retirement Tax Guide | UntilFire',
    description:
      'Discover 9 US states with zero income tax: Texas, Florida, Nevada, Washington, and more. Compare FIRE numbers, cost of living, and tax savings for each state.',
    canonicalUrl: 'https://www.untilfire.com/fire-number/no-income-tax-states',
    heroTitle: 'FIRE in No-Income-Tax States: Tax-Efficient Retirement',
    heroDesc:
      'Nine US states have zero income tax, keeping more of your savings invested. Compare FIRE targets and living costs across Texas, Florida, Nevada, Washington, and others.',
    pageType: 'no-income-tax',
  },
  'fire-by-state': {
    slug: 'fire-by-state',
    title: 'FIRE Number by State | State-by-State Retirement Guide | UntilFire',
    description:
      'Compare average FIRE targets across all US states. See state tax rates, cheapest and most expensive cities, and median retirement costs for each state.',
    canonicalUrl: 'https://www.untilfire.com/fire-number/fire-by-state',
    heroTitle: 'FIRE Number by State: Compare Retirement Targets',
    heroDesc:
      'Retirement costs vary dramatically by state. See average FIRE targets, state tax rates, and the cheapest/most expensive cities in each US state.',
    pageType: 'by-state',
  },
}

export function getRankingPage(slug: string): RankingPage | null {
  return RANKING_PAGES[slug] || null
}

export const rankingPagesList = Object.values(RANKING_PAGES)

export function getCheapestCities() {
  return CHEAPEST_CITIES
}

export function getMostExpensiveCities() {
  return MOST_EXPENSIVE
}

export function getNoIncomeTaxStates() {
  const noTaxStates = new Set<string>()
  for (const [stateKey, taxInfo] of Object.entries(STATE_TAX)) {
    if (taxInfo.rate === 0 && isUS(stateKey)) {
      noTaxStates.add(stateKey)
    }
  }
  return Array.from(noTaxStates)
}

export function getCitiesByState() {
  const citiesByState: Record<string, typeof US_CITIES> = {}
  for (const city of US_CITIES) {
    if (!citiesByState[city.state]) {
      citiesByState[city.state] = []
    }
    citiesByState[city.state].push(city)
  }
  return citiesByState
}

export function getStateStats(stateKey: string) {
  const cities = US_CITIES.filter((c) => c.state === stateKey)
  if (cities.length === 0) return null

  const avgCol = Math.round(cities.reduce((sum, c) => sum + c.col, 0) / cities.length)
  const cheapest = cities.reduce((a, b) => (a.col < b.col ? a : b))
  const mostExpensive = cities.reduce((a, b) => (a.col > b.col ? a : b))
  const taxInfo = STATE_TAX[stateKey]

  return {
    stateKey,
    cities,
    count: cities.length,
    avgCol,
    fireTarget: avgCol * 25,
    cheapest,
    mostExpensive,
    taxInfo,
  }
}
