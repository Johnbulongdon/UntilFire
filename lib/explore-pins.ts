/**
 * The pure half of Explore (D-58): your year in a city, pin labels, country
 * pins and Zillow-style placement. No data imports, so checks run it directly.
 */
import { REAL_RETURN, yearsToTarget } from "./fire/strategies/traditional.ts";

/** The fields placement and labels need; ExploreCity satisfies it. */
export interface PinCity { key: string; place: string; flag: string; lat: number; lng: number; us: boolean; region: string; monthlyUSD: number; annualUSD: number }

/** What the visitor told the calculator, in USD. Age is optional. */
export interface ExplorePlan {
  saved: number;
  monthlySaving: number;
  age?: number;
  realReturn?: number;
  /**
   * Target per dollar of a city's typical yearly cost. 25 by default (4%
   * withdrawal). Scaled by how you spend against your own city's typical
   * cost, so your home city gives the calculator's year (D-58), and in the
   * app it carries lifestyle and tax in retirement as the freedom date does.
   */
  targetMultiple?: number;
  /** The currency the numbers were entered in, for showing money back (amounts here are USD). */
  currency?: string;
  /** Take-home a month, USD: half-time pay for the Gold badge (D-67). Unknown, Gold is not judged. */
  monthlyIncome?: number;
  /** Spending a month today, USD. Unset, take-home less saving (right only when saving is all from take-home). */
  monthlySpend?: number;
  /** Of `saved`, what can be drawn before the pension opens (taxable, cash, Roth paid-in). Unset, all of it. */
  reachable?: number;
  /** The age badges are judged by: the pension opens. 59½ unless the plan says otherwise. */
  retireAge?: number;
  /** Target per dollar of spending for badges: 1 ÷ withdrawal rate, never scaled by lifestyle (D-67). */
  withdrawalMultiple?: number;
}

/**
 * Freedom badges (D-67): for each city, how you could get there and how
 * you could live, judged by the same age for everyone (when the pension
 * opens, 59½ by default). Metal is the means, each harder than the last:
 * Bronze keeps working full time, Silver stops saving now and just covers
 * costs (Coast FIRE), Gold works half time from now with savings covering
 * the gap (Barista FIRE). Stars are the life once free, as a share of the
 * city's typical cost: 1 frugal (75%), 2 medium (100%), 3 wealthy (150%).
 * Stars count the levels reached, so a metal always implies the one below.
 */
export type Metal = "bronze" | "silver" | "gold";
export type Badges = Record<Metal, number> & { goldJudged: boolean };
export const BADGE_LIFE = [0.75, 1, 1.5] as const;
export const BADGE_RETIRE_AGE = 59.5;

/** Whether the means has the target by the retire age without running out of reachable money on the way. */
function reaches(plan: ExplorePlan, target: number, means: Metal): boolean {
  const years = (plan.retireAge ?? BADGE_RETIRE_AGE) - (plan.age ?? 0);
  if (years < 0) return plan.saved >= target;
  const r = plan.realReturn ?? REAL_RETURN;
  // Gold's yearly flow: half the take-home less today's spending (take-home less saving), often negative.
  const flow = means === "bronze" ? plan.monthlySaving * 12
    : means === "silver" ? 0
    : ((plan.monthlyIncome ?? 0) * 0.5 - (plan.monthlySpend ?? (plan.monthlyIncome ?? 0) - plan.monthlySaving)) * 12;
  let reach = Math.min(plan.saved, plan.reachable ?? plan.saved), locked = plan.saved - reach;
  // Judged at the retire age, every year lived through: money above the target but
  // locked in a pension cannot pay for the half-time years before it opens.
  for (let y = 0; y < years; y++) {
    if (flow < 0) { reach += flow; if (reach < 0) return false; } // withdrawn at the start of the year (D-65, D-66)
    reach = reach * (1 + r) + Math.max(flow, 0);
    locked *= 1 + r;
  }
  return reach + locked >= target;
}

/** A city's badges for a plan, or null without an age to judge by. */
export function freedomBadges(city: Pick<PinCity, "annualUSD">, plan: ExplorePlan): Badges | null {
  if (plan.age == null) return null;
  const multiple = plan.withdrawalMultiple ?? 25;
  const stars = (m: Metal) => BADGE_LIFE.filter((f) => reaches(plan, city.annualUSD * f * multiple, m)).length;
  const goldJudged = (plan.monthlyIncome ?? 0) > 0;
  const bronze = stars("bronze"), silver = Math.min(stars("silver"), bronze);
  // Gold sits above Silver: half-time pay that out-earns your costs is saving, not Barista FIRE.
  return { bronze, silver, gold: goldJudged ? Math.min(stars("gold"), silver) : 0, goldJudged };
}

/** The highest metal with any stars, for a pin. */
export function bestBadge(b: Badges | null): { metal: Metal; stars: number } | null {
  if (!b) return null;
  for (const m of ["gold", "silver", "bronze"] as Metal[]) if (b[m] > 0) return { metal: m, stars: b[m] };
  return null;
}
export const MEDAL: Record<Metal, string> = { bronze: "🥉", silver: "🥈", gold: "🥇" };

