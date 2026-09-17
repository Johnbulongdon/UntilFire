import fs from 'node:fs';

const source = fs.readFileSync('lib/fire-data.ts', 'utf8');
const cityBlock = source.split('export const CITIES: City[] = [')[1]?.split('];')[0];
const taxBlock = source.split('export const STATE_TAX: Record<string, TaxInfo> = {')[1]?.split('};')[0];
const intlBlock = source.split('const US_INTL = new Set([')[1]?.split(']);')[0];

if (!cityBlock || !taxBlock || !intlBlock) {
  throw new Error('Could not find city, tax, or US_INTL blocks in fire-data.ts');
}

// colLow/colHigh are optional: cities with no measured range carry neither.
const cityRows = [...cityBlock.matchAll(/\{ name: (?:'([^']+)'|\"([^\"]+)\"),\s*key:\s*'([^']+)',\s*col:\s*(\d+),(?:\s*colLow:\s*(\d+),\s*colHigh:\s*(\d+),)?\s*state:\s*'([^']+)'/g)]
  .map((m) => ({
    name: m[1] ?? m[2],
    key: m[3],
    col: Number(m[4]),
    colLow: m[5] === undefined ? null : Number(m[5]),
    colHigh: m[6] === undefined ? null : Number(m[6]),
    state: m[7],
  }));
const taxKeys = new Set([...taxBlock.matchAll(/^\s*([a-z0-9_]+):\s*\{/gm)].map((m) => m[1]));
const intlKeys = new Set([...intlBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]));
const usCities = cityRows.filter((city) => !intlKeys.has(city.state));

const duplicateKeys = cityRows.map((city) => city.key).filter((key, i, keys) => keys.indexOf(key) !== i);
const missingTax = [...new Set(cityRows.map((city) => city.state).filter((state) => !taxKeys.has(state)))];
const lowCost = cityRows.filter((city) => city.col < 1_000);

if (cityRows.length < 350) {
  throw new Error(`Expected at least 350 global cities, found ${cityRows.length}`);
}
if (usCities.length < 220) {
  throw new Error(`Expected at least 220 US cities, found ${usCities.length}`);
}
if (duplicateKeys.length) {
  throw new Error(`Duplicate city keys: ${[...new Set(duplicateKeys)].join(', ')}`);
}
if (missingTax.length) {
  throw new Error(`City states missing STATE_TAX entries: ${missingTax.join(', ')}`);
}
// A range that does not contain its own figure, or that has collapsed to a
// point, is silently dropped by costRangeFor() — the page still renders, so
// nothing catches it. Catch it here instead.
const badRange = cityRows.filter((city) => {
  const half = (city.colLow === null) !== (city.colHigh === null);
  if (half) return true;
  if (city.colLow === null) return false;
  return !(city.colLow <= city.col && city.col <= city.colHigh) || city.colHigh <= city.colLow;
});
if (badRange.length) {
  throw new Error(`Cities with a broken cost range: ${badRange.map((city) => city.key).join(', ')}`);
}

if (lowCost.length) {
  throw new Error(`Cities with suspicious annual costs: ${lowCost.map((city) => city.key).join(', ')}`);
}

console.log(`City coverage ok: ${cityRows.length} total, ${usCities.length} US cities, ${taxKeys.size} tax keys.`);
