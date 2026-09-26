#!/usr/bin/env node
/**
 * The Coast FIRE target with Social Security, pensions and a partner's
 * benefit. The target must be exactly what the projection needs: a pot of
 * that size at retirement, drawn down year by year the way the calculator
 * draws it, still covers the benefit gap with the lasting share intact.
 *
 * Run: npm run test:coast-fire
 */
import { readFileSync } from 'node:fs';
import { coastTarget, coastNumberAt, incomeAt } from '../lib/coast-fire.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const near = (a, b, tol = 1) => Math.abs(a - b) < tol;

// No benefits: the classic target and the page's worked example.
check('no income: $50,000 at 4% is $1,250,000', near(coastTarget(50000, 0.04, 0.07, 65), 1_250_000));
check('page example: $1,250,000 over 30 years at 7% is about $164,000', Math.round(coastNumberAt(1_250_000, 0.07, 35, 65) / 1000) === 164);

// A benefit that starts at retirement just lowers the spending.
check('benefit at retirement: ($50,000 − $20,000) ÷ 4% = $750,000', near(coastTarget(50000, 0.04, 0.07, 65, [{ annual: 20000, startAge: 65 }]), 750_000));

// A benefit that starts later: the pot bridges the gap, and the projection agrees.
{
  const r = 0.069, retire = 55, spend = 50000, incomes = [{ annual: 24000, startAge: 67 }];
  const target = coastTarget(spend, 0.04, r, retire, incomes);
  check('a later benefit costs more than one at retirement', target > coastTarget(spend, 0.04, r, retire, [{ annual: 24000, startAge: 55 }]));
  // Draw down the way the calculator does: end-of-year spending less income that has started.
  // The lasting share, drawn at its own rate, must end where the whole pot ends:
  // the bridge share is spent exactly, no more and no less.
  let bal = target, lasting = (spend - 24000) / 0.04;
  for (let a = retire; a < 67; a++) {
    bal = bal * (1 + r) - Math.max(0, spend - incomeAt(a, incomes));
    lasting = lasting * (1 + r) - (spend - 24000);
  }
  check('the bridge share is used up exactly by 67', near(bal, lasting, 5), `${Math.round(bal)} vs ${Math.round(lasting)}`);
}

// Two benefits, a partner's starting later.
{
  const incomes = [{ annual: 20000, startAge: 67 }, { annual: 15000, startAge: 70 }];
  check('income adds up once both have started', incomeAt(70, incomes) === 35000 && incomeAt(68, incomes) === 20000 && incomeAt(60, incomes) === 0);
  const two = coastTarget(60000, 0.04, 0.05, 60, incomes);
  check('a second benefit lowers the target', two < coastTarget(60000, 0.04, 0.05, 60, incomes.slice(0, 1)));
}

// Edges.
check('income above spending: target never negative', coastTarget(30000, 0.04, 0.05, 65, [{ annual: 40000, startAge: 65 }]) === 0);
check('zero return bridges year for year', near(coastTarget(40000, 0.04, 0, 60, [{ annual: 10000, startAge: 65 }]), 30000 / 0.04 + 5 * 10000));
check('zero withdrawal rate gives zero, not Infinity', coastTarget(40000, 0, 0.05, 60) === 0);

// Wiring.
const calc = readFileSync(new URL('../app/calculators/coast-fire/CoastFireCalculator.tsx', import.meta.url), 'utf8');
check('calculator uses the shared target', calc.includes('coastTarget(annualExpenses, wr, r, retire, incomes)'));
check('calculator leads with the Coast FIRE number', calc.indexOf('Your Coast FIRE number') < calc.indexOf('label="Stop paying in at"'));
check('drawdown subtracts benefits that have started', calc.includes('annualExpenses - incomeAt(a, incomes)'));
const page = readFileSync(new URL('../app/calculators/coast-fire/page.tsx', import.meta.url), 'utf8');
check('FAQ answers Social Security and couples', /Social Security/.test(page) && /couple/i.test(page));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.ok || !c.detail ? '' : ` (${c.detail})`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
