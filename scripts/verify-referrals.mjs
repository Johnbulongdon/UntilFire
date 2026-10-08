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
  accountYoungEnoughToClaim, REFERRAL_MIN_PAYOUT_CENTS, formatCents, rateForPayment, readyToPay,
} from '../lib/referrals.ts';
import { claimReferral, recordReferralCommission, reverseReferralCommission, applyPendingCredits, friendLinkFor } from '../lib/referrals-server.ts';
import { FRIEND_CREDIT_CENTS, friendCode, firstYearEstimateCents } from '../lib/referrals.ts';
import { PRO_MONTHLY_USD } from '../lib/pricing.ts';
import { freedomPath, quickFreedom } from '../lib/quick-freedom.ts';
import { yearsToTarget } from '../lib/fire/strategies/traditional.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const day = 86_400_000;

// ── Rules
check('codes: lowercase, digits, single hyphens, 3–24', normaliseCode(' Jane-Saves ') === 'jane-saves' && normaliseCode('ab') === null && normaliseCode('a--b') === null && normaliseCode('-abc') === null && normaliseCode('x'.repeat(25)) === null && normaliseCode('a'.repeat(24)) === 'a'.repeat(24));
check('invite estimate: 9 yearly readers at 30%, the 10th at 40%', firstYearEstimateCents(9, 7900) === 9 * 2370 && firstYearEstimateCents(10, 7900) === 9 * 2370 + 3160 && firstYearEstimateCents(0, 7900) === 0);
check('codes: reserved words refused', normaliseCode('admin') === null && normaliseCode('untilfire') === null);
check('codes: nothing that reads as UntilFire or its staff', ['untilfire-official', 'until-fire', 'official-deals', 'untilfire2', 'support-team', 'staffpicks', 'admin-jane', 'removed-abc'].every((c) => normaliseCode(c) === null) && normaliseCode('jane-saves') === 'jane-saves');
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
check('rate: 30% in year one, 40% from the 10th paying customer, 10% after year one',
  rateForPayment({ baseRateBps: 3000, inFirstYear: true, payingCustomers: 9 }) === 3000 &&
  rateForPayment({ baseRateBps: 3000, inFirstYear: true, payingCustomers: 10 }) === 4000 &&
  rateForPayment({ baseRateBps: 3000, inFirstYear: false, payingCustomers: 50 }) === 1000);
check('first payout at any amount; later ones from $20', readyToPay(270, false) && !readyToPay(270, true) && readyToPay(2000, true) && !readyToPay(0, false));
check('money reads as $23.70 and $20', formatCents(2370) === '$23.70' && formatCents(2000) === '$20' && formatCents(270) === '$2.70');
check('only new accounts can be claimed', accountYoungEnoughToClaim(new Date(Date.now() - 2 * day).toISOString()) && !accountYoungEnoughToClaim(new Date(Date.now() - 30 * day).toISOString()));

