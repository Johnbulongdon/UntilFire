import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLearnArticle } from '@/lib/learn'
import { cityLandingPages, getCityLandingPage } from '@/lib/city-pages'
import type { CityLandingPage } from '@/lib/city-pages'
import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data'
import type { City } from '@/lib/fire-data'
import { calcFIRE, calcTakeHome } from '@/lib/fire'
import CityCalcWidget from '../CityCalcWidget'

type Props = {
  params: Promise<{ slug: string }>
}

const US_CITIES = CITIES.filter((city) => isUS(city.state))
const SORTED_US_CITIES_BY_COST = [...US_CITIES].sort((a, b) => b.col - a.col)
const US_CITY_COUNT = US_CITIES.length
const US_MEDIAN_COL = [...US_CITIES].sort((a, b) => a.col - b.col)[Math.floor(US_CITIES.length / 2)]?.col ?? 52_000

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

function usd(amount: number) {
  return `$${Math.round(amount).toLocaleString()}`
}

function ordinal(value: number) {
  const mod10 = value % 10
  const mod100 = value % 100

  if (mod10 === 1 && mod100 !== 11) return `${value}st`
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`
  return `${value}th`
}

function getNationalCostRank(city: City) {
  const rank = SORTED_US_CITIES_BY_COST.findIndex((entry) => entry.key === city.key) + 1
  return {
    rank,
    total: US_CITY_COUNT,
  }
}

function getCostBand(city: City) {
  if (city.col >= 80_000) return 'very-high'
  if (city.col >= 62_000) return 'high'
  if (city.col >= 48_000) return 'mid'
  return 'lower'
}

function getSuggestedCalculator(city: City, taxRate: number) {
  if (city.col >= 70_000) {
    return {
      href: '/calculators/savings-rate',
      label: 'Savings Rate Calculator',
      reason: `In ${city.name}, small spending changes move the target quickly, so your savings rate matters more than almost anything else.`,
    }
  }

  if (taxRate === 0) {
    return {
      href: '/calculators/coast-fire',
      label: 'Coast FIRE Calculator',
      reason: `Lower tax drag can turn more income into invested cash, which makes Coast FIRE scenarios especially worth testing in ${city.name}.`,
    }
  }

  return {
    href: '/calculators/4-percent-rule',
    label: 'FIRE Number Calculator',
    reason: `The quickest next step after a city baseline is pressure-testing your withdrawal-rate assumptions for ${city.name}.`,
  }
}

function getRelatedArticleSlug(city: City, taxRate: number) {
  if (city.col >= 70_000) return 'how-fire-assumptions-change-your-retirement-date'
  if (taxRate === 0) return 'why-savings-rate-matters-more-than-income'
  if (city.col <= 46_000) return 'coast-fire-vs-full-fire'
  return 'how-much-money-do-i-need-to-retire'
}

export async function generateStaticParams() {
  const paths = new Map<string, { slug: string }>()
  for (const page of cityLandingPages) {
    paths.set(page.slug, { slug: page.slug })
  }
  for (const city of US_CITIES) {
    paths.set(city.key, { slug: city.key })
  }
  return Array.from(paths.values())
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getCityLandingPage(slug)

  if (page) {
    return {
      title: page.title,
      description: page.description,
      keywords: `${page.keyword}, FIRE calculator, retirement calculator, financial independence calculator, ${page.city.name}`,
      robots: {
        index: true,
        follow: true,
      },
      alternates: {
        canonical: page.canonicalUrl,
      },
      openGraph: {
        title: page.title,
        description: page.description,
        url: page.canonicalUrl,
        siteName: 'UntilFire',
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: page.title,
        description: page.description,
      },
    }
  }

  const data = US_CITIES.find((city) => city.key === slug)
  if (!data) return {}

  const rank = getNationalCostRank(data)

  return {
    title: `${data.name} FIRE Number Calculator | UntilFire`,
    description: `How much do you need to retire in ${data.name}? Based on a local cost of living of ${fmt(data.col)}/year. Compare local tax context, see how ${data.name} ranks among US city baselines, and model your timeline.`,
    keywords: `${data.name} FIRE number, ${data.name} FIRE calculator, retire in ${data.name}, ${data.name} cost of living, financial independence ${data.name}`,
    robots: {
      index: true,
      follow: true,
    },
    alternates: { canonical: `https://www.untilfire.com/fire-number/${data.key}` },
    openGraph: {
      title: `${data.name} FIRE Number Calculator and Cost Guide`,
      description: `${data.name} ranks ${ordinal(rank.rank)} out of ${rank.total} US city baselines in UntilFire. Use local cost and tax context to estimate your target and timeline.`,
      url: `https://www.untilfire.com/fire-number/${data.key}`,
      type: 'website',
    },
  }
}

