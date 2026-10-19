import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute real handlers against in-memory service doubles. No provider, auth,
// billing or database request is sent, and no credentials are read.
const modules = new Map();
const json = (body, options) => new Response(JSON.stringify(body), options);
const env = { OPENROUTER_API_KEY: 'fixture-only', STRIPE_WEBHOOK_SECRET: 'fixture-only' };
let providerCalls = 0, providerBody = [], providerOK = true;
let writes = [], writeError = null, event;
let subscription = { id: 'sub_fixture', customer: 'cus_fixture', status: 'trialing', items: { data: [{ current_period_end: 1_900_000_000, price: { id: 'p', unit_amount: 900 } }] } };
const admin = {
  auth: { getUser: async () => ({ data: { user: { id: 'user_fixture' } }, error: null }) },
  from: () => ({
    upsert: async row => { writes.push(row); return { error: writeError }; },
    update: row => ({ eq: async () => { writes.push(row); return { error: writeError }; } }),
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'user_fixture' }, error: null }) }) }),
  }),
};
const mocks = {
  'next/server': { NextResponse: { json } },
  '@/lib/supabase-admin': { adminClient: () => admin },
  '@/lib/stripe': { getStripe: () => ({
    webhooks: { constructEvent: () => event },
    subscriptions: { retrieve: async () => subscription },
    checkout: { sessions: { retrieve: async () => ({ metadata: { supabase_user_id: 'user_fixture' }, customer: 'cus_fixture', subscription, payment_status: 'no_payment_required' }) } },
  }) },
  '@/lib/analytics-server': { trackCheckoutSucceededServer: async () => {} },
  '@/lib/lifecycle': { recordEvent: async () => {}, LIFECYCLE_EVENTS: { SUBSCRIBED: 'subscribed' } },
  '@/lib/email-send': {}, '@/lib/email-html': {}, '@/lib/referrals-server': {}, resend: {},
};
function load(path) {
  if (modules.has(path)) return modules.get(path);
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, {
    exports, Date, Math, Number, Map, Set, TextDecoder, Uint8Array, AbortSignal,
    process: { env }, console: { error() {} },
    fetch: async () => { providerCalls++; return { ok: providerOK, json: async () => ({ choices: [{ message: { content: JSON.stringify(providerBody) } }] }) }; },
    require: id => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('@/lib/')) return load(`lib/${id.slice(6)}.ts`);
      throw new Error(`Unexpected dependency: ${id}`);
    },
  }, { filename: path });
  modules.set(path, exports);
  return exports;
}
const request = (body, headers = {}) => new Request('http://localhost/fixture', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const { callerKey, rateLimit } = load('lib/rate-limit.ts');
for (let i = 0; i < 20; i++) assert.equal(rateLimit(callerKey(request({}, { authorization: `Bearer invented-${i}` }), 'anonymous'), 20), null);
assert.equal(rateLimit(callerKey(request({}, { authorization: 'Bearer another' }), 'anonymous'), 20).status, 429, 'invented tokens cannot reset the IP allowance');
assert.equal(callerKey(request({}, { authorization: 'Bearer old' }), 'signed-in', 'verified'), callerKey(request({}, { authorization: 'Bearer refreshed' }), 'signed-in', 'verified'));
assert.notEqual(callerKey(request({}), 'signed-in', 'one'), callerKey(request({}), 'signed-in', 'two'));

const { stripeSubscriptionState } = load('lib/stripe-subscription.ts');
assert.equal(stripeSubscriptionState(subscription).plan, 'pro');
assert.equal(stripeSubscriptionState({ ...subscription, status: 'past_due' }).plan, 'free');
assert.equal(stripeSubscriptionState({ ...subscription, items: { data: [{ current_period_end: 1_900_000_000 }, { current_period_end: 1_800_000_000 }] } }).current_period_end, new Date(1_800_000_000_000).toISOString());
for (const data of [[], [{ current_period_end: undefined }], [{ current_period_end: NaN }], [{ current_period_end: -1 }]]) assert.throws(() => stripeSubscriptionState({ status: 'active', items: { data } }));

const webhook = load('app/api/stripe/webhook/route.ts').POST;
event = { type: 'checkout.session.completed', data: { object: { id: 'cs_fixture', metadata: { supabase_user_id: 'user_fixture' }, subscription: 'sub_fixture', customer: 'cus_fixture' } } };
const signed = () => request({}, { 'stripe-signature': 'fixture' });
assert.equal((await webhook(signed())).status, 200);
assert.equal(writes.at(-1).plan, 'pro');
assert.equal(writes.at(-1).current_period_end, new Date(1_900_000_000_000).toISOString());
assert.equal((await webhook(signed())).status, 200, 'repeat activation is an upsert');
writeError = { message: 'fixture failure' };
assert.equal((await webhook(signed())).status, 500, 'a failed activation must be retried');
writeError = null;
event = { type: 'customer.subscription.deleted', data: { object: subscription } };
assert.equal((await webhook(signed())).status, 200);
assert.equal(writes.at(-1).plan, 'free');
writeError = { message: 'fixture failure' };
assert.equal((await webhook(signed())).status, 500, 'failed cancellation must be retried');
writeError = null;
const sync = load('app/api/stripe/sync-subscription/route.ts').POST;
assert.equal((await sync(request({ session_id: 'cs_fixture' }, { authorization: 'Bearer fixture' }))).status, 200, 'trial checkout with no immediate payment activates');
writeError = { message: 'fixture failure' };
assert.equal((await sync(request({ session_id: 'cs_fixture' }, { authorization: 'Bearer fixture' }))).status, 500);
writeError = null;
subscription = { ...subscription, status: 'canceled' };
assert.equal((await sync(request({ session_id: 'cs_fixture' }, { authorization: 'Bearer fixture' }))).status, 409, 'return-page sync cannot reactivate a canceled subscription');

const { readAIRequest, classificationItems } = load('lib/ai-request.ts');
assert.throws(() => classificationItems(Array.from({ length: 51 }, () => ({ description: 'shop', category: 'food' }))));
assert.throws(() => classificationItems([{ description: 'x'.repeat(301), category: 'food' }]));
await assert.rejects(readAIRequest(request('x'.repeat(5000)), 4096), /too large/);
await assert.rejects(readAIRequest(request('x'.repeat(5000), { 'content-length': '5000' }), 4096), /too large/);
const classify = load('app/api/classify-needs-wants/route.ts').POST;
const valid = { items: [{ description: 'groceries', category: 'food' }] };
assert.equal((await classify(request({ items: [null] }))).status, 400);
assert.equal((await classify(request('{'))).status, 400);
assert.equal(providerCalls, 0, 'invalid requests never reach the provider');
providerBody = [{ description: 'groceries', needOrWant: 'need' }];
assert.equal((await classify(request(valid))).status, 200);
providerBody = [];
assert.equal((await classify(request(valid))).status, 502, 'missing results are not silently marked want');
providerOK = false;
assert.equal((await classify(request(valid))).status, 502);
providerOK = true;
const categorise = load('app/api/categorise/route.ts').POST;
assert.equal((await categorise(request({ description: 'shop', type: 'bad' }))).status, 400);
providerBody = { category: 'invented', tags: [] };
assert.equal((await categorise(request({ description: 'shop', type: 'expense' }))).status, 502);
const estimate = load('app/api/estimate-goal-amount/route.ts').POST;
assert.equal((await estimate(request({ category: 'emotion', description: 'holiday', monthlyExpenses: -5 }))).status, 400);
assert.equal((await estimate(request('{'))).status, 400);
console.log('Audit repair regressions passed: billing activation/retry/cancellation, identity limits, bounded AI input and provider errors.');
