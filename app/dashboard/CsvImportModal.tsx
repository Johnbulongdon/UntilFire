"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

type ParsedRow = {
  date: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  sub_category: string | null;
  transaction_type: "expense" | "income";
};

type DuplicateFlag = {
  rowIndex: number;
  row: ParsedRow;
  existing: { id: string; date: string; amount: number; category: string };
};

type Step = "upload" | "map" | "review" | "importing" | "done";

const FIELD_OPTIONS = [
  { value: "", label: "(ignore)" },
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "description", label: "Description" },
  { value: "category", label: "Category" },
  { value: "currency", label: "Currency" },
  { value: "transaction_type", label: "Type (expense/income)" },
];

const AUTO_DETECT: Record<string, string> = {
  date: "date",
  "transaction date": "date",
  "trans date": "date",
  "posted date": "date",
  "posting date": "date",
  amount: "amount",
  "debit amount": "amount",
  "credit amount": "amount",
  sum: "amount",
  price: "amount",
  description: "description",
  merchant: "description",
  payee: "description",
  memo: "description",
  narration: "description",
  name: "description",
  category: "category",
  currency: "currency",
  type: "transaction_type",
  "transaction type": "transaction_type",
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim()); current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cells.push(current.trim()); current = "";
      if (cells.some(c => c !== "")) rows.push([...cells]);
      cells.length = 0;
    } else {
      current += ch;
    }
  }
  if (cells.length || current) {
    cells.push(current.trim());
    if (cells.some(c => c !== "")) rows.push([...cells]);
  }
  return rows;
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return "";
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      fontSize: 13, color: "#DC2626", background: "#FEF2F2",
      border: "1px solid #FCA5A5", borderRadius: 8,
      padding: "8px 12px", marginBottom: 16,
    }}>
      {msg}
    </div>
  );
}

