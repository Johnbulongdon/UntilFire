/**
 * Plaid's detailed category, made readable — and the ways that can go wrong.
 *
 * Every failure here is silent: a sub-category reading
 * "FOOD_AND_DRINK_COFFEE", or an empty one where Plaid gave a perfectly good
 * answer. Neither throws, and both only show up by looking at a transaction
 * list nobody is looking at yet.
 */
import assert from "node:assert/strict";
import { prettifyPfcDetailed, PLAID_CATEGORY_MAP, PLAID_SKIP_CATEGORIES } from "../lib/plaid-category.ts";

// The prefix the primary already says is dropped.
assert.equal(prettifyPfcDetailed("FOOD_AND_DRINK", "FOOD_AND_DRINK_COFFEE"), "Coffee");
assert.equal(prettifyPfcDetailed("MEDICAL", "MEDICAL_DENTAL_CARE"), "Dental Care");
assert.equal(
  prettifyPfcDetailed("TRANSPORTATION", "TRANSPORTATION_TAXIS_AND_RIDE_SHARES"),
  "Taxis and Ride Shares",
  "'and' stays lowercase mid-phrase so it reads as English",
);

// A leading "and" would still be capitalised — it is the start of the phrase.
assert.equal(prettifyPfcDetailed("X", "X_AND_MORE"), "And More");

// No prefix to strip: keep the whole thing rather than mangling it.
assert.equal(prettifyPfcDetailed("GENERAL_SERVICES", "SOMETHING_ELSE"), "Something Else");

// Nothing useful to say -> null, never an empty string or a guess.
assert.equal(prettifyPfcDetailed("FOOD_AND_DRINK", ""), null);
assert.equal(prettifyPfcDetailed("FOOD_AND_DRINK", "FOOD_AND_DRINK"), null, "detailed equal to primary adds nothing");
assert.equal(prettifyPfcDetailed("", ""), null);

// Underscore runs must not become double spaces.
assert.equal(prettifyPfcDetailed("A", "A__DOUBLE__GAP"), "Double Gap");

// A skipped category must never also be a mapped one — it would look routed
// while being silently dropped.
for (const skipped of PLAID_SKIP_CATEGORIES) {
  assert.ok(
    !(skipped in PLAID_CATEGORY_MAP),
    `${skipped} is both skipped and mapped, so the map entry is dead code`,
  );
}

console.log(
  `Plaid PFC ok: detailed categories render readably, ${Object.keys(PLAID_CATEGORY_MAP).length} primaries mapped, ${PLAID_SKIP_CATEGORIES.size} skipped, no overlap.`,
);
