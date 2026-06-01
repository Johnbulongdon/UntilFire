"use client";
import React, { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Step = "upload" | "map" | "review" | "importing" | "done";

type Transaction = {
  date: string;
  amount: number;
  currency: string;
  transaction_type: "expense" | "income";
};

type Props = {
  onClose: () => void;
  onImported: (count: number) => void;
  defaultCurrency?: string;
  transactions?: Transaction[];
  viewMonth?: string;
  rates?: Record<string, number>;
  formatAmount?: (value: number) => string;
  displayCurrency?: string;
};

type ParsedImportTransaction = {
  date: string;
  description: string;
  amount: number;
  transaction_type: "expense" | "income";
  category: string;
};

// ─── CSV parsing ──────────────────────────────────────────────────────────────
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
  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function parseDate(s: string): string | null {
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

function parseAmount(s: string): number | null {
  s = s.trim().replace(/[$€£¥₩₹,\s]/g, "");
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

function autoDetectColumns(headers: string[]): { date: string; description: string; amount: string } {
  const find = (patterns: RegExp[]) =>
    headers.find((h) => patterns.some((p) => p.test(h.toLowerCase()))) ?? "";
  return {
    date: find([/^date$/, /date/, /posted/, /transaction date/]),
    description: find([/description/, /memo/, /details/, /narrative/, /payee/, /name/]),
    amount: find([/^amount$/, /amount/, /debit/, /credit/, /transaction amount/]),
  };
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
  const [colAmount, setColAmount] = useState("");
  const [flipSigns, setFlipSigns] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length < 2) {
        setError("Couldn't parse this file. Make sure it's a CSV with headers.");
        return;
      }
      const auto = autoDetectColumns(h);
      setHeaders(h);
      setRows(r.filter((row) => row.some((c) => c.trim())));
      setColDate(auto.date);
      setColDesc(auto.description);
      setColAmount(auto.amount);
      setFlipSigns(false);
      setError("");
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

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
    const amtIdx = headers.indexOf(colAmount);

    const parsed: ParsedImportTransaction[] = [];
    for (const row of rows) {
      const rawDate = row[dateIdx] ?? "";
      const rawDesc = row[descIdx] ?? "";
      const rawAmount = row[amtIdx] ?? "";

      const date = parseDate(rawDate);
      const rawAmt = parseAmount(rawAmount);
      if (!date || rawAmt === null || !rawDesc.trim()) continue;

      const amt = flipSigns ? -rawAmt : rawAmt;
      const type: "expense" | "income" = amt < 0 ? "expense" : "income";
      parsed.push({
        date,
        description: rawDesc.trim(),
        amount: Math.abs(amt),
        transaction_type: type,
        category: guessCategory(rawDesc, type),
      });
    }
    return parsed;
  }, [colAmount, colDate, colDesc, flipSigns, headers, rows]);

  const parsedTransactions = buildParsedTransactions();
  const sampleTransaction = parsedTransactions[0] ?? null;
  const touchedMonths = [...new Set(parsedTransactions.map((t) => t.date.slice(0, 7)).filter(Boolean))].length;

  const previewRows = (() => {
    if (!colDate || !colDesc || !colAmount) return [];
    const di = headers.indexOf(colDate);
    const ni = headers.indexOf(colDesc);
    const ai = headers.indexOf(colAmount);
    return rows.slice(0, 5).map((r: string[]) => ({
      date: r[di] ?? "",
      desc: r[ni] ?? "",
      amount: r[ai] ?? "",
    }));
  })();

  const monthLabel = (() => {
    if (!viewMonth) return "this month";
    const [y, m] = viewMonth.split("-").map(Number);
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

  const currentMonthTxns = viewMonth ? transactions.filter((t) => t.date.startsWith(viewMonth)) : [];
  const importedMonthTxns = viewMonth ? parsedTransactions.filter((t) => t.date.startsWith(viewMonth)) : [];
  const currentIncome = currentMonthTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const currentExpenses = currentMonthTxns.filter((t) => t.transaction_type !== "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const importedIncome = importedMonthTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + toUSD(t.amount, defaultCurrency, rates), 0);
  const importedExpenses = importedMonthTxns.filter((t) => t.transaction_type !== "income").reduce((s, t) => s + toUSD(t.amount, defaultCurrency, rates), 0);
  const projectedIncome = currentIncome + importedIncome;
  const projectedExpenses = currentExpenses + importedExpenses;
  const projectedNet = projectedIncome - projectedExpenses;

  const openReview = useCallback(() => {
    if (!colDate || !colDesc || !colAmount) return;
    if (parsedTransactions.length === 0) {
      setError("No valid rows found. Check that Date, Description, and Amount columns are correct.");
      return;
    }
    setError("");
    setStep("review");
  }, [colAmount, colDate, colDesc, parsedTransactions.length]);

  const handleImport = useCallback(async () => {
    const parsed = buildParsedTransactions();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (parsed.length === 0) {
      setError("No valid rows found. Check that Date, Description, and Amount columns are correct.");
      setStep("map");
      return;
    }

    setTotal(parsed.length);
    setProgress(0);
    setStep("importing");

    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < parsed.length; i += BATCH) {
      const batch = parsed.slice(i, i + BATCH).map((tx) => ({
        user_id: session.user.id,
        date: tx.date,
        amount: tx.amount,
        currency: defaultCurrency,
        description: tx.description,
        category: tx.category,
        transaction_type: tx.transaction_type,
        tags: [],
        sub_category: null,
      }));
      const { error: dbErr } = await supabase.from("expenses").insert(batch);
      if (dbErr) {
        setError("Import failed: " + dbErr.message);
        setStep("review");
        return;
      }
      inserted += batch.length;
      setProgress(inserted);
    }

    setImportedCount(inserted);
    setStep("done");
    onImported(inserted);
  }, [buildParsedTransactions, defaultCurrency, onImported]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid #23232d", background: "#1a1a24", color: "#e2e8f0",
    fontSize: 13, fontFamily: "Manrope, sans-serif",
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
              Import bank CSV
            </div>
            {step === "upload" && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Upload a CSV exported from your bank</div>}
            {step === "map" && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{rows.length} rows detected — map the columns below</div>}
            {step === "review" && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Check one interpreted example and the month totals before importing</div>}
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
              Drop your CSV here or click to browse
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Export from your bank as CSV, then upload it here
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
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
              ].map(({ label, val, set }) => (
                <div key={label} style={{ gridColumn: label.startsWith("Amount") ? "1 / -1" : undefined }}>
                  <label style={labelStyle}>{label}</label>
                  <select value={val} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set(e.target.value)} style={inputStyle}>
                    <option value="">— select —</option>
                    {headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
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
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw CSV sample</div>
                <div style={{ border: "1px solid #23232d", borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#1a1a24" }}>
                        {["Date", "Description", "Amount"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #23232d" }}>{h}</th>
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
            )}

            <button
              onClick={openReview}
              disabled={!colDate || !colDesc || !colAmount}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                background: (!colDate || !colDesc || !colAmount) ? "#1a1a24" : "#059669",
                color: (!colDate || !colDesc || !colAmount) ? "#475569" : "#fff",
                fontSize: 14, fontWeight: 700, cursor: (!colDate || !colDesc || !colAmount) ? "not-allowed" : "pointer",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              Review import →
            </button>
          </>
        )}

        {step === "review" && (
          <>
            <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#161621", border: "1px solid #23232d", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Import summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
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
                </div>
              </div>

              <div style={{ background: "#161621", border: "1px solid #23232d", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Example transaction</div>
                {sampleTransaction ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Date</span><span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600 }}>{sampleTransaction.date}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Description</span><span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600, textAlign: "right" }}>{sampleTransaction.description}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Type</span><span style={{ color: sampleTransaction.transaction_type === "income" ? "#86EFAC" : "#FCA5A5", fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{sampleTransaction.transaction_type}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Amount stored</span><span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 700 }}>{previewAmount(sampleTransaction.amount)}</span></div>
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
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => setStep("map")}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "1px solid #334155",
                  background: "transparent", color: "#cbd5e1", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={parsedTransactions.length === 0}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                  background: parsedTransactions.length === 0 ? "#1a1a24" : "#059669",
                  color: parsedTransactions.length === 0 ? "#475569" : "#fff",
                  fontSize: 14, fontWeight: 700, cursor: parsedTransactions.length === 0 ? "not-allowed" : "pointer",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                Import {parsedTransactions.length} transactions
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
              {importedCount} transactions imported
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
