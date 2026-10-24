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
  checkoutRoute.includes('priceIdFor(interval)') && /return NextResponse\.json\(\{[^}]*priceId/.test(checkoutRoute),
  'Stripe checkout route must return the price id it actually charged, for client analytics.',
);

assert(
  analyticsServer.includes('price_monthly: input.priceMonthly') &&
    webhookRoute.includes('price?.unit_amount'),
  'Server checkout success analytics must report the amount Stripe actually charged, not a hardcoded price.',
);

assert(
  analyticsEvents.includes("from './pricing'") &&
    analyticsEvents.includes('priceMonthly: PRO_MONTHLY_USD') &&
    !/priceMonthly: [0-9]/.test(analyticsEvents),
  'The analytics price must come from lib/pricing, never a literal — six copies of it is how it drifted before.',
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

// D-26: checkout charges the price IDs that sit beside the display prices,
// not Vercel settings that can drift from the page.
const pricing = fs.readFileSync('lib/pricing.ts', 'utf8');
const stripeLib = fs.readFileSync('lib/stripe.ts', 'utf8');
assert(
  /month: "price_[A-Za-z0-9]+", \/\/ \$9 \/ month/.test(pricing) &&
    /year: "price_[A-Za-z0-9]+", \/\/ \$79 \/ year/.test(pricing) &&
    pricing.includes('export const PRO_MONTHLY_USD = 9;') &&
    pricing.includes('export const PRO_ANNUAL_USD = 79;') &&
    stripeLib.includes('return STRIPE_PRICE_IDS[interval];') &&
    !/process\.env\.STRIPE_PRO_(ANNUAL_)?PRICE_ID/.test(stripeLib),
  'Checkout must charge the Stripe price IDs kept beside the display prices in lib/pricing.ts.',
);

console.log('Revenue funnel instrumentation regression passed');
