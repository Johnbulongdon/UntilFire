/**
 * The layout merge is the fiddly part of a customisable Home, and every one of
 * its failure modes is silent: a card that never appears for someone who
 * customised early, a stored id that no longer exists, a corrupt preference
 * that empties the page. All of them look like "Home is broken" and none of
 * them throw.
 */
import assert from "node:assert/strict";
import { CARDS, defaultLayout, normaliseLayout, moveCard, setCard, pinnedCount } from "../lib/dashboard-layout.ts";

const ids = (l: { cards: { id: string }[] }) => l.cards.map((c) => c.id);

// Never customised → everything, in CARDS order.
assert.deepEqual(ids(normaliseLayout(null)), CARDS.map((c) => c.id));
assert.deepEqual(ids(normaliseLayout(undefined)), CARDS.map((c) => c.id));

// Corrupt input must fall back rather than empty the page.
for (const junk of ["not json", "{}", {}, { cards: "nope" }, [], 42]) {
  assert.deepEqual(ids(normaliseLayout(junk)), CARDS.map((c) => c.id), `junk: ${JSON.stringify(junk)}`);
}

// A stored layout from before a card existed still gets that card.
const old = { cards: [{ id: "hero", visible: true, span: "full" }, { id: "goals", visible: false, span: "full" }] };
const merged = normaliseLayout(old);
assert.equal(merged.cards.length, CARDS.length, "every current card is present after a merge");
assert.equal(merged.cards.find((c) => c.id === "goals")?.visible, false, "a hidden card stays hidden");

// A card removed from CARDS disappears from stored layouts.
const withGhost = { cards: [{ id: "ghost_card_that_never_existed", visible: true, span: "full" }] };
assert.ok(!ids(normaliseLayout(withGhost)).includes("ghost_card_that_never_existed"), "unknown ids are dropped");

// A required card cannot be hidden, however it was stored.
const required = CARDS.find((c) => c.required);
if (required) {
  const forced = normaliseLayout({ cards: [{ id: required.id, visible: false, span: "full" }] });
  assert.equal(forced.cards.find((c) => c.id === required.id)?.visible, true, "required cards stay visible");
  const viaSet = setCard(defaultLayout(), required.id, { visible: false });
  assert.equal(viaSet.cards.find((c) => c.id === required.id)?.visible, true, "setCard cannot hide a required card");
}

// An unknown span falls back rather than reaching CSS.
const badSpan = normaliseLayout({ cards: [{ id: "hero", visible: true, span: "gigantic" }] });
assert.equal(badSpan.cards.find((c) => c.id === "hero")?.span, "full", "an unknown span falls back");

// Duplicates collapse.
const dupe = normaliseLayout({ cards: [{ id: "hero", visible: true, span: "full" }, { id: "hero", visible: false, span: "half" }] });
assert.equal(dupe.cards.filter((c) => c.id === "hero").length, 1, "duplicate ids collapse to one");

// Pinned cards lead and stay put.
const base = defaultLayout();
const pins = pinnedCount(base);
assert.ok(pins >= 1, "at least one card is pinned");
for (let i = 0; i < pins; i++) {
  const pinned = CARDS.find((c) => c.id === base.cards[i].id);
  assert.ok(pinned?.pinned, `card ${i} is one of the pinned ones`);
}
const pinnedId = base.cards[0].id;
assert.deepEqual(ids(moveCard(base, pinnedId, 1)), ids(base), "a pinned card cannot be moved down");
assert.deepEqual(ids(moveCard(base, pinnedId, -1)), ids(base), "a pinned card cannot be moved up");
assert.deepEqual(
  ids(moveCard(base, base.cards[pins].id, -1)), ids(base),
  "nothing can be moved above a pinned card",
);

// A stored layout that puts a pinned card mid-stack is corrected on load.
const scrambled = normaliseLayout({
  cards: [
    { id: base.cards[1].id, visible: true, span: "full" },
    { id: base.cards[2].id, visible: true, span: "full" },
    { id: pinnedId, visible: true, span: "full" },
  ],
});
assert.equal(scrambled.cards[0].id, pinnedId, "a pinned card is pulled back to the front on load");

// Moving is bounded at both ends.
assert.deepEqual(ids(moveCard(base, base.cards[base.cards.length - 1].id, 1)), ids(base), "cannot move the last card down");
const moved = moveCard(base, base.cards[pins + 1].id, -1);
assert.equal(moved.cards[pins].id, base.cards[pins + 1].id, "moving up swaps with the card above");
assert.equal(moved.cards[pins + 1].id, base.cards[pins].id, "and the card above moves down");

// Round trip: what we save is what we load.
const custom = setCard(moveCard(defaultLayout(), "goals", -1), "support", { visible: false, span: "half" });
const round = normaliseLayout(JSON.parse(JSON.stringify(custom)));
assert.deepEqual(ids(round), ids(custom), "order survives a save/load round trip");
assert.equal(round.cards.find((c) => c.id === "support")?.visible, false);
assert.equal(round.cards.find((c) => c.id === "support")?.span, "half");

console.log(`Dashboard layout ok: ${CARDS.length} cards, ${pinnedCount(defaultLayout())} pinned; merge, move, pin and round trip all hold.`);
