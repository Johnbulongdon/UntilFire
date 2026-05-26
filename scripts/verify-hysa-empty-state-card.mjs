#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const plaidConnect = readFileSync('app/dashboard/PlaidConnect.tsx', 'utf8');
const analyticsEvents = readFileSync('lib/analytics-events.ts', 'utf8');
const analytics = readFileSync('lib/analytics.ts', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
}

assert(
  plaidConnect.includes('Park your emergency fund where it can quietly earn more.'),
  'HYSA empty-state card headline is present'
);

assert(
  plaidConnect.includes('We are not recommending any bank here yet'),
  'HYSA card stays educational and avoids affiliate-style bank recommendations'
);

assert(
  plaidConnect.includes('href="/calculators/apy?source=dashboard-hysa-card"') && plaidConnect.includes('Learn more'),
  'HYSA card links Learn more to the internal APY calculator'
);

assert(
  plaidConnect.includes('Connect account') && plaidConnect.includes("cta: 'connect_account'"),
  'HYSA card includes a tracked Connect account CTA'
);

assert(
  analyticsEvents.includes("HYSA_EMPTY_STATE_CTA_CLICKED: 'funnel_hysa_empty_state_cta_clicked'") &&
    analytics.includes('trackHysaEmptyStateCtaClicked'),
  'analytics contract and helper exist for the HYSA empty-state experiment'
);

console.log('HYSA empty-state card regression passed');
