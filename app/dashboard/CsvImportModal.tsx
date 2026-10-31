"use client";
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-pages";
import { CURRENCY_FLAG, CURRENCY_NAMES, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { ALL_CATEGORIES, loadCatCustomizations, resolveDisplay, type CatCustomizations } from "@/lib/categories";
import { Button, Icon, Select } from "@/components/ui";
import type { IconName } from "@/components/ui";
import Flag from "@/app/components/Flag";
import type { CellValue } from "read-excel-file/browser";
import { formatMoney } from "@/lib/money";
import { combineDateAndTime, timeFromCell } from "@/lib/transaction-time";
import { PDF_STOP_MARKERS, parseStatementLines } from "@/lib/pdf-statement";
import { walletTwinScore } from "@/lib/transaction-flags";

// One idea per screen: pick a file, check it (with side screens for
// currency, duplicates and columns), then the saving progress and the result.
type Step = "upload" | "check" | "currency" | "dupes" | "columns" | "importing" | "failed" | "done";

type Props = {
  onClose: () => void;
  onImported: (count: number) => void;
  defaultCurrency?: string;
  preferredCurrencies?: string[];
  rates?: Record<string, number>;
  formatAmount?: (value: number) => string;
  displayCurrency?: string;
};

type ParsedImportTransaction = {
  date: string;
  occurred_at: string | null;
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
  existing: { id: string; date: string; amount: number; currency: string; description: string | null };
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

// ─── PDF (bank/credit-card statement) parsing: row rules live in lib/pdf-statement.ts ───────────
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
  return parseStatementLines(await pdfExtractLines(file));
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

// Moving money between accounts (or to/from another person), not earning or
// spending it - matched on the word itself rather than generic deposit/
// withdrawal language, since those alone don't distinguish a transfer from
// real income (e.g. a salary deposit).
const TRANSFER_PATTERN = /\btransfer\b|轉賬|轉帳|轉數快/i;

function guessCategory(desc: string, type: "expense" | "income" | "transfer"): string {
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

// ─── Duplicate detection across currencies ────────────────────────────────
// Foreign-currency card statements often show the original amount inline,
// e.g. "Alipay*McDonalds Shanghai CN CNY 28.90 *EXCHANGE RATE: 1.18131".
// Extracting that lets us match a converted card charge (34.14 HKD) against
// the same purchase's native-currency record from another source, like an
// Alipay export (28.9 CNY) - the two would never match on amount alone.
function extractEmbeddedForeignAmount(description: string): { currency: string; amount: number } | null {
  const match = description.match(/\b([A-Z]{3})\s?([\d,]+\.\d{2})\b/);
  if (!match) return null;
  const currency = match[1];
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) return null;
  const amount = parseFloat(match[2].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { currency, amount };
}

const DUPLICATE_DATE_TOLERANCE_DAYS = 2;
const DUPLICATE_AMOUNT_TOLERANCE = 0.02;

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isWithinDateTolerance(a: string, b: string): boolean {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return a === b;
  return Math.abs(da - db) <= DUPLICATE_DATE_TOLERANCE_DAYS * 86400000;
}

function amountsClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= DUPLICATE_AMOUNT_TOLERANCE;
}


type DupeExisting = { id: string; date: string; amount: number; currency: string; description: string | null };

// Find rows in this file that look like ones already saved: within a couple
// of days, and the same amount (directly, through a foreign amount printed
// in either row's description, or a wallet purchase's card copy converted).
async function findDuplicates(parsed: ParsedImportTransaction[], rates: Record<string, number>): Promise<DuplicateFlag[]> {
  const dates = parsed.map((r) => r.date).filter(Boolean);
  if (dates.length === 0) return [];
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));
  // Widen the query window so date-shifted duplicates (a card statement
  // posts a day or two after the underlying wallet transaction) are still
  // fetched as candidates.
  const { data: existing } = await fetchAllPages((from, to) => supabase
    .from("expenses")
    .select("id, date, amount, category, currency, description")
    .eq("user_id", session.user.id)
    .gte("date", shiftDate(minDate, -DUPLICATE_DATE_TOLERANCE_DAYS))
    .lte("date", shiftDate(maxDate, DUPLICATE_DATE_TOLERANCE_DAYS))
    .order("id")
    .range(from, to));

  const flags: DuplicateFlag[] = [];
  const usd = (amount: number, currency: string) => toUSD(amount, currency, rates);
  // Each saved row answers for one file row, so two identical purchases in
  // the file are not both skipped against a single saved one.
  const claimed = new Set<string>();
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    const rowForeign = extractEmbeddedForeignAmount(row.description);
    const match = (existing as DupeExisting[] | null)?.find((raw) => {
      if (claimed.has(raw.id)) return false;
      const e = { ...raw, amount: Number(raw.amount) };
      // A card line for an Alipay/WeChat purchase against the wallet's own row, either way round.
      // 10%: a card's rate can sit 7% from the market feed (6.6 vs 7.1 yuan, Oct 2026).
      if (walletTwinScore(row, e, usd, 0.1) !== null || walletTwinScore(e, row, usd, 0.1) !== null) return true;
      if (!isWithinDateTolerance(e.date, row.date)) return false;
      if (e.currency === row.currency && amountsClose(e.amount, row.amount)) return true;
      if (rowForeign && e.currency === rowForeign.currency && amountsClose(e.amount, rowForeign.amount)) return true;
      const existingForeign = extractEmbeddedForeignAmount(e.description ?? "");
      return !!existingForeign && existingForeign.currency === row.currency && amountsClose(existingForeign.amount, row.amount);
    });
    if (match) { claimed.add(match.id); flags.push({ rowIndex: i, row, existing: { ...match, amount: Number(match.amount) } }); }
  }
  return flags;
}

