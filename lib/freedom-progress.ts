/**
 * "How far you've come" (goal gradient): the freedom number is often 15+
 * years away, too far to feel. So Home shows the share already there and the
 * next quarter mark, which is always close enough to chase.
 *
 * `invested` and `target` are the freedom date's own numbers (the pot that
 * counts, the FIRE target), in one currency. `path` is the same projection
 * year by year, to say when the next mark is reached; without it, no year.
 * Shared by the website (FreedomCard) and the phone (Home hero).
 */

export const PROGRESS_MARKS = [0.25, 0.5, 0.75, 1] as const;

export interface FreedomProgress {
  /** 0 to 1. */
  share: number;
  /** The next mark ahead, null once the target is reached. */
  next: { mark: number; toGo: number; year: number | null } | null;
}

export function freedomProgress(invested: number, target: number, path: { year: number; value: number }[] = []): FreedomProgress | null {
  if (!(target > 0) || !Number.isFinite(invested)) return null;
  const share = Math.min(1, Math.max(0, invested / target));
  const mark = PROGRESS_MARKS.find((m) => share < m);
  if (mark == null) return { share, next: null };
  const at = path.find((p) => p.value >= target * mark);
  return { share, next: { mark, toGo: target * mark - Math.max(0, invested), year: at ? at.year : null } };
}

/** "23%": whole percent, but never 100% before it is all there, nor 0% once something is. */
export function progressPercent(share: number): string {
  const pct = share >= 1 ? 100 : share > 0 ? Math.min(99, Math.max(1, Math.round(share * 100))) : 0;
  return `${pct}%`;
}
