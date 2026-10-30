import assert from "node:assert/strict";
import {
  wrapStoryRailPosition,
  storyMembershipLabel,
} from "../lib/landing-story-rail.ts";
const width = 1448;
// Crossing either seam must preserve exactly the same visible position in the repeated group.
for (const p of [-10000, -1, 0, 1447, 1448, 1450, 2895, 2896, 50000]) {
  const wrapped = wrapStoryRailPosition(p, width);
  assert(wrapped >= width && wrapped < width * 2);
  assert.equal(Math.abs((wrapped - p) % width), 0);
  assert.equal(wrapStoryRailPosition(wrapped, width), wrapped);
}
assert.equal(wrapStoryRailPosition(width * 2, width), width);
assert.equal(wrapStoryRailPosition(width - 1, width), width * 2 - 1);
assert.equal(wrapStoryRailPosition(1, 0), 0);
const now = new Date("2026-10-30T12:00:00Z");
assert.equal(storyMembershipLabel("2026-07-01", now), "Joined 3 months ago");
assert.equal(storyMembershipLabel("2026-09-30", now), "Joined 1 month ago");
assert.equal(storyMembershipLabel("2025-10-30", now), "Joined 1 year ago");
assert.equal(
  storyMembershipLabel("2025-08-30", now),
  "Joined 1 year, 2 months ago",
);
assert.equal(storyMembershipLabel("2026-10-29", now), "Joined recently");
assert.equal(storyMembershipLabel("2027-01-01", now), undefined);
assert.equal(storyMembershipLabel("2026-02-31", now), undefined);
assert.equal(storyMembershipLabel("nonsense", now), undefined);
assert.equal(storyMembershipLabel(undefined, now), undefined);
console.log(
  "PASS: endless rail seam wrapping and approved-date membership labels.",
);
