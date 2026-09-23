#!/usr/bin/env node
/**
 * Applying need/want rules to untagged transactions.
 *
 * The failure this exists to prevent is silent: a transaction that should be
 * a need arrives untagged, the needs total reads low, the emergency fund
 * target shrinks, and the contribution ladder sends money past a buffer it
 * believes is nearly full. Most of the checks below are about when NOT to
 * act — overwriting someone's own tag would be the worse bug.
 *
 * Run: npm run test:classification-rules
 */
import { ruleKey, indexRules, tagFor, planTagging } from "../lib/classification-rules.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });

const RULES = [
  { category: "Food", sub_category: "Groceries", classification: "need" },
  { category: "Food", sub_category: "Restaurants", classification: "want" },
  { category: "Housing", sub_category: "Rent", classification: "need" },
];
const index = indexRules(RULES);
const tx = (over = {}) => ({ id: "t1", category: "Food", sub_category: "Groceries", tags: [], transaction_type: "expense", ...over });

// ── When it acts
check("an untagged transaction matching a rule is tagged", tagFor(tx(), index) === "need");
check("a want rule tags a want", tagFor(tx({ sub_category: "Restaurants" }), index) === "want");
check("tags are null rather than empty, which is how some rows are stored",
  tagFor(tx({ tags: null }), index) === "need");
check("capitalisation does not matter — Plaid's is not stable",
  tagFor(tx({ category: "food", sub_category: "GROCERIES" }), index) === "need" &&
  tagFor(tx({ category: " Food ", sub_category: "groceries " }), index) === "need");

// ── When it must not act
check("a transaction the user already tagged is left alone",
  tagFor(tx({ tags: ["want"] }), index) === null,
  "a rule must never overrule the person");
check("even when the user's tag agrees, nothing is rewritten",
  tagFor(tx({ tags: ["need"] }), index) === null);
check("a transaction tagged something else entirely is still taggable",
  tagFor(tx({ tags: ["work"] }), index) === "need",
  "work is not an answer to need-or-want, so the gap is still a gap");
check("income is never need or want", tagFor(tx({ transaction_type: "income" }), index) === null);
check("no matching rule means no tag",
  tagFor(tx({ sub_category: "Coffee" }), index) === null &&
  tagFor(tx({ category: "Transport" }), index) === null);
check("a transaction with no sub-category matches nothing",
  tagFor(tx({ sub_category: null }), index) === null &&
  tagFor(tx({ category: null }), index) === null);
check("a rule with a nonsense classification is ignored",
  indexRules([{ category: "Food", sub_category: "Groceries", classification: "maybe" }]).size === 0);

// ── The batch
{
  const rows = [
    tx({ id: "a" }),                                        // tagged need
    tx({ id: "b", sub_category: "Restaurants" }),           // tagged want
    tx({ id: "c", tags: ["want"] }),                        // left alone
    tx({ id: "d", sub_category: "Coffee" }),                // no rule
    tx({ id: "e", transaction_type: "income" }),            // income
    tx({ id: "f", tags: ["work"] }),                        // gap still filled
  ];
  const updates = planTagging(rows, RULES);
  check("only the rows that need writing are written",
    updates.map((u) => u.id).join(",") === "a,b,f", updates.map((u) => u.id).join(","));
  check("an existing tag is kept alongside the new one",
    updates.find((u) => u.id === "f").tags.join(",") === "work,need",
    updates.find((u) => u.id === "f").tags.join(","));

  // Running it twice must do nothing the second time, because it runs on
  // every sync over the same 36 months.
  const applied = rows.map((r) => {
    const u = updates.find((x) => x.id === r.id);
    return u ? { ...r, tags: u.tags } : r;
  });
  check("a second pass finds nothing left to do", planTagging(applied, RULES).length === 0);
  check("with no rules at all, nothing is read or written", planTagging(rows, []).length === 0);
}

check("the key separates category from sub-category unambiguously",
  ruleKey("a", "b c") !== ruleKey("a b", "c"),
  `${JSON.stringify(ruleKey("a", "b c"))} vs ${JSON.stringify(ruleKey("a b", "c"))}`);

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nClassification rule verification failed: ${failed} check(s).` : "\nClassification rule verification passed");
process.exit(failed ? 1 : 0);
