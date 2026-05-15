import { CITIES, STATE_TAX } from '@/lib/fire-data'

type CityLandingSeed = {
  slug: string
  cityKey: string
  keyword: string
  calculatorHref: string
  calculatorLabel: string
  articleSlug: string
  articleTitle: string
  audienceNote: string
  costAngle: string
  taxAngle: string
}

const CITY_PAGE_SEEDS: CityLandingSeed[] = [
  {
    slug: 'austin-tx',
    cityKey: 'austin',
    keyword: 'FIRE number Austin',
    calculatorHref: '/calculators/savings-rate',
    calculatorLabel: 'Savings Rate Calculator',
    articleSlug: 'why-savings-rate-matters-more-than-income',
    articleTitle: 'Why Savings Rate Matters More Than Income',
    audienceNote:
      'Austin tends to attract high-income workers who still want a lower-cost path than coastal tech hubs.',
    costAngle:
      'Housing and lifestyle inflation can quietly erase the Texas-tax advantage if your spending rises with income.',
    taxAngle:
      'Texas has no state income tax, which means take-home pay can convert into invested savings faster than in high-tax states.',
  },
  {
    slug: 'london',
    cityKey: 'london',
    keyword: 'FIRE number London',
    calculatorHref: '/calculators/4-percent-rule',
    calculatorLabel: 'FIRE Number Calculator',
    articleSlug: 'how-much-money-do-i-need-to-retire',
    articleTitle: 'How Much Money Do You Need to Retire?',
    audienceNote:
      'London planners usually need a tighter handle on housing, commuting, and how much flexibility they want in retirement.',
    costAngle:
      'A higher annual spending baseline pushes the portfolio target up quickly, so location and housing assumptions matter more here than in lower-cost cities.',
    taxAngle:
      'A realistic FIRE plan for London has to respect both taxes and your true lifestyle budget, not just gross salary headlines.',
  },
  {
    slug: 'singapore',
    cityKey: 'singapore',
    keyword: 'FIRE number Singapore',
    calculatorHref: '/calculators/coast-fire',
    calculatorLabel: 'Coast FIRE Calculator',
    articleSlug: 'coast-fire-vs-full-fire',
    articleTitle: 'Coast FIRE vs Full FIRE',
    audienceNote:
      'Singapore is one of the clearest examples of a city where strong income potential and disciplined saving can dramatically change the timeline.',
    costAngle:
      'Your housing assumptions matter a lot here, because changing your recurring spend changes both your target portfolio and the pace at which you can fund it.',
    taxAngle:
      'Relatively light effective taxes can make the gap between gross income and investable cash much healthier than peers expect.',
  },
  {
    slug: 'shanghai',
    cityKey: 'shanghai',
    keyword: 'FIRE number Shanghai',
    calculatorHref: '/calculators/compound-interest',
    calculatorLabel: 'Compound Interest Calculator',
    articleSlug: 'compound-interest-and-fire',
    articleTitle: 'Compound Interest and FIRE',
    audienceNote:
      'Shanghai is useful for people comparing high-opportunity global cities where earnings potential and spending pressure both run high.',
    costAngle:
      'Small shifts in recurring expenses can move the required FIRE portfolio by hundreds of thousands of dollars over time.',
    taxAngle:
      'The real question is not just salary level, but how much of that salary turns into consistent long-term invested capital.',
  },
  {
    slug: 'dubai',
    cityKey: 'dubai',
    keyword: 'FIRE number Dubai',
    calculatorHref: '/calculators/coast-fire',
    calculatorLabel: 'Coast FIRE Calculator',
    articleSlug: 'how-fire-assumptions-change-your-retirement-date',
    articleTitle: 'How FIRE Assumptions Change Your Retirement Date',
    audienceNote:
      'Dubai draws people who care about high earning power, global mobility, and tax-aware planning rather than one standard retirement path.',
    costAngle:
      'It is a strong city for modelling the tradeoff between premium lifestyle spending and keeping a large monthly surplus invested.',
    taxAngle:
      'Low taxes improve the saving side of the equation, but the lifestyle side still decides whether the advantage actually compounds.',
  },
]

function usd(amount: number) {
  return `$${Math.round(amount).toLocaleString()}`
}

export const cityLandingPages = CITY_PAGE_SEEDS.map((seed) => {
  const city = CITIES.find((entry) => entry.key === seed.cityKey)

  if (!city) {
    throw new Error(`Unknown city for landing page: ${seed.cityKey}`)
  }

  const monthlyCost = city.col / 12
  const fireTarget = city.col * 25
  const comparedToUsAverage = city.col - 52_000
  const taxLabel = STATE_TAX[city.state]?.label ?? 'Local tax rates apply'

  return {
    ...seed,
    city,
    taxLabel,
    monthlyCost,
    fireTarget,
    comparedToUsAverage,
    title: `${seed.keyword} Calculator and Planning Guide | UntilFire`,
    description: `Estimate a realistic FIRE number for ${city.name} using city-specific cost of living, taxes, and retirement math. See spending, target portfolio, and the next calculator to use.`,
    canonicalUrl: `https://untilfire.com/fire-number/${seed.slug}`,
    heroTitle: `What is a realistic FIRE number in ${city.name}?`,
    intro:
      `Use ${city.name} as the baseline for your FIRE planning. UntilFire starts with an estimated annual spending profile for the city, then turns that into a retirement target you can pressure-test with your actual income and savings.`,
    summaryItems: [
      {
        label: 'Estimated annual spending',
        value: usd(city.col),
      },
      {
        label: 'Estimated monthly spending',
        value: usd(monthlyCost),
      },
      {
        label: '25x FIRE target',
        value: usd(fireTarget),
      },
    ],
  }
})

export type CityLandingPage = (typeof cityLandingPages)[number]

export function getCityLandingPage(slug: string) {
  return cityLandingPages.find((page) => page.slug === slug)
}
