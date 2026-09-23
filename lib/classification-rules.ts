/**
 * Applying a user's need/want rules to transactions they have not tagged.
 *
 * A rule is per category and sub-category — "Food · Groceries is a need" —
 * and until now it was only ever applied at the moment it was set. Plaid's
 * sync writes every imported transaction with `tags: []`, so next month's
 * groceries arrived untagged even though the rule already existed, and
 * anything that counts needs (the emergency fund target, the contribution
 * ladder's monthly expenses) quietly read low.
 *
 * Reading low is the dangerous direction: a needs figure that is too small
 * makes the emergency fund target too small, so the ladder believes the
 * buffer is nearly full and sends money past it into investments.
 *
 * The one rule this module follows: never overwrite a tag a transaction
 * already has. A rule fills a gap; it does not overrule the person. That is
 * what makes it safe to run over everything on every sync — it converges,
 * and a transaction the user deliberately tagged the other way stays put.
 */

export type Classification = "need" | "want";

export interface ClassificationRule {
  category: string;
  sub_category: string;
  classification: Classification;
}

export interface TaggableExpense {
  id: string;
  category?: string | null;
  sub_category?: string | null;
  tags?: string[] | null;
  transaction_type?: string | null;
}

/** Rules are matched case-insensitively, the same way the Categories screen
 *  matches them (`ilike`), because Plaid's capitalisation is not stable. */
export function ruleKey(category?: string | null, subCategory?: string | null): string {
  return `${(category ?? "").trim().toLowerCase()}\u0000${(subCategory ?? "").trim().toLowerCase()}`;
}

export function indexRules(rules: ClassificationRule[]): Map<string, Classification> {
  const index = new Map<string, Classification>();
  for (const rule of rules) {
    if (rule.classification !== "need" && rule.classification !== "want") continue;
    index.set(ruleKey(rule.category, rule.sub_category), rule.classification);
  }
  return index;
}

/** What this transaction should be tagged, or null to leave it alone. */
export function tagFor(
  expense: TaggableExpense,
  rules: Map<string, Classification>,
): Classification | null {
  if (expense.transaction_type && expense.transaction_type !== "expense") return null;
  const tags = expense.tags ?? [];
  if (tags.includes("need") || tags.includes("want")) return null;   // already answered
  if (!expense.category || !expense.sub_category) return null;       // nothing to match on
  return rules.get(ruleKey(expense.category, expense.sub_category)) ?? null;
}

/** The rows to write, and only those — an empty result means no work. */
export function planTagging(
  expenses: TaggableExpense[],
  rules: ClassificationRule[],
): { id: string; tags: string[] }[] {
  const index = indexRules(rules);
  if (index.size === 0) return [];
  const updates: { id: string; tags: string[] }[] = [];
  for (const expense of expenses) {
    const tag = tagFor(expense, index);
    if (tag) updates.push({ id: expense.id, tags: [...(expense.tags ?? []), tag] });
  }
  return updates;
}
