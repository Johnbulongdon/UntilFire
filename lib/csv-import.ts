/**
 * Reading a bank's CSV export into transactions: the parsing rules from
 * app/dashboard/CsvImportModal.tsx, moved here unchanged so the iOS app
 * imports a file exactly as the website does. Pure, so it runs in the app,
 * on the server and in scripts/verify-csv-import.ts alike.
 *
 * The website's modal still carries its own copy (it also reads Excel and
 * PDF statements); it should import these once it is next touched.
 */
import { SUPPORTED_CURRENCIES } from "./currency.ts";
import { combineDateAndTime, timeFromCell } from "./transaction-time.ts";

export type ImportType = "expense" | "income" | "transfer";

export type ParsedImportTransaction = {
  date: string;
  occurred_at: string | null;
  description: string;
  notes: string;
  amount: number;
  currency: string;
  transaction_type: ImportType;
  category: string;
};

export type ColumnMap = { date: string; description: string; notes: string; amount: string; currency: string; type: string };

// Some banks (e.g. WeChat Pay) prepend title/metadata rows before the real header row.
// A row counts as the header row once at least 2 of its cells match one of these patterns.
const HEADER_INDICATORS = [/交易时间/, /^\s*date/i, /金额/, /amount/i];

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const delim = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === delim && !inQ) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const cells = lines[i].split(delim);
    const hits = cells.filter(c => HEADER_INDICATORS.some(p => p.test(c.replace(/^"|"$/g, "").trim()))).length;
    if (hits >= 2) { headerIdx = i; break; }
  }
  const headers = parseLine(lines[headerIdx]).map((h) => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(headerIdx + 1).map(parseLine);
  return { headers, rows };
}

