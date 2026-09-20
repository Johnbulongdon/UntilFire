/**
 * The time of day a transaction happened — optional everywhere.
 *
 * Transactions carry a date and, for some of them, a time. Plaid supplies one
 * for select institutions; a WeChat or bank CSV usually has it sitting inside
 * the date column already; and someone entering a transaction by hand may
 * simply know it. None of those are guaranteed, so every function here
 * returns null rather than a guess, and `date` stays the authoritative field
 * that everything groups and sums by.
 *
 * Pure and dependency-free so it can be tested without a bundler.
 */

/**
 * Midnight is Plaid's placeholder, not a time.
 *
 * Plaid's own documentation says these fields "may contain default time
 * values (such as 00:00:00)". Storing that would print "12:00 AM" against
 * transactions whose time nobody knows, which is worse than printing nothing
 * — it looks like information.
 *
 * The cost is losing the handful of transactions that genuinely happened at
 * midnight. Silence about a real midnight is a smaller error than a confident
 * midnight about an unknown time.
 */
export function isPlaceholderTime(iso: string): boolean {
  return /T00:00(:00(\.0+)?)?(Z|[+-]00:?00)?$/.test(iso.trim());
}

/**
 * The moment to show for a Plaid transaction, or null.
 *
 * `authorized_datetime` is preferred over `datetime` on Plaid's own advice:
 * for a posted transaction, `datetime` is when the bank posted it while
 * `authorized_datetime` is when the person actually made it — which is the
 * one a human recognises.
 */
export function plaidOccurredAt(
  authorizedDatetime?: string | null,
  datetime?: string | null,
): string | null {
  for (const candidate of [authorizedDatetime, datetime]) {
    if (!candidate) continue;
    const value = candidate.trim();
    if (!value || isPlaceholderTime(value)) continue;
    if (Number.isNaN(Date.parse(value))) continue;
    return new Date(value).toISOString();
  }
  return null;
}

/**
 * The time hiding inside a spreadsheet's date cell.
 *
 * Statement exports routinely put a full timestamp in the column mapped as
 * the date — WeChat's 交易时间 literally means "transaction time" — and the
 * importer parses the date out and drops the rest. This recovers it.
 *
 * Returns "HH:MM" in 24-hour form, or null when the cell is only a date.
 * Midnight is treated as absent for the same reason as above: a date-only
 * cell parsed as a timestamp lands on 00:00 and would otherwise become a
 * confident, wrong time on every row.
 */
export function timeFromCell(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = String(raw).trim();

  // 14:32 or 14:32:05, anywhere in the cell, optionally followed by am/pm.
  //
  // Not \b before the hour: in an ISO cell like 2026-09-19T14:32 the "T" and
  // the "1" are both word characters, so there is no boundary between them
  // and the whole ISO format silently stopped matching. Requiring a non-digit
  // instead still stops "123:45" being read as "23:45".
  const match = text.match(/(?:^|[^\d])(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  if (hour === 0 && minute === 0) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * A date and a wall-clock time, as the instant they name where the reader is.
 *
 * "14:30 on the 19th" means 14:30 in the timezone of whoever typed it, so it
 * is combined in local time rather than assumed to be UTC. Storing the
 * instant means it renders back as 14:30 for them, and correctly shifted for
 * a partner in another country reading the same household.
 */
export function combineDateAndTime(date: string, time: string | null | undefined): string | null {
  if (!date || !time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;

  const local = new Date(y, m - 1, d, Number(match[1]), Number(match[2]), 0, 0);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

/** "14:32" for an input[type=time], or "" when there is no time to show. */
export function timeInputValue(occurredAt: string | null | undefined): string {
  if (!occurredAt) return "";
  const when = new Date(occurredAt);
  if (Number.isNaN(when.getTime())) return "";
  return `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
}

/** How a time reads in a transaction list, in the reader's own locale. */
export function formatTime(occurredAt: string | null | undefined, locale?: string): string | null {
  if (!occurredAt) return null;
  const when = new Date(occurredAt);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}
