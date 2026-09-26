import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The engine's return comes from the generated history file; load it from source.
const load = (path, require) => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Date, Math, require });
  return exports;
};
const history = load('lib/sp500-history.ts');
const exports = load('lib/fire/strategies/traditional.ts', (id) => {
  if (id === '../../sp500-history.ts') return history;
  throw new Error(`unexpected import ${id}`);
});
const { calcFIRE, traditionalStrategy } = exports;
for (const savings of [0, -100, 1]) {
  const result = calcFIRE(savings, 48000, 30, 0);
  assert.equal(result.years, null, `Unreached target with savings=${savings}`);
  assert.equal(result.retireYear, null);
  assert.equal(result.age, undefined);
  assert.equal(JSON.parse(JSON.stringify(result)).retireYear, null);
}
const ready = calcFIRE(0, 48000, 30, 1200000);
assert.equal(ready.years, 0);
assert.equal(ready.age, 30);
assert.equal(ready.retireYear, new Date().getFullYear());
assert.ok(calcFIRE(0, 48000, 30, 100000).years > 0, 'Investments can grow without contributions');
assert.ok(Math.abs(calcFIRE(2000, 48000, 30, 0, 0.07).years - 22.23) < 0.02, 'Normal projection stays stable');
// The default is measured, not typed: the S&P 500 since 1928 after inflation (D-24).
const since1928 = history.SP500_HISTORY.periods.find((p) => p.id === 'since1928').realPct / 100;
assert.equal(exports.REAL_RETURN, since1928, 'Default growth is the since-1928 S&P 500 return after inflation');
assert.equal(calcFIRE(2000, 48000, 30, 0).years, calcFIRE(2000, 48000, 30, 0, since1928).years);
const compute = traditionalStrategy.compute;
const base = { monthlySavings: 100, annualExpenses: 3120, expectedRealReturn: 0, maxYears: 65 };
assert.equal(compute(base).years, 65, 'Reaching the target at the horizon counts');
assert.equal(compute({ ...base, annualExpenses: 3121 }).years, null);
assert.equal(compute({ ...base, annualExpenses: 3096 }).years, 64.5, 'Interpolate inside the last year');
assert.equal(compute({ ...base, annualExpenses: 72 }).years, 1.5, 'Zero-return projection stays finite');
console.log('FIRE projection regression checks passed.');
