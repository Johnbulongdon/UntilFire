#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const source = readFileSync('app/dashboard/page.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`x ${message}`);
    process.exit(1);
  }
}

assert(
  source.includes('const manualEmergencyNeeds ='),
  'dashboard computes a manual needs-only fallback for the emergency fund'
);

assert(
  source.includes('const emergencyFundMonthlyBase = histNeedsAvg > 0 ? histNeedsAvg : manualEmergencyNeeds;'),
  'emergency fund monthly base prefers historical need-tagged spending over total expenses'
);

assert(
  source.includes('monthlyNeedsExpenses={emergencyFundMonthlyBase > 0 ? emergencyFundMonthlyBase : undefined}'),
  'overview emergency fund task uses the shared needs-only base'
);

assert(
  source.includes('emergencyFundMonthlyBase={emergencyFundMonthlyBase}'),
  'assets emergency fund card receives the shared needs-only base'
);

assert(
  source.includes('emergencyFundMonthlyBase = 0') &&
    source.includes('emergencyFundMonthlyBase?: number'),
  'assets emergency fund card prop is explicitly named for the emergency fund base'
);

assert(
  source.includes('getEmergencyFundPlan(emergencyFundBalance, emergencyFundMonthlyBase, hasEverHealthyEmergencyFund)'),
  'assets emergency fund card calculates target from needs-only monthly base'
);

assert(
  !source.includes('getEmergencyFundPlan(emergencyFundBalance, monthlyExpenses, hasEverHealthyEmergencyFund)'),
  'assets emergency fund card no longer calculates target from total monthly expenses'
);

console.log('Emergency fund needs-only regression passed');
