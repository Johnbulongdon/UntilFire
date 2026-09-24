#!/usr/bin/env node
/**
 * The contribution maths, checked against the spreadsheet it replaces.
 *
 * The fixtures below are real rows from the sheet, with the figures it
 * displayed. They are the reason to trust the port: if lib/contribution.ts
 * ever stops reproducing them, it has stopped doing what the user's own
 * process does. The sheet shows whole dollars, so each leg is compared to
 * within $1.
 *
 * Run: npm run test:contribution-plan
 */
import { planContribution, bandFor, statusFor, targetsSumTo100, aggregateHoldingsByTicker, planImportMerge, rowsToPlan, planToRows, isCashTicker, cashSymbol, ladderToStored, storedToLadder, sanitiseLadder, planHasContent, newerPlan, stampPlan, withEmergencyAccountIds, EMPTY_LADDER } from "../lib/contribution.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });

const pct = (o) => Object.entries(o).map(([symbol, targetPct]) => ({ symbol, targetPct }));
const val = (o) => Object.entries(o).map(([symbol, value]) => ({ symbol, value }));

// ── Sheet fixtures. normaliseToBudget is off so these compare against the
//    sheet's own un-normalised numbers.
const SHEET = [
  {
    name: "tab 1, December — a portfolio that is all BTC and gold",
    targets: { VTI: 0.26, VXUS: 0.34, AVDV: 0.20, BTC: 0.12, ETH: 0.03, IAUM: 0.05 },
    holdings: { VTI: 0, VXUS: 0, AVDV: 0, BTC: 697, ETH: 23, IAUM: 238 },
    budget: 100,
    expect: { VTI: 33, VXUS: 46, AVDV: 24, BTC: 5, ETH: 3, IAUM: 4 },
  },
  {
    name: "tab 1, February — mild drift",
    targets: { VTI: 0.26, VXUS: 0.34, AVDV: 0.20, BTC: 0.12, ETH: 0.03, IAUM: 0.05 },
    holdings: { VTI: 676, VXUS: 1060, AVDV: 592, BTC: 1054, ETH: 92, IAUM: 164 },
    budget: 100,
    expect: { VTI: 28, VXUS: 36, AVDV: 21, BTC: 10, ETH: 3, IAUM: 5 },
  },
  {
    name: "tab 2, January — a different portfolio and a $1,800 budget",
    targets: { SP500: 0.45, QQQ: 0.20, BTC: 0.25, ETH: 0.05, GOLD: 0.05 },
    holdings: { SP500: 1502, QQQ: 712, BTC: 1102, ETH: 116, GOLD: 322 },
    budget: 1800,
    expect: { SP500: 850, QQQ: 364, BTC: 430, ETH: 92, GOLD: 87 },
  },
  {
    name: "tab 2, February — drift closing as contributions land",
    targets: { SP500: 0.45, QQQ: 0.20, BTC: 0.25, ETH: 0.05, GOLD: 0.05 },
    holdings: { SP500: 2352, QQQ: 1076, BTC: 1532, ETH: 208, GOLD: 409 },
    budget: 1800,
    expect: { SP500: 833, QQQ: 363, BTC: 439, ETH: 91, GOLD: 88 },
  },
];

for (const row of SHEET) {
  const plan = planContribution(pct(row.targets), val(row.holdings), row.budget, { normaliseToBudget: false });
  const off = plan.assets
    .map((a) => ({ symbol: a.symbol, got: a.adjusted, want: row.expect[a.symbol] }))
    .filter((r) => Math.abs(r.got - r.want) > 1);
  check(
    row.name,
    off.length === 0,
    off.map((r) => `${r.symbol}: got $${r.got.toFixed(2)}, sheet says $${r.want}`).join("; "),
  );
}

// ── The two places the app deliberately departs from the sheet ──────────
{
  const row = SHEET[0];
  const raw = planContribution(pct(row.targets), val(row.holdings), row.budget, { normaliseToBudget: false });
  const norm = planContribution(pct(row.targets), val(row.holdings), row.budget);
  check(
    "the sheet asks for more than the budget — $114 of instructions on $100",
    raw.total > row.budget + 10,
    `raw total $${raw.total.toFixed(2)} on a $${row.budget} budget`,
  );
  check(
    "normalising spends exactly the budget",
    Math.abs(norm.total - row.budget) < 1e-6,
    `$${norm.total.toFixed(2)}`,
  );
  // Same scale factor on every leg means the tilt survives normalising.
  const ratios = norm.assets.map((a, i) => a.adjusted / raw.assets[i].adjusted);
  check(
    "normalising preserves the tilt — every leg scales by the same factor",
    Math.max(...ratios) - Math.min(...ratios) < 1e-9,
  );
}

