import type { Metadata } from 'next'
import Link from 'next/link'
import { US_CITY_COST_DATA_UPDATED } from '@/lib/fire-data'
import { statePages } from '@/lib/state-pages'
import { formatMoney } from '@/lib/money'
import { cityPagePath } from '@/lib/city-pages'
import { siteUrl } from '@/lib/site'
import UsFireGuideLinks from '../UsFireGuideLinks'

const CENSUS_RECENT_MOVER_SOURCE = 'https://api.census.gov/data/2024/acs/acs5/groups/B25113.html'
const CENSUS_ALL_RENTER_SOURCE = 'https://api.census.gov/data/2024/acs/acs5/groups/B25064.html'
const CENSUS_METHOD_SOURCE = 'https://www.census.gov/programs-surveys/acs/methodology.html'
const CSV_URL = siteUrl('/fire-number/fire-by-state/data.csv')

const faqs = [
  {
    question: 'Is this a statewide cost-of-living average?',
    answer: 'No. Each state figure is the unweighted average of the city planning baselines in UntilFire’s sample. It describes the cities listed for that state, not every household or community in the state.',
  },
  {
    question: 'How is each city baseline calculated?',
    answer: 'UntilFire combines annualized Census ACS median gross rent for recent movers with a $34,000 national non-housing baseline. If the recent-mover rent is unavailable, the all-renter median is used.',
  },
  {
    question: 'How does the annual baseline become a FIRE target?',
    answer: 'The reference multiplies annual spending by 25, which is the familiar 4% withdrawal-rate guideline. It is a planning shortcut, not a guarantee. The calculator lets you change the withdrawal rate, taxes, and other income.',
  },
]

export const metadata: Metadata = {
  title: 'FIRE Number by State: Sourced US Comparison | UntilFire',
  description: 'Compare sourced FIRE planning baselines across 50 states and Washington, D.C. See sampled cities, annual costs, 25x targets, tax context, methodology, and Census sources.',
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl('/fire-number/fire-by-state') },
  openGraph: {
    images: [{ url: '/api/og/ranking/fire-by-state', width: 1200, height: 630, alt: 'FIRE by state comparison' }],
    title: 'FIRE Number by State | UntilFire',
    description: 'A sourced comparison of city-sample FIRE baselines across the United States.',
    type: 'website',
  },
}

