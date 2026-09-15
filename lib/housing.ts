import { CITIES, isUS, type City } from "./fire-data";

/**
 * Mover-facing housing costs for US cities, from HUD Fair Market Rents.
 *
 * Why HUD and not BEA: BEA's smallest US geography is the metro area, and for
 * New York that is twenty million people across three states, so Manhattan is
 * averaged with Paterson. 226 of our cities came back with 134 distinct
 * figures. HUD publishes by COUNTY, which is the granularity this actually
 * needs.
 *
 * Why Fair Market Rents specifically: FMR is the 40th percentile of rents paid
 * by RECENT MOVERS. That is the number someone planning a move faces, which is
 * what a freedom date is built on. Census median gross rent measures sitting
 * tenants, including rent-stabilised ones, and understates New York badly for
 * exactly the reason it is useful for other questions.
 *
 * Server-only: reads HUD_API_KEY. Never import into a client component.
 */

const HUD = "https://www.huduser.gov/hudapi/public";
const CENSUS_GEOCODER = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress";

/**
 * The reference unit. HUD's own comparisons and most cost-of-living work use
 * the two-bedroom, and it is the closest single figure to a household rather
 * than a person — the per-capita mistake that made the BEA import unusable.
 */
export const REFERENCE_BEDROOM = "Two-Bedroom" as const;

const BEDROOMS = ["Efficiency", "One-Bedroom", "Two-Bedroom", "Three-Bedroom", "Four-Bedroom"] as const;
type Bedroom = (typeof BEDROOMS)[number];

export interface CityHousing {
  key: string;
  name: string;
  /** 5-digit state+county FIPS, the join key to HUD. */
  countyFips: string;
  countyName: string;
  /** Monthly rent by unit size, USD. Null where HUD published none. */
  rents: Partial<Record<Bedroom, number>>;
  /** The two-bedroom figure, monthly. */
  monthlyRent: number;
  fmrYear: number;
  /** True when HUD returned ZIP-level small-area rents and we took a median. */
  smallArea: boolean;
}

export interface HousingResult {
  year: number;
  cities: CityHousing[];
  /** Cities we could not resolve, with the reason. These need a hand mapping. */
  unresolved: string[];
}

/** Cached county resolutions, so the geocoder is called once per city ever. */
export interface CountyRef {
  cityKey: string;
  countyFips: string;
  countyName: string;
}

async function json(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // The URL can carry a token, so it never goes into an error message.
    throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 160)}`);
  }
}

/**
 * City name to county, via the Census geocoder.
 *
 * Our city list carries no coordinates, only "San Francisco, CA", so this is a
 * name lookup. It is cached in the database afterwards because a city does not
 * change county — the geocoder should be called once per city in its lifetime,
 * not once per sync.
 */
export async function resolveCounty(city: City): Promise<CountyRef | null> {
  const url = new URL(CENSUS_GEOCODER);
  url.searchParams.set("address", cityQuery(city));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("format", "json");

  const body = await json(url.toString());
  const result = (body.result ?? {}) as Record<string, unknown>;
  const matches = (result.addressMatches ?? []) as Record<string, unknown>[];
  const geographies = (matches[0]?.geographies ?? {}) as Record<string, unknown>;
  const counties = (geographies.Counties ?? []) as Record<string, string>[];
  const county = counties[0];
  if (!county?.STATE || !county?.COUNTY) return null;

  return {
    cityKey: city.key,
    countyFips: `${county.STATE}${county.COUNTY}`,
    countyName: county.NAME ?? "",
  };
}

/**
 * What to send the geocoder.
 *
 * The boroughs are the reason this is not just `city.name`. "Brooklyn, NY" is
 * not a Census place — it is Kings County — and left alone it fell through to
 * the New York State average, which is how Brooklyn ended up priced like
 * upstate. Each borough is named as its county directly.
 */
const GEOCODE_OVERRIDES: Record<string, string> = {
  brooklyn: "Kings County, NY",
  nyc: "New York County, NY",
  queens: "Queens County, NY",
  bronx: "Bronx County, NY",
  staten: "Richmond County, NY",
  dc: "Washington, DC",
};

function cityQuery(city: City): string {
  return GEOCODE_OVERRIDES[city.key] ?? city.name;
}

/** HUD keys counties as state+county+99999. */
function hudEntityId(countyFips: string): string {
  return `${countyFips}99999`;
}

function numeric(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Rents for one county.
 *
 * HUD returns `basicdata` as an object for an ordinary county, and as an ARRAY
 * of ZIP-level rows where Small Area FMRs apply — which is most large metros,
 * so this is the common case rather than an edge one. Taking a mean across
 * ZIPs would re-create the averaging problem this whole change exists to
 * escape, so we take the median and mark the row, letting a review see which
 * figures are a county-wide midpoint rather than a single published rent.
 */
export async function fetchFmr(
  token: string,
  countyFips: string,
  year: number,
): Promise<{ rents: Partial<Record<Bedroom, number>>; smallArea: boolean } | null> {
  const body = await json(`${HUD}/fmr/data/${hudEntityId(countyFips)}?year=${year}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (body.data ?? {}) as Record<string, unknown>;
  const basic = data.basicdata;
  if (!basic) return null;

  const rows = (Array.isArray(basic) ? basic : [basic]) as Record<string, unknown>[];
  const smallArea = Array.isArray(basic) && rows.length > 1;

  const rents: Partial<Record<Bedroom, number>> = {};
  for (const bedroom of BEDROOMS) {
    const values = rows.map((r) => numeric(r[bedroom])).filter((v): v is number => v !== null).sort((a, b) => a - b);
    if (!values.length) continue;
    const mid = Math.floor(values.length / 2);
    rents[bedroom] = values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
  }

  return Object.keys(rents).length ? { rents, smallArea } : null;
}