// ── The 5/25 band ───────────────────────────────────────────────────────
{
  const big = bandFor(0.45);
  check("a 45% target uses the absolute rule: 40–50%",
    Math.abs(big.lowPct - 0.40) < 1e-9 && Math.abs(big.highPct - 0.50) < 1e-9,
    `${(big.lowPct * 100).toFixed(2)}–${(big.highPct * 100).toFixed(2)}%`);

  const small = bandFor(0.03);
  check("a 3% target uses the relative rule: 2.25–3.75%, not the unusable −2–8%",
    Math.abs(small.lowPct - 0.0225) < 1e-9 && Math.abs(small.highPct - 0.0375) < 1e-9,
    `${(small.lowPct * 100).toFixed(2)}–${(small.highPct * 100).toFixed(2)}%`);

  const cross = bandFor(0.20);
  check("the two rules meet exactly at a 20% target",
    Math.abs(cross.lowPct - 0.15) < 1e-9 && Math.abs(cross.highPct - 0.25) < 1e-9);

  check("no band can reach below zero", [0.005, 0.01, 0.03, 0.2, 0.9].every((t) => bandFor(t).lowPct >= 0));

  check("a small asset can actually be flagged as under target",
    statusFor(0.015, bandFor(0.03)) === "under");
  check("a flat 5pp band could not have flagged it",
    0.015 >= 0.03 - 0.05);
}

// ── Guards against nonsense input ───────────────────────────────────────
{
  const targets = pct({ VTI: 0.6, VXUS: 0.4 });
  const empty = planContribution(targets, [], 500);
  check("an empty portfolio contributes the plain split, with no drift to correct",
    Math.abs(empty.assets[0].adjusted - 300) < 1e-6 && Math.abs(empty.assets[1].adjusted - 200) < 1e-6,
    empty.assets.map((a) => `${a.symbol} $${a.adjusted.toFixed(0)}`).join(", "));

  const wild = planContribution(pct({ A: 0.5, B: 0.5 }), val({ A: 0, B: 100000 }), 100);
  check("an asset far over target is never given a negative contribution",
    wild.assets.every((a) => a.adjusted >= 0),
    wild.assets.map((a) => `${a.symbol} $${a.adjusted.toFixed(2)}`).join(", "));

  const weekly = planContribution(targets, [], 434.8, { frequency: "weekly" });
  check("weekly divides by 4.35, not 4 — a month is not four weeks",
    Math.abs(weekly.perPeriod - 100) < 0.5, `$${weekly.perPeriod.toFixed(2)}/week`);

  check("targets that do not sum to 100% are rejected",
    !targetsSumTo100(pct({ A: 0.5, B: 0.4 })) && targetsSumTo100(targets));
}

// ── Plaid holdings aggregation ──────────────────────────────────────────
{
  const securities = {
    s1: { ticker_symbol: "VTI", type: "etf" },
    s2: { ticker_symbol: "vti", type: "etf" },      // same holding, different case
    s3: { ticker_symbol: "VXUS", type: "etf" },
    s4: { ticker_symbol: null, name: "CASH SWEEP", type: "cash" },
    s5: { ticker_symbol: null, name: "IN-HOUSE BALANCED FUND", type: "mutual fund" },
  };
  const rows = [
    { security_id: "s1", institution_value: 1000 },
    { security_id: "s2", institution_value: 500 },                       // second account
    { security_id: "s3", quantity: 10, institution_price: 60 },          // no value, must multiply
    { security_id: "s4", institution_value: 250 },                       // cash sweep
    { security_id: "s5", institution_value: 700 },                       // untickered, not cash
    { security_id: "s3", institution_value: null, quantity: null, institution_price: null }, // unpriceable
  ];
  const agg = aggregateHoldingsByTicker(rows, securities);
  const vti = agg.holdings.find((h) => h.symbol === "VTI");
  const vxus = agg.holdings.find((h) => h.symbol === "VXUS");

  check("one ticker held in two accounts is summed, not duplicated",
    agg.holdings.filter((h) => h.symbol === "VTI").length === 1 && vti?.value === 1500,
    `VTI $${vti?.value}`);
  check("a lower-case ticker is the same holding, and cash is one too",
    agg.holdings.length === 3 && agg.holdings.some((h) => h.symbol === "CASH"),
    agg.holdings.map((h) => h.symbol).join(", "));
  check("a position with no institution_value falls back to quantity x price",
    vxus?.value === 600, `VXUS $${vxus?.value}`);
  check("an untickered position that is not cash is reported, not silently dropped",
    agg.skippedCount === 1 && agg.skippedValue === 700,
    `${agg.skippedCount} position worth $${agg.skippedValue}`);
  check("a cash sweep is cash, not an untickered mystery",
    agg.cashValue === 250 && agg.holdings.some((h) => h.symbol === "CASH" || h.symbol === "USD"),
    `cash $${agg.cashValue}, as ${agg.holdings.filter((h) => ["CASH", "USD"].includes(h.symbol)).map((h) => h.symbol).join(",") || "(missing)"}`);
  check("a position with neither a value nor a price is ignored",
    vxus?.value === 600);
  check("holdings come back largest first",
    agg.holdings[0].symbol === "VTI");

  const empty = aggregateHoldingsByTicker([], {});
  check("no connected holdings is not an error",
    empty.holdings.length === 0 && empty.skippedCount === 0);
}