export function parseDate(s: string): string | null {
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}`;
  // WeChat Pay and other banks export datetime strings like "2026-05-29 15:14:49"
  const dt = s.match(/^(\d{4}-\d{2}-\d{2})\s\d{2}:\d{2}:\d{2}$/);
  if (dt) return dt[1];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

export function parseAmount(s: string): number | null {
  s = s.trim().replace(/[^0-9().,-]/g, "").replace(/,/g, "");
  const paren = s.match(/^\((.+)\)$/);
  if (paren) return -Math.abs(parseFloat(paren[1]));
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Moving money between accounts (or to/from another person), not earning or
// spending it - matched on the word itself rather than generic deposit/
// withdrawal language, since those alone don't distinguish a transfer from
// real income (e.g. a salary deposit).
export const TRANSFER_PATTERN = /\btransfer\b|轉賬|轉帳|轉數快/i;

export function guessCategory(desc: string, type: ImportType): string {
  const d = desc.toLowerCase();
  if (type === "transfer") return "transfer";
  if (type === "income") {
    if (/salary|payroll|direct dep|wages/.test(d)) return "salary";
    if (/freelance|consulting|invoice/.test(d)) return "freelance";
    if (/dividend|interest|capital gain/.test(d)) return "investment";
    return "other_income";
  }
  if (/uber|lyft|taxi|transit|parking|gas station|fuel|subway|metro|bus/.test(d)) return "transport";
  if (/netflix|spotify|hulu|disney|apple\.com\/bill|subscription|amazon prime/.test(d)) return "subscriptions";
  if (/grocery|whole foods|trader joe|kroger|safeway|aldi|costco|publix/.test(d)) return "food";
  if (/restaurant|mcdonald|starbucks|chipotle|doordash|grubhub|ubereats|cafe|diner/.test(d)) return "food";
  if (/amazon|target|walmart|best buy|ebay|shop|store|mall/.test(d)) return "shopping";
  if (/rent|mortgage|utilities|electric|water|internet|comcast|verizon/.test(d)) return "housing";
  if (/doctor|hospital|pharmacy|cvs|walgreens|dental|clinic|health/.test(d)) return "healthcare";
  if (/movie|theater|cinema|concert|spotify|ticketmaster|steam|game/.test(d)) return "entertainment";
  if (/hotel|airbnb|flight|airline|united|delta|american air|booking/.test(d)) return "travel";
  return "other";
}

export function normalizeCurrencyCode(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();

  if (SUPPORTED_CURRENCIES.includes(upper as (typeof SUPPORTED_CURRENCIES)[number])) return upper;
  if (upper === "RMB") return "CNY";
  if (upper === "CNH") return "CNY";

  if (/HONG KONG|HKD/.test(upper)) return "HKD";
  if (/SINGAPORE|SGD/.test(upper)) return "SGD";
  if (/AUSTRALIA|AUD/.test(upper)) return "AUD";
  if (/CANADA|CAD/.test(upper)) return "CAD";
  if (/NEW ZEALAND|NZD/.test(upper)) return "NZD";
  if (/UNITED STATES|US DOLLAR|USD/.test(upper)) return "USD";
  if (/EURO|EUR/.test(upper)) return "EUR";
  if (/POUND|STERLING|GBP/.test(upper)) return "GBP";
  if (/YEN|JPY/.test(upper)) return "JPY";
  if (/YUAN|RENMINBI|CNY/.test(upper)) return "CNY";
  if (/RUPEE|INR/.test(upper)) return "INR";
  if (/WON|KRW/.test(upper)) return "KRW";
  if (/FRANC|CHF/.test(upper)) return "CHF";

  return null;
}

export function detectCurrencyFromValue(value: string, fallbackCurrency: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const normalized = normalizeCurrencyCode(raw);
  if (normalized) return normalized;

  const upper = raw.toUpperCase();
  if (upper.includes("HK$")) return "HKD";
  if (upper.includes("SGD") || upper.includes("S$")) return "SGD";
  if (upper.includes("AUD") || upper.includes("A$")) return "AUD";
  if (upper.includes("CAD") || upper.includes("C$")) return "CAD";
  if (upper.includes("NZD") || upper.includes("NZ$")) return "NZD";
  if (upper.includes("CHF")) return "CHF";
  if (upper.includes("EUR") || raw.includes("€")) return "EUR";
  if (upper.includes("GBP") || raw.includes("£")) return "GBP";
  if (upper.includes("JPY") || upper.includes("CNY") || upper.includes("RMB") || raw.includes("¥")) {
    if (fallbackCurrency === "CNY") return "CNY";
    if (fallbackCurrency === "JPY") return "JPY";
    return upper.includes("CNY") || upper.includes("RMB") ? "CNY" : "JPY";
  }
  if (upper.includes("INR") || raw.includes("₹")) return "INR";
  if (upper.includes("KRW") || raw.includes("₩")) return "KRW";
  if (upper.includes("USD") || upper.includes("US$")) return "USD";
  if (raw.includes("$") && normalizeCurrencyCode(fallbackCurrency)) return fallbackCurrency;

  return null;
}

export function autoDetectColumns(headers: string[]): ColumnMap {
  // Test against original header (not lowercased) so Chinese chars are matched
  const find = (patterns: RegExp[]) =>
    headers.find((h) => patterns.some((p) => p.test(h))) ?? "";
  return {
    date: find([/交易时间/, /^date$/i, /date/i, /posted/i, /transaction.?date/i]),
    description: find([/交易对方/, /description/i, /memo/i, /details/i, /narrative/i, /payee/i, /name/i]),
    notes: find([/商品/, /备注/, /^notes?$/i, /note/i, /remark/i, /comment/i]),
    amount: find([/金额/, /^amount$/i, /amount/i, /debit/i, /credit/i, /transaction.?amount/i]),
    currency: find([/^currency$/i, /currency.?code/i, /currency/i, /^ccy$/i, /curr/i]),
    type: find([/收.支/, /^type$/i, /transaction.?type/i, /income/i]),
  };
}

export function inferImportCurrency({ headers, rows, colAmount, colCurrency, fallbackCurrency }: {
  headers: string[]; rows: string[][]; colAmount: string; colCurrency: string; fallbackCurrency: string;
}): string {
  const currencyIdx = colCurrency ? headers.indexOf(colCurrency) : -1;
  const amountIdx = colAmount ? headers.indexOf(colAmount) : -1;
  const counts = new Map<string, number>();
  for (const row of rows.slice(0, 25)) {
    const rawCurrency = currencyIdx >= 0 ? row[currencyIdx] ?? "" : "";
    const rawAmount = amountIdx >= 0 ? row[amountIdx] ?? "" : "";
    const detected = normalizeCurrencyCode(rawCurrency) || detectCurrencyFromValue(rawAmount, fallbackCurrency);
    if (!detected) continue;
    counts.set(detected, (counts.get(detected) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ?? fallbackCurrency;
}

/** Every usable row as a transaction, as the modal's buildParsedTransactions does. */
export function buildTransactions(headers: string[], rows: string[][], cols: ColumnMap, opts: { flipSigns: boolean; importCurrency: string }): ParsedImportTransaction[] {
  if (!cols.date || !cols.description || !cols.amount) return [];
  const idx = (c: string) => (c ? headers.indexOf(c) : -1);
  const dateIdx = idx(cols.date), descIdx = idx(cols.description), notesIdx = idx(cols.notes);
  const amtIdx = idx(cols.amount), currencyIdx = idx(cols.currency), typeIdx = idx(cols.type);

  const parsed: ParsedImportTransaction[] = [];
  for (const row of rows) {
    const rawDate = row[dateIdx] ?? "";
    const rawDesc = row[descIdx] ?? "";
    const rawNotes = notesIdx >= 0 ? row[notesIdx] ?? "" : "";
    const rawAmount = row[amtIdx] ?? "";
    const rawCurrency = currencyIdx >= 0 ? row[currencyIdx] ?? "" : "";
    const rawTypeVal = typeIdx >= 0 ? row[typeIdx] ?? "" : "";

    const date = parseDate(rawDate);
    const rawAmt = parseAmount(rawAmount);
    if (!date || rawAmt === null || !rawDesc.trim()) continue;

    let type: ImportType;
    let amount: number;
    if (rawTypeVal) {
      // WeChat Pay: 收入 = income, 支出 = expense; amounts always positive
      type = /收入|income|credit/i.test(rawTypeVal) ? "income" : "expense";
      amount = Math.abs(rawAmt);
    } else {
      const amt = opts.flipSigns ? -rawAmt : rawAmt;
      type = amt < 0 ? "expense" : "income";
      amount = Math.abs(amt);
    }
    if (TRANSFER_PATTERN.test(rawDesc)) type = "transfer";
    const currency = normalizeCurrencyCode(rawCurrency) || detectCurrencyFromValue(rawAmount, opts.importCurrency) || opts.importCurrency;
    parsed.push({
      date,
      occurred_at: combineDateAndTime(date, timeFromCell(rawDate)),
      description: rawDesc.trim(),
      notes: rawNotes.trim(),
      amount,
      currency,
      transaction_type: type,
      category: guessCategory(rawDesc, type),
    });
  }
  return parsed;
}

const DUPLICATE_DATE_TOLERANCE_DAYS = 2;
const DUPLICATE_AMOUNT_TOLERANCE = 0.02;

/** Already in the account: same currency, an amount within 2 cents, posted within two days. */
export function isLikelyDuplicate(row: { date: string; amount: number; currency: string },
  existing: { date: string; amount: number; currency: string }): boolean {
  if (row.currency !== existing.currency) return false;
  if (Math.abs(row.amount - existing.amount) > DUPLICATE_AMOUNT_TOLERANCE) return false;
  const a = new Date(`${row.date}T00:00:00Z`).getTime(), b = new Date(`${existing.date}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return row.date === existing.date;
  return Math.abs(a - b) <= DUPLICATE_DATE_TOLERANCE_DAYS * 86400000;
}
