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
  plaidConnect.includes('says who earns from each link'),
  'HYSA card points to Offers and says links are disclosed (D-81)'
);

assert(
  plaidConnect.includes('href="/dashboard?tab=offers"') && plaidConnect.includes('See savings accounts') && plaidConnect.includes("cta: 'see_offers'"),
  'HYSA card links to Money → Offers with a tracked CTA'
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