// ── Merging an import into a plan that already exists ───────────────────
{
  const existing = ["VTI", "vxus", "", "  BND  "];
  const imported = [
    { symbol: "VTI", value: 1500 },
    { symbol: "VXUS", value: 900 },     // matches despite the saved row's case
    { symbol: "AVDV", value: 400 },     // new to the plan
  ];
  const m = planImportMerge(existing, imported);
  check("an imported holding already in the plan updates that row",
    m.fill.get("VTI") === 1500 && m.fill.get("VXUS") === 900, `filled ${[...m.fill.keys()].join(", ")}`);
  check("matching ignores case and stray whitespace",
    m.fill.has("VXUS") && !m.add.some((h) => h.symbol === "VXUS"));
  check("a holding the plan has never heard of is added, not merged into another row",
    m.add.length === 1 && m.add[0].symbol === "AVDV");
  check("an untouched row in the plan is not in the fill set",
    !m.fill.has("BND"));
  check("importing nothing changes nothing",
    planImportMerge(existing, []).fill.size === 0 && planImportMerge(existing, []).add.length === 0);
}

// ── The stored shape, and the round trip through it ─────────────────────
{
  const rows = [
    { id: "1", symbol: "vti",  targetPct: "26",   value: "676" },
    { id: "2", symbol: " VXUS ", targetPct: "34", value: "1,060" },   // typed with a comma
    { id: "3", symbol: "AVDV", targetPct: "",     value: "592" },     // imported, no target yet
    { id: "4", symbol: "",     targetPct: "",     value: "" },        // an empty row
  ];
  const stored = rowsToPlan(rows, "$100", "weekly");

  check("percentages are stored as fractions, not display numbers",
    stored.targets[0].targetPct === 0.26, `VTI stored as ${stored.targets[0].targetPct}`);
  check("tickers are normalised on the way in",
    stored.targets.map((t) => t.symbol).join(",") === "VTI,VXUS,AVDV",
    stored.targets.map((t) => t.symbol).join(","));
  check("a value typed with separators is read as a number",
    stored.holdings[1].value === 1060, `${stored.holdings[1].value}`);
  check("a budget typed with a currency symbol is read as a number",
    stored.budget === 100, `${stored.budget}`);
  check("an empty row is not stored as an asset",
    stored.targets.length === 3);

  const back = planToRows(stored);
  check("the round trip keeps the target as the user typed it",
    back.rows[0].targetPct === "26" && back.rows[1].targetPct === "34",
    back.rows.map((r) => `${r.symbol}:${r.targetPct}`).join(" "));
  check("a blank target round-trips blank, not as zero",
    back.rows[2].targetPct === "", `AVDV came back as "${back.rows[2].targetPct}"`);
  check("values and settings survive the round trip",
    back.rows[1].value === "1060" && back.budget === "100" && back.frequency === "weekly",
    `${back.rows[1].value} / ${back.budget} / ${back.frequency}`);

  // The stored plan must still drive the maths after a round trip.
  const plan = planContribution(stored.targets, stored.holdings, stored.budget);
  check("a stored plan still computes",
    Math.abs(plan.total - 100) < 1e-6 && plan.assets.length === 3, `$${plan.total.toFixed(2)}`);
}

