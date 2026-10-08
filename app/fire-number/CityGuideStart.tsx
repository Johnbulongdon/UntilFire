import type { City } from '@/lib/fire-data';
import { costRangeFor, isUS, US_CITY_COST_DATA_UPDATED } from '@/lib/fire-data';
import { formatMoney } from '@/lib/money';
import { getCityComparisons } from '@/lib/city-comparisons';
import CityComparisonMap from './CityComparisonMap';
import CityPlanLink from './CityPlanLink';
import './city-guide.css';

export default function CityGuideStart({ city, slug }: { city: City; slug: string }) {
  const range = costRangeFor(city);
  const us = isUS(city.state);
  const cityName = city.name.split(',')[0];
  return <div className="city-guide-start">
    <section className="city-guide-hero">
      <h1>What would it take to retire in {city.name}?</h1>
      <p className="city-guide-muted">Estimated FIRE portfolio for the city’s spending baseline</p>
      <div className="city-guide-number">{formatMoney(city.col * 25)} <span>USD</span></div>
      <div className="city-guide-facts"><div><strong>{formatMoney(city.col / 12)} / month</strong><span>Spending baseline · USD</span></div><div><strong>25× annual spending</strong><span>Planning guideline, not a guarantee</span></div></div>
      <p className="city-guide-note">{us ? `Data reviewed ${US_CITY_COST_DATA_UPDATED}.` : 'Illustrative USD comparison baseline, not a local-currency household budget.'} {range && `Annual spending range: ${formatMoney(range.low)}${range.capped ? ' or more' : `–${formatMoney(range.high)}`}.`} <a href="#city-guide-sources">Sources & assumptions</a></p>
    </section>
    <section className="city-guide-product" aria-labelledby="city-plan-heading">
      <h2 id="city-plan-heading">The city number is a starting point.<br />Your plan is personal.</h2>
      <p>See how your savings and spending shape your path to making work optional.</p>
      <ol className="city-guide-steps"><li>Your starting point</li><li>Your timeline</li><li>Your progress</li></ol>
      <CityPlanLink cityKey={city.key} cityName={cityName} slug={slug} />
      <p className="city-guide-note">Explore your timeline first. Create an account when you want to save your plan.</p>
    </section>
    <CityComparisonMap cities={getCityComparisons(city)} />
    <details className="city-guide-details"><summary id="city-guide-sources">Data sources & assumptions</summary>
      <p>{us ? 'The US spending baseline combines Census median gross rent with a $34,000 national non-housing allowance. The range reflects renter medians and Census uncertainty; it is not a full local household budget.' : 'This international baseline is an illustrative spending estimate stored in US dollars. It is not a Census estimate or a live local-currency quote. Replace it with your actual spending in your personal plan.'}</p>
      <p>The target is annual spending × 25. Retirement length, taxes, healthcare and investment outcomes can change the amount you need.</p>
      {us && <p><a href="https://api.census.gov/data/2024/acs/acs5/groups/B25113.html">Census recent-mover rent table</a> · <a href="https://api.census.gov/data/2024/acs/acs5/groups/B25064.html">Census all-renter fallback table</a></p>}
    </details>
  </div>;
}
