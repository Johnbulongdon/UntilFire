/**
 * Which bank connections to disconnect so unpaid accounts stop costing a
 * Plaid fee (founder's call, October 14, 2026: "Drop idle banks").
 *
 *   Pro (own or household)  — keeps every bank.
 *   Free, idle 30+ days     — loses every bank; they can reconnect on return.
 *   Free, active            — keeps one bank, the first connected, as the
 *                             free plan promises. Extra banks from a Pro
 *                             spell go 7 days after Pro ended, so a failed
 *                             card or a late renewal doesn't cut anyone off.
 *
 * Synced transactions are kept either way; only the live connection goes.
 */

export const IDLE_DAYS = 30;
export const PRO_GRACE_DAYS = 7;
const DAY = 86_400_000;

export interface CleanupItem { id: string; user_id: string; created_at: string }
export interface CleanupUser {
  pro: boolean;
  /** When the subscription row last changed while not Pro: the end of Pro, near enough. Null when never Pro. */
  proEndedAt: string | null;
  lastActiveAt: string | null;
}

export function planBankCleanup(items: CleanupItem[], users: Map<string, CleanupUser>, now: Date): string[] {
  const byUser = new Map<string, CleanupItem[]>();
  for (const it of items) byUser.set(it.user_id, [...(byUser.get(it.user_id) ?? []), it]);
  const remove: string[] = [];
  for (const [userId, own] of byUser) {
    const u = users.get(userId);
    if (!u || u.pro) continue;
    const idleDays = u.lastActiveAt ? (now.getTime() - Date.parse(u.lastActiveAt)) / DAY : 0;
    if (idleDays >= IDLE_DAYS) { remove.push(...own.map((i) => i.id)); continue; }
    if (own.length <= 1) continue;
    const sinceProDays = u.proEndedAt ? (now.getTime() - Date.parse(u.proEndedAt)) / DAY : Infinity;
    if (sinceProDays < PRO_GRACE_DAYS) continue;
    const oldestFirst = [...own].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    remove.push(...oldestFirst.slice(1).map((i) => i.id));
  }
  return remove;
}
