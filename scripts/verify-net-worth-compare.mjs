#!/usr/bin/env node
/**
 * "How you compare": net worth against US households of the same age.
 *
 * The comparison is only as honest as its standard, so this checks the
 * maths, the wording and the data: the table must be the one generated from
 * the Federal Reserve's survey, and its medians must match the Fed's own.
 *
 * Run: npm run test:net-worth-compare
 */
import { readFileSync } from 'node:fs';
import { weightedCutpoints } from '../lib/weighted-percentiles.ts';
import { ageBand, shareBelow, compareNetWorth, percentileToday } from '../lib/net-worth-compare.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

// ── Weighted percentiles
{
  const uniform = Array.from({ length: 100 }, (_, i) => ({ value: i + 1, weight: 1 }));
  const c = weightedCutpoints(uniform);
  check('equal weights: the 50th cutpoint is the middle value', c.length === 99 && c[49] === 50 && c[0] === 1 && c[98] === 99, `${c[0]} ${c[49]} ${c[98]}`);
  const heavy = [{ value: 10, weight: 60 }, { value: 20, weight: 20 }, { value: 30, weight: 20 }];
  const h = weightedCutpoints(heavy);
  check('weights count: 60% of the weight at 10 puts the median at 10', h[49] === 10 && h[59] === 10 && h[60] === 20 && h[98] === 30, `${h[49]} ${h[59]} ${h[60]} ${h[98]}`);
  check('rows with no weight are ignored', weightedCutpoints([{ value: 5, weight: 0 }, { value: 7, weight: 1 }])[49] === 7);
}

// ── Where a value sits
{
  const cuts = Array.from({ length: 99 }, (_, i) => (i + 1) * 1000); // p1 = 1k … p99 = 99k
  check('below the first cutpoint is ahead of nobody', shareBelow(500, cuts) === 0);
  check('above the 99th cutpoint is ahead of everyone measured', shareBelow(150_000, cuts) === 100);
  check('between cutpoints interpolates', Math.abs(shareBelow(50_500, cuts) - 50.5) < 1e-9, String(shareBelow(50_500, cuts)));
  const tied = [-5000, -2000, -500, 0, 0, 0, 0, 0, ...Array.from({ length: 91 }, (_, i) => (i + 1) * 1000)];
  check('a zero net worth does not count as ahead of the others at zero', Math.abs(shareBelow(0, tied) - 4) < 1e-9, String(shareBelow(0, tied)));
}

// ── The comparison
{
  const cuts = Array.from({ length: 99 }, (_, i) => (i + 1) * 1000);
  const bands = Object.fromEntries(['all', 'under_35', '35_44', '45_54', '55_64', '65_74', '75_plus'].map((b) => [b, cuts]));
  const bm = { year: 2022, bands };
  check('age bands follow the survey: 34/35, 44/45, 74/75',
    ageBand(34) === 'under_35' && ageBand(35) === '35_44' && ageBand(44) === '35_44' && ageBand(45) === '45_54' && ageBand(74) === '65_74' && ageBand(75) === '75_plus' && ageBand(null) === 'all');
  check('outside US dollars there is no comparison', compareNetWorth({ netWorthUsd: 50_000, age: 40, ageAssumed: false, currency: 'HKD' }, bm) === null);
  const withAge = compareNetWorth({ netWorthUsd: 62_400, age: 40, ageAssumed: false, currency: 'USD' }, bm);
  check('with an age it compares with that age, rounding down', withAge.band === '35_44' && withAge.aheadOfPct === 62 && !withAge.allAges && withAge.bandLabel === 'aged 35–44', JSON.stringify(withAge));
  const assumed = compareNetWorth({ netWorthUsd: 62_400, age: 30, ageAssumed: true, currency: 'USD' }, bm);
  check('an assumed age compares with all households, and says so', assumed.band === 'all' && assumed.allAges && assumed.bandLabel === 'of all ages');
  const top = compareNetWorth({ netWorthUsd: 1e9, age: 40, ageAssumed: false, currency: 'USD' }, bm);
  check('past the top cutpoint it says more than 99%, not 100%', top.aboveTop && top.aheadOfPct === 99);
  const adj = compareNetWorth({ netWorthUsd: 60_000, age: 40, ageAssumed: false, currency: 'USD' }, bm, { factor: 1.2, through: 'August 2026' });
  check("today's net worth is brought back to survey dollars before it is placed", adj.aheadOfPct === 50 && adj.adjustedThrough === 'August 2026', JSON.stringify(adj));
  check('without an adjustment it says so, rather than implying one', withAge.adjustedThrough === null);
  const bad = compareNetWorth({ netWorthUsd: 60_000, age: 40, ageAssumed: false, currency: 'USD' }, bm, { factor: 0, through: 'x' });
  check('an unusable factor is ignored, not divided by', bad.aheadOfPct === 60 && bad.adjustedThrough === null);
}

