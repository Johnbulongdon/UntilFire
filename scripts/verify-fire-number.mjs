#!/usr/bin/env node
/**
 * The FIRE number and its factors. A calculator that claims to show its
 * working has to get the working right, so the worked examples published on
 * the page are checked here, along with the recommendations and the wiring.
 *
 * Run: npm run test:fire-number
 */
import { readFileSync } from 'node:fs';
import { fireNumber, recommendedWithdrawalRate, fireProgress } from '../lib/fire-number.ts';
import { calcFIRE, yearsToTarget } from '../lib/fire/strategies/traditional.ts';
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
  check('purchase impact measures on the same clock', near(monthsToFire(50000, 2000, 1_250_000, 0.07) / 12, shared), String(monthsToFire(50000, 2000, 1_250_000, 0.07) / 12));
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