export default function CsvImportModal({
  open, onClose, onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicateFlags, setDuplicateFlags] = useState<DuplicateFlag[]>([]);
  const [skipIndices, setSkipIndices] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRawRows([]);
    setColumnMap({});
    setParsedRows([]);
    setDuplicateFlags([]);
    setSkipIndices(new Set());
    setProgress(0);
    setImportResult(null);
    setError(null);
  }

  function handleClose() { reset(); onClose(); }

  function handleFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setError("CSV must have at least a header row and one data row.");
        return;
      }
      const hdrs = rows[0];
      const data = rows.slice(1);
      setHeaders(hdrs);
      setRawRows(data);
      const map: Record<number, string> = {};
      hdrs.forEach((h, i) => {
        const key = h.trim().toLowerCase();
        if (AUTO_DETECT[key]) map[i] = AUTO_DETECT[key];
      });
      setColumnMap(map);
      setStep("map");
    };
    reader.readAsText(file);
  }

  function buildParsedRows(): ParsedRow[] {
    const find = (field: string) => {
      const entry = Object.entries(columnMap).find(([, v]) => v === field);
      return entry ? Number(entry[0]) : null;
    };
    const dateIdx = find("date");
    const amountIdx = find("amount");
    const descIdx = find("description");
    const catIdx = find("category");
    const currIdx = find("currency");
    const typeIdx = find("transaction_type");

    return rawRows.map((row) => {
      const rawAmt = amountIdx != null ? (row[amountIdx] ?? "") : "";
      const amtNum = parseFloat(rawAmt.replace(/[^0-9.\-]/g, "")) || 0;
      const txType: "expense" | "income" =
        typeIdx != null
          ? (row[typeIdx]?.toLowerCase().includes("income") ? "income" : "expense")
          : (amtNum < 0 ? "income" : "expense");
      return {
        date: normalizeDate(dateIdx != null ? (row[dateIdx] ?? "") : ""),
        amount: Math.abs(amtNum),
        currency: currIdx != null ? (row[currIdx] || "USD") : "USD",
        description: descIdx != null ? (row[descIdx] ?? "") : "",
        category: catIdx != null ? ((row[catIdx] || "other").trim().toLowerCase()) : "other",
        sub_category: null,
        transaction_type: txType,
      };
    }).filter(r => r.date !== "" && r.amount > 0);
  }

  async function handleCheckDuplicates() {
    setError(null);
    const rows = buildParsedRows();
    if (rows.length === 0) {
      setError("No valid rows found. Make sure Date and Amount columns are mapped correctly.");
      return;
    }
    setParsedRows(rows);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in."); return; }

    const dates = rows.map(r => r.date);
    const minDate = dates.reduce((a, b) => a < b ? a : b);
    const maxDate = dates.reduce((a, b) => a > b ? a : b);

    const { data: existing, error: fetchErr } = await supabase
      .from("expenses")
      .select("id, date, amount, category")
      .eq("user_id", session.user.id)
      .gte("date", minDate)
      .lte("date", maxDate);

    if (fetchErr) { setError("Failed to check for duplicates. Please try again."); return; }

    const flags: DuplicateFlag[] = [];
    rows.forEach((row, i) => {
      const match = existing?.find(e =>
        e.date === row.date &&
        Math.abs(Number(e.amount) - row.amount) < 0.01 &&
        (e.category ?? "").trim().toLowerCase() === row.category.trim().toLowerCase()
      );
      if (match) flags.push({ rowIndex: i, row, existing: match });
    });

    if (flags.length > 0) {
      setDuplicateFlags(flags);
      setSkipIndices(new Set(flags.map(f => f.rowIndex)));
      setStep("review");
    } else {
      await runImport(rows, new Set());
    }
  }

  async function runImport(rows: ParsedRow[], skip: Set<number>) {
    setStep("importing");
    setProgress(0);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in."); return; }

    const toInsert = rows
      .filter((_, i) => !skip.has(i))
      .map(r => ({
        user_id: session.user.id,
        date: r.date,
        amount: r.amount,
        currency: r.currency,
        description: r.description,
        category: r.category || "other",
        sub_category: r.sub_category,
        tags: [] as string[],
        transaction_type: r.transaction_type,
      }));

    const CHUNK = 50;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const batch = toInsert.slice(i, i + CHUNK);
      const { error: insertErr } = await supabase.from("expenses").insert(batch);
      if (insertErr) {
        setError(`Import failed at row ${i + 1}: ${insertErr.message}`);
        setStep("map");
        return;
      }
      inserted += batch.length;
      setProgress(toInsert.length > 0 ? Math.round((inserted / toInsert.length) * 100) : 100);
    }

    const skipped = rows.length - inserted;
    setImportResult({ imported: inserted, skipped });
    setStep("done");
    onImported();
  }

  if (!open) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff", borderRadius: 16, padding: "32px 28px",
          maxWidth: 640, width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Close button */}
        {step !== "importing" && (
          <button
            onClick={handleClose}
            style={{
              position: "absolute", top: 14, right: 18,
              background: "none", border: "none",
              fontSize: 22, color: "#94A3B8", cursor: "pointer", lineHeight: 1,
            }}
          >
            ×
          </button>
        )}

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#064E3B" }}>Import CSV</div>
              <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
                Upload a bank or expense CSV to bulk-import transactions.
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <input
              ref={fileRef} type="file" accept=".csv"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              style={{
                border: "2px dashed #A7F3D0", borderRadius: 12, padding: "44px 24px",
                textAlign: "center", cursor: "pointer",
                background: "#F0FDF4",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#047857" }}>
                Click or drag a CSV file here
              </div>
              <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
                Supports any bank export — .csv files only
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Map columns ── */}
        {step === "map" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#064E3B" }}>Map columns</div>
              <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
                {rawRows.length} rows found. Match each CSV column to a field.
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={thStyle}>CSV column</th>
                    <th style={thStyle}>Maps to</th>
                    <th style={{ ...thStyle, borderRight: "none" }}>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "9px 14px", fontWeight: 600, color: "#19181E" }}>{h}</td>
                      <td style={{ padding: "9px 14px" }}>
                        <select
                          value={columnMap[i] ?? ""}
                          onChange={e => setColumnMap(prev => ({ ...prev, [i]: e.target.value }))}
                          style={{
                            fontSize: 13, padding: "5px 8px", borderRadius: 6,
                            border: "1px solid #E2E8F0", background: "#fff",
                            color: "#19181E", cursor: "pointer",
                          }}
                        >
                          {FIELD_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{
                        padding: "9px 14px", color: "#94A3B8", fontSize: 12,
                        maxWidth: 140, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {rawRows.slice(0, 2).map(r => r[i]).filter(Boolean).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => { setStep("upload"); setError(null); }}
                style={{ fontSize: 14, color: "#64748B", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                ← Back
              </button>
              <button
                onClick={handleCheckDuplicates}
                style={primaryBtnStyle}
              >
                Import {rawRows.length} rows →
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Review duplicates ── */}
        {step === "review" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#064E3B" }}>
                {duplicateFlags.length} possible duplicate{duplicateFlags.length !== 1 ? "s" : ""} found
              </div>
              <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
                These rows may already exist in your records. Checked rows will be skipped.
              </div>
            </div>
            <div style={{ border: "1px solid #FED7AA", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#FFF7ED" }}>
                    <th style={{ ...thStyle, color: "#92400E", borderBottom: "1px solid #FED7AA" }}>Skip</th>
                    <th style={{ ...thStyle, color: "#92400E", borderBottom: "1px solid #FED7AA" }}>Date</th>
                    <th style={{ ...thStyle, color: "#92400E", borderBottom: "1px solid #FED7AA" }}>Description</th>
                    <th style={{ ...thStyle, color: "#92400E", borderBottom: "1px solid #FED7AA", textAlign: "right" }}>Amount</th>
                    <th style={{ ...thStyle, color: "#92400E", borderBottom: "1px solid #FED7AA", borderRight: "none" }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateFlags.map(({ rowIndex, row }) => {
                    const isSkipped = skipIndices.has(rowIndex);
                    return (
                      <tr
                        key={rowIndex}
                        style={{ borderBottom: "1px solid #F1F5F9", background: isSkipped ? "#FFFBEB" : "#fff" }}
                      >
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSkipped}
                            onChange={() => setSkipIndices(prev => {
                              const s = new Set(prev);
                              if (s.has(rowIndex)) s.delete(rowIndex); else s.add(rowIndex);
                              return s;
                            })}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={tdStyle}>{row.date}</td>
                        <td style={{ ...tdStyle, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.description || "—"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          ${row.amount.toFixed(2)}
                        </td>
                        <td style={tdStyle}>{row.category}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => runImport(parsedRows, new Set())}
                style={{
                  fontSize: 13, color: "#64748B",
                  background: "none", border: "1px solid #E2E8F0",
                  borderRadius: 8, padding: "9px 16px", cursor: "pointer",
                }}
              >
                Import all anyway
              </button>
              <button
                onClick={() => runImport(parsedRows, skipIndices)}
                style={primaryBtnStyle}
              >
                Skip checked & continue →
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Importing ── */}
        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#064E3B", marginBottom: 20 }}>Importing…</div>
            <div style={{
              height: 8, background: "#E2E8F0", borderRadius: 99,
              overflow: "hidden", maxWidth: 320, margin: "0 auto",
            }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: "#059669", borderRadius: 99, transition: "width 0.3s",
              }} />
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 10 }}>{progress}%</div>
            {error && <ErrorBox msg={error} />}
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === "done" && importResult && (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#064E3B", marginBottom: 8 }}>
              Import complete
            </div>
            <div style={{ fontSize: 15, color: "#374151" }}>
              <strong>{importResult.imported}</strong> row{importResult.imported !== 1 ? "s" : ""} imported
              {importResult.skipped > 0 && (
                <>, <strong>{importResult.skipped}</strong> duplicate{importResult.skipped !== 1 ? "s" : ""} skipped</>
              )}.
            </div>
            <button onClick={handleClose} style={{ ...primaryBtnStyle, marginTop: 28 }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left",
  fontWeight: 700, color: "#64748B",
  borderBottom: "1px solid #E2E8F0",
  borderRight: "none",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 12px", color: "#374151",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "11px 24px", borderRadius: 10, border: "none",
  background: "#047857", color: "#fff",
  fontSize: 14, fontWeight: 700, cursor: "pointer",
};
