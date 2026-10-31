/**
 * Reading a PDF bank or card statement: the text lines pdf.js pulls out of
 * the file become Date / Description / Amount rows for the import modal
 * (app/dashboard/CsvImportModal.tsx). Pure, so scripts/verify-pdf-statement.ts
 * can test it with made-up lines.
 */
import { SUPPORTED_CURRENCIES } from "./currency.ts";

// ─── PDF (bank/credit-card statement) parsing ──────────────────────────────────────────────────
// A PDF has no real columns — each transaction row is reconstructed from the raw text layout
// instead: a row starts on a line beginning with a date, ends with either one signed transaction
// amount (credit-card statements) or an amount + a running balance (savings/deposit-account
// statements - the direction is derived from whether the balance rose or fell), and may have up
// to one continuation line of extra description (e.g. a device ID or exchange rate) directly
// below it. Anything past that (page footers, T&Cs, repeated headers) is not part of the table
// and is ignored rather than merged in.
const PDF_MONTH_ABBR: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
// "26 May 2026", "30 Sept 2026" and, when a narrow column wraps the year onto
// the next line (ether.fi card statements), just "20 Sept".
const PDF_DAY_MONTH_NAME = "\\d{1,2}\\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEPT?|OCT|NOV|DEC)(?:\\s+\\d{4})?";
const PDF_DATE_TOKEN_AT_START = new RegExp(`^(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|\\d{1,2}[A-Z]{3}\\d{0,4}|\\d{1,2}-[A-Z]{3}-\\d{2,4}|${PDF_DAY_MONTH_NAME})\\b`, "i");
const PDF_STATEMENT_DATE = /(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/;
// "Pending transactions" (ether.fi) repeats charges already listed above.
export const PDF_STOP_MARKERS = [/REWARDCASH SUMMARY/i, /TRANSACTION SUMMARY/i, /FEES AND CHARGES SUMMARY/i, /FINANCE CHARGE SUMMARY/i, /^\*{5,}/, /^Pending transactions$/i];
const PDF_MAX_CONTINUATION_LINES = 1;
// Savings/deposit-account statements (as opposed to credit-card statements)
// show Deposit/Withdrawal + a running Balance instead of one signed amount,
// and open each sub-account with a balance-only row that isn't a transaction.
const PDF_BALANCE_ONLY_MARKERS = [/opening balance/i, /closing balance/i, /上期結餘/, /本期結餘/];

function pdfMatchLeadingDateTokens(line: string): { tokens: string[]; rest: string } | null {
  let rest = line;
  const tokens: string[] = [];
  for (let i = 0; i < 2; i++) {
    const m = rest.match(PDF_DATE_TOKEN_AT_START);
    if (!m) break;
    tokens.push(m[0]);
    rest = rest.slice(m[0].length).trim();
  }
  if (tokens.length === 0) return null;
  return { tokens, rest };
}

function pdfExtractTrailingAmount(text: string): { amount: number; isCredit: boolean; matchStart: number } | null {
  const m = text.match(/([\d,]+\.\d{2})\s*(CR)?\s*$/i);
  if (!m || m.index === undefined) return null;
  return { amount: parseFloat(m[1].replace(/,/g, "")), isCredit: !!m[2], matchStart: m.index };
}

// Deposit/Withdrawal + running-Balance statements end each transaction line
// with two decimal amounts, not one - the first is the transaction amount,
// the second is the account balance after it (not itself a transaction).
//
// This can look identical to a different case some statements already rely
// on: a foreign-currency reference amount inlined before the real charge,
// e.g. "...CN CNY 111.58 131.26" (111.58 is the CNY amount shown for
// context, 131.26 is the actual HKD charge). That's disambiguated by
// checking what precedes the first number - a currency code label (as
// above) means it's a reference amount, not this row's own amount+balance,
// so the single-trailing-amount path should handle it instead (it already
// correctly extracts the real charge, the last number on the line).
function pdfExtractAmountAndBalance(text: string): { amount: number; balance: number; matchStart: number } | null {
  const m = text.match(/([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*(CR)?\s*$/i);
  if (!m || m.index === undefined) return null;
  const beforeFirst = text.slice(0, m.index).trim();
  const codeMatch = beforeFirst.match(/\b([A-Z]{3})$/);
  if (codeMatch && (SUPPORTED_CURRENCIES as readonly string[]).includes(codeMatch[1])) return null;
  return { amount: parseFloat(m[1].replace(/,/g, "")), balance: parseFloat(m[2].replace(/,/g, "")), matchStart: m.index };
}

// A summary line like "Statement date: 09 JUN 2026 ... Statement balance
// HKD3,842.50" can start with a date token and end with an amount too, but
// isn't a transaction - it never has real description text, just a bare
// currency code (or nothing) left after the amount is stripped off.
function pdfIsTrivialDescription(desc: string): boolean {
  const trimmed = desc.trim();
  if (!trimmed) return true;
  return /^[A-Z]{3}$/.test(trimmed) && (SUPPORTED_CURRENCIES as readonly string[]).includes(trimmed);
}

// Statements that print the sign and currency with each amount, then a
// reference ID, e.g. ether.fi: "Claude.ai -$20.00 1faf9981-…" or
// "Refund: Shop +$2.58 …". The sign is already right (minus = spent), so the
// row needs no "flip signs" step and refunds come in as money back.
const PDF_TRAILING_REFERENCE = /\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function pdfExtractSignedAmount(text: string): { amount: number; matchStart: number } | null {
  const body = text.replace(PDF_TRAILING_REFERENCE, "");
  const m = body.match(/([-+−])\s?(?:US)?[$€£¥]\s?([\d,]+\.\d{2})$/);
  if (!m || m.index === undefined) return null;
  const value = parseFloat(m[2].replace(/,/g, ""));
  return { amount: m[1] === "+" ? value : -value, matchStart: m.index };
}

function pdfDateTokenToISO(tok: string, refYear: number, refMonth: number): string | null {
  const t = tok.toUpperCase();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, mm, dd, yy] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  m = t.match(/^(\d{1,2})([A-Z]{3})(\d{2,4})?$/);
  if (m) {
    const [, dd, mon, yy] = m;
    const monthNum = PDF_MONTH_ABBR[mon];
    if (!monthNum) return null;
    let year = yy ? (yy.length === 2 ? 2000 + Number(yy) : Number(yy)) : refYear;
    if (!yy && monthNum > refMonth + 1) year = refYear - 1; // statement crosses a year boundary
    return `${year}-${String(monthNum).padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  m = t.match(/^(\d{1,2})-([A-Z]{3})-(\d{2,4})$/);
  if (m) {
    const [, dd, mon, yy] = m;
    const monthNum = PDF_MONTH_ABBR[mon];
    if (!monthNum) return null;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    return `${year}-${String(monthNum).padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  m = t.match(/^(\d{1,2})\s+([A-Z]{3})T?(?:\s+(\d{4}))?$/);
  if (m) {
    const [, dd, mon, yyyy] = m;
    const monthNum = PDF_MONTH_ABBR[mon];
    if (!monthNum) return null;
    // A year wrapped off the date line: same year as the row above, unless
    // the months jumped back (Dec → Jan), which means the next year.
    let year = yyyy ? Number(yyyy) : refYear;
    if (!yyyy && monthNum < refMonth - 6) year++;
    return `${year}-${String(monthNum).padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return null;
}

/** Text lines of a statement (one per visual row) → Date / Description / Amount rows. */
export function parseStatementLines(lines: string[]): { headers: string[]; rows: string[][] } {

  let refYear = new Date().getFullYear();
  let refMonth = new Date().getMonth() + 1;
  for (const line of lines) {
    const m = line.match(PDF_STATEMENT_DATE);
    const monthNum = m ? PDF_MONTH_ABBR[m[2].toUpperCase()] : undefined;
    if (m && monthNum) { refYear = Number(m[3]); refMonth = monthNum; break; }
  }

  // "Amount (USD)" column header: the statement's own currency, so the import
  // doesn't assume the account's home currency.
  let currency = "";
  for (const line of lines) {
    const m = line.match(/\bAmount \(([A-Z]{3})\)/);
    if (m && (SUPPORTED_CURRENCIES as readonly string[]).includes(m[1])) { currency = m[1]; break; }
  }

  type BuiltRow = { tokens: string[]; description: string; amount: number | null; isCredit: boolean; continuations: number };
  const built: BuiltRow[] = [];
  // Tracks the running account balance for Deposit/Withdrawal/Balance-style
  // statements, so a transaction's direction (income vs expense) can be
  // derived from whether the balance rose or fell - reset by each balance-only
  // row, since one statement can cover several sub-accounts in sequence.
  let runningBalance: number | null = null;
  for (const line of lines) {
    const lead = pdfMatchLeadingDateTokens(line);
    if (lead) {
      const signed = pdfExtractSignedAmount(lead.rest);
      if (signed && !pdfIsTrivialDescription(lead.rest.slice(0, signed.matchStart))) {
        // The lines below (card location, crypto amount, original currency)
        // are details, not part of the merchant name.
        built.push({ tokens: lead.tokens, description: lead.rest.slice(0, signed.matchStart).trim(), amount: signed.amount, isCredit: false, continuations: PDF_MAX_CONTINUATION_LINES });
        continue;
      }
      const isBalanceOnly = PDF_BALANCE_ONLY_MARKERS.some((p) => p.test(lead.rest));
      const amtBal = !isBalanceOnly ? pdfExtractAmountAndBalance(lead.rest) : null;
      if (amtBal && !pdfIsTrivialDescription(lead.rest.slice(0, amtBal.matchStart))) {
        const isWithdrawal = runningBalance === null || amtBal.balance < runningBalance;
        runningBalance = amtBal.balance;
        built.push({ tokens: lead.tokens, description: lead.rest.slice(0, amtBal.matchStart).trim(), amount: isWithdrawal ? -amtBal.amount : amtBal.amount, isCredit: false, continuations: 0 });
        continue;
      }
      if (isBalanceOnly) {
        const bal = pdfExtractTrailingAmount(lead.rest);
        if (bal) runningBalance = bal.amount;
        built.push({ tokens: lead.tokens, description: lead.rest, amount: null, isCredit: false, continuations: PDF_MAX_CONTINUATION_LINES });
        continue;
      }
      const amt = pdfExtractTrailingAmount(lead.rest);
      if (amt && !pdfIsTrivialDescription(lead.rest.slice(0, amt.matchStart))) {
        built.push({ tokens: lead.tokens, description: lead.rest.slice(0, amt.matchStart).trim(), amount: amt.amount, isCredit: amt.isCredit, continuations: 0 });
      } else {
        // no trailing amount, or the "description" is just a bare currency
        // code (a statement-summary line, not a transaction) — can't reliably use this row
        built.push({ tokens: lead.tokens, description: lead.rest, amount: null, isCredit: false, continuations: PDF_MAX_CONTINUATION_LINES });
      }
    } else if (built.length > 0) {
      const prev = built[built.length - 1];
      if (prev.amount !== null && prev.continuations < PDF_MAX_CONTINUATION_LINES) {
        prev.description += " " + line;
        prev.continuations++;
      }
      // else: outside the transaction table (footer/header/boilerplate) — ignore
    }
  }

  const rows: string[][] = [];
  let lastYear = refYear, lastMonth = refMonth;
  for (const row of built) {
    if (row.amount === null || row.isCredit) continue; // isCredit = card payment, not a purchase; skipped on import
    const dateTok = row.tokens.length === 2 ? row.tokens[1] : row.tokens[0];
    // A "20 Sept" whose year wrapped to the next line takes the year of the row above.
    const yearless = /^\d{1,2}\s+[A-Z]{3,4}$/i.test(dateTok);
    const iso = yearless ? pdfDateTokenToISO(dateTok, lastYear, lastMonth) : pdfDateTokenToISO(dateTok, refYear, refMonth);
    if (!iso) continue;
    lastYear = Number(iso.slice(0, 4)); lastMonth = Number(iso.slice(5, 7));
    const out = [iso, row.description.replace(/\s+/g, " ").trim(), String(row.amount)];
    rows.push(currency ? [...out, currency] : out);
  }
  return { headers: currency ? ["Date", "Description", "Amount", "Currency"] : ["Date", "Description", "Amount"], rows };
}

