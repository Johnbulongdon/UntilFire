#!/usr/bin/env node
/**
 * The creator referral program (D-27): the rules, the money paths against an
 * in-memory stand-in for Supabase, and the wiring that keeps the tables
 * private and the redirect closed.
 *
 * Run: npm run test:referrals
 */
import { readFileSync } from 'node:fs';
import {
  normaliseCode, commissionCents, withinEarningWindow, payableAt, commissionStatus, summarise,
  accountYoungEnoughToClaim, REFERRAL_MIN_PAYOUT_CENTS, formatCents,
} from '../lib/referrals.ts';
import { claimReferral, recordReferralCommission, reverseReferralCommission } from '../lib/referrals-server.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const day = 86_400_000;

// ── Rules
check('codes: lowercase, digits, single hyphens, 3–24', normaliseCode(' Jane-Saves ') === 'jane-saves' && normaliseCode('ab') === null && normaliseCode('a--b') === null && normaliseCode('-abc') === null && normaliseCode('x'.repeat(25)) === null && normaliseCode('a'.repeat(24)) === 'a'.repeat(24));
check('codes: reserved words refused', normaliseCode('admin') === null && normaliseCode('untilfire') === null);
check('30% of $9 is $2.70; of $79 is $23.70', commissionCents(900) === 270 && commissionCents(7900) === 2370);
check('rounds down, never up', commissionCents(899) === 269 && commissionCents(0) === 0 && commissionCents(-100) === 0);
check('uses the snapshotted rate', commissionCents(1000, 2000) === 200);
{
  const first = new Date('2027-01-31T00:00:00Z');
  check('12-month window: the first payment opens it', withinEarningWindow(null, first));
  check('12-month window: month 12 in, month 13 out', withinEarningWindow(first, new Date('2027-12-31T00:00:00Z')) && !withinEarningWindow(first, new Date('2028-01-31T00:00:00Z')));
}
{
  const now = new Date('2027-03-01T00:00:00Z');
  const earned = new Date('2027-01-15T00:00:00Z');
  check('held 30 days', payableAt(earned).getTime() - earned.getTime() === 30 * day);
  check('status: pending, then payable after the hold', commissionStatus({ status: 'pending', payable_at: new Date(now.getTime() + day).toISOString() }, now) === 'pending' && commissionStatus({ status: 'pending', payable_at: new Date(now.getTime() - day).toISOString() }, now) === 'payable');
  const s = summarise([
    { referred_user_id: 'a', commission_cents: 1500, status: 'pending', payable_at: '2027-02-01T00:00:00Z' },
    { referred_user_id: 'a', commission_cents: 270, status: 'pending', payable_at: '2027-04-01T00:00:00Z' },
    { referred_user_id: 'b', commission_cents: 2370, status: 'paid', payable_at: '2027-01-01T00:00:00Z' },
    { referred_user_id: 'c', commission_cents: 270, status: 'reversed', payable_at: '2027-01-01T00:00:00Z' },
  ], now);
  check('summary: earned excludes reversed; paying counts people', s.earned === 1500 + 270 + 2370 && s.payable === 1500 && s.pending === 270 && s.paid === 2370 && s.reversed === 270 && s.payingCustomers === 2, JSON.stringify(s));
  check('pays out only from the minimum', s.readyToPay === (1500 >= REFERRAL_MIN_PAYOUT_CENTS));
}
check('money reads as $23.70 and $20', formatCents(2370) === '$23.70' && formatCents(2000) === '$20' && formatCents(270) === '$2.70');
check('only new accounts can be claimed', accountYoungEnoughToClaim(new Date(Date.now() - 2 * day).toISOString()) && !accountYoungEnoughToClaim(new Date(Date.now() - 30 * day).toISOString()));

// ── Money paths against an in-memory Supabase
function fakeDb(tables) {
  const unique = { referral_attributions: 'referred_user_id', referral_commissions: 'stripe_invoice_id' };
  return {
    tables,
    from(name) {
      const rows = (tables[name] ??= []);
      let filters = [], order = null, limit = null, op = 'select', payload = null;
      const match = (r) => filters.every(([k, v, kind]) => (kind === 'in' ? v.includes(r[k]) : r[k] === v));
      const run = () => {
        if (op === 'insert') {
          const key = unique[name];
          if (key && rows.some((r) => r[key] === payload[key])) return { data: null, error: { code: '23505', message: 'duplicate' } };
          // Column defaults the migration declares.
          rows.push(name === 'referral_commissions' ? { status: 'pending', ...payload } : { ...payload });
          return { data: [payload], error: null };
        }
        if (op === 'update') {
          const hit = rows.filter(match);
          hit.forEach((r) => Object.assign(r, payload));
          return { data: hit, error: null };
        }
        let out = rows.filter(match);
        if (order) out = [...out].sort((a, b) => (a[order.k] < b[order.k] ? -1 : 1) * (order.asc ? 1 : -1));
        if (limit != null) out = out.slice(0, limit);
        return { data: out, error: null };
      };
      const q = {
        select() { return q; }, eq(k, v) { filters.push([k, v]); return q; }, in(k, v) { filters.push([k, v, 'in']); return q; },
        order(k, o) { order = { k, asc: o?.ascending !== false }; return q; }, limit(n) { limit = n; return q; },
        insert(p) { op = 'insert'; payload = p; return q; }, update(p) { op = 'update'; payload = p; return q; },
        maybeSingle() { const r = run(); return Promise.resolve({ data: r.data?.[0] ?? null, error: r.error }); },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
      };
      return q;
    },
  };
}

