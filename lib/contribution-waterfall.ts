/**
 * The ladder: where this month's money goes before any of it reaches the
 * investment split.
 *
 * Each rung has a capacity — how much it can still absorb — and they fill in
 * order until the money runs out. Nothing here is clever; the judgement is
 * entirely in the order and in what each capacity means.
 *
 * Two of the orderings are worth stating, because they are the ones that cost
 * money if you get them wrong:
 *
 * The emergency fund straddles the debt rather than sitting on one side of it.
 * With no buffer at all, the first surprise goes back onto the card you just
 * paid down, so a small floor comes first; the full target waits until the
 * expensive debt is gone. getEmergencyFundPlan already splits exactly this
 * way, into gapToFloor and gapToTarget.
 *
 * Low-interest debt sits near the bottom, not near the top. Paying down a 3%
 * mortgage ahead of a tax-advantaged account trades an expected real return
 * plus a tax break for a guaranteed 3%. It is also the one rung that takes a
 * monthly amount rather than a balance: taxable investing below it is
 * bottomless, so a rung defined by its balance would starve everything under
 * it forever.
 *
 * The order is a default, not a verdict. Every rung can be moved or switched
 * off, which is what keeps this a published convention the user is editing
 * rather than advice the product is handing down.
 */

export type RungKind =
  | "emergency-floor"
  | "employer-match"
  | "high-interest-debt"
  | "emergency-target"
  | "tax-advantaged"
  | "low-interest-debt"
  | "taxable";

export interface Rung {
  kind: RungKind;
  label: string;
  /** Why this sits where it does. Shown to the user; it is the argument, not a label. */
  why: string;
  /** How much this rung can still take. Infinity means bottomless. */
  capacity: number;
  enabled: boolean;
}

export interface RungFill extends Rung {
  amount: number;
  /** True when the rung took everything it could and is now satisfied. */
  filled: boolean;
}

export interface WaterfallResult {
  fills: RungFill[];
  /** What reaches the investment split. */
  toInvest: number;
  /** Money with nowhere left to go — only possible if every rung is capped. */
  leftover: number;
}

/** Fill rungs in order. A disabled rung is skipped, not zeroed and kept. */
export function fillWaterfall(rungs: Rung[], budget: number): WaterfallResult {
  let remaining = Math.max(0, budget);
  const fills: RungFill[] = rungs.map((rung) => {
    if (!rung.enabled || remaining <= 0) {
      return { ...rung, amount: 0, filled: false };
    }
    const amount = Math.min(rung.capacity, remaining);
    remaining -= amount;
    return { ...rung, amount, filled: amount >= rung.capacity && Number.isFinite(rung.capacity) };
  });
  const taxable = fills.find((f) => f.kind === "taxable");
  return { fills, toInvest: taxable?.amount ?? 0, leftover: remaining };
}

export interface Debt {
  name: string;
  balance: number;
  /** Annual rate as a percentage, as the user typed it: 22.9, not 0.229. */
  ratePct: number;
}

export interface LadderInputs {
  /** From getEmergencyFundPlan — the shortfall to the floor and to the target. */
  emergencyGapToFloor: number;
  emergencyGapToTarget: number;
  /** Employer match you have not captured yet, per month. */
  monthlyMatch: number;
  debts: Debt[];
  /** Above this rate, paying down beats investing. Conventionally your
   *  expected real return. A number the user moves, not a label we assign. */
  highInterestThresholdPct: number;
  /** Contribution room left in tax-advantaged accounts this year. */
  taxAdvantagedRoom: number;
  /** Deliberate extra against cheap debt, per month. Off by default. */
  lowInterestExtra: number;
  /** Rungs the user has switched off, by kind. */
  disabled?: RungKind[];
}

export const DEFAULT_THRESHOLD_PCT = 7;

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

export function splitDebts(debts: Debt[], thresholdPct: number) {
  return {
    high: debts.filter((d) => d.ratePct >= thresholdPct && d.balance > 0),
    low: debts.filter((d) => d.ratePct < thresholdPct && d.balance > 0),
  };
}

export function buildLadder(inputs: LadderInputs): Rung[] {
  const off = new Set(inputs.disabled ?? []);
  const { high } = splitDebts(inputs.debts, inputs.highInterestThresholdPct);
  const highBalance = sum(high.map((d) => d.balance));
  const highNames = high.map((d) => d.name).filter(Boolean).join(", ");

  const rungs: Rung[] = [
    {
      kind: "emergency-floor",
      label: "Emergency fund — get to your floor",
      why: "With no buffer at all, the next surprise goes onto a card and undoes the payments underneath it.",
      capacity: Math.max(0, inputs.emergencyGapToFloor),
      enabled: true,
    },
    {
      kind: "employer-match",
      label: "Employer match",
      why: "A match is an immediate return on the money, which nothing further down the ladder comes close to.",
      capacity: Math.max(0, inputs.monthlyMatch),
      enabled: true,
    },
    {
      kind: "high-interest-debt",
      label: highNames ? `Debt above ${inputs.highInterestThresholdPct}% — ${highNames}` : `Debt above ${inputs.highInterestThresholdPct}%`,
      why: `Paying this off is a guaranteed return equal to its rate, and above ${inputs.highInterestThresholdPct}% that beats what investing is expected to earn.`,
      capacity: highBalance,
      enabled: true,
    },
    {
      kind: "emergency-target",
      label: "Emergency fund — get to your target",
      why: "The expensive debt is gone, so the buffer can now go from survivable to comfortable.",
      capacity: Math.max(0, inputs.emergencyGapToTarget - Math.max(0, inputs.emergencyGapToFloor)),
      enabled: true,
    },
    {
      kind: "tax-advantaged",
      label: "Tax-advantaged accounts",
      why: "The same investments, sheltered. The room does not roll over, so unused room is gone at year end.",
      capacity: Math.max(0, inputs.taxAdvantagedRoom),
      enabled: true,
    },
    {
      kind: "low-interest-debt",
      label: "Extra against cheap debt",
      why: "Optional, and deliberately near the bottom: clearing cheap debt early trades an expected higher return for a guaranteed lower one.",
      capacity: Math.max(0, inputs.lowInterestExtra),
      enabled: inputs.lowInterestExtra > 0,
    },
    {
      kind: "taxable",
      label: "Invest the rest",
      why: "Whatever is left goes into your allocation, split by how far each holding has drifted.",
      capacity: Infinity,
      enabled: true,
    },
  ];

  return rungs.map((r) => (off.has(r.kind) ? { ...r, enabled: false } : r));
}