// ── The two things a real import turned up ──────────────────────────────
// Reported from a live account: the import added an asset called "CUR:USD"
// and one called "ETH", both with no value.
{
  const securities = {
    c1: { ticker_symbol: "CUR:USD", type: "cash" },      // Plaid's cash pseudo-ticker
    c2: { ticker_symbol: "CUR:GBP", type: null },        // same, without the type hint
    c3: { ticker_symbol: null, type: "cash" },           // cash, no ticker — currency comes off the holding
    e1: { ticker_symbol: "ETH", type: "crypto" },        // real ticker, nothing held
    v1: { ticker_symbol: "VTI", type: "etf" },
  };
  const agg = aggregateHoldingsByTicker([
    { security_id: "c1", institution_value: 4200 },
    { security_id: "c2", institution_value: 300 },
    { security_id: "c3", institution_value: 100, iso_currency_code: "EUR" },
    { security_id: "e1", institution_value: 0 },
    { security_id: "v1", institution_value: 9000 },
  ], securities);

  check("no holding is ever called CUR:anything",
    !agg.holdings.some((h) => h.symbol.startsWith("CUR:")),
    agg.holdings.map((h) => h.symbol).join(", ") || "(none)");
  check("cash appears as a holding named by its currency",
    agg.holdings.find((h) => h.symbol === "USD")?.value === 4200
      && agg.holdings.find((h) => h.symbol === "GBP")?.value === 300,
    agg.holdings.filter((h) => ["USD", "GBP"].includes(h.symbol)).map((h) => `${h.symbol} $${h.value}`).join(", "));
  check("cash flagged only by type falls back to the holding's own currency",
    agg.holdings.find((h) => h.symbol === "EUR")?.value === 100,
    `EUR $${agg.holdings.find((h) => h.symbol === "EUR")?.value}`);
  check("cash counts toward the portfolio, and is reported so the note can say so",
    agg.cashValue === 4600, `cash $${agg.cashValue}`);
  check("cash is not counted as an untickered mystery position",
    agg.skippedCount === 0 && agg.skippedValue === 0);
  check("cashSymbol maps the forms Plaid sends",
    cashSymbol("CUR:USD") === "USD" && cashSymbol("cur:gbp") === "GBP"
      && cashSymbol(null, "eur") === "EUR" && cashSymbol(null, null) === "CASH");
  check("a real ticker is still a real ticker",
    agg.holdings.some((h) => h.symbol === "VTI"));

  check("isCashTicker catches the forms Plaid actually sends",
    isCashTicker("CUR:USD") && isCashTicker("cur:eur") && isCashTicker("X", "cash")
      && !isCashTicker("VTI") && !isCashTicker("CURE"));

  // A zero-value holding must not be added, but must still update a row the
  // plan already has — selling out of something is information.
  const merge = planImportMerge(["VTI"], [
    { symbol: "VTI", value: 0 },
    { symbol: "ETH", value: 0 },
    { symbol: "VXUS", value: 500 },
  ]);
  check("a position you hold none of is not added to the plan",
    !merge.add.some((h) => h.symbol === "ETH"), merge.add.map((h) => h.symbol).join(", ") || "(nothing added)");
  check("but selling out of something already in the plan updates it to zero",
    merge.fill.get("VTI") === 0);
  check("a real new holding is still added",
    merge.add.some((h) => h.symbol === "VXUS"));

  // A plan that already took a CUR:USD row repairs itself on load.
  const stale = {
    targets: [{ symbol: "VTI", targetPct: 0.6 }, { symbol: "CUR:USD", targetPct: 0 }, { symbol: "ETH", targetPct: 0 }],
    holdings: [{ symbol: "VTI", value: 9000 }],
    budget: 500, frequency: "monthly",
  };
  const repaired = planToRows(stale);
  check("a plan that stored CUR:USD shows it as USD instead",
    !repaired.rows.some((r) => r.symbol === "CUR:USD") && repaired.rows.some((r) => r.symbol === "USD"),
    repaired.rows.map((r) => r.symbol).join(", "));
  check("the renamed cash row keeps its value rather than being orphaned",
    planToRows({
      targets: [{ symbol: "CUR:USD", targetPct: 0.1 }],
      holdings: [{ symbol: "CUR:USD", value: 2500 }],
      budget: 100, frequency: "monthly",
    }).rows[0].value === "2500");
  check("but a real ticker sitting at zero is left for the user to decide about",
    repaired.rows.some((r) => r.symbol === "ETH"));
}

