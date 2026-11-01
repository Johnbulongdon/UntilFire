"use client";

import React, { useEffect, useRef } from "react";
import Button from "./Button";

/**
 * Our own "are you sure?" popup, in place of the browser's grey confirm().
 * One question, one short line of what happens, two pill buttons. Escape or
 * a tap outside cancels. Focus starts on Cancel so Enter never destroys.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel = "Cancel", danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "var(--uf-scrim)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="uf-confirm-title"
        style={{ background: "var(--uf-card)", color: "var(--uf-ink)", border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-modal)", boxShadow: "var(--uf-e3)", padding: "24px 24px 20px", width: "100%", maxWidth: 380, fontFamily: "var(--uf-font)" }}
      >
        <h2 id="uf-confirm-title" className="uf-t-h3" style={{ margin: "0 0 6px" }}>{title}</h2>
        {body && <p className="uf-t-body" style={{ color: "var(--uf-ink-2)", margin: "0 0 20px" }}>{body}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: body ? 0 : 16 }}>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} style={{ flex: 1 }}>{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} style={{ flex: 1 }}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
