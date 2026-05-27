"use client";
import React, { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Step = "upload" | "map" | "importing" | "done";

type Props = {
  onClose: () => void;
  onImported: (count: number) => void;
  defaultCurrency?: string;
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

// ─── Auto-detect column mapping from header names ─────────────────────────────
function autoDetectColumns(headers: string[]): { date: string; description: string; amount: string } {
  const find = (patterns: RegExp[]) =>
    headers.find((h) => patterns.some((p) => p.test(h.toLowerCase()))) ?? "";
  return {
    date: find([/^date$/, /date/, /posted/, /transaction date/]),
    description: find([/description/, /memo/, /details/, /narrative/, /payee/, /name/]),
    amount: find([/^amount$/, /amount/, /debit/, /credit/, /transaction amount/]),
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function CsvImportModal({ onClose, onImported, defaultCurrency = "USD" }: Props) {
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
      if (h.length < 2) { setError("Couldn't parse this file. Make sure it's a CSV with headers."); return; }
      const auto = autoDetectColumns(h);
      setHeaders(h);
      setRows(r.filter((row) => row.some((c) => c.trim())));
      setColDate(auto.date);
      setColDesc(auto.description);
      setColAmount(auto.amount);
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

  const handleImport = useCallback(async () => {
    if (!colDate || !colDesc || !colAmount) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const dateIdx = headers.indexOf(colDate);
    const descIdx = headers.indexOf(colDesc);
    const amtIdx  = headers.indexOf(colAmount);

    const parsed: {
      date: string; description: string; amount: number;
      transaction_type: "expense" | "income"; category: string;
    }[] = [];

    for (const row of rows) {
      const rawDate   = row[dateIdx] ?? "";
      const rawDesc   = row[descIdx] ?? "";
      const rawAmount = row[amtIdx]  ?? "";

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

    if (parsed.length === 0) {
      setError("No valid rows found. Check that Date, Description, and Amount columns are correct.");
      return;
    }

    setTotal(parsed.length);
    setProgress(0);
    setStep("importing");

    // Insert in batches of 50
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
      if (dbErr) { setError("Import failed: " + dbErr.message); setStep("map"); return; }
      inserted += batch.length;
      setProgress(inserted);
    }

    setImportedCount(inserted);
    setStep("done");
    onImported(inserted);
  }, [colDate, colDesc, colAmount, headers, rows, flipSigns, defaultCurrency, onImported]);

  // ── Preview rows (first 3 valid) ────────────────────────────────────────────
  const previewRows = (() => {
    if (!colDate || !colDesc || !colAmount) return [];
    const di = headers.indexOf(colDate);
    const ni = headers.indexOf(colDesc);
    const ai = headers.indexOf(colAmount);
    return rows.slice(0, 5).map((r: string[]) => ({
      date:   r[di] ?? "",
      desc:   r[ni] ?? "",
      amount: r[ai] ?? "",
    }));
  })();

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid #23232d", background: "#1a1a24", color: "#e2e8f0",
    fontSize: 13, fontFamily: "DM Sans, sans-serif",
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
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", fontFamily: "Syne, sans-serif" }}>
              Import bank CSV
            </div>
            {step === "upload" && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Upload a CSV exported from your bank</div>}
            {step === "map"     && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{rows.length} rows detected — map the columns below</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* ── Step 1: Upload ───────────────────────────────────────────────── */}
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

        {/* ── Step 2: Map columns ──────────────────────────────────────────── */}
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

            {/* Preview */}
            {previewRows.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Preview</div>
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
              onClick={handleImport}
              disabled={!colDate || !colDesc || !colAmount}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                background: (!colDate || !colDesc || !colAmount) ? "#1a1a24" : "#059669",
                color: (!colDate || !colDesc || !colAmount) ? "#475569" : "#fff",
                fontSize: 14, fontWeight: 700, cursor: (!colDate || !colDesc || !colAmount) ? "not-allowed" : "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Import {rows.length} transactions →
            </button>
          </>
        )}

        {/* ── Step 3: Importing ────────────────────────────────────────────── */}
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

        {/* ── Step 4: Done ─────────────────────────────────────────────────── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, fontFamily: "Syne, sans-serif" }}>
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
                cursor: "pointer", fontFamily: "DM Sans, sans-serif",
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