// ── Money paths against an in-memory Supabase
function fakeDb(tables) {
  const unique = { referral_attributions: 'referred_user_id', referral_commissions: 'stripe_invoice_id', referral_credits: 'referred_user_id', referral_partners: 'user_id' };
  let nextId = 0;
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
          const defaults = { referral_commissions: { status: 'pending' }, referral_credits: { status: 'pending' }, referral_partners: { status: 'active', kind: 'creator' } };
          const row = { id: `id${++nextId}`, ...(defaults[name] ?? {}), ...payload };
          rows.push(row);
          return { data: [row], error: null };
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
        single() { return q.maybeSingle(); },
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
  check('after 12 months of paying, 10% for as long as they pay', (await recordReferralCommission(db, inv('in_late', 900, paidAt + 400 * 86400))) === 'recorded' && db.tables.referral_commissions.at(-1).commission_cents === 90 && db.tables.referral_commissions.at(-1).rate_bps === 1000);
  check('an unreferred customer earns no one anything', (await recordReferralCommission(db, { ...inv('in_x', 900), customer: 'cus_unknown' })) === 'unknown-customer');

  // The 40% tier: nine other paying customers, then a tenth pays.
  for (let i = 0; i < 9; i++) {
    db.tables.subscriptions.push({ user_id: `r${i}`, stripe_customer_id: `cus_r${i}` });
    db.tables.referral_attributions.push({ referred_user_id: `r${i}`, partner_id: 'p1', rate_bps: 3000 });
    await recordReferralCommission(db, { ...inv(`in_r${i}`, 900), customer: `cus_r${i}` });
  }
  const tenth = db.tables.referral_commissions.filter((c) => c.referred_user_id === 'r8').at(-1);
  const ninth = db.tables.referral_commissions.filter((c) => c.referred_user_id === 'r7').at(-1);
  check('the 10th paying customer earns 40%, the 9th 30%', tenth.rate_bps === 4000 && tenth.commission_cents === 360 && ninth.rate_bps === 3000, `${ninth.rate_bps} ${tenth.rate_bps}`);

  // Removed for breaking the terms: an existing customer paying earns nothing more.
  db.tables.referral_partners.push({ id: 'p3', user_id: 'faker', code: 'removed-p3', status: 'removed', kind: 'creator', rate_bps: 3000, months: 12 });
  db.tables.subscriptions.push({ user_id: 'fooled', stripe_customer_id: 'cus_fooled' });
  db.tables.referral_attributions.push({ referred_user_id: 'fooled', partner_id: 'p3', rate_bps: 3000 });
  check('a removed creator earns nothing more', (await recordReferralCommission(db, { ...inv('in_fooled', 900), customer: 'cus_fooled' })) === 'partner-removed');

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
const checkout = read('app/api/stripe/checkout/route.ts');
check('referred readers get the 60-day trial at checkout', checkout.includes('if (referred) trialDays = REFERRED_TRIAL_DAYS;') && checkout.includes('trial_period_days: trialDays'));
check('the upgrade screen names the referred trial', read('app/dashboard/page.tsx').includes('trialLabel={referredTrial ? REFERRED_TRIAL_LABEL : TRIAL_LABEL}'));
check('a creator sees in-trial counts, never ids', me.includes('inTrial,') && !me.includes('referredIds,'));
check('the dashboard claims after first sign-in', read('app/dashboard/page.tsx').includes('fetch("/api/referrals/claim"'));

// ── Give a month, get a month (item 4)
check('a free month is the monthly price', FRIEND_CREDIT_CENTS === PRO_MONTHLY_USD * 100);
{
  let n = 0;
  const codes = new Set(Array.from({ length: 200 }, () => friendCode(() => ((n = (n * 9301 + 49297) % 233280) / 233280))));
  check('friend codes: f- and eight readable characters, and they pass the code rules', [...codes].every((c) => /^f-[a-hj-km-np-z2-9]{8}$/.test(c) && normaliseCode(c) === c) && codes.size > 150);
}
{
  const credits = [];
  const stripe = { customers: { createBalanceTransaction: async (customer, body, opts) => { credits.push({ customer, ...body, key: opts?.idempotencyKey }); return { id: `cbtxn_${credits.length}` }; } } };
  const db = fakeDb({ referral_partners: [], subscriptions: [{ user_id: 'friend-a', stripe_customer_id: 'cus_a' }, { user_id: 'newbie', stripe_customer_id: 'cus_n' }] });
  const link = await friendLinkFor(db, 'sharer');
  check('a user gets a friend link on first ask, and the same one after', link?.kind === 'friend' && (await friendLinkFor(db, 'sharer'))?.code === link.code && db.tables.referral_partners.length === 1);
  const fresh = new Date(Date.now() - 86400000).toISOString();
  check('a new account can be claimed by a friend link', (await claimReferral(db, { id: 'newbie', created_at: fresh }, link.code)) === 'claimed');
  const inv = { id: 'in_f1', customer: 'cus_n', amount_paid: 900, total_taxes: [], status_transitions: { paid_at: Math.floor(Date.now() / 1000) } };
  check('the friend paying earns a credit, not cash; saved until the sharer has a customer', (await recordReferralCommission(db, inv, stripe)) === 'credit-pending' && !db.tables.referral_commissions?.length && credits.length === 0);
  check('a retried webhook, or the friend paying again, earns nothing more', (await recordReferralCommission(db, { ...inv, id: 'in_f2' }, stripe)) === 'duplicate' && db.tables.referral_credits.length === 1);
  check('at the sharer\'s checkout the saved month comes off: -$9, once', (await applyPendingCredits(stripe, db, 'sharer', 'cus_s')) === 1 && credits.length === 1 && credits[0].amount === -900 && credits[0].customer === 'cus_s' && credits[0].key.startsWith('uf-referral-credit-') && db.tables.referral_credits[0].status === 'applied');
  check('nothing pending twice', (await applyPendingCredits(stripe, db, 'sharer', 'cus_s')) === 0 && credits.length === 1);
}
const meRoute = read('app/api/referrals/me/route.ts');
check('a friend link is not the creator program, and joining upgrades it in place', meRoute.includes('partner.kind !== "creator"') && meRoute.includes('.update(creator).eq("id", friendRow.id)'));
check('the admin creator list leaves friend links out', read('app/api/admin/referrals/route.ts').includes('.eq("kind", "creator")'));
check('checkout applies saved free months', read('app/api/stripe/checkout/route.ts').includes('applyPendingCredits(stripe, supabaseAdmin, user.id, customerId)'));
check('friend credits are private, like the rest', read('supabase/migrations/0044_friend_referrals.sql').includes('ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;') && !/CREATE POLICY/i.test(read('supabase/migrations/0044_friend_referrals.sql')));

// ── The embeddable calculator (item 3)
{
  const now = new Date('2026-09-27T00:00:00Z');
  const r = quickFreedom({ monthlyIncome: 5000, monthlySpending: 3000, invested: 25000 }, now);
  const years = yearsToTarget(25000, 24000, 900000);
  check('embed: 25× spending, the shared projection, the year rounded like the free result (D-37)', r.target === 900000 && Math.abs(r.years - years) < 1e-9 && r.year === 2026 + Math.floor(years) && Math.round(r.savingsRate * 100) === 40, JSON.stringify(r));
  check('embed: spending above income never reaches it', quickFreedom({ monthlyIncome: 2000, monthlySpending: 3000, invested: 0 }, now).year === null);
  check('embed: already there is year zero', quickFreedom({ monthlyIncome: 5000, monthlySpending: 1000, invested: 400000 }, now).years === 0);
  const path = freedomPath({ monthlyIncome: 5000, monthlySpending: 3000, invested: 25000 });
  check('embed: the curve ends on the freedom year, at the target', path.length - 1 === Math.ceil(years) && path[path.length - 1] >= 900000 && path[path.length - 2] < 900000, path.length);
  check('embed: a curve that never arrives stops at 65 years', freedomPath({ monthlyIncome: 2000, monthlySpending: 3000, invested: 0 }).length === 66);
}
const mw = read('middleware.ts');
{
  const joinRoute = read('app/api/referrals/me/route.ts');
  check('a held code only goes to the email it is held for, then frees itself', joinRoute.includes('from("referral_code_holds")') && joinRoute.includes('hold.email !== (user.email ?? "").toLowerCase()') && joinRoute.includes('if (hold) await admin.from("referral_code_holds").delete()'));
  const founderRoute = read('app/api/admin/referrals/route.ts');
  check('removing a creator frees the code and forfeits unpaid earnings', founderRoute.includes('code: `removed-${id.slice(0, 8)}`') && founderRoute.includes('creator removed for breaking the terms') && founderRoute.includes('.neq("status", "removed")'));
  const holdsSql = read('supabase/migrations/0045_referral_removal_and_holds.sql');
  check('code holds are service-role only', holdsSql.includes('ALTER TABLE referral_code_holds ENABLE ROW LEVEL SECURITY;') && !/CREATE POLICY/i.test(holdsSql));
}
check('only /embed/ can be framed; everything else stays DENY', mw.includes('pathname.startsWith("/embed/")') && mw.includes('"frame-ancestors *"') && mw.includes('"X-Frame-Options", "DENY"'));
check('no logo splash inside an embed', read('app/layout.tsx').includes("location.pathname.indexOf('/embed/')===0"));
const embed = read('app/embed/[code]/EmbedCalculator.tsx');
check('every link out of the embed goes through the creator link', embed.includes('`https://www.untilfire.com/r/${code}`') && !/href="https:\/\/www\.untilfire\.com\/(?!r\/)/.test(embed));
const invite = read('app/invite/CreatorArea.tsx');
check('the snippet links back through /r/ in plain HTML', invite.includes('<a href="https://www.untilfire.com/r/${code}">'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.ok || !c.detail ? '' : ` (${c.detail})`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
