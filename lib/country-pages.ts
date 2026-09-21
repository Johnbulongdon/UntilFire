import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data'

/**
 * Country-level FIRE pages.
 *
 * Deliberately not the same bet as the city pages. Search Console settled
 * those: `/fire-number/austin-tx` ranks at position 1.7 and earned five
 * impressions in three months, because Austin does not change the arithmetic
 * — same currency, same tax system, same 4% rule — so nobody asks.
 *
 * A country does change the arithmetic. The effective tax rate across these
 * ranges from 0% to 32% and the cost base from about $9,500 to $96,000, which
 * is a real spread of answers to a question people genuinely have. The
 * evidence is already in our own data: "coast fire calculator singapore"
 * ranks 7.7 where the generic term ranks 41, and Singapore is the single
 * most-seen page on the site.
 *
 * So: ~40 pages whose numbers actually differ, rather than 229 that differ by
 * a place name. Everything on them is computed from data the product already
 * stands behind — no bespoke per-country tax claims, because a wrong one on a
 * finance site costs more than the page could ever earn.
 */

/** Tax-jurisdiction key to the country name used in copy and slugs. */
const COUNTRY_NAMES: Record<string, string> = {
  uk: 'the United Kingdom', de: 'Germany', fr: 'France', es: 'Spain',
  it: 'Italy', pt: 'Portugal', nl: 'the Netherlands', ie: 'Ireland',
  ch: 'Switzerland', se: 'Sweden', no: 'Norway', dk: 'Denmark',
  at: 'Austria', fi: 'Finland', be: 'Belgium', gr: 'Greece',
  cz: 'the Czech Republic', pl: 'Poland', hu: 'Hungary',
  jp: 'Japan', kr: 'South Korea', tw: 'Taiwan', cn: 'China',
  hk: 'Hong Kong', sg: 'Singapore', th: 'Thailand', my: 'Malaysia',
  id_idn: 'Indonesia', vn: 'Vietnam', ph: 'the Philippines',
  in_ind: 'India', au: 'Australia', nz: 'New Zealand',
  ae: 'the UAE', sa: 'Saudi Arabia', qa: 'Qatar', il_isr: 'Israel',
  tr: 'Turkey', mx: 'Mexico', br: 'Brazil', cl: 'Chile',
  co_col: 'Colombia', pe: 'Peru', uy: 'Uruguay', cr: 'Costa Rica',
  pa_pan: 'Panama', za: 'South Africa', ke: 'Kenya', ng: 'Nigeria',
  eg: 'Egypt', ma_mar: 'Morocco', ge: 'Georgia',
}

/** The short form, for titles and tables where "the" reads badly. */
const SHORT_NAMES: Record<string, string> = {
  uk: 'the UK', nl: 'the Netherlands', ae: 'the UAE', ph: 'the Philippines',
  cz: 'the Czech Republic',
}

/**
 * Somewhere that is one city and one country at once.
 *
 * The two-city minimum keeps out jurisdictions too thin to say anything
 * about, but for these it would exclude a complete answer — and Singapore is
 * the best-performing page on the site.
 */
const CITY_STATES = new Set(['sg', 'hk', 'ae', 'qa', 'mo'])

const MIN_CITIES = 2

function slugFor(countryKey: string): string {
  const name = COUNTRY_NAMES[countryKey] ?? countryKey
  return name.replace(/^the /, '').toLowerCase().replace(/\s+/g, '-')
}

export interface CountryPage {
  countryKey: string
  slug: string
  /** "Germany", "the United Kingdom" — reads correctly mid-sentence. */
  name: string
  /** "Germany", "the UK" — for titles and table cells. */
  shortName: string
  flag: string
  cities: typeof CITIES
  /** Average annual cost of living across the cities we hold, in USD. */
  avgCol: number
  cheapestCity: (typeof CITIES)[number]
  dearestCity: (typeof CITIES)[number]
  fireTarget: number
  taxRate: number
  taxLabel: string
  noIncomeTax: boolean
  /** 1 = cheapest of every country here. Computed, so it is true per page. */
  costRank: number
  countryCount: number
  /** How the cost base compares with the US cities we hold. */
  vsUsPct: number
  /** The average US city cost, so pages can show the comparison directly. */
  usAvgCol: number
  /** What a US-average portfolio has to be here instead. */
  usFireTarget: number
  /** Years a $1m portfolio funds here at 4% real. Varies ~10x across these. */
  yearsPerMillion: number
  /** Nearest neighbours by cost — different on every page, and true. */
  cheaperNeighbour: string | null
  dearerNeighbour: string | null
  title: string
  description: string
  canonicalUrl: string
  heroTitle: string
}

