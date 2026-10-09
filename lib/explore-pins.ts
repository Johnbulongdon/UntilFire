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
}

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
  // Counted from the calendar year, like the calculator (retireYear =
  // this year + whole years), so the same numbers give the same year here.
  const at = now.getFullYear() + years;
  return { years, at, age: plan.age != null ? Math.floor(plan.age + years) : null };
}

export type PinMode = "monthly" | "year" | "age";

/** What a pin or badge says in each mode. Short: pins are small. */
export function pinText(city: Pick<PinCity, "monthlyUSD">, mode: PinMode, freedom: Freedom | null): string {
  if (mode === "monthly") return `$${(city.monthlyUSD / 1000).toFixed(1)}k`;
  if (!freedom) return "—";
  return mode === "year" ? `${Math.floor(freedom.at)}` : freedom.age != null ? `${freedom.age}` : "—";
}

/** One typical figure per country, for the zoomed-out globe: the median city. */
export function countryPins<T extends PinCity>(cities: T[]) {
  const groups = new Map<string, T[]>();
  for (const c of cities) if (!c.us) groups.set(c.region, [...(groups.get(c.region) ?? []), c]);
  return [...groups.entries()].map(([region, list]) => {
    const sorted = [...list].sort((a, b) => a.monthlyUSD - b.monthlyUSD);
    const mid = sorted[Math.floor(sorted.length / 2)];
    return {
      region, place: mid.place, flag: mid.flag, count: list.length, mid,
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
