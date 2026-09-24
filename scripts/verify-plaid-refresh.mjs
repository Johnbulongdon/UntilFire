#!/usr/bin/env node
/**
 * Connected banks: the daily refresh, and the holdings request.
 *
 * Balances used to move only when someone pressed Sync, so every figure built
 * on them was as old as the last press. And the holdings request went to
 * every connection, so a bank with no investments showed "Reconnect to enable
 * holdings data" on every visit to Net Worth.
 *
 * Run: npm run test:plaid-refresh
 */
import { readFileSync } from 'node:fs';
import { itemsWithInvestments, holdingsOutcome } from '../lib/plaid-holdings.ts';
import { plaidErrorCode, plaidErrorOutcome, summariseRefresh } from '../lib/plaid-errors.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

// ── Which connections are asked for holdings
const accounts = [
  { plaid_item_id: 'bank', type: 'depository' }, { plaid_item_id: 'bank', type: 'depository' },
  { plaid_item_id: 'broker', type: 'investment' },
  { plaid_item_id: 'wallet', type: 'investment' }, { plaid_item_id: 'wallet', type: 'depository' },
  { plaid_item_id: null, type: 'investment' },
];
const asked = itemsWithInvestments(accounts);
check('a connection with only bank accounts is not asked for holdings', !asked.has('bank'));
check('a connection with an investment account is asked', asked.has('broker') && asked.has('wallet'));
check('an account with no connection id asks nothing', asked.size === 2);

// ── What a refusal means
check('missing investments consent means reconnect', holdingsOutcome('ADDITIONAL_CONSENT_REQUIRED') === 'reconnect');
check('a bank asking to log in again means reconnect', plaidErrorOutcome('ITEM_LOGIN_REQUIRED') === 'reconnect');
check('data not ready yet, or not offered, says nothing to the user',
  ['PRODUCT_NOT_READY', 'PRODUCTS_NOT_SUPPORTED', 'NO_INVESTMENT_ACCOUNTS'].every((c) => plaidErrorOutcome(c) === 'quiet'));
check('an unknown failure is ours to look at, not the user\'s to reconnect',
  plaidErrorOutcome('INTERNAL_SERVER_ERROR') === 'unexpected' && plaidErrorOutcome(undefined) === 'unexpected');
check('the error code is read from a Plaid SDK error',
  plaidErrorCode({ response: { data: { error_code: 'ITEM_LOGIN_REQUIRED' } } }) === 'ITEM_LOGIN_REQUIRED' &&
  plaidErrorCode(new Error('network')) === undefined);

// ── A night's run, as job_runs will read it
{
  const allOk = summariseRefresh([{ institution: 'Bank A', ok: true }, { institution: 'Broker', ok: true }]);
  check('every connection refreshed: ok, with nothing to say', allOk.status === 'ok' && allOk.acted === 2 && allOk.considered === 2 && !allOk.error);
  const owner = summariseRefresh([{ institution: 'Bank A', ok: true }, { institution: 'Bank B', ok: false, errorCode: 'ITEM_LOGIN_REQUIRED' }]);
  check('a connection waiting for its owner to log in is listed but does not fail the job',
    owner.status === 'ok' && owner.acted === 1 && /waiting on the owner: Bank B \(ITEM_LOGIN_REQUIRED\)/.test(owner.error), owner.error);
  const broken = summariseRefresh([{ institution: 'Bank A', ok: false, errorCode: 'INTERNAL_SERVER_ERROR' }, { institution: 'Bank B', ok: false }]);
  check('an unexpected failure fails the job and names it',
    broken.status === 'error' && /failed: Bank A \(INTERNAL_SERVER_ERROR\), Bank B \(no code\)/.test(broken.error), broken.error);
  check('no connections is an ok run of zero', summariseRefresh([]).status === 'ok' && summariseRefresh([]).considered === 0);
}

// ── Wiring
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const cron = vercel.crons?.find((c) => c.path === '/api/cron/plaid-sync');
check('the refresh is scheduled daily, before the retention email reads anything',
  !!cron && /^\d+ \d+ \* \* \*$/.test(cron.schedule) &&
  Number(cron.schedule.split(' ')[1]) < Number(vercel.crons.find((c) => c.path === '/api/email/retention').schedule.split(' ')[1]),
  cron?.schedule);
const cronSrc = readFileSync('app/api/cron/plaid-sync/route.ts', 'utf8');
check('the refresh refuses a request without the cron secret',
  /secret !== process\.env\.CRON_SECRET/.test(cronSrc) && /status: 401/.test(cronSrc));
check('the refresh is recorded in job_runs', /startJobRun\(admin, JOBS\.PLAID_SYNC\)/.test(cronSrc) && /finishJobRun\(/.test(cronSrc));
const syncSrc = readFileSync('app/api/plaid/sync/route.ts', 'utf8');
check('the Sync button and the daily refresh share one implementation',
  /syncPlaidItem\(/.test(syncSrc) && /syncPlaidItem\(/.test(cronSrc) && !/transactionsSync/.test(syncSrc) && !/transactionsSync/.test(cronSrc));
const holdingsSrc = readFileSync('app/api/plaid/holdings/route.ts', 'utf8');
check('holdings are requested only for connections with an investment account',
  /itemsWithInvestments\(/.test(holdingsSrc) && /investing\.has\(i\.id\)/.test(holdingsSrc));
const lifecycle = readFileSync('lib/lifecycle.ts', 'utf8');
check('the admin page expects the refresh daily',
  /PLAID_SYNC: "plaid_sync"/.test(lifecycle) && /\[JOBS\.PLAID_SYNC\]: 24,/.test(lifecycle));

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nPlaid refresh verification failed: ${failed} check(s).` : '\nPlaid refresh verification passed');
process.exit(failed ? 1 : 0);
