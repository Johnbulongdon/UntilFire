"use client";
import React, { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CURRENCY_NAMES, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { CellValue } from "read-excel-file/browser";

type Step = "upload" | "map" | "review" | "importing" | "done";

type Transaction = {
  date: string;
  amount: number;
  refund_amount?: number;
  currency: string;
  transaction_type: "expense" | "income" | "transfer";
};

type Props = {
  onClose: () => void;
  onImported: (count: number) => void;
  defaultCurrency?: string;
  preferredCurrencies?: string[];
  transactions?: Transaction[];
  viewMonth?: string;
  rates?: Record<string, number>;
  formatAmount?: (value: number) => string;
  displayCurrency?: string;
};

type ParsedImportTransaction = {
  date: string;
  description: string;
  notes: string;
  amount: number;
  currency: string;
  transaction_type: "expense" | "income" | "transfer";
  category: string;
};

type DuplicateFlag = {
  rowIndex: number;
  row: ParsedImportTransaction;
  existing: { id: string; date: string; amount: number; category: string };
};

// Some banks (e.g. WeChat Pay) prepend title/metadata rows before the real header row.
// A row counts as the header row once at least 2 of its cells match one of these patterns.
const HEADER_INDICATORS = [/交易时间/, /^\s*date/i, /金额/, /amount/i];

// ─── CSV parsing ───────────────────────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
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

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  // Find the real header row — see HEADER_INDICATORS above
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

// ─── Excel (.xlsx) parsing ──────────────────────────────────────────────────────────────────────
function xlsxCellToString(cell: CellValue | null): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(cell);
}

async function parseXLSX(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const { readSheet } = await import("read-excel-file/browser");
  const sheet = await readSheet(file);

  // Find the real header row — see HEADER_INDICATORS above
  let headerIdx = 0;
  for (let i = 0; i < Math.min(sheet.length, 30); i++) {
    const hits = (sheet[i] || []).filter((cell) => {
      const s = xlsxCellToString(cell).trim();
      return s && HEADER_INDICATORS.some((p) => p.test(s));
    }).length;
    if (hits >= 2) { headerIdx = i; break; }
  }

  const headerRow = sheet[headerIdx] || [];
  const dataRows = sheet.slice(headerIdx + 1);
  const headers = headerRow.map(xlsxCellToString);
  const rows = dataRows.map((row) => headers.map((_, i) => xlsxCellToString(row[i])));
  return { headers, rows };
}

// ─── PDF (bank/credit-card statement) parsing ──────────────────────────────────────────────────
// A PDF has no real columns — each transaction row is reconstructed from the raw text layout
// instead: a row starts on a line beginning with a date, ends with the transaction amount, and
// may have up to one continuation line of extra description (e.g. a device ID or exchange rate)
// directly below it. Anything past that (page footers, T&Cs, repeated headers) is not part of
// the table and is ignored rather than merged in.
const PDF_MONTH_ABBR: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
const PDF_DATE_TOKEN_AT_START = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}[A-Z]{3}\d{0,4}|\d{1,2}-[A-Z]{3}-\d{2,4})\b/i;
const PDF_STATEMENT_DATE = /(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/;
const PDF_STOP_MARKERS = [/REWARDCASH SUMMARY/i, /TRANSACTION SUMMARY/i, /FEES AND CHARGES SUMMARY/i, /FINANCE CHARGE SUMMARY/i, /^\*{5,}/];
const PDF_MAX_CONTINUATION_LINES = 1;

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
  return null;
}

async function pdfExtractLines(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const allLines: string[] = [];
  outer:
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items as { str?: string; transform: number[] }[])
      .filter((it) => !!it.str?.trim()) as { str: string; transform: number[] }[];
    const byY = new Map<number, { x: number; str: string }[]>();
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      let bucketKey: number | null = null;
      for (const k of byY.keys()) { if (Math.abs(k - y) <= 2) { bucketKey = k; break; } }
      if (bucketKey === null) bucketKey = y;
      if (!byY.has(bucketKey)) byY.set(bucketKey, []);
      byY.get(bucketKey)!.push({ x, str: it.str });
    }
    const pageLines = [...byY.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((pp) => pp.str).join(" ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const line of pageLines) {
      if (PDF_STOP_MARKERS.some((p) => p.test(line))) break outer;
      allLines.push(line);
    }
  }
  return allLines;
}

