/** Transactions as a spreadsheet file (D-56). No imports, so checks can run it directly. */

export type ExportTransaction = {
  id: string;
  date: string;
  occurred_at?: string | null;
  transaction_type: string;
  amount: number;
  refund_amount?: number | null;
  currency: string;
  description: string | null;
  category: string | null;
  sub_category: string | null;
  tags: string[] | null;
  notes?: string | null;
  source?: string | null;
};

const CSV_COLUMNS = ["date", "type", "amount", "refund", "currency", "description", "category", "sub_category", "tags", "notes", "source"] as const;

/**
 * One cell: quoted when it holds a comma, quote or line break, and with a
 * leading = + - @ neutralised so a spreadsheet never runs it as a formula.
 */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Transactions as CSV, oldest first, one row each; opens in any spreadsheet. */
export function transactionsCsv(rows: ExportTransaction[]): string {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const lines = sorted.map((t) => [
    t.date.slice(0, 10), t.transaction_type, t.amount, t.refund_amount || "", t.currency, t.description,
    t.category, t.sub_category, (t.tags ?? []).join(" "), t.notes, t.source,
  ].map(csvCell).join(","));
  // A byte-order mark so Excel reads accents and non-Latin names correctly.
  return "﻿" + [CSV_COLUMNS.join(","), ...lines].join("\r\n") + "\r\n";
}
