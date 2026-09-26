#!/usr/bin/env node
/**
 * The FIRE number and its factors. A calculator that claims to show its
 * working has to get the working right, so the worked examples published on
 * the page are checked here, along with the recommendations and the wiring.
 *
 * Run: npm run test:fire-number
 */
import { readFileSync } from 'node:fs';
import { fireNumber, recommendedWithdrawalRate, fireProgress, DEFAULT_RETURN_PCT, RECOMMENDED_RETURN_PCT, CAUTIOUS_RETURN_PCT, GROWTH_CHOICES, inflationFor } from '../lib/fire-number.ts';
import { SP500_HISTORY } from '../lib/sp500-history.ts';
import { calcFIRE, yearsToTarget, REAL_RETURN } from '../lib/fire/strategies/traditional.ts';
import { monthsToFire } from '../lib/purchase-impact.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const near = (a, b) => Math.abs(a - b) < 0.01;
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ── The maths
{
  const plain = fireNumber({ annualSpending: 60000 });
  check('plain rule: $60,000 at 4% is 25× = $1,500,000', near(plain.fireNumber, 1_500_000) && plain.multiple === 25, String(plain.fireNumber));
  const worked = fireNumber({ annualSpending: 60000, otherIncome: 12000, taxRatePct: 10, withdrawalRatePct: 4 });
  check('page example: $48,000 ÷ 0.9 ÷ 4% = $1,333,333', Math.round(worked.fireNumber) === 1_333_333, String(worked.fireNumber));
  check('breakdown adds up: spending − income + tax = total', near(worked.fromSpending - worked.otherIncomeReduction + worked.taxAddition, worked.fireNumber));
  check('first-year withdrawal includes the tax', near(worked.firstYearWithdrawal, 48000 / 0.9));
  check('3% needs 33.3× spending', near(fireNumber({ annualSpending: 30000, withdrawalRatePct: 3 }).fireNumber, 1_000_000));
  const covered = fireNumber({ annualSpending: 40000, otherIncome: 50000, taxRatePct: 10 });
  check('income above spending gives zero, never negative', covered.fireNumber === 0 && covered.otherIncomeReduction === 40000 * 25);
  check('blank or negative inputs count as zero', fireNumber({ annualSpending: NaN }).fireNumber === 0 && fireNumber({ annualSpending: -5 }).fireNumber === 0);
}

// ── The recommendations
{
  check('no age: the standard 4%', recommendedWithdrawalRate(null).rate === 4);
  check('stopping at 65 (30 years): 4%', recommendedWithdrawalRate(65).rate === 4);
  check('stopping at 55 (40 years): 3.5%', recommendedWithdrawalRate(55).rate === 3.5);
  check('stopping at 40 (55 years): 3%', recommendedWithdrawalRate(40).rate === 3);
  check('boundary: 45 years (age 50) is still 3.5%', recommendedWithdrawalRate(50).rate === 3.5);
}

// ── Progress
check('progress is capped at 100', fireProgress(3_000_000, 1_500_000) === 100 && near(fireProgress(750_000, 1_500_000), 50));
check('nothing needed and nothing saved is 0, not NaN', fireProgress(0, 0) === 0);

// ── One answer everywhere (the calculator audit)
{
  // Spends $50k, saves $2,000 a month, has $50k invested, age 30.
  const engine = calcFIRE(2000, 50000, 30, 50000);
  const shared = yearsToTarget(50000, 24000, 1_250_000);
  check('freedom date and the shared projection agree', near(engine.years, shared), `${engine.years} vs ${shared}`);
  check('purchase impact measures on the same clock', near(monthsToFire(50000, 2000, 1_250_000, REAL_RETURN) / 12, shared), String(monthsToFire(50000, 2000, 1_250_000, REAL_RETURN) / 12));
  check('age in the freedom year rounds like the year (30 + 20.7 years → 50)', engine.age === 30 + Math.floor(engine.years), `${engine.age} after ${engine.years}`);
  check('already there is zero years', yearsToTarget(2_000_000, 0, 1_000_000) === 0);
  check('never reached within the cap is null', yearsToTarget(0, 0, 1_000_000) === null);
  const own = [
    ['app/calculators/savings-rate/SavingsRateCalculator.tsx', 'yearsToTarget('],
    ['app/components/landing/LandingPage.tsx', 'yearsToTarget('],
    ['lib/purchase-impact.ts', 'yearsToTarget('],
  ];
  for (const [file, needle] of own) {
    const src = read(file);
    check(`${file.split('/').pop()} uses the shared projection, not its own loop`, src.includes(needle) && !/monthlyReturn|GROWTH_MONTHLY|annualRate \/ 12/.test(src));
  }
  check('city pages use the shared return, not a typed 0.07', !read('app/fire-number/[slug]/page.tsx').includes('= 0.07'));
  check('purchase impact logo follows the theme', read('app/calculators/purchase-impact/PurchaseImpactCalculator.tsx').includes('<Logo variant="auto"'));
}

