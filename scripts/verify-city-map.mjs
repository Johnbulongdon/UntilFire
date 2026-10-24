import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import path from 'node:path';

const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require = name => load(name.startsWith('@/') ? `${name.slice(2)}.ts` : path.resolve(path.dirname(file), `${name}.ts`));
  vm.runInNewContext(code, { exports, require, console, Map, Set, Math, Intl }, { filename: file });
  return exports;
}
const { CITIES, isUS } = load('lib/fire-data.ts');
const { cityLandingPages, cityPagePath } = load('lib/city-pages.ts');
const { getCityComparisons, fitCityMap, projectCity, cityDistance } = load('lib/city-comparisons.ts');
const published = CITIES.filter(c => isUS(c.state) || cityLandingPages.some(p => p.city.key === c.key));
let mapped = 0;
for (const city of published) {
  const comparisons = getCityComparisons(city);
  if (!comparisons.length) continue;
  mapped++;
  assert.equal(comparisons[0].key, city.key);
  assert.equal(comparisons.length, new Set(comparisons.map(c => c.key)).size);
  assert.ok(comparisons.length <= 4);
  for (const c of comparisons) {
    assert.ok(published.some(p => p.key === c.key), 'map links only to published city guides');
    assert.equal(c.href, cityPagePath(c.key));
    assert.ok(c.annualUSD > 0 && Number.isFinite(c.lat) && Number.isFinite(c.lng));
  }
  for (const width of [288, 358, 812]) {
    const map = fitCityMap(comparisons, width);
    assert.ok(map.tiles.length <= 15, 'only visible viewport tiles, no prefetch');
    for (const p of map.labels) assert.ok(p.x >= 72 && p.x <= width - 72 && p.y >= 48 && p.y <= 292, `label fits: ${city.key}`);
    for (let i=0;i<map.labels.length;i++) for (let j=i+1;j<map.labels.length;j++) {
      const a=map.labels[i], b=map.labels[j];
      assert.ok(Math.abs(a.x-b.x)>=140 || Math.abs(a.y-b.y)>=72, `map labels have separate touch targets: ${city.key} ${width}`);
    }
  }
}
assert.equal(mapped, published.length, 'every currently published city has a coordinate-backed map');
const austin = CITIES.find(c=>c.key==='austin');
assert.equal(austin.col*25, 1357500);
assert.equal(CITIES.find(c=>c.key==='houston').col*25-austin.col*25,-87500);
assert.equal(getCityComparisons(CITIES.find(c=>c.key==='singapore')).length,1,'no fake Singapore neighbors');
assert.ok(cityDistance({lat:0,lng:179},{lat:0,lng:-179})<225, 'date-line distance wraps');
assert.equal(projectCity(0,0,1).x,256);
const home=readFileSync('app/HomeClient.tsx','utf8');
assert.match(home,/const cityFromLink = CITIES.find\(c => c.key === urlParams.get\("city"\)\)/);
assert.match(home,/setCurrency\(stateToCurrency\(cityFromLink.state\)\)/);
console.log(`City maps verified for ${mapped} published cities, three widths, canonical links, collision-free targets, USD comparisons and onboarding context.`);
