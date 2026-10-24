/**
 * Suggestions from history: the same merchant filed the same way again.
 *
 * Run: npm run test:merchant-memory
 */
import assert from "node:assert/strict";
import { buildMerchantMemory, merchantKey, suggestFromHistory, type HistoryTx } from "../lib/merchant-memory.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const tx = (id: string, description: string, category: string, sub: string | null, tags: string[], date = "2026-08-01"): HistoryTx =>
  ({ id, description, category, sub_category: sub, tags, date, transaction_type: "expense" });

ok("reference numbers and punctuation do not split a merchant", () => {
  assert.equal(merchantKey("SQ *BLUE BOTTLE 0423"), merchantKey("SQ *Blue Bottle 1187"));
  assert.equal(merchantKey("Amazon Mktp US*2K4AB"), merchantKey("AMAZON MKTP US*9ZZ1Q"));
});
ok("Chinese merchant names are kept and matched", () => {
  assert.equal(merchantKey("中国移动"), "中国移动");
  assert.equal(merchantKey("美团(2026)"), merchantKey("美团"));
});

const history = [
  tx("1", "美团", "food", "Takeout & Delivery", ["want"], "2026-07-03"),
  tx("2", "美团", "food", "Takeout & Delivery", ["want"], "2026-08-03"),
  tx("3", "中国移动", "utilities", "Phone", ["need"]),
  tx("4", "Unknown shop", "other", null, []),
  tx("5", "Gym", "personal_care", "Wellness", [], "2026-06-01"),
  tx("6", "Gym", "entertainment", "Sports", [], "2026-08-01"),
];
const memory = buildMerchantMemory(history);

ok("a repeat merchant gets its category, sub-category and need/want", () => {
  const s = suggestFromHistory(tx("x", "美团", "other", null, []), memory);
  assert.deepEqual(s, { category: "food", sub_category: "Takeout & Delivery", classification: "want", seen: 2 });
});
ok("need/want comes along when it was tagged", () => {
  assert.equal(suggestFromHistory(tx("x", "中国移动", "other", null, []), memory)?.classification, "need");
});
ok("unfiled history ('other', untagged) teaches nothing", () => {
  assert.equal(suggestFromHistory(tx("x", "Unknown shop", "other", null, []), memory), null);
});
ok("a tie goes to the most recent choice", () => {
  assert.equal(suggestFromHistory(tx("x", "GYM", "other", null, []), memory)?.category, "entertainment");
});
ok("a new merchant has no suggestion", () => {
  assert.equal(suggestFromHistory(tx("x", "Brand new place", "other", null, []), memory), null);
});
ok("income is not learned as spending", () => {
  const m = buildMerchantMemory([{ ...tx("i", "Payroll", "salary", null, []), transaction_type: "income" }]);
  assert.equal(m.size, 0);
});

console.log(`Merchant memory ok: ${n} checks.`);
