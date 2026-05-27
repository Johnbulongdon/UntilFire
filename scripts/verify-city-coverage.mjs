import fs from 'node:fs';

const source = fs.readFileSync('lib/fire-data.ts', 'utf8');
const cityBlock = source.split('export const CITIES: City[] = [')[1]?.split('];')[0];
const taxBlock = source.split('export const STATE_TAX: Record<string, TaxInfo> = {')[1]?.split('};')[0];
const intlBlock = source.split('const US_INTL = new Set([')[1]?.split(']);')[0];

if (!cityBlock || !taxBlock || !intlBlock) {
  throw new Error('Could not find city, tax, or US_INTL blocks in fire-data.ts');
}

const cityRows = [...cityBlock.matchAll(/\{ name: (?:'([^']+)'|\"([^\"]+)\"),\s*key:\s*'([^']+)',\s*col:\s*(\d+),\s*state:\s*'([^']+)'/g)]
  .map((m) => ({ name: m[1] ?? m[2], key: m[3], col: Number(m[4]), state: m[5] }));
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
if (lowCost.length) {
  throw new Error(`Cities with suspicious annual costs: ${lowCost.map((city) => city.key).join(', ')}`);
}

console.log(`City coverage ok: ${cityRows.length} total, ${usCities.length} US cities, ${taxKeys.size} tax keys.`);
