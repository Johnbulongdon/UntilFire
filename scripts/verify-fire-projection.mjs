import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/fire/strategies/traditional.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports, Date, Math });
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
assert.ok(Math.abs(calcFIRE(2000, 48000, 30, 0).years - 22.23) < 0.02, 'Normal projection stays stable');
const compute = traditionalStrategy.compute;
const base = { monthlySavings: 100, annualExpenses: 3120, expectedRealReturn: 0, maxYears: 65 };
assert.equal(compute(base).years, 65, 'Reaching the target at the horizon counts');
assert.equal(compute({ ...base, annualExpenses: 3121 }).years, null);
assert.equal(compute({ ...base, annualExpenses: 3096 }).years, 64.5, 'Interpolate inside the last year');
assert.equal(compute({ ...base, annualExpenses: 72 }).years, 1.5, 'Zero-return projection stays finite');
console.log('FIRE projection regression checks passed.');
