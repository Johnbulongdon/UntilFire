/**
 * Explore (D-58): your year in each city, what pins say, and how they make
 * room for each other on the map.
 */
import assert from "node:assert/strict";
import { freedomIn, pinText, placePins, pinWidth, countryPins } from "../lib/explore-pins.ts";
import { calcFIRE } from "../lib/fire/strategies/traditional.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const now = new Date(2026, 9, 9);
const plan = { saved: 60000, monthlySaving: 2000, age: 34, realReturn: 0.05 };
const city = (key: string, monthlyUSD: number, extra: Record<string, unknown> = {}) =>
  ({ key, place: "Portugal", flag: "🇵🇹", lat: 38, lng: -9, us: false, region: "pt", monthlyUSD, annualUSD: monthlyUSD * 12, ...extra });

ok("a cheaper city frees you sooner, with the same savings", () => {
  const cheap = freedomIn(city("faro", 2333), plan, now)!, dear = freedomIn(city("lisbon", 3000), plan, now)!;
  assert.ok(cheap.at < dear.at);
  assert.ok(cheap.years > 0 && cheap.at > 2026);
});
ok("the same numbers give the calculator's year and age, for every case", () => {
  for (const saved of [0, 20000, 60000, 150000]) for (const monthly of [500, 1000, 2000, 3500]) for (const annual of [30000, 40000, 60000, 80000]) {
    const calc = calcFIRE(monthly, annual, 34, saved, 0.05);
    const f = freedomIn({ annualUSD: annual }, { saved, monthlySaving: monthly, age: 34, realReturn: 0.05 });
    if (calc.retireYear == null) { assert.equal(f, null); continue; }
    assert.equal(Math.floor(f!.at), calc.retireYear);
    assert.equal(f!.age, calc.age);
  }
});
ok("age is your age now plus the years; without an age there is none", () => {
  const f = freedomIn(city("faro", 2333), plan, now)!;
  assert.equal(f.age, Math.floor(34 + f.years));
  assert.equal(freedomIn(city("faro", 2333), { ...plan, age: undefined }, now)!.age, null);
});
ok("already there means now; never there means no year", () => {
  assert.equal(freedomIn(city("x", 1000), { saved: 1e7, monthlySaving: 0 }, now)!.years, 0);
  assert.equal(freedomIn(city("x", 9000), { saved: 0, monthlySaving: 0 }, now), null);
});
ok("pins read $/mo, the year or the age, and a dash when unknown", () => {
  const c = city("faro", 2333), f = freedomIn(c, plan, now);
  assert.equal(pinText(c, "monthly", f), "$2.3k");
  assert.equal(pinText(c, "year", f), String(Math.floor(f!.at)));
  assert.equal(pinText(c, "age", f), String(f!.age));
  assert.equal(pinText(c, "year", null), "—");
});
ok("one typical pin per country, at the median city", () => {
  const pins = countryPins([city("a", 1000), city("b", 2000), city("c", 3000), city("us", 4000, { us: true, region: "tx" })]);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].mid.key, "b");
  assert.equal(pins[0].count, 3);
});
ok("a crowded pin flips side before it becomes a dot", () => {
  const w = pinWidth("$2.3k");
  const placed = placePins([{ key: "a", x: 100, y: 100, width: w }, { key: "b", x: 100, y: 104, width: w }], { width: 400, height: 300 });
  assert.equal(placed[0].side, "up");
  assert.equal(placed[1].side, "down");
});
ok("with no room left it becomes a dot, unless it is starred", () => {
  const w = pinWidth("$2.3k"), pts = ["a", "b", "c", "d", "e"].map((key) => ({ key, x: 100, y: 100, width: w }));
  const plain = placePins(pts, { width: 400, height: 300 });
  assert.equal(plain[4].side, null);
  const starred = placePins(pts, { width: 400, height: 300 }, new Set(["e"]));
  assert.notEqual(starred[4].side, null);
});
ok("pills stay inside the frame", () => {
  const w = pinWidth("$2.3k");
  const [edge] = placePins([{ key: "a", x: 3, y: 150, width: w }], { width: 400, height: 300 });
  assert.equal(edge.side, "right");
});

console.log(`\nExplore checks passed: ${n}`);