// ── Growth after inflation is a factor, grounded in S&P 500 history (D-24)
{
  const H = SP500_HISTORY;
  const since1928 = H.periods.find((p) => p.id === 'since1928');
  check('default growth is the S&P 500 since 1928 after inflation, and the engine uses it', DEFAULT_RETURN_PCT === since1928.realPct && Math.abs(REAL_RETURN - since1928.realPct / 100) < 1e-12, `${DEFAULT_RETURN_PCT} ${REAL_RETURN}`);
  check('the history is plausible: since 1928, 9.5–10.8% before inflation and 6–7.5% after', since1928.nominalPct >= 9.5 && since1928.nominalPct <= 10.8 && since1928.realPct >= 6 && since1928.realPct <= 7.5, JSON.stringify(since1928));
  check('every period earns less after inflation than before', H.periods.every((p) => p.realPct < p.nominalPct));
  check('one answer: the recommendation is the default, the full record since 1928', RECOMMENDED_RETURN_PCT === DEFAULT_RETURN_PCT && DEFAULT_RETURN_PCT === since1928.realPct);
  check('the cautious 5% is extra margin: history beat it more often than the recommendation', CAUTIOUS_RETURN_PCT === 5 && H.cautious.beatShare > since1928.beatShare, `${H.cautious.beatShare} vs ${since1928.beatShare}`);
  const pickerSrc = read('app/components/GrowthChoicePicker.tsx');
  check('the picker shows a row\'s details only when it is selected, and a dot meter for confidence', pickerSrc.includes('{on && (') && pickerSrc.includes('function Confidence'));
  check('the picker marks one choice, not a separate default and recommendation', pickerSrc.includes('>Recommended</Badge>') && !pickerSrc.includes('>Default</Badge>'));
  check('the worst 30 years is the lowest choice and every stretch beat it', H.worst.realPct === Math.min(...GROWTH_CHOICES.map((c) => c.realPct)) && H.worst.beatShare === 100);
  check('a higher rate is never beaten more often than a lower one', GROWTH_CHOICES.every((a) => GROWTH_CHOICES.every((b) => !(a.realPct > b.realPct) || a.beatShare <= b.beatShare)));
  check('the data runs through the last full year', H.through >= 2025 && H.windows === H.through - 1957 + 1, `${H.through} ${H.windows}`);
  check('start years have a reason, not a rolling window', H.periods.length >= 5 && H.periods.every((p) => /^since\d{4}$/.test(p.id) && p.why.length > 20), H.periods.map((p) => p.id).join(','));
  check('the start changes the answer: from the 2000 peak lower, from after 2008 higher', H.periods.find((p) => p.id === 'since2000').realPct < since1928.realPct && H.periods.find((p) => p.id === 'since2009').realPct > since1928.realPct);
  check('each choice\'s inflation joins its before and after figures', GROWTH_CHOICES.every((c) => Math.abs((1 + c.realPct / 100) * (1 + c.inflationPct / 100) - (1 + c.nominalPct / 100)) < 0.0015), GROWTH_CHOICES.map((c) => `${c.id}:${c.nominalPct}/${c.realPct}/${c.inflationPct}`).join(' '));
  check('only the cautious rate\'s before-inflation figure is an estimate', GROWTH_CHOICES.filter((c) => c.nominalEstimated).map((c) => c.id).join() === 'cautious');
  check('future dollars use the chosen stretch\'s inflation, else the long-run average', inflationFor(since1928.realPct) === since1928.inflationPct && inflationFor(6.123) === since1928.inflationPct);
  const picker = read('app/components/GrowthChoicePicker.tsx');
  check('the picker switches between before and after inflation and explains the gap', picker.includes("'Before inflation'") && picker.includes("'After inflation'") && picker.includes('What an account shows') && picker.includes('What your money can buy'));
  const flow2 = read('app/components/RevealFlow.tsx');
  check('the result switches between today\'s and future dollars and says the date is the same', flow2.includes('futureDollars') && flow2.includes('Same buying power, same date') && read('app/HomeClient.tsx').includes('Math.pow(1 + inflationFor(returnPct) / 100, result.years)'));
  const at7 = calcFIRE(2000, 50000, 30, 50000, 0.07).years, at5 = calcFIRE(2000, 50000, 30, 50000, 0.05).years;
  check('the cautious rate gives a later date (20.7 → 24.2 years at 7% and 5%)', at5 > at7 && Math.abs(at7 - 20.7) < 0.05 && Math.abs(at5 - 24.2) < 0.05, `${at7} ${at5}`);
  const home = read('app/HomeClient.tsx');
  check('free result: growth is state, and every projection uses it', home.includes('useState<number>(DEFAULT_RETURN_PCT)') && home.includes('const marketReturn = returnPct / 100;') && !home.includes('const marketReturn = REAL_RETURN'));
  check('free result: the choice carries into the dashboard', home.includes('realReturn: marketReturn') && read('app/dashboard/page.tsx').includes('prefill.realReturn'));
  check('free result: age rounds like the year', home.includes('planningAge + Math.floor(result.years)') && !home.includes('planningAge + Math.round(projection.years)'));
  const flow = read('app/components/RevealFlow.tsx');
  check('free result states its growth in one line and opens the history to change it', flow.includes('growth</b> a year after inflation') && flow.includes('as we recommend') && flow.includes('"Change"') && home.includes('growthPicker={<GrowthChoicePicker'));
  const card = read('app/dashboard/FireAssumptionsCard.tsx');
  check('Plan assumptions: growth in one line, the history one tap away', card.includes('<GrowthSetting') && !card.includes('<GrowthChoicePicker'));
  check('dashboard treats the old typed 0.07 as never chosen', read('app/dashboard/page.tsx').includes('fp.growthRate !== 0.07'));
  const dash = read('app/dashboard/page.tsx');
  check('dashboard wires the saved growth into the card and expat views', dash.includes('onGrowthRateChange={setGrowthRate}') && !/calcFIRE\([^)]*portfolioBalance\);/.test(dash));
  check('savings rate page: growth is a factor', read('app/calculators/savings-rate/SavingsRateCalculator.tsx').includes('yearsToFIRE(sr, returnPct / 100'));
  check('Coast FIRE uses the history picker; savings rate shows growth in one line that opens it', read('app/calculators/coast-fire/CoastFireCalculator.tsx').includes('<GrowthChoicePicker') && read('app/calculators/savings-rate/SavingsRateCalculator.tsx').includes('<GrowthSetting') && read('app/components/GrowthSetting.tsx').includes('<GrowthChoicePicker'));
  {
    const factor = read('app/calculators/4-percent-rule/Factor.tsx');
    check('calculator factors keep explanations behind a tap and recommend in a few words', factor.includes('aria-expanded={open}') && factor.includes('{open && (') && factor.includes('recommendationWhy'));
  }
}