async function parsePDF(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const lines = await pdfExtractLines(file);

  let refYear = new Date().getFullYear();
  let refMonth = new Date().getMonth() + 1;
  for (const line of lines) {
    const m = line.match(PDF_STATEMENT_DATE);
    const monthNum = m ? PDF_MONTH_ABBR[m[2].toUpperCase()] : undefined;
    if (m && monthNum) { refYear = Number(m[3]); refMonth = monthNum; break; }
  }

  type BuiltRow = { tokens: string[]; description: string; amount: number | null; isCredit: boolean; continuations: number };
  const built: BuiltRow[] = [];
  for (const line of lines) {
    const lead = pdfMatchLeadingDateTokens(line);
    if (lead) {
      const amt = pdfExtractTrailingAmount(lead.rest);
      if (amt) {
        built.push({ tokens: lead.tokens, description: lead.rest.slice(0, amt.matchStart).trim(), amount: amt.amount, isCredit: amt.isCredit, continuations: 0 });
      } else {
        // no trailing amount on the row-start line — can't reliably use this row
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
  for (const row of built) {
    if (row.amount === null || row.isCredit) continue; // isCredit = card payment, not a purchase; skipped on import
    const dateTok = row.tokens.length === 2 ? row.tokens[1] : row.tokens[0];
    const iso = pdfDateTokenToISO(dateTok, refYear, refMonth);
    if (!iso) continue;
    rows.push([iso, row.description.replace(/\s+/g, " ").trim(), String(row.amount)]);
  }
  return { headers: ["Date", "Description", "Amount"], rows };
}

function parseDate(s: string): string | null {
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

function parseAmount(s: string): number | null {
  s = s.trim().replace(/[^0-9().,-]/g, "").replace(/,/g, "");
  const paren = s.match(/^\((.+)\)$/);
  if (paren) return -Math.abs(parseFloat(paren[1]));
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function guessCategory(desc: string, type: "expense" | "income"): string {
  const d = desc.toLowerCase();
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

function normalizeCurrencyCode(value: string): string | null {
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

function detectCurrencyFromValue(value: string, fallbackCurrency: string): string | null {
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

function autoDetectColumns(headers: string[]): { date: string; description: string; notes: string; amount: string; currency: string; type: string } {
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

function inferImportCurrency({
  headers,
  rows,
  colAmount,
  colCurrency,
  fallbackCurrency,
}: {
  headers: string[];
  rows: string[][];
  colAmount: string;
  colCurrency: string;
  fallbackCurrency: string;
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

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

export default function CsvImportModal({
  onClose,
  onImported,
  defaultCurrency = "USD",
  preferredCurrencies = [],
  transactions = [],
  viewMonth = "",
  rates = {},
  formatAmount,
  displayCurrency = defaultCurrency,
}: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [colDate, setColDate] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colNotes, setColNotes] = useState("");
  const [colAmount, setColAmount] = useState("");
  const [colCurrency, setColCurrency] = useState("");
  const [colType, setColType] = useState("");
  const [importCurrency, setImportCurrency] = useState(defaultCurrency);
  const [flipSigns, setFlipSigns] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [error, setError] = useState("");
  const [duplicateFlags, setDuplicateFlags] = useState<DuplicateFlag[]>([]);
  const [skipIndices, setSkipIndices] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";
    const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
    const isCsv = name.endsWith(".csv") || file.type === "text/csv";
    if (!isCsv && !isExcel && !isPdf) {
      setError("Please upload a .csv, .xlsx, or .pdf file.");
      return;
    }
    try {
      let h: string[];
      let r: string[][];
      if (isPdf) {
        ({ headers: h, rows: r } = await parsePDF(file));
        if (r.length === 0) {
          setError("Couldn't find any transactions in this PDF. It may be a scanned image, or a statement layout we don't recognize yet — try exporting as CSV or Excel instead.");
          return;
        }
      } else if (isExcel) {
        ({ headers: h, rows: r } = await parseXLSX(file));
      } else {
        const buffer = await file.arrayBuffer();
        let text: string;
        try {
          // Try UTF-8 first; strict mode throws if bytes are invalid UTF-8 (e.g. GBK files)
          text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        } catch {
          // WeChat Pay and many Chinese bank exports use GBK encoding
          text = new TextDecoder("gbk").decode(buffer);
        }
        ({ headers: h, rows: r } = parseCSV(text));
      }
      if (h.length < 2) {
        setError("Couldn't parse this file. Make sure it has headers.");
        return;
      }
      const auto = autoDetectColumns(h);
      const cleanedRows = r.filter((row) => row.some((c) => c.trim()));
      const detectedCurrency = inferImportCurrency({
        headers: h,
        rows: cleanedRows,
        colAmount: auto.amount,
        colCurrency: auto.currency,
        fallbackCurrency: defaultCurrency,
      });
      setHeaders(h);
      setRows(cleanedRows);
      setFileName(file.name);
      setColDate(auto.date);
      setColDesc(auto.description);
      setColNotes(auto.notes);
      setColAmount(auto.amount);
      setColCurrency(auto.currency);
      setColType(auto.type);
      setImportCurrency(detectedCurrency);
      setFlipSigns(false);
      setError("");
      setStep("map");
    } catch {
      setError("Failed to read file. Please try again.");
    }
  }, [defaultCurrency]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const buildParsedTransactions = useCallback((): ParsedImportTransaction[] => {
    if (!colDate || !colDesc || !colAmount) return [];
    const dateIdx = headers.indexOf(colDate);
    const descIdx = headers.indexOf(colDesc);
    const notesIdx = colNotes ? headers.indexOf(colNotes) : -1;
    const amtIdx = headers.indexOf(colAmount);
    const currencyIdx = colCurrency ? headers.indexOf(colCurrency) : -1;
    const typeIdx = colType ? headers.indexOf(colType) : -1;

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

      let type: "expense" | "income";
      let amount: number;
      if (rawTypeVal) {
        // WeChat Pay: 收入 = income, 支出 = expense; amounts always positive
        type = /收入|income|credit/i.test(rawTypeVal) ? "income" : "expense";
        amount = Math.abs(rawAmt);
      } else {
        const amt = flipSigns ? -rawAmt : rawAmt;
        type = amt < 0 ? "expense" : "income";
        amount = Math.abs(amt);
      }
      const currency = normalizeCurrencyCode(rawCurrency) || detectCurrencyFromValue(rawAmount, importCurrency) || importCurrency;
      parsed.push({
        date,
        description: rawDesc.trim(),
        notes: rawNotes.trim(),
        amount,
        currency,
        transaction_type: type,
        category: guessCategory(rawDesc, type),
      });
    }
    return parsed;
  }, [colAmount, colCurrency, colDate, colDesc, colNotes, colType, flipSigns, headers, importCurrency, rows]);

  const parsedTransactions = buildParsedTransactions();
  const sampleTransaction = parsedTransactions[0] ?? null;
  const touchedMonths = [...new Set(parsedTransactions.map((t) => t.date.slice(0, 7)).filter(Boolean))].length;

  const previewRows = (() => {
    if (!colDate || !colDesc || !colAmount) return [];
    const di = headers.indexOf(colDate);
    const ni = headers.indexOf(colDesc);
    const ai = headers.indexOf(colAmount);
    return rows.map((r: string[]) => ({
      date: r[di] ?? "",
      desc: r[ni] ?? "",
      amount: r[ai] ?? "",
    }));
  })();

  const previewMonthKey = sampleTransaction?.date.slice(0, 7) || parsedTransactions[0]?.date.slice(0, 7) || viewMonth;

  const monthLabel = (() => {
    if (!previewMonthKey) return "this month";
    const [y, m] = previewMonthKey.split("-").map(Number);
    if (!y || !m) return "this month";
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  const previewAmount = (value: number) => {
    if (formatAmount) return formatAmount(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const currencyOptions = Array.from(new Set([
    defaultCurrency,
    ...preferredCurrencies,
    ...SUPPORTED_CURRENCIES,
  ])).filter(Boolean);

  const currentMonthTxns = previewMonthKey ? transactions.filter((t) => t.date.startsWith(previewMonthKey)) : [];
  const importedMonthTxns = previewMonthKey ? parsedTransactions.filter((t) => t.date.startsWith(previewMonthKey)) : [];
  const currentIncome = currentMonthTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const currentExpenses = currentMonthTxns.filter((t) => t.transaction_type === "expense").reduce((s, t) => s + toUSD(Math.max(0, t.amount - (t.refund_amount || 0)), t.currency, rates), 0);
  const importedIncome = importedMonthTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const importedExpenses = importedMonthTxns.filter((t) => t.transaction_type === "expense").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const projectedIncome = currentIncome + importedIncome;
  const projectedExpenses = currentExpenses + importedExpenses;
  const projectedNet = projectedIncome - projectedExpenses;

  const handleImport = useCallback(async (skip: Set<number> = new Set()) => {
    const parsed = buildParsedTransactions();
    const toInsert = parsed.filter((_, i) => !skip.has(i));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (parsed.length === 0) {
      setError("No valid rows found. Check that Date, Description, and Amount columns are correct.");
      setStep("map");
      return;
    }

    setTotal(toInsert.length);
    setProgress(0);
    setStep("importing");

    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH).map((tx) => ({
        user_id: session.user.id,
        date: tx.date,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        notes: tx.notes || "",
        category: tx.category,
        transaction_type: tx.transaction_type,
        tags: [],
        sub_category: null,
        source: "csv",
        source_file: fileName,
      }));
      const { error: dbErr } = await supabase.from("expenses").insert(batch);
      if (dbErr) {
        setError("Import failed: " + dbErr.message);
        setStep("map");
        return;
      }
      inserted += batch.length;
      setProgress(inserted);
    }

    setImportedCount(inserted);
    setSkippedCount(skip.size);
    setStep("done");
    onImported(inserted);
  }, [buildParsedTransactions, onImported, fileName]);

  const handleCheckDuplicates = useCallback(async () => {
    const parsed = buildParsedTransactions();
    const dates = parsed.map((r) => r.date).filter(Boolean);
    if (dates.length === 0) {
      handleImport(new Set());
      return;
    }
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { handleImport(new Set()); return; }

    const { data: existing } = await supabase
      .from("expenses")
      .select("id, date, amount, category")
      .eq("user_id", session.user.id)
      .gte("date", minDate)
      .lte("date", maxDate);

    const flags: DuplicateFlag[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      const match = existing?.find(
        (e) =>
          e.date === row.date &&
          Number(e.amount) === row.amount
      );
      if (match) flags.push({ rowIndex: i, row, existing: match });
    }

    if (flags.length > 0) {
      setDuplicateFlags(flags);
      setSkipIndices(new Set(flags.map((f) => f.rowIndex)));
      setStep("review");
    } else {
      handleImport(new Set());
    }
  }, [buildParsedTransactions, handleImport]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid #23232d", background: "#1a1a24", color: "#e2e8f0",
    fontSize: 13, fontFamily: "Manrope, sans-serif",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    colorScheme: "dark",
  };

  const selectOptionStyle: React.CSSProperties = {
    backgroundColor: "#1a1a24",
    color: "#e2e8f0",
    fontFamily: "Manrope, sans-serif",
  };

  const placeholderOptionStyle: React.CSSProperties = {
    ...selectOptionStyle,
    color: "#64748b",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 16,
      }}
    >
      <div
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          background: "#111118", border: "1px solid #23232d", borderRadius: 20,
          padding: 32, width: "100%", maxWidth: 520,
          maxHeight: "90dvh", overflowY: "auto",
          fontFamily: "Manrope, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", fontFamily: "Manrope, sans-serif" }}>
              Import bank transactions
            </div>
            {step === "upload" && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Upload a CSV, Excel, or PDF statement from your bank</div>}
            {step === "map" && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Map the columns and check the live import preview below</div>}
            {step === "review" && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Review possible duplicates before importing</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {step === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "#059669" : "#23232d"}`,
              borderRadius: 14, padding: "48px 32px", textAlign: "center",
              cursor: "pointer", transition: "border-color 0.15s",
              background: dragging ? "rgba(5,150,105,0.05)" : "transparent",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>
              Drop your CSV, Excel, or PDF statement here or click to browse
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Export from your bank as CSV, Excel (.xlsx), or a PDF statement, then upload it here
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,application/pdf"
              style={{ display: "none" }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />
          </div>
        )}

        {step === "map" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Date column *", val: colDate, set: setColDate },
                { label: "Description column *", val: colDesc, set: setColDesc },
                { label: "Amount column *", val: colAmount, set: setColAmount },
                { label: "Notes column", val: colNotes, set: setColNotes },
                { label: "Income/Expense column", val: colType, set: setColType },
                { label: "Currency column", val: colCurrency, set: setColCurrency },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ gridColumn: label.startsWith("Amount") ? "1 / -1" : undefined }}>
                  <label style={labelStyle}>{label}</label>
                  <select value={val} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set(e.target.value)} style={selectStyle}>
                    <option value="" style={placeholderOptionStyle}>— select —</option>
                    {headers.map((h: string) => <option key={h} value={h} style={selectOptionStyle}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Currency for imported amounts</label>
              <select value={importCurrency} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setImportCurrency(e.target.value)} style={selectStyle}>
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency} style={selectOptionStyle}>{currency} — {CURRENCY_NAMES[currency] ?? currency}</option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                {colCurrency
                  ? "Rows use the mapped currency column when present. This selection is the fallback if a row is blank or unclear."
                  : "Used when there is no separate currency column. We auto-detect when the file makes it obvious, and you can override it here."}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94a3b8", marginBottom: 20, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={flipSigns}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlipSigns(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#059669" }}
              />
              My bank shows expenses as positive numbers (flip signs)
            </label>

            {previewRows.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw file sample ({previewRows.length} rows)</div>
                <div style={{ border: "1px solid #23232d", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ maxHeight: 260, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#1a1a24" }}>
                          {["Date", "Description", "Amount"].map((h) => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #23232d", position: "sticky", top: 0, background: "#1a1a24" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r: { date: string; desc: string; amount: string }, i: number) => (
                          <tr key={i} style={{ borderBottom: i < previewRows.length - 1 ? "1px solid #1a1a24" : undefined }}>
                            <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{r.date}</td>
                            <td style={{ padding: "8px 12px", color: "#e2e8f0", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.desc}</td>
                            <td style={{ padding: "8px 12px", color: "#e2e8f0", whiteSpace: "nowrap" }}>{r.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#161621", border: "1px solid #23232d", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Import summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Transactions</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>{parsedTransactions.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Months touched</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>{touchedMonths}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Sign mode</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: flipSigns ? "#FBBF24" : "#86EFAC" }}>{flipSigns ? "Flipped" : "Original"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Currency</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#cbd5e1" }}>{colCurrency ? `${importCurrency} fallback` : importCurrency}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#161621", border: "1px solid #23232d", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Example transaction</div>
                {sampleTransaction ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Date</span><span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600 }}>{sampleTransaction.date}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Description</span><span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600, textAlign: "right" }}>{sampleTransaction.description}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Type</span><span style={{ color: sampleTransaction.transaction_type === "income" ? "#86EFAC" : "#FCA5A5", fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{sampleTransaction.transaction_type}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Currency</span><span style={{ color: "#cbd5e1", fontSize: 13 }}>{sampleTransaction.currency}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Amount stored</span><span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 700 }}>{new Intl.NumberFormat("en-US", { style: "currency", currency: sampleTransaction.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(sampleTransaction.amount)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Category guess</span><span style={{ color: "#cbd5e1", fontSize: 13 }}>{sampleTransaction.category}</span></div>
                  </div>
                ) : (
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>No valid example row found.</div>
                )}
              </div>

              <div style={{ background: "#161621", border: "1px solid #23232d", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{monthLabel} if accepted</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
                  <div style={{ background: "#111118", border: "1px solid #23232d", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Income</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#86EFAC" }}>{previewAmount(projectedIncome)}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Now {previewAmount(currentIncome)} · adding {previewAmount(importedIncome)}</div>
                  </div>
                  <div style={{ background: "#111118", border: "1px solid #23232d", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Expenses</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>{previewAmount(projectedExpenses)}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Now {previewAmount(currentExpenses)} · adding {previewAmount(importedExpenses)}</div>
                  </div>
                </div>
                <div style={{ background: projectedNet >= 0 ? "rgba(5,150,105,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${projectedNet >= 0 ? "rgba(5,150,105,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Projected net after import</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: projectedNet >= 0 ? "#86EFAC" : "#FCA5A5" }}>{projectedNet >= 0 ? "+" : ""}{previewAmount(projectedNet)}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                    {importedMonthTxns.length > 0
                      ? `${importedMonthTxns.length} imported transaction${importedMonthTxns.length === 1 ? "" : "s"} land in ${monthLabel}.`
                      : `None of these imported transactions land in ${monthLabel}.`}
                  </div>
                  {touchedMonths > 1 && importedMonthTxns.length > 0 && (
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                      Showing {monthLabel} because this preview example lands there. This file touches {touchedMonths} months in total.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => setStep("upload")}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "1px solid #334155",
                  background: "transparent", color: "#cbd5e1", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                Choose another file
              </button>
              <button
                onClick={handleCheckDuplicates}
                disabled={!colDate || !colDesc || !colAmount || parsedTransactions.length === 0}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                  background: (!colDate || !colDesc || !colAmount || parsedTransactions.length === 0) ? "#1a1a24" : "#059669",
                  color: (!colDate || !colDesc || !colAmount || parsedTransactions.length === 0) ? "#475569" : "#fff",
                  fontSize: 14, fontWeight: 700, cursor: (!colDate || !colDesc || !colAmount || parsedTransactions.length === 0) ? "not-allowed" : "pointer",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                Import {parsedTransactions.length} transactions
              </button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#FBBF24", marginBottom: 6 }}>
                {duplicateFlags.length} possible duplicate{duplicateFlags.length !== 1 ? "s" : ""} found
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                These rows may already exist. Uncheck any you still want to import.
              </div>
            </div>

            <div style={{ border: "1px solid #23232d", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#1a1a24" }}>
                    {["Skip", "Date", "Description", "Amount", "Category"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #23232d", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {duplicateFlags.map(({ rowIndex, row }) => {
                    const checked = skipIndices.has(rowIndex);
                    return (
                      <tr key={rowIndex} style={{ borderBottom: "1px solid #1a1a24", background: checked ? "rgba(251,191,36,0.04)" : undefined }}>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSkipIndices((prev) => {
                                const next = new Set(prev);
                                if (next.has(rowIndex)) next.delete(rowIndex);
                                else next.add(rowIndex);
                                return next;
                              })
                            }
                            style={{ accentColor: "#FBBF24", width: 14, height: 14 }}
                          />
                        </td>
                        <td style={{ padding: "8px 10px", color: "#94a3b8", whiteSpace: "nowrap" }}>{row.date}</td>
                        <td style={{ padding: "8px 10px", color: "#e2e8f0", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description}</td>
                        <td style={{ padding: "8px 10px", color: "#f8fafc", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: row.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(row.amount)}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{row.category}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => handleImport(new Set())}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10,
                  border: "1px solid #334155", background: "transparent",
                  color: "#cbd5e1", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                Import all anyway
              </button>
              <button
                onClick={() => handleImport(skipIndices)}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                  background: "#059669", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                Skip checked &amp; continue →
              </button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>
              Importing transactions…
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              {progress} / {total}
            </div>
            <div style={{ height: 6, background: "#23232d", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#059669", borderRadius: 99, width: `${total > 0 ? (progress / total) * 100 : 0}%`, transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, fontFamily: "Manrope, sans-serif" }}>
              {importedCount} transaction{importedCount !== 1 ? "s" : ""} imported
              {skippedCount > 0 ? `, ${skippedCount} duplicate${skippedCount !== 1 ? "s" : ""} skipped` : ""}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>
              Categories were auto-detected. Tap any transaction to adjust.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "10px 28px", borderRadius: 10, border: "none",
                background: "#059669", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "Manrope, sans-serif",
              }}
            >
              Done
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
