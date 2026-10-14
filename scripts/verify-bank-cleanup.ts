/**
 * Disconnecting idle free banks and extra banks after Pro ends.
 *
 * Run: npm run test:bank-cleanup
 */
import assert from "node:assert/strict";
import { planBankCleanup, type CleanupUser } from "../lib/bank-cleanup.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const now = new Date("2026-10-14T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const item = (id: string, user_id: string, age: number) => ({ id, user_id, created_at: daysAgo(age) });
const users = (u: Record<string, CleanupUser>) => new Map(Object.entries(u));
const free = (lastActive: number, proEnded: number | null = null): CleanupUser =>
  ({ pro: false, lastActiveAt: daysAgo(lastActive), proEndedAt: proEnded == null ? null : daysAgo(proEnded) });

ok("Pro keeps every bank, however idle", () => {
  const plan = planBankCleanup([item("a", "u", 90), item("b", "u", 10)], users({ u: { pro: true, lastActiveAt: daysAgo(200), proEndedAt: null } }), now);
  assert.deepEqual(plan, []);
});
ok("an active free account keeps its one bank", () => {
  assert.deepEqual(planBankCleanup([item("a", "u", 90)], users({ u: free(2) }), now), []);
});
ok("a free account idle 30 days loses every bank", () => {
  assert.deepEqual(planBankCleanup([item("a", "u", 90)], users({ u: free(31) }), now), ["a"]);
  assert.deepEqual(planBankCleanup([item("a", "u", 90)], users({ u: free(29) }), now), []);
});
ok("after Pro ends, extra banks wait out the 7-day grace, then the first connected stays", () => {
  const items = [item("late", "u", 5), item("first", "u", 60), item("mid", "u", 20)];
  assert.deepEqual(planBankCleanup(items, users({ u: free(1, 3) }), now), [], "still in the grace period");
  assert.deepEqual(planBankCleanup(items, users({ u: free(1, 8) }), now).sort(), ["late", "mid"]);
});
ok("a user with no account row is left alone", () => {
  assert.deepEqual(planBankCleanup([item("a", "ghost", 90)], users({}), now), []);
});

console.log(`Bank cleanup ok: ${n} checks.`);
