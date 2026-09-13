/**
 * Spotting repeating payments in transaction history.
 *
 * Extracted from RecurringTab, which used to render the output as a list in
 * its own right. It is now a *suggestion* source: a guess the user accepts
 * into their real list, never a row that appears on its own. A guessed item
 * sitting alongside declared ones is what made the old tab hard to trust —
 * you could not tell which of your bills you had told it about.
 */

export type FrequencyLabel =
  | "weekly" | "biweekly" | "monthly" | "quarterly" | "annual" | "irregular";

export type RawTx = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  transaction_type: "expense" | "income";
};

export type DetectedItem = {
  key: string;
  description: string;
  category: string;
  transaction_type: "expense" | "income";
  avgAmountUSD: number;
  frequency: FrequencyLabel;
  monthCount: number;
  lastSeenDate: string;
  nextDueDate: string;
  daysUntilDue: number;
  occurrences: number;
};

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

export function inferFrequency(avgDays: number): FrequencyLabel {
  if (avgDays >= 5  && avgDays <= 9)   return "weekly";
  if (avgDays >= 10 && avgDays <= 18)  return "biweekly";
  if (avgDays >= 19 && avgDays <= 45)  return "monthly";
  if (avgDays >= 46 && avgDays <= 105) return "quarterly";
  if (avgDays > 105)                   return "annual";
  return "irregular";
}

export function frequencyToDays(f: FrequencyLabel): number {
  return ({ weekly: 7, biweekly: 14, monthly: 30, quarterly: 91, annual: 365, irregular: 30 } as Record<FrequencyLabel, number>)[f];
}

export function toMonthly(amount: number, f: FrequencyLabel): number {
  return ({ weekly: amount * 4.33, biweekly: amount * 2.17, monthly: amount,
            quarterly: amount / 3, annual: amount / 12, irregular: amount } as Record<FrequencyLabel, number>)[f];
}

/** 'irregular' has no place in a recurrence the user commits to. */
export function toRecurrence(f: FrequencyLabel): string {
  return f === "irregular" ? "monthly" : f;
}

export function detectRecurring(
  txns: RawTx[],
  rates: Record<string, number>,
): { expenses: DetectedItem[]; income: DetectedItem[] } {
  const groups = new Map<string, RawTx[]>();
  for (const tx of txns) {
    const key = tx.description.toLowerCase().trim();
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const results: DetectedItem[] = [];

  for (const [key, group] of groups) {
    const distinctMonths = new Set(group.map((t) => t.date.slice(0, 7)));
    if (distinctMonths.size < 2) continue;

    const sortedDates = [...group.map((t) => t.date)].sort();
    let totalGap = 0, gapCount = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (new Date(sortedDates[i] + "T00:00:00").getTime() -
                    new Date(sortedDates[i - 1] + "T00:00:00").getTime()) / 86_400_000;
      if (diff > 0) { totalGap += diff; gapCount++; }
    }
    const avgGap = gapCount > 0 ? totalGap / gapCount : 30;
    const frequency = inferFrequency(avgGap);
    if (frequency === "irregular" && avgGap < 5) continue;

    const amounts = group.map((t) => toUSD(t.amount, t.currency, rates));
    const avgAmountUSD = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avgAmountUSD > 0) {
      // A bill whose amount swings more than 20% is not a fixed commitment,
      // and guessing a figure for it would be worse than staying quiet.
      const stdDev = Math.sqrt(amounts.reduce((s, a) => s + (a - avgAmountUSD) ** 2, 0) / amounts.length);
      if (stdDev / avgAmountUSD > 0.2) continue;
    }
    const lastSeenDate = sortedDates[sortedDates.length - 1];
    const mostRecent = group.find((t) => t.date === lastSeenDate)!;

    const nextDate = new Date(new Date(lastSeenDate + "T00:00:00").getTime() + frequencyToDays(frequency) * 86_400_000);
    const nextDueDate = nextDate.toISOString().split("T")[0];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.round((nextDate.getTime() - today.getTime()) / 86_400_000);

    results.push({
      key, description: mostRecent.description, category: mostRecent.category,
      transaction_type: mostRecent.transaction_type, avgAmountUSD, frequency,
      monthCount: distinctMonths.size, lastSeenDate, nextDueDate, daysUntilDue,
      occurrences: group.length,
    });
  }

  const sorted = results.sort((a, b) => b.avgAmountUSD - a.avgAmountUSD);
  return {
    expenses: sorted.filter((r) => r.transaction_type !== "income"),
    income:   sorted.filter((r) => r.transaction_type === "income"),
  };
}

/**
 * Do two descriptions name the same thing?
 *
 * A bank writes "ANTHROPIC CLAUDE SUBSCR" where a person writes "Claude", so
 * exact matching shows both and leaves the reader deciding which of their own
 * bills is the real one. Matching on the meaningful words instead means an
 * item you already added suppresses the suggestion for it.
 *
 * Deliberately biased toward declaring a match: a missed suggestion costs a
 * few seconds of typing, a duplicate costs trust in the list.
 */
const NOISE = new Set([
  "the", "inc", "llc", "ltd", "co", "com", "www", "payment", "payments", "pay",
  "subscription", "subscr", "sub", "monthly", "annual", "yearly", "recurring",
  "autopay", "auto", "ach", "pos", "debit", "credit", "card", "bill", "invoice",
  "purchase", "online", "store", "and", "for", "from", "ref",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !NOISE.has(t) && !/^\d+$/.test(t));
}

export function sameMerchant(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;

  const sa = new Set(ta);
  const sb = new Set(tb);

  // One name being wholly contained in the other covers the common case:
  // a person's short label inside the bank's longer string.
  const aInB = ta.every((t) => sb.has(t));
  const bInA = tb.every((t) => sa.has(t));
  if (aInB || bInA) return true;

  // Otherwise a shared distinctive word is enough — "Spotify Family" and
  // "Spotify UK" are one subscription, not two.
  return ta.some((t) => t.length >= 4 && sb.has(t));
}

/**
 * A recurrence is a frequency the user has committed to, plus "none" for a
 * one-off. Detection deals in FrequencyLabel (which can be "irregular");
 * stored rows deal in this. Keeping them as separate types stops an
 * "irregular" ever being written as if someone had chosen it.
 */
export type Recurrence = "none" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "One-off", weekly: "Weekly", biweekly: "Every 2 weeks",
  monthly: "Monthly", quarterly: "Quarterly", annual: "Yearly",
};

/** Days to the next occurrence. A one-off has none, so 0. */
export function recurrenceDays(r: Recurrence): number {
  return r === "none" ? 0 : frequencyToDays(r);
}

/** What a repeating amount costs per month. A one-off costs nothing per month. */
export function recurrenceToMonthly(amount: number, r: Recurrence): number {
  return r === "none" ? 0 : toMonthly(amount, r);
}