const TRANSFER_DISPLAY = { emoji: "↔️", color: "#ded8cd", label: "Moved" };

function categoryDisplay(key: string, type: ParsedImportTransaction["transaction_type"], customs: CatCustomizations) {
  if (type === "transfer") return TRANSFER_DISPLAY;
  const def = ALL_CATEGORIES.find((c) => c.key === key) ?? ALL_CATEGORIES.find((c) => c.key === "other")!;
  return { ...resolveDisplay(def, customs, def.key), label: def.label };
}

const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const signedAmount = (t: { amount: number; currency: string; transaction_type: string }) => {
  const money = formatMoney(t.amount, { currency: t.currency, decimals: 2 });
  return t.transaction_type === "expense" ? `−${money}` : t.transaction_type === "income" ? `+${money}` : money;
};

const TYPE_WORD = { expense: "expense", income: "income", transfer: "moved" } as const;

// ─── Small pieces, one look across every screen ─────────────────────────────
const panel: React.CSSProperties = { background: "var(--uf-surface)", borderRadius: "var(--uf-r-card)" };
const plainButton: React.CSSProperties = { font: "inherit", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 };
const iconButton: React.CSSProperties = {
  ...plainButton, width: 44, height: 44, borderRadius: 14, background: "var(--uf-surface)",
  display: "grid", placeItems: "center", color: "var(--uf-ink-2)", fontSize: 20, lineHeight: 1, flexShrink: 0,
};

function Header({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {onBack && <button type="button" onClick={onBack} aria-label="Back" style={iconButton}>‹</button>}
      <h2 id="import-title" className="uf-t-h3" style={{ margin: 0, flex: 1, textAlign: onBack ? "center" : "left" }}>{title}</h2>
      <button type="button" onClick={onClose} aria-label="Close" style={iconButton}>×</button>
    </div>
  );
}