export interface Freedom {
  years: number;
  /** This year plus the years to freedom; its floor is the freedom year. */
  at: number;
  age: number | null;
}

/** When work becomes optional if this city's typical cost is what you retire on. Null past 65 years. */
export function freedomIn(city: Pick<PinCity, "annualUSD">, plan: ExplorePlan, now = new Date()): Freedom | null {
  const years = yearsToTarget(plan.saved, plan.monthlySaving * 12, city.annualUSD * (plan.targetMultiple ?? 25), plan.realReturn ?? REAL_RETURN);
  if (years == null) return null;
  // Counted from today, like the calculator (D-65): the year the freedom date
  // falls in, so the same numbers give the same year here.
  const at = now.getFullYear() + (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (365.25 * 864e5) + years;
  return { years, at, age: plan.age != null ? Math.round(plan.age + years) : null }; // rounded, as freedomAgeAt (D-65)
}

export type PinMode = "monthly" | "year" | "age" | "badge";

/** What a pin or badge says in each mode. Short: pins are small. */
export function pinText(city: Pick<PinCity, "monthlyUSD">, mode: PinMode, freedom: Freedom | null, money?: (usd: number) => string, badges?: Badges | null): string {
  // Money in your currency when the page passes a formatter; USD otherwise.
  if (mode === "monthly") return money ? money(city.monthlyUSD) : `$${(city.monthlyUSD / 1000).toFixed(1)}k`;
  if (mode === "badge") { const b = bestBadge(badges ?? null); return b ? `${MEDAL[b.metal]}${"★".repeat(b.stars)}` : "🔒"; }
  if (!freedom) return "—";
  return mode === "year" ? `${Math.floor(freedom.at)}` : freedom.age != null ? `${freedom.age}` : "—";
}

/** One typical figure per country, for the zoomed-out globe: the median city. The US is one country. */
export function countryPins<T extends PinCity>(cities: T[]) {
  const groups = new Map<string, T[]>();
  // By country (its flag), not by tax region: US states and Canadian
  // provinces each carry their own tax key, but the globe shows one pin a country.
  for (const c of cities) { const key = c.us ? "us" : c.flag; groups.set(key, [...(groups.get(key) ?? []), c]); }
  return [...groups.entries()].map(([region, list]) => {
    const sorted = [...list].sort((a, b) => a.monthlyUSD - b.monthlyUSD);
    const mid = sorted[Math.floor(sorted.length / 2)];
    return {
      region, place: region === "us" ? "United States" : mid.place, flag: mid.flag, count: list.length, mid,
      lat: list.reduce((t, c) => t + c.lat, 0) / list.length,
      lng: list.reduce((t, c) => t + c.lng, 0) / list.length,
    };
  });
}

export type Side = "up" | "down" | "right" | "left";
export interface PinPlacement { key: string; x: number; y: number; side: Side | null }
type Box = [number, number, number, number];

const PIN_H = 22, GAP = 6, PAD = 3;
function boxFor(x: number, y: number, w: number, side: Side): Box {
  if (side === "up") return [x - w / 2, y - GAP - PIN_H, w, PIN_H];
  if (side === "down") return [x - w / 2, y + GAP, w, PIN_H];
  if (side === "right") return [x + GAP, y - PIN_H / 2, w, PIN_H];
  return [x - GAP - w, y - PIN_H / 2, w, PIN_H];
}
const overlaps = (a: Box, b: Box) =>
  a[0] < b[0] + b[2] + PAD && b[0] < a[0] + a[2] + PAD && a[1] < b[1] + b[3] + PAD && b[1] < a[1] + a[3] + PAD;

/**
 * Zillow-style placement. Points arrive in priority order (selected, then
 * starred, then the rest). Each tries above, below, right, then left of its
 * point, inside the frame and clear of every pill placed before it; one with
 * no room becomes a dot (side null). Pinned keys always get a pill, above.
 */
export function placePins(
  points: { key: string; x: number; y: number; width: number }[],
  frame: { width: number; height: number },
  pinned: Set<string> = new Set(),
): PinPlacement[] {
  const taken: Box[] = [];
  const inside = (b: Box) => b[0] >= 2 && b[1] >= 2 && b[0] + b[2] <= frame.width - 2 && b[1] + b[3] <= frame.height - 2;
  return points.map(({ key, x, y, width }) => {
    const sides: Side[] = ["up", "down", "right", "left"];
    let side = sides.find((s) => { const b = boxFor(x, y, width, s); return inside(b) && taken.every((t) => !overlaps(b, t)); }) ?? null;
    if (!side && pinned.has(key)) side = sides.find((s) => inside(boxFor(x, y, width, s))) ?? "up";
    if (side) taken.push(boxFor(x, y, width, side));
    return { key, x, y, side };
  });
}

/** Rough pill width for a label, in px, at the 11px mono pin size. */
export const pinWidth = (text: string) => Math.ceil(text.length * 7 + 16);