export default async function FireNumberSlugPage({ params }: Props) {
  const { slug } = await params
  const page = getCityLandingPage(slug)

  if (page) {
    return <CuratedCityFireNumberPage page={page} />
  }

  const data = US_CITIES.find((city) => city.key === slug)
  if (!data) {
    notFound()
  }

  return <GenericCityFireNumberPage data={data} />
}

function CuratedCityFireNumberPage({ page }: { page: CityLandingPage }) {
  const article = getLearnArticle(page.articleSlug)
  const source = `fire-number-${page.slug}`

  return (
    <>
      <main style={{ background: '#F7F9FB', minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 24px 88px' }}>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 26, fontSize: 13 }}>
            <Link href="/" style={{ color: '#64748B', textDecoration: 'none' }}>Home</Link>
            <Link href="/calculators" style={{ color: '#64748B', textDecoration: 'none' }}>Calculators</Link>
            <Link href="/learn" style={{ color: '#64748B', textDecoration: 'none' }}>Learn</Link>
            <span style={{ color: '#94A3B8' }}>{page.city.name}</span>
          </nav>

          <section
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)',
              border: '1px solid #D1FAE5',
              borderRadius: 24,
              padding: '34px 28px',
              marginBottom: 28,
            }}
          >
            <p style={{ fontSize: 12, color: '#059669', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              City FIRE Guide
            </p>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.02, color: '#19181E', letterSpacing: '-0.05em', margin: '0 0 16px' }}>
              {page.heroTitle}
            </h1>
            <p style={{ maxWidth: 760, fontSize: 17, lineHeight: 1.8, color: '#475569', margin: '0 0 24px' }}>
              {page.intro}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              <Link
                href={`/?source=${source}`}
                style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #059669, #064E3B)', color: '#fff', padding: '12px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}
              >
                Run the full FIRE calculator
              </Link>
              <Link
                href={`${page.calculatorHref}?source=${source}`}
                style={{ textDecoration: 'none', background: '#fff', color: '#19181E', padding: '12px 18px', borderRadius: 10, border: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}
              >
                Open {page.calculatorLabel}
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {page.summaryItems.map((item) => (
                <div key={item.label} style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 18px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: '#19181E' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)',
              gap: 18,
              marginBottom: 28,
            }}
          >
            <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '28px 24px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 28, color: '#19181E', letterSpacing: '-0.03em' }}>
                Why {page.city.name} changes your FIRE math
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.9, color: '#475569' }}>
                {page.audienceNote}
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.9, color: '#475569' }}>
                {page.costAngle}
              </p>
              <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.9, color: '#475569' }}>
                {page.taxAngle}
              </p>

              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  {
                    label: 'Local tax context',
                    value: page.taxLabel,
                  },
                  {
                    label: 'Compared with a $52,000/year US baseline',
                    value:
                      page.comparedToUsAverage >= 0
                        ? `${usd(page.comparedToUsAverage)} higher`
                        : `${usd(Math.abs(page.comparedToUsAverage))} lower`,
                  },
                  {
                    label: '25x rule implication',
                    value: `Every $1,000/year you cut lowers the target by ${usd(25_000)}.`,
                  },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 16px 14px' }}>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 16, lineHeight: 1.6, color: '#19181E', fontWeight: 600 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <aside style={{ display: 'grid', gap: 18 }}>
              <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '24px 20px' }}>
                <div style={{ fontSize: 12, color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                  Next best tool
                </div>
                <h2 style={{ margin: '0 0 10px', fontSize: 22, lineHeight: 1.2, color: '#19181E' }}>
                  Go from city estimate to your actual timeline.
                </h2>
                <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.8, color: '#64748B' }}>
                  Start with {page.calculatorLabel} if you want one specific answer, or use the full UntilFire calculator if you want your retirement date adjusted for income, savings, and taxes.
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <Link href={`/?source=${source}`} style={{ textDecoration: 'none', background: '#064E3B', color: '#fff', borderRadius: 10, padding: '12px 14px', fontWeight: 700, fontSize: 14 }}>
                    Calculate my FIRE date
                  </Link>
                  <Link href={`${page.calculatorHref}?source=${source}`} style={{ textDecoration: 'none', background: '#ECFDF5', color: '#064E3B', borderRadius: 10, padding: '12px 14px', fontWeight: 700, fontSize: 14 }}>
                    Open {page.calculatorLabel}
                  </Link>
                </div>
              </div>

              {article ? (
                <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '24px 20px' }}>
                  <div style={{ fontSize: 12, color: '#0F766E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                    Related reading
                  </div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 20, lineHeight: 1.25, color: '#19181E' }}>
                    {page.articleTitle}
                  </h2>
                  <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.8, color: '#64748B' }}>
                    {article.description}
                  </p>
                  <Link href={`/learn/${article.slug}`} style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                    Read the guide
                  </Link>
                </div>
              ) : null}
            </aside>
          </section>

          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '28px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 20 }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#059669', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Popular city pages
                </p>
                <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#19181E' }}>
                  Compare nearby FIRE planning paths
                </h2>
              </div>
              <Link href="/learn/topics" style={{ color: '#059669', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                Browse FIRE topics
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              {cityLandingPages
                .filter((entry) => entry.slug !== page.slug)
                .map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/fire-number/${entry.slug}`}
                    style={{
                      textDecoration: 'none',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 16,
                      padding: '18px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {entry.keyword}
                    </div>
                    <div style={{ fontSize: 19, color: '#19181E', fontWeight: 800, letterSpacing: '-0.02em' }}>
                      {entry.city.name}
                    </div>
                    <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>
                      Annual baseline {usd(entry.city.col)} · target {usd(entry.fireTarget)}
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: page.city.name, item: page.canonicalUrl },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: page.title,
              description: page.description,
              url: page.canonicalUrl,
              about: {
                '@type': 'Thing',
                name: `FIRE planning in ${page.city.name}`,
              },
            },
          ]),
        }}
      />
    </>
  )
}

function GenericCityFireNumberPage({ data }: { data: City }) {

  const fireTarget = data.col * 25;
  const tax = STATE_TAX[data.state];
  const taxRate = tax?.rate ?? 0;
  const taxLabel = tax?.label ?? data.state.toUpperCase();

  const SCENARIOS = [75000, 100000, 150000];
  const SAVINGS_RATE = 0.20;
  const START_AGE = 30;

  const scenarios = SCENARIOS.map((gross) => {
    const { takeHome } = calcTakeHome(gross, data.state);
    const monthlySavings = (takeHome * SAVINGS_RATE) / 12;
    const result = calcFIRE(monthlySavings, data.col, START_AGE, 0);
    return { gross, takeHome, monthlySavings, ...result };
  });

  const relatedCities = US_CITIES
    .filter((c) => c.state === data.state && c.key !== data.key)
    .slice(0, 5);

  const nationalRank = getNationalCostRank(data)
  const costBand = getCostBand(data)
  const spendDelta = data.col - US_MEDIAN_COL
  const suggestedCalculator = getSuggestedCalculator(data, taxRate)
  const relatedArticle = getLearnArticle(getRelatedArticleSlug(data, taxRate))
  const nearestHigherCostCity = SORTED_US_CITIES_BY_COST
    .filter((city) => city.col > data.col)
    .sort((a, b) => a.col - b.col)[0]
  const nearestLowerCostCity = SORTED_US_CITIES_BY_COST
    .filter((city) => city.col < data.col)
    .sort((a, b) => b.col - a.col)[0]
  const cityFaqs = [
    {
      question: `What FIRE number should I use for ${data.name}?`,
      answer: `A simple baseline for ${data.name} is ${fmt(fireTarget)}, which comes from multiplying the local annual spending estimate of ${fmt(data.col)} by 25. That is a starting point, not a final answer: your housing, taxes, and personal spending rhythm still matter.`,
    },
    {
      question: `Is ${data.name} expensive for FIRE planning?`,
      answer:
        spendDelta >= 0
          ? `${data.name} sits about ${fmt(spendDelta)} above the current UntilFire median US city baseline of ${fmt(US_MEDIAN_COL)} per year, so spending control matters more than average here.`
          : `${data.name} sits about ${fmt(Math.abs(spendDelta))} below the current UntilFire median US city baseline of ${fmt(US_MEDIAN_COL)} per year, which can make the target easier to reach if income holds up.`,
    },
    {
      question: `How do taxes affect FIRE in ${data.name}?`,
      answer:
        taxRate === 0
          ? `${data.name} benefits from a state with no income tax, so more of each raise can turn into invested savings. That does not remove lifestyle risk, but it can shorten the path to FIRE if spending stays disciplined.`
          : `${data.name} uses ${taxLabel}, so pre-tax contributions and realistic take-home assumptions matter. Taxes do not change the 25x rule directly, but they do change how quickly you can fund it.`,
    },
  ]

  const heading: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#64748B",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 0,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        table { border-collapse: collapse; width: 100%; }
        th { text-align: left; }
        @media(max-width: 640px) {
          .city-hero-grid { grid-template-columns: 1fr !important; }
          .city-scenario-table th, .city-scenario-table td { padding: 10px 12px !important; font-size: 13px !important; }
          .city-related { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ textDecoration: "none", color: "#94A3B8" }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: "none", color: "#94A3B8" }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: "#064E3B", fontWeight: 600 }}>{data.name}</span>
        </nav>

        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{data.flag}</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.8px", margin: "0 0 12px", lineHeight: 1.1 }}>
            FIRE Number Calculator{' '}<br />for {data.name}
          </h1>
          <p style={{ fontSize: 17, color: "#475569", margin: 0, lineHeight: 1.6, maxWidth: 580 }}>
            How much do you need to retire in {data.name}? Based on a local cost of living of{" "}
            <strong style={{ color: "#064E3B" }}>{fmt(data.col)}/year</strong>, your FIRE target is{" "}
            <strong style={{ color: "#064E3B" }}>{fmt(fireTarget)}</strong>.
          </p>
        </div>

        {/* Key stats */}
        <div className="city-hero-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Annual cost of living", value: fmt(data.col), sub: "local baseline" },
            { label: "FIRE target (25× rule)", value: fmt(fireTarget), sub: "4% withdrawal" },
            { label: "State income tax", value: taxRate === 0 ? "0% — no income tax" : `${(taxRate * 100).toFixed(1)}%`, sub: taxLabel },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px 22px" }}>
              <div style={heading}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.4px" }}>{value}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Scenarios table */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#064E3B", margin: 0 }}>
              Sample retirement timelines in {data.name}
            </h2>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>
              Starting at age 30 with $0 saved, 20% savings rate
            </p>
          </div>
          <table className="city-scenario-table">
            <thead style={{ background: "#F8FAFC" }}>
              <tr>
                {["Annual income", "Take-home pay", "Monthly savings", "Years to FIRE", "Retire at age"].map((h) => (
                  <th key={h} style={{ padding: "12px 24px", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s, i) => (
                <tr key={s.gross} style={{ borderBottom: i < scenarios.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  <td style={{ padding: "16px 24px", fontSize: 15, fontWeight: 700, color: "#19181E" }}>{fmt(s.gross)}</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#475569" }}>{fmt(s.takeHome)}</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#475569" }}>{fmt(s.monthlySavings)}</td>
                  <td style={{ padding: "16px 24px", fontSize: 15, fontWeight: 700, color: "#064E3B" }}>{Math.round(s.years)} yrs</td>
                  <td style={{ padding: "16px 24px", fontSize: 15, fontWeight: 800, color: "#22d3a5" }}>
                    {START_AGE + Math.round(s.years)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interactive calc */}
        <CityCalcWidget city={data} />

        {/* Editorial content */}
        <div style={{ marginTop: 48, marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.4px", marginBottom: 16 }}>
            What does it take to retire in {data.name}?
          </h2>
          <div style={{ fontSize: 15, color: "#475569", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0 }}>
              Using the 4% rule — the most widely used FIRE guideline — retiring in {data.name} requires a portfolio of{" "}
              <strong style={{ color: "#064E3B" }}>{fmt(fireTarget)}</strong>. This assumes you&apos;ll spend{" "}
              {fmt(data.col)} per year and withdraw 4% of your portfolio annually, which historical data suggests can
              sustain a 30+ year retirement.
            </p>
            <p style={{ margin: 0 }}>
              {costBand === 'very-high'
                ? `${data.name} is one of the most expensive FIRE baselines in UntilFire, ranking ${ordinal(nationalRank.rank)} out of ${nationalRank.total} US cities. In places like this, housing and recurring lifestyle costs usually matter more than trying to optimise tiny line items.`
                : costBand === 'high'
                  ? `${data.name} sits in the higher-cost group of US city baselines. You usually need both a healthy income and a disciplined savings rate to keep the target from drifting upward.`
                  : costBand === 'mid'
                    ? `${data.name} sits near the middle of UntilFire's US city range. That makes it useful for testing whether the real lever is spending discipline, tax efficiency, or simply earning more.`
                    : `${data.name} lands in the lower-cost end of UntilFire's US city range, which can make FIRE more reachable if income remains stable and lifestyle creep stays under control.`}
            </p>
            <p style={{ margin: 0 }}>
              {taxRate === 0
                ? `${data.name} is in a no-state-income-tax environment, so more of each raise can become invested cash. That advantage compounds only if spending does not rise just as fast.`
                : `${data.name} residents face ${taxLabel}, so pre-tax contributions and a realistic take-home estimate matter. FIRE math breaks when people plan from gross salary instead of the amount they can actually invest.`}
            </p>
            <p style={{ margin: 0 }}>
              The biggest levers are still your savings rate and your timeline. Saving 20% of take-home instead of 10% can cut years off the journey, and starting earlier lowers the amount your portfolio has to do later.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 40 }}>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 20px" }}>
            <div style={heading}>National context</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", marginBottom: 8 }}>
              {ordinal(nationalRank.rank)} of {nationalRank.total}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
              {data.name} ranks by annual spending baseline among UntilFire&apos;s US cities, which helps explain whether your target is being pushed mostly by local costs or by your own spending choices.
            </p>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 20px" }}>
            <div style={heading}>Compared with the US median</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", marginBottom: 8 }}>
              {spendDelta >= 0 ? `${fmt(spendDelta)} higher` : `${fmt(Math.abs(spendDelta))} lower`}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
              The current UntilFire median US city baseline is {fmt(US_MEDIAN_COL)}/year. Every {fmt(1_000)} of annual spending changes the 25× target by {fmt(25_000)}.
            </p>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 20px" }}>
            <div style={heading}>Closest cost comparisons</div>
            <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
              {nearestHigherCostCity ? `Nearest higher baseline: ${nearestHigherCostCity.name} at ${fmt(nearestHigherCostCity.col)}/year.` : 'This is already among the highest baselines in the current data set.'}
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
              {nearestLowerCostCity ? `Nearest lower baseline: ${nearestLowerCostCity.name} at ${fmt(nearestLowerCostCity.col)}/year.` : 'This is already among the lowest baselines in the current data set.'}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 20px" }}>
            <div style={heading}>Next calculator</div>
            <h2 style={{ fontSize: 20, lineHeight: 1.25, margin: "0 0 10px", color: "#19181E" }}>
              {suggestedCalculator.label}
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
              {suggestedCalculator.reason}
            </p>
            <Link href={suggestedCalculator.href} style={{ color: "#059669", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
              Open {suggestedCalculator.label}
            </Link>
          </div>

          {relatedArticle ? (
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 20px" }}>
              <div style={heading}>Related reading</div>
              <h2 style={{ fontSize: 20, lineHeight: 1.25, margin: "0 0 10px", color: "#19181E" }}>
                {relatedArticle.title}
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
                {relatedArticle.description}
              </p>
              <Link href={`/learn/${relatedArticle.slug}`} style={{ color: "#059669", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                Read the guide
              </Link>
            </div>
          ) : null}
        </div>

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px 22px", marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#064E3B", margin: "0 0 16px" }}>
            Questions people ask about FIRE in {data.name}
          </h2>
          <div style={{ display: "grid", gap: 14 }}>
            {cityFaqs.map((faq) => (
              <div key={faq.question} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 16px 14px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#19181E" }}>{faq.question}</h3>
                <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.8 }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related cities */}
        {relatedCities.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#064E3B", marginBottom: 16 }}>
              Other cities in the same state
            </h2>
            <div className="city-related" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {relatedCities.map((c) => (
                <Link
                  key={c.key}
                  href={`/fire-number/${c.key}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 16px",
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#064E3B",
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{c.flag}</span>
                  <div>
                    <div>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>{fmt(c.col * 25)} target</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ background: "linear-gradient(135deg, #064E3B 0%, #047857 100%)", borderRadius: 16, padding: "32px 36px", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.4px" }}>
            Ready to build your real FIRE plan?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", margin: "0 0 24px" }}>
            Track your spending, model your investments, and see exactly when you can retire in {data.name}.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "#22d3a5",
              color: "#064E3B",
              padding: "14px 32px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 800,
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            Start free — no credit card
          </Link>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
                { '@type': 'ListItem', position: 2, name: 'FIRE Number by City', item: 'https://www.untilfire.com/fire-number' },
                { '@type': 'ListItem', position: 3, name: data.name, item: `https://www.untilfire.com/fire-number/${data.key}` },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: `${data.name} FIRE Number Calculator and Cost Guide`,
              description: `Estimate a realistic FIRE number for ${data.name} using local annual spending of ${fmt(data.col)}, state tax context, and retirement math.`,
              url: `https://www.untilfire.com/fire-number/${data.key}`,
              about: {
                '@type': 'Thing',
                name: `FIRE planning in ${data.name}`,
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: cityFaqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            },
          ]),
        }}
      />
    </>
  );
}