function Note({ tone, icon, title, children, action }: {
  tone: "info" | "warn" | "neg"; icon: IconName; title?: string; children?: React.ReactNode; action?: React.ReactNode;
}) {
  const bg = tone === "neg" ? "var(--uf-neg-bg)" : tone === "warn" ? "var(--uf-warn-bg)" : "var(--uf-surface)";
  const ink = tone === "neg" ? "var(--uf-neg)" : tone === "warn" ? "var(--uf-warn)" : "var(--uf-ink-2)";
  return (
    <div role={tone === "neg" ? "alert" : undefined} style={{ background: bg, borderRadius: 20, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
      <span style={{ color: ink }}><Icon name={icon} size={22} /></span>
      <div className="uf-t-body" style={{ flex: 1, color: "var(--uf-ink-2)", lineHeight: 1.45 }}>
        {title && <div style={{ fontWeight: 700, color: tone === "neg" ? "var(--uf-neg)" : "var(--uf-ink)" }}>{title}</div>}
        {children}
      </div>
      {action}
    </div>
  );
}

function CategoryTile({ emoji, color }: { emoji: string; color: string }) {
  return <span aria-hidden style={{ width: 36, height: 36, borderRadius: 12, background: color, display: "grid", placeItems: "center", fontSize: 17, flexShrink: 0 }}>{emoji}</span>;
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      style={{ ...plainButton, width: 48, height: 28, borderRadius: 999, flexShrink: 0, position: "relative",
        background: on ? "var(--uf-ink)" : "var(--uf-surface-2)", transition: "background var(--uf-dur-1, 150ms)" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: "50%",
        background: on ? "var(--uf-card)" : "var(--uf-card)", boxShadow: "0 1px 2px rgba(0,0,0,.25)", transition: "left var(--uf-dur-1, 150ms)" }} />
    </button>
  );
}

export default function CsvImportModal({
  onClose,
  onImported,
  defaultCurrency = "USD",
  preferredCurrencies = [],
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
  const [error, setError] = useState<{ title: string; body?: string } | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateFlag[] | null>(null);
  const [keep, setKeep] = useState<Set<number>>(new Set());
  const [dupeRun, setDupeRun] = useState(0);
  const [result, setResult] = useState<{ added: number; skipped: number; spent: number; income: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [customs] = useState<CatCustomizations>(() => (typeof window === "undefined" ? {} : loadCatCustomizations()));

  const processFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";
    const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
    const isCsv = name.endsWith(".csv") || file.type === "text/csv";
    if (!isCsv && !isExcel && !isPdf) {
      setError({ title: "Please use a CSV, Excel or PDF file." });
      return;
    }
    try {
      let h: string[];
      let r: string[][];
      if (isPdf) {
        ({ headers: h, rows: r } = await parsePDF(file));
        if (r.length === 0) {
          setError({ title: "We couldn’t read this PDF.", body: "It may be a scanned picture. Try a CSV or Excel file from your bank." });
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
        setError({ title: "We couldn’t find the columns in this file.", body: "Try exporting it again from your bank." });
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
      setError(null);
      setStep("check");
    } catch {
      setError({ title: "We couldn’t read this file.", body: "Please try again." });
    }
  }, [defaultCurrency]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const parsedTransactions = useMemo((): ParsedImportTransaction[] => {
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

      let type: "expense" | "income" | "transfer";
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
      // Moving money between accounts (or to/from another person) isn't
      // earned or spent - don't let it skew income/expense totals just
      // because of which direction the balance happened to move.
      if (TRANSFER_PATTERN.test(rawDesc)) type = "transfer";
      const currency = normalizeCurrencyCode(rawCurrency) || detectCurrencyFromValue(rawAmount, importCurrency) || importCurrency;
      parsed.push({
        date,
        // Statement exports put the whole timestamp in the column mapped as
        // the date — WeChat's 交易时间 is literally "transaction time" — and
        // parseDate throws the time away. Recover it from the same cell.
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
  }, [colAmount, colCurrency, colDate, colDesc, colNotes, colType, flipSigns, headers, importCurrency, rows]);

  // Read through a ref: the default `{}` is a new object every render.
  const ratesRef = useRef(rates);
  ratesRef.current = rates;
  // Look for rows already saved whenever what we'd add changes, and again
  // after a failed save (dupeRun) so rows that did land are skipped next time.
  useEffect(() => {
    if (parsedTransactions.length === 0) { setDuplicates([]); return; }
    let live = true;
    setDuplicates(null);
    findDuplicates(parsedTransactions, ratesRef.current).then((flags) => {
      if (!live) return;
      setDuplicates(flags);
      setKeep(new Set());
    }).catch(() => { if (live) setDuplicates([]); });
    return () => { live = false; };
  }, [parsedTransactions, dupeRun]);

  const skip = useMemo(() => new Set((duplicates ?? []).map((d) => d.rowIndex).filter((i) => !keep.has(i))), [duplicates, keep]);
  const toAdd = parsedTransactions.filter((_, i) => !skip.has(i));
  const columnsReady = !!colDate && !!colDesc && !!colAmount;
  const canAdd = columnsReady && duplicates !== null && toAdd.length > 0;

  const display = (usd: number) => formatAmount ? formatAmount(usd) : formatMoney(usd, { currency: displayCurrency, decimals: 0 });

  const handleImport = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || toAdd.length === 0) return;
    setError(null);
    setTotal(toAdd.length);
    setProgress(0);
    setStep("importing");

    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < toAdd.length; i += BATCH) {
      const batch = toAdd.slice(i, i + BATCH).map((tx) => ({
        user_id: session.user.id,
        date: tx.date,
        occurred_at: tx.occurred_at,
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
        if (inserted > 0) onImported(inserted);
        setStep("failed");
        return;
      }
      inserted += batch.length;
      setProgress(inserted);
    }

    const sum = (type: string) => toAdd.filter((t) => t.transaction_type === type).reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
    setResult({ added: inserted, skipped: skip.size, spent: sum("expense"), income: sum("income") });
    setStep("done");
    onImported(inserted);
  }, [toAdd, skip, fileName, onImported, rates]);

  const chooseAnother = () => { setStep("upload"); setError(null); setDuplicates(null); };
  const retry = () => { setDupeRun((n) => n + 1); setStep("check"); };

  const currencyOptions = Array.from(new Set([defaultCurrency, ...preferredCurrencies, ...SUPPORTED_CURRENCIES])).filter(Boolean);
  const dates = parsedTransactions.map((t) => t.date).sort();
  const sample = parsedTransactions.slice(0, 3);

  const foundCard = (
    <div style={{ background: "var(--uf-mint)", borderRadius: "var(--uf-r-card)", padding: 20 }}>
      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {parsedTransactions.length} found
      </div>
      <div className="uf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: "var(--uf-ink-2)", marginTop: 6 }}>
        {dates.length > 0 && <span>{shortDate(dates[0])} – {shortDate(dates[dates.length - 1])}</span>}
        <button type="button" onClick={() => setStep("currency")} disabled={step === "importing"}
          aria-label={`Currency: ${CURRENCY_NAMES[importCurrency] ?? importCurrency}. Change`}
          style={{ ...plainButton, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--uf-card)", color: "var(--uf-ink)",
            fontWeight: 600, fontSize: 13, padding: "6px 10px 6px 8px", borderRadius: 999, minHeight: 32 }}>
          <Flag code={CURRENCY_FLAG[importCurrency]} size={12} />
          {CURRENCY_NAMES[importCurrency] ?? importCurrency}
          <span aria-hidden style={{ color: "var(--uf-ink-3)" }}>▾</span>
        </button>
      </div>
    </div>
  );

  const sampleList = sample.length > 0 && (
    <ul style={{ ...panel, listStyle: "none", margin: 0, padding: "6px 18px" }} aria-label="First rows from your file">
      {sample.map((t, i) => {
        const cat = categoryDisplay(t.category, t.transaction_type, customs);
        return (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--uf-border)" : undefined }}>
            <CategoryTile emoji={cat.emoji} color={cat.color} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>
              <div className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{cat.label} · {shortDate(t.date)}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: t.transaction_type === "income" ? "var(--uf-pos)" : "var(--uf-ink)" }}>{signedAmount(t)}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--uf-ink-3)" }}>{TYPE_WORD[t.transaction_type]}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const dupeCount = duplicates?.length ?? 0;
  const keptCount = keep.size;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(21,23,25,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          background: "var(--uf-card)", borderRadius: "var(--uf-r-modal)",
          padding: "clamp(20px, 5vw, 28px)", width: "100%", maxWidth: 480,
          maxHeight: "90dvh", overflowY: "auto", color: "var(--uf-ink)",
          display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        {step === "upload" && (
          <>
            <Header title="Add bank history" onClose={onClose} />
            <div
              onDrop={handleDrop}
              onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              style={{
                background: "var(--uf-lilac)", borderRadius: "var(--uf-r-card)", padding: "32px 20px", textAlign: "center",
                border: `2px dashed ${dragging ? "var(--uf-ink)" : "color-mix(in srgb, var(--uf-ink) 18%, transparent)"}`,
              }}
            >
              <span style={{ width: 56, height: 56, borderRadius: 18, background: "var(--uf-card)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
                <Icon name="upload" size={26} strokeWidth={2} />
              </span>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Drop your bank file here</div>
              <div className="uf-t-body" style={{ color: "var(--uf-ink-2)", margin: "4px 0 12px" }}>or</div>
              <Button variant="primary" size="lg" onClick={() => fileRef.current?.click()} style={{ minWidth: 180 }}>Choose file</Button>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {["CSV", "Excel", "PDF"].map((k) => (
                  <span key={k} style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: "var(--uf-card)", color: "var(--uf-ink-2)" }}>{k}</span>
                ))}
              </div>
              <input
                ref={fileRef}
                type="file"
                aria-label="Bank file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,application/pdf"
                style={{ display: "none" }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) processFile(f); }}
              />
            </div>
            {error
              ? <Note tone="neg" icon="critical" title={error.title}>{error.body}</Note>
              : <Note tone="info" icon="info" title="Where do I find it?">In your bank app, look for “Export” or “Statements”.</Note>}
          </>
        )}

        {(step === "check" || step === "importing" || step === "failed") && (
          <>
            <Header title="Looks good?" onClose={onClose} />
            {foundCard}
            {step !== "failed" && sampleList}
            {step === "check" && !colType && (
              <div>
                <div id="sign-q" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Are expenses shown as expenses?</div>
                <div role="radiogroup" aria-labelledby="sign-q" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--uf-surface)", borderRadius: 999, padding: 4 }}>
                  {[{ v: false, l: "✓ Yes" }, { v: true, l: "⇄ No, swap" }].map(({ v, l }) => {
                    const on = flipSigns === v;
                    return (
                      <button key={l} type="button" role="radio" aria-checked={on} onClick={() => setFlipSigns(v)}
                        style={{ ...plainButton, minHeight: 40, borderRadius: 999, fontSize: 14, fontWeight: 600,
                          background: on ? "var(--uf-card)" : "transparent", color: on ? "var(--uf-ink)" : "var(--uf-ink-2)",
                          boxShadow: on ? "0 1px 3px rgba(0,0,0,.12)" : "none" }}>{l}</button>
                    );
                  })}
                </div>
              </div>
            )}
            {step === "check" && dupeCount > 0 && (
              <Note tone="warn" icon="warning"
                title={`${dupeCount} ${dupeCount === 1 ? "is" : "are"} already here.`}
                action={<button type="button" onClick={() => setStep("dupes")} style={{ ...plainButton, fontWeight: 700, textDecoration: "underline", color: "var(--uf-ink)", minHeight: 44, padding: "0 4px" }}>See</button>}>
                {keptCount > 0 ? `Keeping ${keptCount}, skipping ${dupeCount - keptCount}.` : dupeCount === 1 ? "We’ll skip it." : "We’ll skip them."}
              </Note>
            )}
            {step === "check" && columnsReady && parsedTransactions.length === 0 && (
              <Note tone="neg" icon="critical" title="No rows we can use.">Check the columns below.</Note>
            )}
            {step === "failed" && (
              <Note tone="neg" icon="critical" title={progress > 0 ? `Stopped after ${progress} of ${total}.` : "Nothing was added."}>
                Check your internet and try again.{progress > 0 && ` We won’t add the first ${progress} twice.`}
              </Note>
            )}

            {step === "check" && (
              <Button variant="primary" size="lg" fullWidth disabled={!canAdd} onClick={handleImport}>
                {duplicates === null ? "Checking…" : `Add ${toAdd.length} transaction${toAdd.length === 1 ? "" : "s"}`}
              </Button>
            )}
            {step === "importing" && (
              <>
                <Button variant="primary" size="lg" fullWidth disabled aria-live="polite" style={{ opacity: 1, cursor: "progress" }}>Adding {progress} of {total}…</Button>
                <div role="progressbar" aria-label="Adding transactions" aria-valuemin={0} aria-valuemax={total} aria-valuenow={progress}
                  style={{ height: 6, borderRadius: 999, background: "var(--uf-surface)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${total ? (progress / total) * 100 : 0}%`, background: "var(--uf-ink)", transition: "width 200ms" }} />
                </div>
              </>
            )}
            {step === "failed" && <Button variant="primary" size="lg" fullWidth onClick={retry}>Try again</Button>}

            {step !== "importing" && (
              <button type="button" onClick={chooseAnother} style={{ ...plainButton, alignSelf: "center", minHeight: 44, fontSize: 14, fontWeight: 600, color: "var(--uf-ink-2)", textDecoration: "underline" }}>
                Choose another file
              </button>
            )}
            {step === "check" && (
              <button type="button" onClick={() => setStep("columns")} style={{ ...plainButton, minHeight: 44, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, color: "var(--uf-ink-2)", padding: "0 4px" }}>
                <span>Wrong columns? Fix them</span><span aria-hidden>›</span>
              </button>
            )}
          </>
        )}

        {step === "currency" && (
          <>
            <Header title="Currency" onBack={() => setStep("check")} onClose={onClose} />
            <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
              {colCurrency ? "Your file has a currency column. This is only used when a row leaves it blank." : "We guessed this from your file. Only change it if that’s wrong."}
            </p>
            <div role="radiogroup" aria-label="Currency" style={{ ...panel, padding: "4px 16px", maxHeight: 360, overflowY: "auto" }}>
              {currencyOptions.map((c, i) => {
                const on = c === importCurrency;
                return (
                  <button key={c} type="button" role="radio" aria-checked={on} onClick={() => { setImportCurrency(c); setStep("check"); }}
                    style={{ ...plainButton, width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 48, fontSize: 15,
                      borderTop: i ? "1px solid var(--uf-border)" : undefined }}>
                    <Flag code={CURRENCY_FLAG[c]} size={16} />
                    <span style={{ fontWeight: 700, width: 44, textAlign: "left" }}>{c}</span>
                    <span style={{ color: "var(--uf-ink-2)", flex: 1, textAlign: "left" }}>{CURRENCY_NAMES[c] ?? c}</span>
                    {on && <Icon name="positive" size={18} strokeWidth={2.4} />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "dupes" && (
          <>
            <Header title="Already here?" onBack={() => setStep("check")} onClose={onClose} />
            <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
              Left is from your file. Right is already in UntilFire. <Mark on>Yellow</Mark> means different.
            </p>
            {(duplicates ?? []).map(({ rowIndex, row, existing }) => {
              const nameDiff = row.description.trim().toLowerCase() !== (existing.description ?? "").trim().toLowerCase();
              const dateDiff = row.date !== existing.date;
              const amountDiff = row.currency !== existing.currency || !amountsClose(row.amount, existing.amount);
              const kept = keep.has(rowIndex);
              const note = !nameDiff && !dateDiff && !amountDiff ? "Looks the same"
                : dateDiff && !nameDiff && !amountDiff ? "A day or two apart"
                : nameDiff && !dateDiff && !amountDiff ? "Same amount and day"
                : "Close match";
              return (
                <div key={rowIndex} style={{ ...panel, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <DupeSide tag="From file" name={row.description} date={row.date} amount={formatMoney(row.amount, { currency: row.currency, decimals: 2 })} diff={{ name: nameDiff, date: dateDiff, amount: amountDiff }} />
                    <DupeSide tag="Already have" name={existing.description || "No name"} date={existing.date} amount={formatMoney(existing.amount, { currency: existing.currency, decimals: 2 })} diff={{ name: nameDiff, date: dateDiff, amount: amountDiff }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{note}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                      Keep both
                      <Switch on={kept} label={`Keep both: ${row.description}, ${shortDate(row.date)}`} onChange={() => setKeep((prev) => {
                        const next = new Set(prev);
                        if (next.has(rowIndex)) next.delete(rowIndex); else next.add(rowIndex);
                        return next;
                      })} />
                    </span>
                  </div>
                </div>
              );
            })}
            <Button variant="primary" size="lg" fullWidth onClick={() => setStep("check")}>Done</Button>
          </>
        )}

        {step === "columns" && (
          <>
            <Header title="Fix columns" onBack={() => setStep("check")} onClose={onClose} />
            <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>Pick which column in your file holds each thing.</p>
            <div style={{ ...panel, padding: "4px 16px" }}>
              {[
                { label: "Date", val: colDate, set: setColDate },
                { label: "Name", val: colDesc, set: setColDesc },
                { label: "Amount", val: colAmount, set: setColAmount },
                { label: "Income or expense", val: colType, set: setColType, optional: true },
                { label: "Currency", val: colCurrency, set: setColCurrency, optional: true },
                { label: "Notes", val: colNotes, set: setColNotes, optional: true },
              ].map(({ label, val, set, optional }, i) => (
                <label key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 56, fontSize: 14,
                  borderTop: i ? "1px solid var(--uf-border)" : undefined }}>
                  <span>{label}{optional && <span style={{ fontSize: 12, color: "var(--uf-ink-3)", marginLeft: 6 }}>optional</span>}</span>
                  <Select value={val} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set(e.target.value)} style={{ maxWidth: "55%", padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
                    <option value="">{optional ? "None" : "Choose…"}</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </label>
              ))}
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={() => setStep("check")}>Done</Button>
          </>
        )}

        {step === "done" && result && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} aria-label="Close" style={iconButton}>×</button>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ width: 72, height: 72, borderRadius: 24, background: "var(--uf-mint)", color: "var(--uf-pos)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                <Icon name="positive" size={34} strokeWidth={2.6} />
              </span>
              <h2 id="import-title" style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{result.added} added</h2>
              {result.skipped > 0 && <div className="uf-t-body" style={{ color: "var(--uf-ink-2)", marginTop: 4 }}>{result.skipped} skipped, already here</div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ ...panel, borderRadius: 20, padding: 16 }}>
                <div className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Expenses</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{display(result.spent)}</div>
              </div>
              <div style={{ ...panel, borderRadius: 20, padding: 16 }}>
                <div className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--uf-pos)" }}>+{display(result.income)}</div>
              </div>
            </div>
            <Note tone="info" icon="info">Categories are our guess. Tap one to change it.</Note>
            <Button variant="primary" size="lg" fullWidth onClick={onClose}>See transactions</Button>
          </>
        )}
      </div>
    </div>
  );
}

function Mark({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return <mark style={{ background: "var(--uf-yellow)", color: "#151719", borderRadius: 6, padding: "0 4px" }}>{children}</mark>;
}

function DupeSide({ tag, name, date, amount, diff }: {
  tag: string; name: string; date: string; amount: string; diff: { name: boolean; date: boolean; amount: boolean };
}) {
  return (
    <div style={{ minWidth: 0, background: "var(--uf-card)", borderRadius: 16, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--uf-ink-3)", marginBottom: 6 }}>{tag}</div>
      <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}><Mark on={diff.name}>{name}</Mark></div>
      <div className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}><Mark on={diff.date}>{shortDate(date)}</Mark></div>
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}><Mark on={diff.amount}>{amount}</Mark></div>
    </div>
  );
}
