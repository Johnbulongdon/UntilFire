/**
 * Explore (D-58): every city on one map, with what each would mean for you.
 * Pure logic only, so the page, the map and the checks share one source.
 *
 * "Your year" in a city keeps your savings and your monthly saving as they are
 * and swaps the target for 25× that city's typical yearly cost: the same
 * question as the calculator, asked of every city at once. It is not a claim
 * that your pay or saving would stay the same if you moved.
 */
import { CITIES, STATE_TAX, isUS } from "./fire-data";
import { CITY_COORDS } from "./city-coords";
import { cityLandingPages, cityPagePath } from "./city-pages";
import { countryPages } from "./country-pages";

export interface ExploreCity {
  key: string;
  /** "Lisbon" */
  name: string;
  /** "Portugal", "TN" */
  place: string;
  flag: string;
  lat: number;
  lng: number;
  us: boolean;
  /** Tax key: a US state or a country. Abroad it groups cities by country. */
  region: string;
  monthlyUSD: number;
  annualUSD: number;
  /** No income tax where you live: a state with none, or a country with none. */
  noIncomeTax: boolean;
  /** Where a tap leads: the city's page, else its country's, else nowhere. */
  href: string | null;
}

const curatedKeys = new Set(cityLandingPages.map((p) => p.city.key));
const countrySlug = new Map(countryPages.map((p) => [p.countryKey, p.slug]));

export const EXPLORE_CITIES: ExploreCity[] = CITIES.filter((c) => CITY_COORDS[c.key]).map((c) => {
  const us = isUS(c.state);
  const [name, place = ""] = c.name.split(",").map((s) => s.trim());
  const href = us || curatedKeys.has(c.key)
    ? cityPagePath(c.key)
    : countrySlug.has(c.state) ? `/fire-number/countries/${countrySlug.get(c.state)}` : null;
  return {
    key: c.key, name, place, flag: c.flag, ...CITY_COORDS[c.key], us, region: c.state,
    monthlyUSD: c.col / 12, annualUSD: c.col, noIncomeTax: STATE_TAX[c.state]?.rate === 0, href,
  };
});

export * from "./explore-pins";