// ── The ladder's inputs, which are the ones people were re-typing ───────
{
  const typed = {
    efOverride: "7000",           // edited away from the account figure
    expensesOverride: null,       // still following the account
    thresholdOverride: "5.5",
    efAccountIds: ["acct-1", "acct-2"],
    expenseSource: "average",
    monthlyMatch: "250",
    taxRoom: "6,500",             // typed with a separator
    lowInterestExtra: "",
    debts: [
      { id: "1", name: " Visa ", balance: "4,200", ratePct: "22.9" },
      { id: "2", name: "Interest-free plan", balance: "600", ratePct: "0" },
      { id: "3", name: "", balance: "", ratePct: "" },        // an empty row
    ],
    disabled: ["low-interest-debt"],
  };
  const stored = ladderToStored(typed);

  check("an override that follows the account stores as null, not as a number",
    stored.expensesOverride === null && stored.efOverride === 7000,
    `expenses ${stored.expensesOverride} / ef ${stored.efOverride}`);
  check("ladder figures typed with separators are stored as numbers",
    stored.taxRoom === 6500 && stored.debts[0].balance === 4200,
    `${stored.taxRoom} / ${stored.debts[0].balance}`);
  check("an empty debt row is not stored as a debt",
    stored.debts.length === 2, `${stored.debts.length} debts`);

  const back = storedToLadder(stored);
  check("the ladder comes back as it was typed",
    back.efOverride === "7000" && back.thresholdOverride === "5.5" &&
    back.monthlyMatch === "250" && back.taxRoom === "6500",
    `${back.efOverride} / ${back.thresholdOverride} / ${back.monthlyMatch} / ${back.taxRoom}`);
  check("a field following the account still follows it after a reload",
    back.expensesOverride === null);
  check("a debt keeps its name and its rate",
    back.debts[0].name === "Visa" && back.debts[0].ratePct === "22.9",
    `${back.debts[0].name} @ ${back.debts[0].ratePct}`);
  check("a 0% loan keeps its zero rather than coming back blank",
    back.debts[1].ratePct === "0", `came back as "${back.debts[1].ratePct}"`);
  check("the chosen emergency-fund accounts survive the round trip",
    back.efAccountIds.join(",") === "acct-1,acct-2", String(back.efAccountIds));
  check("which month the expenses follow survives the round trip",
    back.expenseSource === "average", back.expenseSource);
  check("a switched-off rung stays switched off",
    back.disabled.length === 1 && back.disabled[0] === "low-interest-debt");
  check("debt rows get fresh ids, and distinct ones",
    back.debts[0].id && back.debts[0].id !== back.debts[1].id);

  // An override of 0 is an answer — "I have no emergency fund" — and is not
  // the same as leaving the field to the account.
  const zeroed = ladderToStored({ ...EMPTY_LADDER, efOverride: "0" });
  check("an override of zero survives as zero, not as follow-the-account",
    zeroed.efOverride === 0 && storedToLadder(zeroed).efOverride === "0",
    `${zeroed.efOverride}`);
}

// ── What comes back out of localStorage and a JSONB column ──────────────
{
  check("a malformed ladder is dropped rather than trusted",
    sanitiseLadder(null) === undefined && sanitiseLadder("nonsense") === undefined);
  const junk = sanitiseLadder({
    efOverride: "7000",                 // a string where a number belongs
    monthlyMatch: Number.NaN,
    taxRoom: 500,
    debts: [null, { name: 5, balance: "x" }],
    disabled: ["low-interest-debt", "not-a-rung"],
  });
  check("a bad field falls back instead of poisoning the whole ladder",
    junk.efOverride === null && junk.monthlyMatch === 0 && junk.taxRoom === 500,
    `${junk.efOverride} / ${junk.monthlyMatch} / ${junk.taxRoom}`);
  check("following-my-savings is stored as null, not as today's account list",
    ladderToStored({ ...EMPTY_LADDER }).efAccountIds === null &&
    storedToLadder(ladderToStored({ ...EMPTY_LADDER })).efAccountIds === null);
  check("an unknown expense source falls back to the last complete month",
    sanitiseLadder({ expenseSource: "whenever" }).expenseSource === "last-month" &&
    sanitiseLadder({}).expenseSource === "last-month");
  check("a junk account id list does not become a live selection",
    sanitiseLadder({ efAccountIds: "all" }).efAccountIds === null &&
    sanitiseLadder({ efAccountIds: ["a", 7, null] }).efAccountIds.join(",") === "a",
    JSON.stringify(sanitiseLadder({ efAccountIds: ["a", 7, null] }).efAccountIds));
  check("a rung kind that no longer exists is not restored as a setting",
    junk.disabled.length === 1 && junk.disabled[0] === "low-interest-debt",
    junk.disabled.join(","));
  check("a debt that is not an object is skipped, one that is gets coerced",
    junk.debts.length === 1 && junk.debts[0].balance === 0, JSON.stringify(junk.debts));

  // The reason planHasContent exists: someone who has only filled in the
  // ladder has a plan, and restoring on targets alone would throw it away.
  const ladderOnly = { targets: [], holdings: [], budget: 500, frequency: "monthly",
                       ladder: ladderToStored({ ...EMPTY_LADDER, monthlyMatch: "250" }) };
  check("a ladder with no allocation behind it still counts as a plan",
    planHasContent(ladderOnly));
  check("an empty plan does not",
    !planHasContent({ targets: [], holdings: [], budget: 0, frequency: "monthly" }) &&
    !planHasContent(null));
  check("a ladder-only plan keeps its budget through the round trip",
    planToRows(ladderOnly).budget === "500");
}