// ── Wiring
{
  const calc = read('app/calculators/4-percent-rule/FourPercentRuleCalculator.tsx');
  check('calculator uses the shared maths', calc.includes("from '@/lib/fire-number'") && !/\/ \(selectedRate/.test(calc));
  check('calculator starts at the plain rule', calc.includes('useState<number>(DEFAULT_WITHDRAWAL_RATE)') && calc.includes('useState(0)'));
  check('calculator inputs stay out of recordings', calc.includes('ph-no-capture'));
  const page = read('app/calculators/4-percent-rule/page.tsx');
  check('page has one h1 (the calculator\'s)', !page.includes('<h1'));
  check('page publishes the formula and the worked example', page.includes('FIRE number = (yearly spending − other income)') && page.includes('$1,333,333'));
  const quick = read('app/learn/[slug]/FireNumberQuick.tsx');
  check('article box uses the shared maths and passes no amounts', quick.includes("from '@/lib/fire-number'") && quick.includes('href="/?source=learn-fire-meaning"'));
}

// ── The definition article
{
  const learn = read('lib/learn.ts');
  const start = learn.indexOf("slug: 'what-is-fire-financial-independence-retire-early'");
  const article = learn.slice(start, learn.indexOf("slug: 'how-much-money-do-i-need-to-retire'"));
  check('article leads with a direct definition', article.includes("h2('What does FIRE mean?')") && article.includes("p('FIRE stands for Financial Independence, Retire Early. It means"));
  check('article carries the FIRE number box and FAQs', article.includes("{ type: 'fire-number' }") && article.includes('faqs: ['));
  const page = read('app/learn/[slug]/page.tsx');
  check('article FAQs are visible and in schema from one list', page.includes("'@type': 'FAQPage'") && page.includes('article.faqs.map'));
}

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.ok || !c.detail ? '' : ` — ${c.detail}`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
