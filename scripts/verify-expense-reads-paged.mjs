#!/usr/bin/env node
/**
 * Reads of the expenses table get every row, not the first 1,000.
 *
 * PostgREST caps a response at the project's max-rows (1,000 by default) and
 * says nothing. A busy account lost its recent months from the dashboard's
 * history, so last month's needs read as empty and the day-to-day estimate
 * fell back to the budget.
 *
 * Two parts: the paging helper itself, and a scan of app/ and lib/ for any
 * read of "expenses" that neither pages nor bounds itself.
 *
 * Run: npm run test:expense-reads-paged
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { fetchAllPages, PAGE_SIZE } from '../lib/supabase-pages.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

// ── The helper, against a fake table that caps each response like PostgREST
const table = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
async function read(rows, { failAt } = {}) {
  const calls = [];
  const result = await fetchAllPages((from, to) => {
    calls.push([from, to]);
    if (failAt !== undefined && calls.length === failAt) return Promise.resolve({ data: null, error: { message: 'boom' } });
    return Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + PAGE_SIZE)), error: null });
  });
  return { ...result, calls };
}
{
  const r = await read(table(2345));
  check('every row comes back, not just the first page',
    r.data.length === 2345 && r.data[2344].id === 2344, `${r.data.length} rows in ${r.calls.length} requests`);
  check('pages are contiguous and do not overlap',
    JSON.stringify(r.calls) === JSON.stringify([[0, 999], [1000, 1999], [2000, 2999]]));
  const exact = await read(table(2000));
  check('an exact multiple of the page size still ends (one empty page)',
    exact.data.length === 2000 && exact.calls.length === 3);
  const small = await read(table(40));
  check('a small account is still one request', small.data.length === 40 && small.calls.length === 1);
  const failed = await read(table(2345), { failAt: 2 });
  check('a failed page fails the read rather than returning a partial list',
    failed.data === null && failed.error?.message === 'boom');
}

// ── The codebase: no unbounded read of "expenses"
function chain(expr) {
  const calls = [];
  let node = expr;
  while (node) {
    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) calls.push({ name: node.expression.name.text, args: node.arguments });
      node = node.expression;
    } else if (ts.isPropertyAccessExpression(node) || ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node) || ts.isAwaitExpression(node)) {
      node = node.expression;
    } else break;
  }
  return calls;
}
const BOUNDED = new Set(['range', 'limit', 'single', 'maybeSingle']);
const WRITES = new Set(['insert', 'update', 'upsert', 'delete']);
function unboundedReads(source, fileName) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = [];
  const visit = (node) => {
    // Only the outermost call of each chain.
    if (ts.isCallExpression(node) && !(ts.isPropertyAccessExpression(node.parent) && ts.isCallExpression(node.parent.parent))) {
      const calls = chain(node);
      const from = calls.find((c) => c.name === 'from');
      const onExpenses = from && from.args[0] && ts.isStringLiteral(from.args[0]) && from.args[0].text === 'expenses';
      const select = calls.find((c) => c.name === 'select');
      if (onExpenses && select && !calls.some((c) => WRITES.has(c.name)) && !calls.some((c) => BOUNDED.has(c.name))) {
        const headOnly = select.args[1] && /head:\s*true/.test(select.args[1].getText(sf));
        const byId = calls.some((c) => c.name === 'eq' && c.args[0] && ts.isStringLiteral(c.args[0]) && c.args[0].text === 'id');
        if (!headOnly && !byId) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          found.push(`${fileName}:${line + 1}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}
{
  const sample = `
    supabase.from("expenses").select("*").eq("user_id", u);                        // unbounded
    fetchAllPages((f, t) => supabase.from("expenses").select("*").order("id").range(f, t));
    supabase.from("expenses").select("id", { count: "exact", head: true });        // count only
    supabase.from("expenses").insert(row).select().single();                       // a write
    supabase.from("expenses").select("*").eq("id", x);                              // one row
    supabase.from("expected_payments").select("*");                                // another table
  `;
  const hits = unboundedReads(sample, 'sample.ts');
  check('the scan flags an unbounded read and nothing that is paged, counted, written, by id or elsewhere',
    hits.length === 1 && hits[0] === 'sample.ts:2', hits.join(', ') || 'none');
}
const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
};
['app', 'lib'].forEach(walk);
const unbounded = files.flatMap((f) => {
  const src = readFileSync(f, 'utf8');
  return src.includes('"expenses"') || src.includes("'expenses'") ? unboundedReads(src, f) : [];
});
check(`no read of expenses stops at the first page (${files.length} files scanned)`,
  unbounded.length === 0, unbounded.length ? `\n    ${unbounded.join('\n    ')}` : '');

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nExpense read verification failed: ${failed} check(s).` : '\nExpense read verification passed');
process.exit(failed ? 1 : 0);
