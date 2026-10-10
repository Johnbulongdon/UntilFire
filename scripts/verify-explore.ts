/**
 * Explore (D-58): your year in each city, what pins say, and how they make
 * room for each other on the map.
 */
import assert from "node:assert/strict";
import { freedomIn, pinText, placePins, pinWidth, countryPins, freedomBadges, bestBadge } from "../lib/explore-pins.ts";
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
  assert.equal(f.age, Math.round(34 + f.years));
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
ok("one typical pin per country, at the median city; the US is one country", () => {
  const pins = countryPins([city("a", 1000), city("b", 2000, { region: "pt_alt" }), city("c", 3000), city("aus", 4000, { us: true, region: "tx", flag: "🇺🇸" }), city("nyc", 6000, { us: true, region: "nyc", flag: "🇺🇸" })]);
  assert.equal(pins.length, 2, "one pin per country, whatever the tax region");
  const pt = pins.find(p => p.region === "🇵🇹")!, us = pins.find(p => p.region === "us")!;
  assert.equal(pt.mid.key, "b");
  assert.equal(pt.count, 3);
  assert.equal(us.count, 2);
  assert.equal(us.place, "United States");
});
ok("monthly pins print in your currency when given a formatter", () => {
  assert.equal(pinText(city("x", 2333), "monthly", null, (usd) => `€${Math.round(usd * 0.92)}`), "€2146");
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

// D-67: freedom badges, judged by 59½ for everyone.
const saver = { saved: 190000, monthlySaving: 2125, monthlyIncome: 6434, age: 28, realReturn: 0.05 };
ok("no age, no badges: there is nothing to judge by", () => {
  assert.equal(freedomBadges({ annualUSD: 36000 }, { ...saver, age: undefined }), null);
});
ok("metals never break their order, for any plan and city", () => {
  for (const saved of [0, 50000, 190000, 600000]) for (const monthlySaving of [0, 800, 2500]) for (const age of [25, 40, 55]) for (const annualUSD of [12000, 36000, 80000]) {
    const b = freedomBadges({ annualUSD }, { saved, monthlySaving, monthlyIncome: 6000, age, realReturn: 0.05 })!;
    assert.ok(b.gold <= b.silver && b.silver <= b.bronze && b.bronze <= 3, JSON.stringify({ saved, monthlySaving, age, annualUSD, b }));
  }
});
ok("a cheaper city never earns fewer stars", () => {
  const dear = freedomBadges({ annualUSD: 58000 }, saver)!, cheap = freedomBadges({ annualUSD: 18000 }, saver)!;
  for (const m of ["bronze", "silver", "gold"] as const) assert.ok(cheap[m] >= dear[m], m);
});
ok("coasting: what is saved today grows to the target by 59½ with nothing added", () => {
  const coast = freedomBadges({ annualUSD: 18000 }, saver)!;
  assert.equal(coast.silver, 3, "190k at 5% for 31.5 years covers 150% of 18k x 25");
  assert.equal(freedomBadges({ annualUSD: 77500 }, saver)!.silver, 0);
});
ok("without take-home, Gold is not judged rather than guessed", () => {
  const b = freedomBadges({ annualUSD: 16000 }, { ...saver, monthlyIncome: undefined })!;
  assert.equal(b.goldJudged, false); assert.equal(b.gold, 0);
});
ok("half time draws on money within reach: locked until 59½, it cannot", () => {
  const open = freedomBadges({ annualUSD: 12000 }, { ...saver, saved: 400000 })!;
  const locked = freedomBadges({ annualUSD: 12000 }, { ...saver, saved: 400000, reachable: 5000 })!;
  assert.ok(open.gold > 0 && locked.gold === 0, JSON.stringify({ open, locked }));
});
ok("half time is judged against spending, not take-home less saving: pension saving is not spending", () => {
  const withPension = { ...saver, monthlySaving: 5833 }; // includes pension paid before take-home
  assert.ok(freedomBadges({ annualUSD: 16000 }, withPension)!.gold > 0, "spending guessed as $601 a month");
  assert.equal(freedomBadges({ annualUSD: 16000 }, { ...withPension, monthlySpend: 4309 })!.gold, 0);
});
ok("a pin shows the best metal with its stars", () => {
  assert.equal(pinText({ monthlyUSD: 1500 }, "badge", null, undefined, { bronze: 3, silver: 2, gold: 0, goldJudged: true }), "🥈★★");
  assert.equal(pinText({ monthlyUSD: 1500 }, "badge", null, undefined, { bronze: 0, silver: 0, gold: 0, goldJudged: true }), "🔒");
  assert.deepEqual(bestBadge({ bronze: 3, silver: 1, gold: 1, goldJudged: true }), { metal: "gold", stars: 1 });
});

console.log(`\nExplore checks passed: ${n}`);