/**
 * Resolve and price every US city.
 *
 * `known` carries county resolutions already stored, so a re-sync re-reads
 * rents without geocoding 226 cities again. Anything unresolved is reported
 * rather than guessed: a city priced off the wrong county is a confident,
 * sourced, wrong number, which is the failure mode that made the BEA import
 * unusable in the first place.
 */
export async function resolveCounties(
  known: Map<string, CountyRef>,
  onBatch: (batch: CountyRef[]) => Promise<void>,
): Promise<{ counties: Map<string, CountyRef>; failed: string[] }> {
  const counties = new Map(known);
  const failed: string[] = [];
  const todo = CITIES.filter((c) => isUS(c.state) && !known.has(c.key));

  // Persisted as we go rather than at the end. Two hundred-odd round trips is
  // long enough to hit a function timeout, and a run that writes nothing on the
  // way down means the next attempt starts from zero again — so each batch is
  // banked, and a second click resumes rather than repeats.
  let pending: CountyRef[] = [];
  const flush = async () => {
    if (!pending.length) return;
    await onBatch(pending);
    pending = [];
  };

  // Eight at a time: enough to turn minutes into seconds, gentle enough not to
  // look like abuse of a free public geocoder.
  const CONCURRENCY = 8;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const slice = todo.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      slice.map(async (city) => {
        try {
          return { city, county: await resolveCounty(city) };
        } catch (err) {
          return { city, county: null, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    );
    for (const r of settled) {
      if (!r.county) {
        failed.push(
          `${r.city.name} — ${"error" in r && r.error ? `geocoder failed: ${r.error}` : "no county matched, needs a manual mapping"}`,
        );
        continue;
      }
      counties.set(r.city.key, r.county);
      pending.push(r.county);
    }
    if (pending.length >= 25) await flush();
  }
  await flush();

  return { counties, failed };
}

export async function fetchHousingCosts(
  token: string,
  year: number,
  known: Map<string, CountyRef> = new Map(),
): Promise<HousingResult> {
  const cities: CityHousing[] = [];
  const unresolved: string[] = [];
  // One county can hold several of our cities; HUD is asked once per county.
  const fmrCache = new Map<string, Awaited<ReturnType<typeof fetchFmr>>>();

  // Only cities with a county. A city without one was already reported by
  // resolveCounties, with the reason it failed; listing it again here would
  // show every unresolvable city twice in the admin, each time saying
  // something different about why.
  for (const city of CITIES.filter((c) => isUS(c.state) && known.has(c.key))) {
    const county = known.get(city.key)!;

    try {
      if (!fmrCache.has(county.countyFips)) {
        fmrCache.set(county.countyFips, await fetchFmr(token, county.countyFips, year));
      }
      const fmr = fmrCache.get(county.countyFips) ?? null;
      const monthlyRent = fmr?.rents[REFERENCE_BEDROOM];
      if (!fmr || !monthlyRent) {
        unresolved.push(`${city.name} — HUD published no ${REFERENCE_BEDROOM} rent for ${county.countyName}`);
        continue;
      }

      cities.push({
        key: city.key,
        name: city.name,
        countyFips: county.countyFips,
        countyName: county.countyName,
        rents: fmr.rents,
        monthlyRent,
        fmrYear: year,
        smallArea: fmr.smallArea,
      });
    } catch (err) {
      unresolved.push(`${city.name} — HUD failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { year, cities, unresolved };
}
