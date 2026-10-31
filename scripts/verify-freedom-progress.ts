import assert from "node:assert/strict";

import { freedomProgress, progressPercent } from "../lib/freedom-progress.ts";

const path = [{ year: 2026, value: 46_000 }, { year: 2027, value: 60_000 }, { year: 2028, value: 105_000 }];

// No target, no bar.
assert.equal(freedomProgress(10_000, 0), null);
assert.equal(freedomProgress(Number.NaN, 100_000), null);

// 23% there: next mark is 25%, $4k to go, reached in 2027.
const p = freedomProgress(46_000, 200_000, path)!;
assert.equal(p.share, 0.23);
assert.deepEqual(p.next, { mark: 0.25, toGo: 4_000, year: 2027 });

// Without the path, no year.
assert.equal(freedomProgress(46_000, 200_000)!.next!.year, null);

// Exactly on a mark aims at the next one.
assert.equal(freedomProgress(50_000, 200_000, path)!.next!.mark, 0.5);

// Reached: full, nothing next. Negative pots count as zero.
assert.deepEqual(freedomProgress(250_000, 200_000), { share: 1, next: null });
assert.equal(freedomProgress(-5_000, 200_000)!.share, 0);
assert.equal(freedomProgress(-5_000, 200_000)!.next!.toGo, 50_000);

// Percent: no 0% once something is there, no 100% before it all is.
assert.equal(progressPercent(0), "0%");
assert.equal(progressPercent(0.001), "1%");
assert.equal(progressPercent(0.996), "99%");
assert.equal(progressPercent(1), "100%");

console.log("Freedom progress checks passed.");
