#!/usr/bin/env node
/**
 * Build lib/sp500-history.ts: what the S&P 500 returned over the periods
 * people quote, before and after inflation, and how often every 30-year
 * stretch since 1928 beat each rate. It is where UntilFire's growth
 * assumption comes from (D-24), so readers can see why a rate is offered.
 *
 *   node scripts/build-sp500-history.mjs sp500.csv cpi.json
 *
 * sp500.csv — Robert Shiller's monthly S&P composite data (price, dividend,
 *   CPI), as republished at https://github.com/datasets/s-and-p-500
 *   (data/data.csv). Prices are monthly averages.
 * cpi.json  — a BLS API response for CUUR0000SA0 (CPI-U) covering the months
 *   after Shiller's CPI stops:
 *   curl -sS -X POST -H 'Content-Type: application/json' \
 *     -d '{"seriesid":["CUUR0000SA0"],"startyear":"2020","endyear":"2026","registrationkey":"…"}' \
 *     https://api.bls.gov/publicAPI/v2/timeseries/data/ -o cpi.json
 *
 * Total return reinvests dividends monthly (a twelfth of the annual dividend).
 * Where the dataset has no dividend yet, the last reported dividend is held
 * flat, which understates recent returns slightly (dividends grow), so the
 * figures err cautious. Refuses to write if Shiller's CPI disagrees with BLS
 * or the since-1928 figure falls outside the range every published series
 * agrees on.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [csvPath, cpiPath] = process.argv.slice(2);
if (!csvPath || !cpiPath) {
  console.error('Usage: node scripts/build-sp500-history.mjs sp500.csv cpi.json');
  process.exit(1);
}

const lines = readFileSync(csvPath, 'utf8').trim().split('\n');
const head = lines[0].split(',');
const col = (name) => head.indexOf(name);
const [iDate, iPrice, iDiv, iCpi] = [col('Date'), col('SP500'), col('Dividend'), col('Consumer Price Index')];

const bls = {};
for (const x of JSON.parse(readFileSync(cpiPath, 'utf8')).Results.series[0].data) {
  if (/^M(0[1-9]|1[0-2])$/.test(x.period) && x.value !== '-') bls[`${x.year}-${x.period.slice(1)}`] = Number(x.value);
}

const price = {}, div = {}, cpi = {}, shillerCpi = {};
let lastDiv = null, lastDivMonth = null, lastShillerCpiMonth = null;
const cpiGaps = [];
for (const line of lines.slice(1)) {
  const c = line.split(',');
  const k = c[iDate].slice(0, 7);
  price[k] = Number(c[iPrice]);
  if (Number(c[iDiv]) > 0) { lastDiv = Number(c[iDiv]); lastDivMonth = k; }
  div[k] = lastDiv;
  if (Number(c[iCpi]) > 0) { shillerCpi[k] = Number(c[iCpi]); lastShillerCpiMonth = k; }
  // BLS is the official series; Shiller's latest months are his estimates.
  if (bls[k]) cpi[k] = bls[k];
  else if (shillerCpi[k]) cpi[k] = shillerCpi[k];
  else cpiGaps.push(k);
}

// Shiller's CPI is CPI-U, so where both are settled they must agree. His last
// twelve months are estimates and are left out of the check (BLS replaces them).
const settled = `${Number(lastShillerCpiMonth.slice(0, 4)) - 1}-${lastShillerCpiMonth.slice(5)}`;
const overlap = Object.keys(bls).filter((k) => k <= settled && shillerCpi[k]);
const worstGap = Math.max(...overlap.map((k) => Math.abs(shillerCpi[k] - bls[k])));
if (!overlap.length || worstGap > 0.05) throw new Error(`Shiller CPI and BLS disagree by ${worstGap} (months: ${overlap.length})`);

const months = Object.keys(price).sort();
const total = {}, real = {};
let t = 1;
months.forEach((k, i) => {
  if (i) t *= (price[k] + div[k] / 12) / price[months[i - 1]];
  total[k] = t;
  if (cpi[k]) real[k] = t / cpi[k];
});

const END = Number(months.filter((k) => k.endsWith('-12') && real[k]).pop().slice(0, 4));
const cagr = (series, from, to) => (series[`${to}-12`] / series[`${from - 1}-12`]) ** (1 / (to - from + 1)) - 1;
const pct = (x) => Math.round(x * 1000) / 10;

// Every 30-year stretch, by calendar year, since 1928.
const WINDOW = 30;
const windows = [];
for (let to = 1928 + WINDOW - 1; to <= END; to++) windows.push({ from: to - WINDOW + 1, to, real: cagr(real, to - WINDOW + 1, to) });
const beatShare = (rate) => Math.round((windows.filter((w) => w.real >= rate / 100 - 1e-9).length / windows.length) * 100);
const worst = windows.reduce((a, b) => (b.real < a.real ? b : a));

const period = (id, label, from) => {
  const realPct = pct(cagr(real, from, END));
  return { id, label, from, to: END, nominalPct: pct(cagr(total, from, END)), realPct, beatShare: beatShare(realPct) };
};
const periods = [
  period('last10', 'Last 10 years', END - 9),
  period('last20', 'Last 20 years', END - 19),
  period('last50', 'Last 50 years', END - 49),
  period('since1928', 'Since 1928', 1928),
];
const since1928 = periods.find((p) => p.id === 'since1928');
if (since1928.nominalPct < 9.5 || since1928.nominalPct > 10.8) throw new Error(`Since-1928 return ${since1928.nominalPct}% is outside 9.5–10.8%`);

const CAUTIOUS = 5;
const out = {
  through: END,
  windowYears: WINDOW,
  windows: windows.length,
  periods,
  cautious: { realPct: CAUTIOUS, beatShare: beatShare(CAUTIOUS) },
  worst: { from: worst.from, to: worst.to, realPct: pct(worst.real), beatShare: 100 },
  dividendsEstimatedAfter: lastDivMonth,
  cpiGaps: cpiGaps.filter((k) => k <= `${END}-12` && k >= '1927-12'),
};

writeFileSync(new URL('../lib/sp500-history.ts', import.meta.url), `// Generated by scripts/build-sp500-history.mjs — do not edit by hand.
// S&P 500 total return (dividends reinvested), from Shiller's monthly data
// and BLS CPI-U, through December ${END}. Dividends after ${lastDivMonth} are
// held at the last reported level, which errs cautious.

export interface Sp500Period {
  id: string
  label: string
  from: number
  to: number
  /** Average yearly return, compounded, before inflation. */
  nominalPct: number
  /** The same after inflation: what the freedom date uses. */
  realPct: number
  /** Share of all ${WINDOW}-year stretches since 1928 that did at least this well. */
  beatShare: number
}

export const SP500_HISTORY = ${JSON.stringify(out, null, 2)} as const
`);
console.log(JSON.stringify(out, null, 2));