export default function FireByStatePage() {
  const sortedStates = [...statePages].sort((a, b) => a.avgCityColAccross - b.avgCityColAccross)
  const cityCount = sortedStates.reduce((sum, state) => sum + state.cities.length, 0)
  const lowestState = sortedStates[0]
  const highestState = sortedStates[sortedStates.length - 1]

  return (
    <>
      <style>{`
        .state-reference-row { transition: background var(--uf-dur-1) var(--uf-ease); }
        .state-reference-row:hover { background: var(--uf-green-50); }
        .state-reference-table-wrap { overflow-x: auto; overscroll-behavior-inline: contain; }
        .state-reference-table { width: 100%; min-width: 860px; border-collapse: collapse; }
        .state-reference-table th, .state-reference-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--uf-border); }
        .state-reference-table th { color: var(--uf-ink-2); background: var(--uf-surface); white-space: nowrap; }
        .state-reference-table td { color: var(--uf-ink-2); vertical-align: top; }
        .state-reference-table tbody tr:last-child td { border-bottom: 0; }
        .state-reference-data { font-family: var(--uf-font-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .state-reference-link { color: var(--uf-green-700); font-weight: 700; text-decoration: none; }
        .state-reference-link:hover { text-decoration: underline; }
        .state-reference-card { background: var(--uf-card); border: 1px solid var(--uf-border); border-radius: var(--uf-r-card); box-shadow: var(--uf-e1); }
        .state-reference-method-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--uf-s4); }
        .state-reference-scroll-hint { display: none; }
        @media (max-width: 640px) {
          .state-reference-shell { padding-inline: var(--uf-s4) !important; }
          .state-reference-method-grid { grid-template-columns: 1fr; }
          .state-reference-scroll-hint { display: block; }
        }
      `}</style>

      <main className="state-reference-shell" style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--uf-s6) var(--uf-s5) 80px' }}>
        <nav aria-label="Breadcrumb" className="uf-t-small" style={{ color: 'var(--uf-ink-2)', marginBottom: 'var(--uf-s5)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>UntilFire</Link><span aria-hidden="true">›</span>
          <Link href="/fire-number" style={{ textDecoration: 'none' }}>FIRE Number by City</Link><span aria-hidden="true">›</span>
          <span style={{ color: 'var(--uf-ink)', fontWeight: 700 }}>By State</span>
        </nav>

        <header style={{ marginBottom: 'var(--uf-s7)', maxWidth: 840 }}>
          <div className="uf-t-label" style={{ color: 'var(--uf-green-700)', marginBottom: 'var(--uf-s3)' }}>US planning reference</div>
          <h1 className="uf-t-h1" style={{ color: 'var(--uf-ink)', margin: '0 0 var(--uf-s4)' }}>FIRE Number by State</h1>
          <p className="uf-t-lead" style={{ color: 'var(--uf-ink-2)', margin: '0 0 var(--uf-s4)', maxWidth: 760 }}>
            Compare annual spending baselines and 25× FIRE targets for {cityCount} sampled cities across all 50 states and Washington, D.C. Every result links back to the city sample and the official Census rent tables behind it.
          </p>
          <p className="uf-t-small" style={{ color: 'var(--uf-ink-2)', margin: 0 }}>
            Data reviewed {US_CITY_COST_DATA_UPDATED} · Annual USD · City-sample averages, not statewide household averages
          </p>
        </header>

        <section aria-label="Reference summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--uf-s4)', marginBottom: 'var(--uf-s7)' }}>
          {[
            { label: 'Coverage', value: '50 states + D.C.', note: `${cityCount} sampled cities` },
            { label: 'Lowest sample average', value: formatMoney(lowestState.avgCityColAccross), note: lowestState.stateName },
            { label: 'Highest sample average', value: formatMoney(highestState.avgCityColAccross), note: highestState.stateName },
          ].map(({ label, value, note }) => (
            <div key={label} className="state-reference-card" style={{ padding: 'var(--uf-s5)' }}>
              <div className="uf-t-label" style={{ color: 'var(--uf-ink-2)', marginBottom: 'var(--uf-s2)' }}>{label}</div>
              <div className="uf-t-data" style={{ fontSize: 24, color: 'var(--uf-ink)', lineHeight: 1.2 }}>{value}</div>
              <div className="uf-t-small" style={{ color: 'var(--uf-ink-2)', marginTop: 'var(--uf-s2)' }}>{note}</div>
            </div>
          ))}
        </section>

        <section className="state-reference-card" aria-labelledby="state-table-heading" style={{ overflow: 'hidden', marginBottom: 'var(--uf-s7)' }}>
          <div style={{ padding: 'var(--uf-s5)', borderBottom: '1px solid var(--uf-border)', display: 'flex', gap: 'var(--uf-s4)', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <h2 id="state-table-heading" className="uf-t-h2" style={{ margin: '0 0 var(--uf-s2)', color: 'var(--uf-ink)' }}>State comparison</h2>
              <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)', maxWidth: 680 }}>
                Ranked by the average annual baseline of the sampled cities in each state. Open a state to inspect every city included.
              </p>
            </div>
            <a className="state-reference-link uf-t-small" href="/fire-number/fire-by-state/data.csv" download>Download the table as CSV</a>
          </div>
          <p id="state-table-scroll-hint" className="state-reference-scroll-hint uf-t-small" style={{ margin: 'var(--uf-s3) var(--uf-s5) 0', color: 'var(--uf-ink-2)' }}>
            Swipe the table to see targets, city ranges, and tax context →
          </p>
          <div className="state-reference-table-wrap" role="region" tabIndex={0} aria-label="Scrollable state FIRE comparison table" aria-describedby="state-table-scroll-hint">
            <table className="state-reference-table">
              <thead><tr>{['State', 'Sample', 'Annual baseline', '25× target', 'Sampled range', 'State income tax'].map((heading) => <th key={heading} scope="col" className="uf-t-label">{heading}</th>)}</tr></thead>
              <tbody>
                {sortedStates.map((state) => (
                  <tr key={state.stateKey} className="state-reference-row">
                    <td><Link href={`/fire-number/states/${state.slug}`} className="state-reference-link">{state.stateName}</Link></td>
                    <td><span className="state-reference-data">{state.cities.length}</span> {state.cities.length === 1 ? 'city' : 'cities'}</td>
                    <td className="state-reference-data" style={{ color: 'var(--uf-ink)', fontWeight: 700 }}>{formatMoney(state.avgCityColAccross)}</td>
                    <td className="state-reference-data" style={{ color: 'var(--uf-teal-deep)', fontWeight: 700 }}>{formatMoney(state.fireTarget)}</td>
                    <td>
                      <Link href={cityPagePath(state.cheapestCity.key)} className="state-reference-link" style={{ fontSize: 13 }}>{state.cheapestCity.name.split(',')[0]}</Link>
                      {' '}to{' '}
                      <Link href={cityPagePath(state.mostExpensiveCity.key)} className="state-reference-link" style={{ fontSize: 13 }}>{state.mostExpensiveCity.name.split(',')[0]}</Link>
                      <div className="state-reference-data uf-t-small" style={{ marginTop: 4 }}>{formatMoney(state.cheapestCity.col)}–{formatMoney(state.mostExpensiveCity.col)}</div>
                    </td>
                    <td>
                      <span className="state-reference-data">{state.taxRate === 0 ? '0%' : `${(state.taxRate * 100).toFixed(1)}%`}</span>
                      <div className="uf-t-small" style={{ marginTop: 4 }}>{state.taxLabel}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="methodology-heading" style={{ marginBottom: 'var(--uf-s7)' }}>
          <div className="uf-t-label" style={{ color: 'var(--uf-green-700)', marginBottom: 'var(--uf-s3)' }}>Methodology and sources</div>
          <h2 id="methodology-heading" className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink)' }}>What the numbers measure</h2>
          <div className="state-reference-method-grid">
            {[
              ['1. Measure city housing', 'For each sampled city, annualized housing starts with the 2024 ACS five-year median gross rent for the most recent mover cohort (B25113). When that value is suppressed, UntilFire falls back to the all-renter median (B25064). Gross rent includes utilities.'],
              ['2. Add non-housing spending', 'Each city receives the same $34,000 annual non-housing planning baseline. This part is an estimate, not a local Census measurement, so the comparison is intentionally conservative where non-housing prices differ.'],
              ['3. Build the state sample', 'A state baseline is the unweighted arithmetic mean of the city baselines listed for that state. It is not population weighted and should not be read as an official statewide household budget. New York City is grouped into New York here even though it keeps its own tax key in city calculations.'],
              ['4. Apply the 25× guideline', 'The FIRE target is annual baseline × 25, equivalent to starting with a 4% withdrawal-rate guideline. Taxes, other income, portfolio fees, and personal spending can materially change an individual target.'],
            ].map(([title, body]) => (
              <article key={title} className="state-reference-card" style={{ padding: 'var(--uf-s5)' }}>
                <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s3)', color: 'var(--uf-ink)' }}>{title}</h3>
                <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>{body}</p>
              </article>
            ))}
          </div>
          <div className="uf-t-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uf-s4)', marginTop: 'var(--uf-s4)' }}>
            <a className="state-reference-link" href={CENSUS_RECENT_MOVER_SOURCE} target="_blank" rel="noreferrer">Census B25113 recent-mover rents</a>
            <a className="state-reference-link" href={CENSUS_ALL_RENTER_SOURCE} target="_blank" rel="noreferrer">Census B25064 all-renter median</a>
            <a className="state-reference-link" href={CENSUS_METHOD_SOURCE} target="_blank" rel="noreferrer">ACS research and methodology</a>
            <Link className="state-reference-link" href="/calculators/4-percent-rule">Test the 25× assumption</Link>
          </div>
        </section>

        <section aria-labelledby="faq-heading" style={{ marginBottom: 'var(--uf-s7)', maxWidth: 900 }}>
          <h2 id="faq-heading" className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink)' }}>Questions about the comparison</h2>
          <div style={{ display: 'grid', gap: 'var(--uf-s3)' }}>
            {faqs.map((faq) => (
              <details key={faq.question} className="state-reference-card" style={{ padding: 'var(--uf-s4) var(--uf-s5)' }}>
                <summary className="uf-t-body" style={{ cursor: 'pointer', color: 'var(--uf-ink)', fontWeight: 700 }}>{faq.question}</summary>
                <p className="uf-t-body" style={{ margin: 'var(--uf-s3) 0 0', color: 'var(--uf-ink-2)' }}>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <UsFireGuideLinks current="/fire-number/fire-by-state" />

        <section className="state-reference-card" style={{ padding: 'var(--uf-s6)', textAlign: 'center' }}>
          <h2 className="uf-t-h2" style={{ color: 'var(--uf-ink)', margin: '0 0 var(--uf-s2)' }}>Replace the sample with your spending</h2>
          <p className="uf-t-body" style={{ color: 'var(--uf-ink-2)', margin: '0 auto var(--uf-s5)', maxWidth: 620 }}>
            The state table is a starting reference. Use your annual spending, withdrawal rate, taxes, and other income for a personal FIRE number.
          </p>
          <Link href="/calculators/4-percent-rule?source=fire-by-state" style={{ display: 'inline-block', background: 'var(--uf-green)', color: 'var(--uf-card)', padding: '12px 24px', borderRadius: 'var(--uf-r-pill)', fontWeight: 800, textDecoration: 'none' }}>Calculate my FIRE number</Link>
        </section>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
        {
          '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl() },
            { '@type': 'ListItem', position: 2, name: 'FIRE Number by City', item: siteUrl('/fire-number') },
            { '@type': 'ListItem', position: 3, name: 'FIRE Number by State', item: siteUrl('/fire-number/fire-by-state') },
          ],
        },
        {
          '@context': 'https://schema.org', '@type': 'Dataset', name: 'UntilFire US city-sample FIRE baselines by state',
          description: 'Annual USD planning baselines and 25x FIRE targets derived from sampled US city costs, grouped by state.',
          url: siteUrl('/fire-number/fire-by-state'), dateModified: '2026-09-17',
          creator: { '@type': 'Organization', name: 'UntilFire', url: siteUrl() },
          isBasedOn: [CENSUS_RECENT_MOVER_SOURCE, CENSUS_ALL_RENTER_SOURCE],
          measurementTechnique: 'Unweighted mean of sampled city baselines; each city combines annualized ACS median gross rent with a $34,000 non-housing planning baseline. FIRE target equals annual baseline multiplied by 25.',
          distribution: { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: CSV_URL },
        },
        {
          '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((faq) => ({
            '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        },
      ]) }} />
    </>
  )
}