{
  const now = Date.now();
  const db = fakeDb({
    referral_partners: [{ id: 'p1', user_id: 'creator', code: 'jane', status: 'active', rate_bps: 3000, months: 12 }, { id: 'p2', user_id: 'other', code: 'paused', status: 'paused', rate_bps: 3000, months: 12 }],
    subscriptions: [{ user_id: 'reader', stripe_customer_id: 'cus_1' }],
  });
  const fresh = { id: 'reader', created_at: new Date(now - day).toISOString() };
  check('claim: no cookie, nothing', (await claimReferral(db, fresh, undefined)) === 'no-cookie');
  check('claim: paused code refused', (await claimReferral(db, fresh, 'paused')) === 'unknown-code');
  check('claim: a creator cannot refer themselves', (await claimReferral(db, { id: 'creator', created_at: fresh.created_at }, 'jane')) === 'self-referral');
  check('claim: an old account is not newly referred', (await claimReferral(db, { id: 'old', created_at: new Date(now - 90 * day).toISOString() }, 'jane')) === 'existing-account');
  check('claim: a new account is attributed', (await claimReferral(db, fresh, 'jane')) === 'claimed' && db.tables.referral_attributions[0].partner_id === 'p1');
  check('claim: the first attribution is final', (await claimReferral(db, fresh, 'jane')) === 'already-attributed' && db.tables.referral_attributions.length === 1);

  const paidAt = Math.floor(now / 1000) - 40 * 86400;
  const inv = (id, cents, at = paidAt, taxes = []) => ({ id, customer: 'cus_1', amount_paid: cents, total_taxes: taxes, status_transitions: { paid_at: at }, created: at });
  check('a $0 trial invoice earns nothing', (await recordReferralCommission(db, inv('in_trial', 0))) === 'nothing-collected');
  check('a $9 invoice earns $2.70', (await recordReferralCommission(db, inv('in_1', 900))) === 'recorded' && db.tables.referral_commissions[0].commission_cents === 270);
  check('a retried webhook records once', (await recordReferralCommission(db, inv('in_1', 900))) === 'duplicate' && db.tables.referral_commissions.length === 1);
  check('tax is not commissioned', (await recordReferralCommission(db, inv('in_tax', 1000, paidAt + 86400, [{ amount: 100 }]))) === 'recorded' && db.tables.referral_commissions[1].collected_cents === 900 && db.tables.referral_commissions[1].commission_cents === 270);
  check('after 12 months of paying, nothing more', (await recordReferralCommission(db, inv('in_late', 900, paidAt + 400 * 86400))) === 'window-ended');
  check('an unreferred customer earns no one anything', (await recordReferralCommission(db, { ...inv('in_x', 900), customer: 'cus_unknown' })) === 'unknown-customer');

  const stripe = { invoicePayments: { list: async ({ payment }) => ({ data: payment.payment_intent === 'pi_1' ? [{ invoice: 'in_1' }] : [] }) } };
  check('a refund reverses its unpaid commission', (await reverseReferralCommission(stripe, db, 'pi_1', 'refunded')) === 'reversed' && db.tables.referral_commissions[0].status === 'reversed');
  check('a refund with no matching invoice changes nothing', (await reverseReferralCommission(stripe, db, 'pi_none', 'refunded')) === 'no-invoice');
}

// ── Wiring
const migration = read('supabase/migrations/0043_referrals.sql');
const tables = ['referral_partners', 'referral_visits', 'referral_attributions', 'referral_payouts', 'referral_commissions'];
check('every referral table has RLS on and no policies', tables.every((t) => migration.includes(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`)) && !/CREATE POLICY/i.test(migration));
check('money is integer cents', /commission_cents\s+INTEGER/.test(migration) && /amount_cents\s+INTEGER/.test(migration));
const link = read('app/r/[code]/route.ts');
check('the link redirects only to our own home page', link.includes('new URL("/", req.url)') && !/searchParams\.get\(["'](next|redirect|url)/.test(link));
check('the referral cookie is httpOnly and lax', link.includes('httpOnly: true') && link.includes('sameSite: "lax"'));
const webhook = read('app/api/stripe/webhook/route.ts');
check('webhook: invoice.paid earns, refunds and disputes reverse', webhook.includes('case "invoice.paid"') && webhook.includes('case "charge.refunded"') && webhook.includes('case "charge.dispute.created"'));
const adminRoute = read('app/api/admin/referrals/route.ts');
check('admin routes check the admin allowlist', (adminRoute.match(/requireAdminUser\(req\)/g) ?? []).length === 2);
check('a payout must match the amount the founder sent', adminRoute.includes('Number(body.amountCents) !== amount'));
const me = read('app/api/referrals/me/route.ts');
check('a creator never sees who they referred', !/commissions:\s/.test(me) && !me.includes('referred_user_id:'));
const auth = read('lib/auth-finish.ts');
check('sign-in returns only to allowlisted pages', auth.includes("new Set(['/invite'])"));
check('the dashboard claims after first sign-in', read('app/dashboard/page.tsx').includes('fetch("/api/referrals/claim"'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.ok || !c.detail ? '' : ` (${c.detail})`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