// ── Wording and wiring
const flow = readFileSync('app/components/RevealFlow.tsx', 'utf8');
check('the result only shows the comparison when there is one', /\{netWorthComparison && \(/.test(flow) && /<NetWorthStanding comparison=\{netWorthComparison\}/.test(flow));
check('it is phrased as how many have less, never as behind', /ahead of/.test(flow) && !/\bbehind\b/i.test(flow.slice(flow.indexOf('function NetWorthStanding'), flow.indexOf('function Bar('))));
check('on short screens the comparison screen tightens, scaling bars together rather than clamping them',
  /@media \(max-height: 820px\)/.test(flow) && /data-dense=\{step === 5 && netWorthComparison/.test(flow) && /--rf-bar-scale/.test(flow) && !/\.rf-bar\{max-height/.test(flow));
check('the result names its source', /Federal Reserve Survey of Consumer Finances, \{netWorthComparison\.surveyYear\}/.test(flow));
const home = readFileSync('app/HomeClient.tsx', 'utf8');
check('the result compares the calculator net worth, age and currency', /compareNetWorth\(\s*\{ netWorthUsd: portfolioBalance, age: currentAge, ageAssumed: ageWasAssumed, currency \}/.test(home));
check('the result and Home both pass the inflation adjustment and say what it is',
  /NET_WORTH_BENCHMARKS,\s*NET_WORTH_INFLATION,/.test(home) && /NET_WORTH_BENCHMARKS,\s*NET_WORTH_INFLATION,/.test(readFileSync('app/dashboard/CompareCard.tsx', 'utf8'))
  && /adjusted for inflation to \{netWorthComparison\.adjustedThrough\}/.test(flow) && /adjusted for inflation to \{comparison\.adjustedThrough\}/.test(readFileSync('app/dashboard/CompareCard.tsx', 'utf8')));
const layout = readFileSync('lib/dashboard-layout.ts', 'utf8');
const page = readFileSync('app/dashboard/page.tsx', 'utf8');
check('Home has the card, using the net worth Home already shows and the plan age',
  /id: "compare"/.test(layout) && /<CompareCard netWorthUsd=\{currentNetWorth\} age=\{fireAge\} currency=\{displayCurrency\}/.test(page));

// ── The data
const data = readFileSync('lib/net-worth-benchmarks.ts', 'utf8');
check('the table is the generated one, not hand-written', /GENERATED by scripts\/build-net-worth-benchmarks\.mjs/.test(data) && !/SYNTHETIC/.test(data));
const json = data.match(/NET_WORTH_BENCHMARKS: NetWorthBenchmarks = (\{[\s\S]*\})\s*$/)?.[1];
let parsed = null;
try { parsed = JSON.parse(json); } catch {}
const PUBLISHED_MEDIANS = JSON.parse(readFileSync('scripts/scf-published-medians.json', 'utf8'));
check("the Fed's published medians cover all seven groups",
  ['all', 'under_35', '35_44', '45_54', '55_64', '65_74', '75_plus'].every((b) => Number(PUBLISHED_MEDIANS[b]) > 0));
check('every band has 99 cutpoints in order',
  !!parsed && Object.keys(PUBLISHED_MEDIANS).every((b) => parsed.bands[b]?.length === 99 && parsed.bands[b].every((v, i, a) => i === 0 || v >= a[i - 1])));
check("each band's median is within 2% of the Fed's published median",
  !!parsed && Object.entries(PUBLISHED_MEDIANS).every(([b, m]) => Math.abs(parsed.bands[b][49] - m) / m <= 0.02),
  parsed ? Object.entries(PUBLISHED_MEDIANS).map(([b, m]) => `${b} ${parsed.bands[b]?.[49]} vs ${m}`).join('; ') : 'unparsed');

const infl = readFileSync('lib/net-worth-inflation.ts', 'utf8');
const inflJson = infl.match(/NET_WORTH_INFLATION: InflationAdjustment \| null = (\{[^\n]*\})/)?.[1];
let inflParsed = null;
try { inflParsed = JSON.parse(inflJson); } catch {}
check('the inflation adjustment is generated from the BLS index, and plausible',
  /GENERATED by scripts\/build-net-worth-inflation\.mjs/.test(infl) && !!inflParsed && inflParsed.factor > 1 && inflParsed.factor < 1.6 && /^[A-Z][a-z]+ 20\d\d$/.test(inflParsed.through),
  inflJson ?? 'placeholder');

let failed = 0;
// ── The net worth by age page (/calculators/net-worth-by-age)
{
  const bench = { year: 2022, bands: { all: Array.from({ length: 99 }, (_, i) => (i + 1) * 1000) } };
  check('a percentile in today\'s dollars is the survey cutpoint times the factor',
    percentileToday(bench, 'all', 50, { factor: 1.1, through: 'X' }) === 50_000 * 1.1
      && percentileToday(bench, 'all', 50, null) === 50_000
      && percentileToday(bench, 'all', 0, null) === null && percentileToday(bench, 'all', 100, null) === null);
  const page = readFileSync('app/calculators/net-worth-by-age/page.tsx', 'utf8');
  const calc = readFileSync('app/calculators/net-worth-by-age/NetWorthByAgeCalculator.tsx', 'utf8');
  check('the page compares with the same function, data and inflation factor as the result',
    /compareNetWorth\(/.test(calc) && /NET_WORTH_BENCHMARKS/.test(calc) && /NET_WORTH_INFLATION/.test(calc));
  check('the page table and FAQ use the generated data, not typed-in amounts',
    /percentileToday\(NET_WORTH_BENCHMARKS/.test(page) && !/\$\d{2,3},\d{3}/.test(page));
  check('its FAQ schema is generated from the visible FAQ', /\{faqs\.map\(/.test(page) && /'FAQPage',\s*mainEntity:\s*faqs\.map/.test(page));
  check('what someone types is kept out of session recordings', /ph-no-capture/.test(calc));
  check('it hands on to the freedom date, tagged with its source', /href="\/\?source=net-worth-by-age"/.test(calc));
  check('it is in the sitemap and the calculators list',
    /siteUrl\('\/calculators\/net-worth-by-age'\)/.test(readFileSync('app/sitemap.ts', 'utf8'))
      && /'\/calculators\/net-worth-by-age'/.test(readFileSync('app/calculators/page.tsx', 'utf8')));
}

for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail && !c.ok ? `  — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nNet worth comparison verification failed: ${failed} check(s).` : '\nNet worth comparison verification passed');
process.exit(failed ? 1 : 0);