// ── Which copy wins when the two stores disagree ────────────────────────
{
  const plan = (budget, at) => ({
    targets: [{ symbol: "VTI", targetPct: 1 }], holdings: [], budget,
    frequency: "monthly", updatedAt: at,
  });

  check("the copy written later wins",
    newerPlan(plan(100, 2000), plan(200, 1000)).budget === 100 &&
    newerPlan(plan(100, 1000), plan(200, 2000)).budget === 200);
  check("a missing copy is not preferred over a real one",
    newerPlan(null, plan(200, 1000)).budget === 200 &&
    newerPlan(plan(100, 1000), null).budget === 100 &&
    newerPlan(null, null) === null);
  check("an untimestamped plan loses to one that has a timestamp",
    newerPlan(plan(100, undefined), plan(200, 1)).budget === 200,
    `${newerPlan(plan(100, undefined), plan(200, 1)).budget}`);
  check("with neither timestamped, the account copy stands",
    newerPlan(plan(100, undefined), plan(200, undefined)).budget === 200);

  // The case this exists for: an edit reached localStorage, the debounced
  // account write was cancelled by leaving the tab, and the tab is reopened.
  const saved = stampPlan(plan(500), 1_700_000_100_000);
  const stale = stampPlan(plan(300), 1_700_000_000_000);
  check("an edit the account never received is not overwritten by the older account copy",
    newerPlan(saved, stale).budget === 500, `${newerPlan(saved, stale).budget}`);
  check("stamping records when, and changes nothing else",
    saved.updatedAt === 1_700_000_100_000 && saved.targets[0].symbol === "VTI");
}

// ── Choosing the emergency fund's accounts from Net Worth
{
  const fresh = withEmergencyAccountIds(null, ["chk-1", "sav-1"]);
  check("choosing accounts with no saved plan creates one that restores",
    planHasContent(fresh) && fresh.targets.length === 0 && fresh.ladder.efAccountIds.join() === "chk-1,sav-1");
  check("and it leaves the contribution amount following real cash, not fixed at 0",
    fresh.budget === 0 && fresh.budgetOverride === undefined);
  const existing = {
    targets: [{ symbol: "VTI", targetPct: 1 }], holdings: [{ symbol: "VTI", value: 900 }],
    budget: 0, frequency: "weekly", budgetOverride: 250,
    ladder: { ...ladderToStored(EMPTY_LADDER), monthlyMatch: 150, efAccountIds: null },
  };
  const patched = withEmergencyAccountIds(existing, ["sav-1"]);
  check("choosing accounts changes nothing else in an existing plan",
    patched.targets === existing.targets && patched.frequency === "weekly" && patched.budgetOverride === 250 &&
    patched.ladder.monthlyMatch === 150 && patched.ladder.efAccountIds.join() === "sav-1");
  check("going back to savings accounts stores null, not an empty choice",
    withEmergencyAccountIds(patched, null).ladder.efAccountIds === null);
  const ids = ["a"];
  const copy = withEmergencyAccountIds(null, ids);
  ids.push("b");
  check("the stored list is a copy, not the caller's array", copy.ladder.efAccountIds.join() === "a");
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nContribution plan verification failed: ${failed} check(s) failed.` : "\nContribution plan verification passed");
process.exit(failed ? 1 : 0);