const intlCities = CITIES.filter((c) => !isUS(c.state))

const byCountry = new Map<string, typeof CITIES>()
for (const city of intlCities) {
  const list = byCountry.get(city.state) ?? []
  list.push(city)
  byCountry.set(city.state, list)
}

const usAvgCol = (() => {
  const us = CITIES.filter((c) => isUS(c.state))
  return us.length ? Math.round(us.reduce((sum, c) => sum + c.col, 0) / us.length) : 0
})()

const qualifying = [...byCountry.entries()].filter(
  ([key, cities]) =>
    STATE_TAX[key] &&
    COUNTRY_NAMES[key] &&
    (cities.length >= MIN_CITIES || CITY_STATES.has(key)),
)

// Ranked before the pages are built, so each page can state where it sits.
const costOrder = [...qualifying]
  .map(([key, cities]) => ({
    key,
    avg: cities.reduce((sum, c) => sum + c.col, 0) / cities.length,
  }))
  .sort((a, b) => a.avg - b.avg)
  .map((entry) => entry.key)

export const countryPages: CountryPage[] = qualifying
  .map(([countryKey, cities]) => {
    const sorted = [...cities].sort((a, b) => b.col - a.col)
    const avgCol = Math.round(cities.reduce((sum, c) => sum + c.col, 0) / cities.length)
    const tax = STATE_TAX[countryKey]
    const name = COUNTRY_NAMES[countryKey]
    const shortName = SHORT_NAMES[countryKey] ?? name
    const noIncomeTax = tax.rate === 0
    const fireTarget = avgCol * 25

    return {
      countryKey,
      slug: slugFor(countryKey),
      name,
      shortName,
      flag: sorted[0]?.flag ?? '',
      cities: sorted,
      avgCol,
      cheapestCity: sorted[sorted.length - 1],
      dearestCity: sorted[0],
      fireTarget,
      taxRate: tax.rate,
      taxLabel: tax.label,
      noIncomeTax,
      costRank: costOrder.indexOf(countryKey) + 1,
      usAvgCol,
      usFireTarget: usAvgCol * 25,
      // A portfolio lasts as long as it lasts; the same million is a decade
      // in one country and half a lifetime in another. Capped because past
      // ~40 years the 4% rule stops being the thing under discussion.
      yearsPerMillion: Math.min(99, Math.round(1_000_000 / avgCol)),
      cheaperNeighbour: null,
      dearerNeighbour: null,
      countryCount: qualifying.length,
      vsUsPct: usAvgCol ? Math.round(((avgCol - usAvgCol) / usAvgCol) * 100) : 0,
      title: `FIRE Number in ${shortName} — Cost of Living & Tax Guide | UntilFire`,
      description:
        `What financial independence costs in ${shortName}: about $${avgCol.toLocaleString('en-US')} a year ` +
        `across ${cities.length} ${cities.length === 1 ? 'city' : 'cities'}, a FIRE target near ` +
        `$${fireTarget.toLocaleString('en-US')}, and ${noIncomeTax ? 'no personal income tax' : `roughly ${Math.round(tax.rate * 100)}% effective tax`}.`,
      canonicalUrl: `https://www.untilfire.com/fire-number/countries/${slugFor(countryKey)}`,
      heroTitle: `FIRE Number in ${shortName}`,
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

// Neighbours need every page built first, so they are filled in afterwards.
for (const page of countryPages) {
  const position = costOrder.indexOf(page.countryKey)
  const cheaper = costOrder[position - 1]
  const dearer = costOrder[position + 1]
  page.cheaperNeighbour = countryPages.find((p) => p.countryKey === cheaper)?.shortName ?? null
  page.dearerNeighbour = countryPages.find((p) => p.countryKey === dearer)?.shortName ?? null
}

export function getCountryPage(slug: string): CountryPage | null {
  return countryPages.find((page) => page.slug === slug) ?? null
}

/** The cheapest countries first — the ranking most people actually want. */
export function countriesByCost(): CountryPage[] {
  return [...countryPages].sort((a, b) => a.avgCol - b.avgCol)
}
