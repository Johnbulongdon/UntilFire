/**
 * What a goal needs each month to land on its date (money logic study, Oct 16
 * 2026): goals take their share of the monthly saving as a rung on the
 * contribution ladder instead of sitting beside it. Null without a date or
 * once reached; a past date asks for the rest this month.
 */
export interface GoalLike { name?: string; target_amount: number; current_saved: number; target_date?: string | null }

export function goalMonthly(g: GoalLike, now = new Date()): number | null {
  const rest = Number(g.target_amount) - Number(g.current_saved);
  if (!(rest > 0) || !g.target_date) return null;
  const due = new Date(`${g.target_date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const months = (due.getFullYear() - now.getFullYear()) * 12 + due.getMonth() - now.getMonth();
  return rest / Math.max(1, months);
}

/** All goals' monthly share together. */
export const goalsMonthly = (goals: GoalLike[], now = new Date()) => goals.reduce((s, g) => s + (goalMonthly(g, now) ?? 0), 0);

/** The ladder's input: each goal still taking money, with its monthly amount. */
export const goalRungs = (goals: GoalLike[], now = new Date()) =>
  goals.flatMap((g) => { const monthly = goalMonthly(g, now); return monthly ? [{ name: g.name ?? "Goal", monthly }] : []; });
