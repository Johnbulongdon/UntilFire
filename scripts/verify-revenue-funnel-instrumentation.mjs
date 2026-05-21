import fs from 'node:fs';

const analytics = fs.readFileSync('lib/analytics.ts', 'utf8');
const analyticsEvents = fs.readFileSync('lib/analytics-events.ts', 'utf8');
const analyticsServer = fs.readFileSync('lib/analytics-server.ts', 'utf8');
const checkoutRoute = fs.readFileSync('app/api/stripe/checkout/route.ts', 'utf8');
const webhookRoute = fs.readFileSync('app/api/stripe/webhook/route.ts', 'utf8');
const upgradeModal = fs.readFileSync('app/dashboard/UpgradeModal.tsx', 'utf8');
const dashboardPage = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const eventsDoc = fs.readFileSync('docs/analytics/EVENTS.md', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(
  analyticsEvents.includes('price_monthly: number') &&
    analyticsEvents.includes('plan: string') &&
    analyticsEvents.includes('price_id?: string') &&
    analyticsEvents.includes('source: string'),
  'Revenue funnel event interfaces must include plan, price_monthly, optional price_id, and source.',
);

assert(
  analytics.includes('PRO_PLAN_ANALYTICS') &&
    analytics.includes('price_monthly: PRO_PLAN_ANALYTICS.priceMonthly') &&
    analytics.includes('plan: PRO_PLAN_ANALYTICS.plan'),
  'Client revenue funnel helpers must attach the shared Pro plan analytics properties.',
);

assert(
  upgradeModal.includes('trackPaywallViewed') &&
    /useEffect\(\(\) => \{\s*if \(!open\) return;\s*trackPaywallViewed\(/s.test(upgradeModal),
  'Upgrade modal must fire funnel_paywall_viewed when it opens.',
);

assert(
  upgradeModal.includes('trackCheckoutStarted') &&
    /trackCheckoutStarted\(\{[\s\S]*source[\s\S]*priceId: data\.priceId[\s\S]*\}\)/.test(upgradeModal),
  'Upgrade modal must fire funnel_checkout_started with source and returned price_id before redirecting.',
);

assert(
  checkoutRoute.includes('priceId: STRIPE_PRO_PRICE_ID'),
  'Stripe checkout route must return the configured price id for client analytics.',
);

assert(
  analyticsServer.includes('price_monthly: input.priceMonthly') &&
    webhookRoute.includes('priceMonthly: 4.99'),
  'Server checkout success analytics must include the current $4.99 monthly price.',
);

assert(
  dashboardPage.includes('upgradeSource') &&
    dashboardPage.includes('plaid_limit') &&
    dashboardPage.includes('profile') &&
    dashboardPage.includes('source={upgradeSource}'),
  'Dashboard must pass source context into UpgradeModal.',
);

assert(
  eventsDoc.includes('price_monthly') &&
    eventsDoc.includes('source') &&
    !eventsDoc.includes('helper exposed (`trackPaywallViewed(surface)`), no emit site') &&
    !eventsDoc.includes('helper exposed (`trackCheckoutStarted(surface)`), no emit site'),
  'Analytics event docs must describe live paywall/checkout emit sites and revenue properties.',
);

console.log('Revenue funnel instrumentation regression passed');
