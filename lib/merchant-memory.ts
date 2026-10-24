/**
 * Suggest a transaction's category, sub-category and need/want from how the
 * person filed the same merchant before.
 *
 * Imports (bank CSVs, Alipay statements) arrive as "other", and the AI step
 * only ever guessed need/want, so every month started from nothing. Most
 * spending is repeat merchants, and the person has usually already said what
 * they are: that history is a better guess than any model, costs nothing,
 * and works in any language.
 *
 * Memory is the history itself, not a separate rules table: approving a
 * suggestion saves the transaction, and that saved transaction is next
 * month's evidence. "Remember this" therefore needs no extra step.
 */

export interface HistoryTx {
  id: string;
  description: string;
  category?: string | null;
  sub_category?: string | null;
  tags?: string[] | null;
  date: string;
  transaction_type?: string | null;
}

export interface MerchantSuggestion {
  category: string | null;
  sub_category: string | null;
  classification: "need" | "want" | null;
  /** How many past transactions agree with the category (or need/want). */
  seen: number;
}

const UNFILED = new Set(["", "other", "uncategorized", "uncategorised"]);

/**
 * The part of a description that names the merchant. Card processors append
 * reference numbers, dates and store numbers ("SQ *BLUE BOTTLE 0423",
 * "Amazon Mktp US*2K4"), so any word containing a digit is dropped, along
 * with punctuation, and the rest compared case-insensitively. Non-Latin text
 * (中国移动, 美团) is kept as is.
 */
export function merchantKey(description: string): string {
  return description
    .toLowerCase()
    .split(/[\s*#()（）[\]/\\|,.:;_-]+/)
    // A word with a digit in it is a reference ("2K4AB", "0423"), not a name.
    .filter((w) => w && !/[0-9]/.test(w))
    .map((w) => w.replace(/[^\p{L}]+/gu, ""))
    .filter(Boolean)
    .join(" ");
}

type Tally = { counts: Map<string, number>; latest: Map<string, string> };
const tally = (): Tally => ({ counts: new Map(), latest: new Map() });
function add(t: Tally, value: string, date: string) {
  t.counts.set(value, (t.counts.get(value) ?? 0) + 1);
  if ((t.latest.get(value) ?? "") < date) t.latest.set(value, date);
}
/** Most frequent value; ties go to the most recent, since habits change. */
function best(t: Tally): [string, number] | null {
  let top: [string, number] | null = null;
  for (const [v, n] of t.counts) {
    if (!top || n > top[1] || (n === top[1] && (t.latest.get(v) ?? "") > (t.latest.get(top[0]) ?? ""))) top = [v, n];
  }
  return top;
}

export type MerchantMemory = Map<string, { cat: Tally; need: Tally }>;

/** Learn from every expense the person has already filed or tagged. */
export function buildMerchantMemory(history: HistoryTx[]): MerchantMemory {
  const memory: MerchantMemory = new Map();
  for (const tx of history) {
    if (tx.transaction_type && tx.transaction_type !== "expense") continue;
    const key = merchantKey(tx.description ?? "");
    if (!key) continue;
    const cat = (tx.category ?? "").trim();
    const nw = tx.tags?.includes("need") ? "need" : tx.tags?.includes("want") ? "want" : null;
    const filed = !UNFILED.has(cat.toLowerCase());
    if (!filed && !nw) continue;
    let m = memory.get(key);
    if (!m) memory.set(key, (m = { cat: tally(), need: tally() }));
    if (filed) add(m.cat, `${cat}\u0000${(tx.sub_category ?? "").trim()}`, tx.date);
    if (nw) add(m.need, nw, tx.date);
  }
  return memory;
}

export function suggestFromHistory(tx: HistoryTx, memory: MerchantMemory): MerchantSuggestion | null {
  const m = memory.get(merchantKey(tx.description ?? ""));
  if (!m) return null;
  const c = best(m.cat);
  const n = best(m.need);
  if (!c && !n) return null;
  const [category, sub] = c ? c[0].split("\u0000") : [null, null];
  return {
    category: category || null,
    sub_category: sub || null,
    classification: (n?.[0] as "need" | "want" | undefined) ?? null,
    seen: Math.max(c?.[1] ?? 0, n?.[1] ?? 0),
  };
}
