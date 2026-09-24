#!/usr/bin/env node
/**
 * Every Supabase write is actually sent.
 *
 * A postgrest-js query builder sends its request only when it is awaited or
 * .then()'d. A bare statement, or one prefixed with `void`, builds the request
 * and drops it without an error. Three writes shipped that way: the custom
 * category sync (categories never reached the account, and a deleted one came
 * back on refocus), undo of a just-added transaction (the row returned on
 * reload), and the onboarding currency (never saved to the profile).
 *
 * This scans app/ and lib/ for expression statements whose call chain starts
 * at .from( or .rpc(, includes a write (upsert, insert, update, delete, rpc),
 * and whose outermost call is not .then/.catch/.finally. An awaited or
 * returned builder is not an expression statement, so it is never flagged.
 *
 * Run: npm run test:supabase-writes-execute
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const WRITES = new Set(['upsert', 'insert', 'update', 'delete', 'rpc']);
const SETTLED = new Set(['then', 'catch', 'finally']);

/** The method names along a call chain, outermost first. */
function chainMethods(expr) {
  const names = [];
  let node = expr;
  while (node) {
    if (ts.isCallExpression(node)) node = node.expression;
    else if (ts.isPropertyAccessExpression(node)) { names.push(node.name.text); node = node.expression; }
    else if (ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)) node = node.expression;
    else break;
  }
  return names;
}

export function findUnsentWrites(source, fileName = 'input.tsx') {
  const kind = fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const visit = (node) => {
    if (ts.isExpressionStatement(node)) {
      let expr = node.expression;
      if (ts.isVoidExpression(expr)) expr = expr.expression;
      if (ts.isCallExpression(expr)) {
        const methods = chainMethods(expr);
        const text = expr.getText(sf);
        const isQuery = methods.includes('from') || methods.includes('rpc');
        // Storage calls (supabase.storage.from(bucket).update/remove) return
        // promises that run eagerly; they are not query builders.
        const isStorage = methods.includes('storage');
        if (isQuery && !isStorage && methods.some((m) => WRITES.has(m)) && !SETTLED.has(methods[0])) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          found.push({ line: line + 1, text: text.replace(/\s+/g, ' ').slice(0, 100) });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

// ── Self-test, so the scan cannot pass by finding nothing at all
const SAMPLE = `
async function f(supabase, id) {
  supabase.from("expenses").delete().eq("id", id);                 // unsent
  void supabase.from("profiles").upsert({ a: 1 }, { onConflict: "user_id" }); // unsent
  supabase.rpc("household_has_pro");                               // unsent
  await supabase.from("expenses").delete().eq("id", id);           // sent
  supabase.from("expenses").insert({}).then(() => {});             // sent
  supabase.from("expenses").update({}).eq("id", id).catch(() => {}); // sent
  const q = supabase.from("expenses").delete().eq("id", id); await q; // sent
  supabase.from("expenses").select("*").eq("id", id);              // a read, not in scope
  supabase.storage.from("bucket").remove(["x"]);                   // storage runs eagerly
  return supabase.from("expenses").upsert({});                     // caller awaits
}`;
const selfTest = findUnsentWrites(SAMPLE).map((f) => f.line);
const expectedLines = [3, 4, 5];
const checks = [];
checks.push({
  name: 'the scan flags bare and void writes and nothing that is awaited, settled, returned, a read or storage',
  ok: JSON.stringify(selfTest) === JSON.stringify(expectedLines),
  detail: `flagged lines ${selfTest.join(', ') || 'none'}, expected ${expectedLines.join(', ')}`,
});

// ── The codebase
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
};
['app', 'lib'].forEach(walk);
const unsent = files.flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  if (!/\.(from|rpc)\(/.test(source)) return [];
  return findUnsentWrites(source, file).map((f) => `${file}:${f.line}  ${f.text}`);
});
checks.push({
  name: `every Supabase write in app/ and lib/ is awaited or settled (${files.length} files scanned)`,
  ok: unsent.length === 0,
  detail: unsent.length ? `\n    ${unsent.join('\n    ')}` : '',
});

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nSupabase write verification failed: ${failed} check(s).` : '\nSupabase write verification passed');
process.exit(failed ? 1 : 0);
