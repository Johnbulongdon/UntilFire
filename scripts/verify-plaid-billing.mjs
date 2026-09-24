#!/usr/bin/env node
/**
 * What keeps a bank connection billing at Plaid.
 *
 * Plaid bills Transactions and Investments monthly for as long as it has the
 * connection. Two ways that went wrong: deleting an account cascaded away the
 * access tokens without removing the connections at Plaid, which left them
 * billing with no way to stop them; and every new connection asked for
 * Investments, which charged its fee on bank-only connections and hid banks
 * that don't offer it.
 *
 * Run: npm run test:plaid-billing
 */
import { readFileSync } from 'node:fs';
import { removePlaidItems, listInstitutions } from '../lib/plaid-remove.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

const plaidError = (code) => Object.assign(new Error(code), { response: { data: { error_code: code } } });
const fakePlaid = (outcomes) => {
  const calls = [];
  return {
    calls,
    async itemRemove({ access_token }) {
      calls.push(access_token);
      const outcome = outcomes[access_token];
      if (outcome instanceof Error) throw outcome;
      return { data: {} };
    },
  };
};
const item = (id, institution) => ({ id, plaid_access_token: `tok-${id}`, institution_name: institution });

// ── Removing connections
{
  const plaid = fakePlaid({});
  const r = await removePlaidItems(plaid, [item('a', 'Bank A'), item('b', 'Bank B')]);
  check('every connection is removed at Plaid', plaid.calls.length === 2 && r.removed.join() === 'a,b' && r.failed.length === 0);
}
{
  const r = await removePlaidItems(fakePlaid({ 'tok-a': plaidError('ITEM_NOT_FOUND'), 'tok-b': plaidError('INVALID_ACCESS_TOKEN') }),
    [item('a', 'Bank A'), item('b', 'Bank B')]);
  check('a connection Plaid no longer has counts as removed', r.removed.join() === 'a,b' && r.failed.length === 0);
}
{
  const r = await removePlaidItems(fakePlaid({ 'tok-b': plaidError('INTERNAL_SERVER_ERROR'), 'tok-c': new Error('network') }),
    [item('a', 'Bank A'), item('b', 'Bank B'), item('c', null)]);
  check('a refused removal is reported, not treated as done',
    r.removed.join() === 'a' && r.failed.length === 2 &&
    r.failed[0].institution === 'Bank B' && r.failed[0].errorCode === 'INTERNAL_SERVER_ERROR' &&
    r.failed[1].institution === 'a bank' && r.failed[1].errorCode === undefined,
    JSON.stringify(r));
}
check('failures are named in plain English',
  listInstitutions(['Chase']) === 'Chase' && listInstitutions(['Chase', 'Wise']) === 'Chase and Wise' &&
  listInstitutions(['Chase', 'Wise', 'Fidelity']) === 'Chase, Wise and Fidelity');

// ── Wiring: nothing deletes the access token before Plaid lets go
const before = (src, first, second) => src.indexOf(first) !== -1 && src.indexOf(second) !== -1 && src.indexOf(first) < src.indexOf(second);
for (const [label, path] of [['deleting your own account', 'app/api/user/delete/route.ts'], ['deleting a user from admin', 'app/api/admin/users/[id]/route.ts']]) {
  const src = readFileSync(path, 'utf8');
  check(`${label} disconnects every bank before deleting the user`,
    before(src, 'disconnectAllForUser(', 'deleteUser(') && /failed\.length > 0[\s\S]{0,400}status: 502/.test(src));
}
const removeSrc = readFileSync('lib/plaid-remove.ts', 'utf8');
check('only connections Plaid confirmed gone lose their row',
  /\.delete\(\)\.in\("id", removed\)/.test(removeSrc));
const disconnectSrc = readFileSync('app/api/plaid/disconnect/route.ts', 'utf8');
check('disconnect keeps the connection when Plaid refuses to remove it',
  before(disconnectSrc, 'removePlaidItems(', '.from("plaid_items").delete()') &&
  /status: 502/.test(disconnectSrc) && !/proceeding anyway/.test(disconnectSrc));
const connectUi = readFileSync('app/dashboard/PlaidConnect.tsx', 'utf8');
const handleDisconnect = connectUi.slice(connectUi.indexOf('const handleDisconnect'), connectUi.indexOf('const btnStyle'));
check('a refused disconnect stays listed and says why',
  handleDisconnect.length > 0 &&
  before(handleDisconnect, 'if (!res.ok)', 'setItems(') &&
  /if \(!res\.ok\)[\s\S]{0,200}setError\([\s\S]{0,120}return;/.test(handleDisconnect));

// ── What a new connection asks for
const linkSrc = readFileSync('app/api/plaid/create-link-token/route.ts', 'utf8');
const products = linkSrc.match(/products:\s*\[([^\]]*)\]/)?.[1] ?? '';
check('a new connection requires Transactions only', /Products\.Transactions/.test(products) && !/Investments/.test(products), products);
check('Investments is used only where the person picks an investment account',
  /required_if_supported_products:\s*\[Products\.Investments\]/.test(linkSrc));

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail && !c.ok ? `  — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nPlaid billing verification failed: ${failed} check(s).` : '\nPlaid billing verification passed');
process.exit(failed ? 1 : 0);
