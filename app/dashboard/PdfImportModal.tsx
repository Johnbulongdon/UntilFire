"use client";
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ParsedStatementTransaction } from "@/app/api/parse-statement/route";

type Step = "upload" | "parsing" | "review" | "importing" | "done";

type ReviewRow = ParsedStatementTransaction & {
  skip: boolean;
  isDuplicate: boolean;
  category: string;
};

type ExistingTx = {
  date: string;
  amount: number;
  transaction_type: string;
};

type Props = {
  onClose: () => void;
  onImported: (count: number) => void;
  defaultCurrency?: string;
  existingTransactions?: ExistingTx[];
};

function isDuplicate(row: ParsedStatementTransaction, existing: ExistingTx[]): boolean {
  return existing.some(
    (e) =>
      e.date === row.date &&
      Math.abs(Number(e.amount) - row.amount) < 0.01 &&
      e.transaction_type === row.type
  );
}

export default function PdfImportModal({ onClose, onImported, defaultCurrency = "USD", existingTransactions = [] }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedBank, setDetectedBank] = useState("");
  const [detectedPeriod, setDetectedPeriod] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setError(null);
    setStep("parsing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-statement", { method: "POST", body: formData });
      if (!res.ok) {
        const { error: msg } = await res.json() as { error: string };
        throw new Error(msg || `Server error ${res.status}`);
      }

      const data = await res.json() as { bank: string; period: string; transactions: ParsedStatementTransaction[] };

      setDetectedBank(data.bank ?? "Unknown bank");
      setDetectedPeriod(data.period ?? "");

      const reviewRows: ReviewRow[] = (data.transactions ?? []).map((t) => ({
        ...t,
        skip: false,
        isDuplicate: isDuplicate(t, existingTransactions),
        category: t.type === "income" ? "other_income" : "other",
      }));

      if (!reviewRows.length) {
        setError("No transactions were found in this statement. The model may need a better prompt for this bank format.");
        setStep("upload");
        return;
      }

      setRows(reviewRows);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("upload");
    }
  }, [existingTransactions]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = async () => {
    const toInsert = rows.filter((r) => !r.skip);
    if (!toInsert.length) { onImported(0); return; }

    setStep("importing");
    setProgress(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not logged in"); setStep("review"); return; }

    const total = toInsert.length;
    let done = 0;
    const chunkSize = 25;

    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize).map((r) => ({
        user_id: session.user.id,
        date: r.date,
        amount: r.amount,
        currency: r.currency,
        description: r.description,
        category: r.category,
        transaction_type: r.type,
        tags: [] as string[],
      }));
      await supabase.from("expenses").insert(chunk);
      done += chunk.length;
      setProgress(Math.round((done / total) * 100));
    }

    const skipped = rows.filter((r) => r.skip).length;
    setImportResult({ imported: done, skipped });
    setStep("done");
  };

  const toggleSkip = (idx: number) =>
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, skip: !r.skip } : r));

  const toggleType = (idx: number) =>
    setRows((prev) => prev.map((r, i) => i === idx
      ? { ...r, type: r.type === "income" ? "expense" : "income" }
      : r));

  const dupCount = rows.filter((r) => r.isDuplicate && !r.skip).length;
  const toImportCount = rows.filter((r) => !r.skip).length;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(8,8,14,0.7)", zIndex: 60 }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 14,
        zIndex: 61, width: "min(560px, 96vw)", maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--uf-border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)" }}>Import PDF Statement</div>
            {detectedBank && step !== "upload" && (
              <div style={{ fontSize: 12, color: "var(--uf-text-3)", marginTop: 2 }}>
                {detectedBank}{detectedPeriod ? ` · ${detectedPeriod}` : ""}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: "var(--uf-text-3)", cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px" }}>

          {/* ── Upload ── */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? "#22d3a5" : "var(--uf-border)"}`,
                  borderRadius: 12, padding: "48px 24px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                  cursor: "pointer", transition: "border-color 0.15s",
                  background: dragging ? "rgba(34,211,165,0.04)" : "transparent",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22d3a5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 12 15 15" />
                </svg>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--uf-text)" }}>
                  Drop your bank statement PDF here
                </div>
                <div style={{ fontSize: 12, color: "var(--uf-text-3)" }}>
                  or click to browse · ZA Bank, HSBC, and most banks supported
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                />
              </div>
              {error && (
                <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid #DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>
                  {error}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--uf-text-3)", lineHeight: 1.6 }}>
                The statement is processed on your server using AI to extract transactions. Your data is not stored externally.
              </div>
            </div>
          )}

          {/* ── Parsing ── */}
          {step === "parsing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
              <div style={{ width: 40, height: 40, border: "3px solid var(--uf-border)", borderTopColor: "#22d3a5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--uf-text)" }}>Analysing statement…</div>
              <div style={{ fontSize: 12, color: "var(--uf-text-3)" }}>AI is extracting transactions from your PDF</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── Review ── */}
          {step === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: "var(--uf-text-2)" }}>
                  <strong style={{ color: "var(--uf-text)" }}>{rows.length}</strong> transactions found
                  {dupCount > 0 && (
                    <span style={{ marginLeft: 8, color: "#f97316" }}>· {dupCount} possible duplicate{dupCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <button
                  onClick={() => setRows((prev) => prev.map((r) => ({ ...r, skip: r.isDuplicate })))}
                  style={{ fontSize: 11, color: "var(--uf-text-3)", background: "none", border: "1px solid var(--uf-border)", borderRadius: 6, padding: "3px 9px", cursor: "pointer" }}
                >
                  Skip duplicates
                </button>
              </div>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 90px 70px 28px", gap: 8, padding: "0 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "var(--uf-text-3)" }}>
                <span>Date</span><span>Description</span><span>Amount</span><span>Type</span><span />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--uf-border)", borderRadius: 10, overflow: "hidden" }}>
                {rows.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid", gridTemplateColumns: "80px 1fr 90px 70px 28px",
                      gap: 8, alignItems: "center", padding: "10px 14px",
                      borderTop: idx > 0 ? "1px solid var(--uf-border)" : "none",
                      background: row.skip ? "rgba(0,0,0,0.15)" : "transparent",
                      opacity: row.skip ? 0.45 : 1,
                      transition: "all 0.1s",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--uf-text-3)", fontVariantNumeric: "tabular-nums" }}>{row.date}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--uf-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.description}
                      </div>
                      {row.isDuplicate && !row.skip && (
                        <span style={{ fontSize: 10, color: "#f97316", fontWeight: 600 }}>possible duplicate</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                      {row.currency} {row.amount.toFixed(2)}
                    </span>
                    {/* Income/expense toggle */}
                    <button
                      onClick={() => toggleType(idx)}
                      style={{
                        fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "2px 8px",
                        background: row.type === "income" ? "rgba(5,150,105,0.15)" : "rgba(249,115,22,0.15)",
                        color: row.type === "income" ? "#059669" : "#f97316",
                        border: "none", cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      {row.type === "income" ? "income" : "expense"}
                    </button>
                    {/* Skip checkbox */}
                    <input
                      type="checkbox"
                      checked={!row.skip}
                      onChange={() => toggleSkip(idx)}
                      style={{ accentColor: "#22d3a5", width: 14, height: 14, cursor: "pointer" }}
                      title={row.skip ? "Include this row" : "Skip this row"}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Importing ── */}
          {step === "importing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
              <div style={{ width: "100%", height: 8, background: "var(--uf-border)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#22d3a5", borderRadius: 99, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 13, color: "var(--uf-text-2)" }}>Importing transactions… {progress}%</div>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && importResult && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "32px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--uf-text)" }}>Import complete</div>
              <div style={{ fontSize: 13, color: "var(--uf-text-2)", textAlign: "center", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--uf-text)" }}>{importResult.imported}</strong> transaction{importResult.imported !== 1 ? "s" : ""} imported
                {importResult.skipped > 0 && <>, <strong style={{ color: "var(--uf-text-3)" }}>{importResult.skipped}</strong> skipped</>}
              </div>
              <button
                onClick={() => { onImported(importResult.imported); }}
                style={{ background: "#047857", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div style={{ padding: "14px 20px 18px", borderTop: "1px solid var(--uf-border)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ background: "none", border: "1px solid var(--uf-border)", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "var(--uf-text-2)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={toImportCount === 0}
              style={{
                background: toImportCount > 0 ? "#047857" : "var(--uf-border)",
                color: toImportCount > 0 ? "#fff" : "var(--uf-text-3)",
                border: "none", borderRadius: 7, padding: "8px 20px",
                fontSize: 13, fontWeight: 700,
                cursor: toImportCount > 0 ? "pointer" : "not-allowed",
              }}
            >
              Import {toImportCount} transaction{toImportCount !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
