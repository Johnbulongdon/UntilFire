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
  source.includes('const EMERGENCY_FUND_TARGET_MONTHS = 6;') &&
    !source.includes('const EMERGENCY_FUND_TARGET_MONTHS = 4;'),
  'emergency fund target is the normal six-month reserve'
);

assert(
  source.includes('const EMERGENCY_FUND_MONTH_MARKS = Array.from({ length: EMERGENCY_FUND_TARGET_MONTHS }, (_, index) => index + 1);') &&
    source.includes('function EmergencyFundProgressBar') &&
    source.includes('{month}mo'),
  'emergency fund progress bars show month marks from one month through target'
);

assert(
  source.includes('Safety runway') &&
    source.includes('Months of essential expenses covered') &&
    source.includes('Excludes wants and work costs'),
  'overview home shows a standalone needs-only emergency fund card'
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
  source.includes('Essential monthly needs') &&
    source.includes('Need-tagged transactions if available; otherwise core budget needs.'),
  'assets emergency fund card labels the needs-only calculation method'
);

assert(
  !source.includes('getEmergencyFundPlan(emergencyFundBalance, monthlyExpenses, hasEverHealthyEmergencyFund)'),
  'assets emergency fund card no longer calculates target from total monthly expenses'
);

console.log('Emergency fund needs-only regression passed');
