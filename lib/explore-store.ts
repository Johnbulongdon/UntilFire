/**
 * Your numbers for Explore (D-58), kept in this browser. The calculator writes
 * them when your result appears, so Explore never asks twice; the page's own
 * fields write the same place. In USD, like every city cost.
 */
import type { ExplorePlan } from "./explore-pins";

export const EXPLORE_PLAN_KEY = "uf_explore_plan";

export function readExplorePlan(): ExplorePlan | null {
  try {
    const raw = localStorage.getItem(EXPLORE_PLAN_KEY);
    const p = raw ? JSON.parse(raw) as ExplorePlan : null;
    return p && Number.isFinite(p.monthlySaving) ? p : null;
  } catch { return null; }
}

export function saveExplorePlan(plan: ExplorePlan): void {
  try { localStorage.setItem(EXPLORE_PLAN_KEY, JSON.stringify(plan)); } catch { /* private mode */ }
}
