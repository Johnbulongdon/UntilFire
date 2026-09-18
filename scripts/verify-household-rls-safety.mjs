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
 * Service-role code is exempt, and the exemption is by what a file actually
 * does rather than where it lives: a module that builds its client from
 * lib/supabase-admin bypasses RLS altogether, so the premise here — that RLS
 * is the only thing scoping the read — is simply false for it. Route handlers
 * under app/api and the household helpers in lib/household.ts both qualify,
 * and both read across members on purpose.
 *
 * A file that imports BOTH clients is not exempt: its browser-side reads still
 * depend on RLS, and that is exactly the mix worth catching.
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
  const src = fs.readFileSync(file, 'utf8');
  // The browser client is the only one RLS applies to. A file that never
  // imports it is reading through the service role, where RLS is bypassed and
  // this guard's premise does not hold — route handlers and server-side
  // helpers both land here, and both read across members deliberately.
  if (!/from ['"]@\/lib\/supabase['"]/.test(src)) continue;
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
