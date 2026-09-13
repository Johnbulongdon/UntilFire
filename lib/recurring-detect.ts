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
