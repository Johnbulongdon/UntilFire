import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the one invariant the household peer-read policies depend on.
 *
 * `supabase/migrations/0016_household_accounts.sql` widens each SELECT policy
 * on the financial tables to `auth.uid() = user_id OR is_household_peer(...)`.
 * That changes what a query *may* return, so any client-side read that does
 * not also filter `user_id` itself would begin returning a partner's rows —
 * with no code change and nothing in the diff to notice.
 *
 * Server routes are exempt: they use the service-role client, which bypasses
 * RLS entirely, and the admin/cron routes read across users deliberately.
 *
 * See docs/design/family-accounts.md.
 */

// Tables 0016 grants peer SELECT on.
const WIDENED = new Set([
  'profiles',
  'scenarios',
  'scenario_assumptions',
  'expenses',
  'plaid_accounts',
  'goals',
  'net_worth_snapshots',
  'user_budget',
  'expected_payments',
]);

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/node_modules|\.next/.test(full)) walk(full);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(full);
    }
  }
}
['app', 'components', 'lib'].forEach(walk);

const offenders = [];
for (const file of files) {
  if (file.startsWith(`app${path.sep}api${path.sep}`)) continue; // service-role
  const src = fs.readFileSync(file, 'utf8');
  const re = /\.from\(\s*["']([a-z_]+)["']\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const table = m[1];
    if (!WIDENED.has(table)) continue;
    // Look at the chain that follows, up to a statement terminator.
    const tail = src.slice(m.index, m.index + 900);
    const stop = tail.search(/;\s*\n|\.then\(|\n\s*\n/);
    const chain = stop > 0 ? tail.slice(0, stop) : tail;
    if (/\.(insert|update|upsert|delete)\(/.test(chain)) continue; // writes keep owner-only policies
    if (/eq\(\s*["']user_id["']/.test(chain)) continue;
    offenders.push(`${file}:${src.slice(0, m.index).split('\n').length}  ${table}`);
  }
}

if (offenders.length) {
  throw new Error(
    `Client-side reads scoped only by RLS on tables the household migration widens:\n  ${offenders.join('\n  ')}\n\n` +
      `Add .eq("user_id", <the signed-in id>) to each. Once 0016 is applied these would silently return a partner's rows.`,
  );
}

console.log(`Household RLS safety ok: ${files.length} files scanned, 0 reads rely on RLS alone.`);
