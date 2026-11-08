import assert from 'node:assert/strict'
import { pickFirstStep, fullByLabel } from '../lib/first-step.ts'

// The mock John approved: $3,900 bills, $1,300 saved a month, $9,000 today.
const pot = pickFirstStep({ monthlySpend: 3900, monthlySavings: 1300, saved: 9000 })!
assert.equal(pot.kind, 'pot')
assert.equal(pot.need, 23400)
assert.equal(pot.monthsToFull, 12)
assert.equal(Math.floor(pot.monthsCovered), 2)
assert.equal(fullByLabel(12, new Date(2026, 10, 8)), 'Nov 2027')

const invest = pickFirstStep({ monthlySpend: 3000, monthlySavings: 1000, saved: 18000 })!
assert.equal(invest.kind, 'invest')
assert.equal(invest.monthsCovered, 6)

const gap = pickFirstStep({ monthlySpend: 4500, monthlySavings: -500, saved: 2000 })!
assert.equal(gap.kind, 'gap')
assert.equal(gap.gap, 500)
assert.equal(pickFirstStep({ monthlySpend: 3000, monthlySavings: 0, saved: 0 })!.kind, 'gap')

// No spending answer: the page is skipped.
assert.equal(pickFirstStep({ monthlySpend: 0, monthlySavings: 500, saved: 0 }), null)
console.log('First step: gap, safety pot and invest picked from the answers; no spending skips the page.')
